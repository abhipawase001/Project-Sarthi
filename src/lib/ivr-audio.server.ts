/**
 * Server-only helpers for the IVR voice line: prompt signing and
 * Lovable AI text-to-speech with a database-backed cache for fixed phrases.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { IvrLang } from "./ivr-engine";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/audio/speech";
const TTS_MODEL = "google/gemini-2.5-flash-tts";

/** Distinct voices per language keep the line from sounding machine-translated. */
const VOICE: Record<IvrLang, string> = { en: "Kore", hi: "Aoede", mr: "Aoede" };

function signingKey() {
  return process.env["IVR_WEBHOOK_SECRET"] || process.env["LOVABLE_API_KEY"] || "drishti-ivr-dev";
}

export function signPrompt(text: string, lang: IvrLang) {
  return createHmac("sha256", signingKey()).update(`${lang}:${text}`).digest("hex").slice(0, 32);
}

export function verifyPrompt(text: string, lang: IvrLang, sig: string) {
  const expected = signPrompt(text, lang);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Absolute, signed URL a telephony provider can fetch the audio from. */
export function audioUrl(origin: string, text: string, lang: IvrLang) {
  const params = new URLSearchParams({
    t: Buffer.from(text, "utf8").toString("base64url"),
    l: lang,
    s: signPrompt(text, lang),
  });
  return `${origin}/api/public/ivr-audio?${params.toString()}`;
}

export function phraseKey(text: string, lang: IvrLang) {
  return createHash("sha256").update(`${lang}:${text}`).digest("hex").slice(0, 40);
}

/** Fixed menu phrases are worth caching; lines containing live numbers are not. */
export function isCacheable(text: string) {
  return !/\d\s?(minute|minutes|minit|seat|jaga)/i.test(text);
}

export interface SpokenAudio {
  bytes: Uint8Array;
  contentType: string;
  cached: boolean;
}

function base64ToBytes(b64: string) {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/**
 * Speak `text` with Lovable AI. Cached phrases are served from the database;
 * everything else is generated on demand.
 */
export async function speak(text: string, lang: IvrLang): Promise<SpokenAudio> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const cacheable = isCacheable(text);
  const pk = phraseKey(text, lang);
  let admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"] | null = null;

  if (cacheable) {
    try {
      admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
      const { data } = await admin
        .from("ivr_audio_cache")
        .select("audio_base64, format")
        .eq("phrase_key", pk)
        .maybeSingle();
      if (data?.audio_base64) {
        return {
          bytes: base64ToBytes(data.audio_base64),
          contentType: data.format === "mp3" ? "audio/mpeg" : "audio/wav",
          cached: true,
        };
      }
    } catch (err) {
      console.error("ivr audio cache read failed", err);
    }
  }

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `Say clearly and calmly, like a helpful bus helpline: ${text}` }],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE[lang] ?? "Kore" } },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`ivr tts failed [${res.status}]: ${body}`);
    throw new Error(`Voice generation failed [${res.status}]: ${body}`);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get("content-type")?.split(";")[0] || "audio/wav";

  if (cacheable && admin) {
    try {
      await admin.from("ivr_audio_cache").upsert(
        {
          phrase_key: pk,
          lang,
          text,
          audio_base64: Buffer.from(buf).toString("base64"),
          format: contentType.includes("mpeg") ? "mp3" : "wav",
        },
        { onConflict: "phrase_key" },
      );
    } catch (err) {
      console.error("ivr audio cache write failed", err);
    }
  }

  return { bytes: buf, contentType, cached: false };
}
