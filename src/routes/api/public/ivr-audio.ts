import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { IvrLang } from "@/lib/ivr-engine";

/**
 * Serves the spoken audio for an IVR prompt.
 *
 * The text is passed in base64url together with an HMAC signature that only
 * this server can produce, so the endpoint cannot be abused as a free
 * text-to-speech API. Fixed menu phrases are cached in the database.
 */

const querySchema = z.object({
  t: z.string().min(1).max(4000),
  l: z.enum(["en", "hi", "mr"]),
  s: z.string().min(8).max(64),
});

export const Route = createFileRoute("/api/public/ivr-audio")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          t: url.searchParams.get("t") ?? "",
          l: url.searchParams.get("l") ?? "en",
          s: url.searchParams.get("s") ?? "",
        });
        if (!parsed.success) return new Response("Bad request", { status: 400 });

        let text: string;
        try {
          text = Buffer.from(parsed.data.t, "base64url").toString("utf8");
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!text || text.length > 3000) return new Response("Bad request", { status: 400 });

        const lang = parsed.data.l as IvrLang;
        const { verifyPrompt, speak } = await import("@/lib/ivr-audio.server");
        if (!verifyPrompt(text, lang, parsed.data.s)) {
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          const audio = await speak(text, lang);
          return new Response(audio.bytes, {
            headers: {
              "content-type": audio.contentType,
              "cache-control": "public, max-age=86400",
            },
          });
        } catch (err) {
          console.error("ivr audio failed", err);
          return new Response(err instanceof Error ? err.message : "Voice generation failed", {
            status: 502,
          });
        }
      },
    },
  },
});
