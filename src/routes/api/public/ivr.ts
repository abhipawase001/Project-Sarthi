import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { initialCall, ivrStep, type IvrCallState, type IvrLang } from "@/lib/ivr-engine";

/**
 * Toll-free voice line webhook (Exotel / Twilio compatible).
 *
 * The provider calls this URL on every step of the call with the caller id and
 * the digit that was pressed. We run the shared IVR engine, persist the call
 * state against a hashed call id (the raw phone number is never stored), and
 * answer with provider XML — or JSON for the on-screen console.
 *
 * Auth: optional `IVR_WEBHOOK_SECRET` as `x-ivr-secret` header or `?key=`.
 * Without it the line runs in dry-run mode so the demo stays usable.
 */

const payloadSchema = z.object({
  callSid: z.string().min(1).max(80),
  from: z.string().max(24).default(""),
  digits: z.string().max(8).default(""),
});

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function hash(value: string, salt: string) {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Twilio TwiML with AI voice audio and digit gathering. */
function twiml(url: string, actionUrl: string, expectDigits: number, hangup: boolean) {
  const play = `<Play>${escapeXml(url)}</Play>`;
  if (hangup || expectDigits === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${play}<Hangup/></Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather numDigits="${expectDigits}" timeout="7" action="${escapeXml(
    actionUrl,
  )}" method="POST">${play}</Gather><Redirect method="POST">${escapeXml(actionUrl)}</Redirect></Response>`;
}

/** Exotel Applet XML. */
function exotel(url: string, expectDigits: number, hangup: boolean) {
  if (hangup || expectDigits === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${escapeXml(url)}</Play><Hangup/></Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather numDigits="${expectDigits}" timeout="7"><Play>${escapeXml(
    url,
  )}</Play></Gather></Response>`;
}

async function readPayload(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  const url = new URL(request.url);
  const q = (k: string) => url.searchParams.get(k) ?? "";
  if (type.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    return payloadSchema.parse({
      callSid: String(json["callSid"] ?? json["CallSid"] ?? json["CallGuid"] ?? q("CallSid") ?? ""),
      from: String(json["from"] ?? json["From"] ?? json["CallFrom"] ?? ""),
      digits: String(json["digits"] ?? json["Digits"] ?? json["digit"] ?? ""),
    });
  }
  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
  }
  const f = (k: string) => String(form?.get(k) ?? "");
  return payloadSchema.parse({
    callSid: f("CallSid") || f("CallGuid") || q("CallSid") || q("CallGuid") || `web-${Date.now()}`,
    from: f("From") || f("CallFrom") || q("From") || q("CallFrom") || "",
    digits: f("Digits") || f("digits") || q("Digits") || q("digits") || "",
  });
}

export const Route = createFileRoute("/api/public/ivr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["IVR_WEBHOOK_SECRET"];
        const dryRun = !secret;
        const url = new URL(request.url);

        if (secret) {
          const provided = request.headers.get("x-ivr-secret") ?? url.searchParams.get("key") ?? "";
          if (!safeEqual(provided, secret)) return new Response("Invalid signature", { status: 401 });
        }

        let payload: z.infer<typeof payloadSchema>;
        try {
          payload = await readPayload(request);
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const salt = secret ?? "drishti-ivr-demo-salt";
        const callHash = hash(payload.callSid, salt);
        const phoneHash = payload.from ? hash(payload.from, salt) : null;

        let call: IvrCallState = initialCall;
        let admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"] | null =
          null;

        if (!dryRun) {
          try {
            admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
            const { data } = await admin
              .from("ivr_calls")
              .select("lang, route, stop_id, state, attempts")
              .eq("call_hash", callHash)
              .maybeSingle();
            if (data) {
              call = {
                lang: (data.lang as IvrLang) ?? "en",
                route: data.route,
                stopId: data.stop_id,
                state: data.state as IvrCallState["state"],
                attempts: data.attempts ?? 0,
              };
            }
          } catch (err) {
            console.error("ivr call load failed", err);
          }
        }

        const step = ivrStep(call, payload.digits || null);

        if (admin) {
          try {
            await admin.from("ivr_calls").upsert(
              {
                call_hash: callHash,
                phone_hash: phoneHash,
                lang: step.next.lang,
                route: step.next.route ?? null,
                stop_id: step.next.stopId ?? null,
                state: step.next.state,
                attempts: step.next.attempts,
                ended_at: step.hangup ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "call_hash" },
            );
            if (step.alert && phoneHash) {
              await admin.from("sms_alerts").insert({
                phone_hash: phoneHash,
                bus_id: step.alert.busId,
                route: step.alert.route,
                stop_id: step.alert.stopId,
                stop_name: step.alert.stopName,
              });
            }
          } catch (err) {
            console.error("ivr call persist failed", err);
          }
        }

        const { audioUrl } = await import("@/lib/ivr-audio.server");
        const origin = url.origin;
        const play = audioUrl(origin, step.say, step.next.lang);
        const action = `${origin}/api/public/ivr${url.search}`;

        const format =
          url.searchParams.get("format") ??
          ((request.headers.get("user-agent") ?? "").includes("Twilio") ? "twiml" : "");

        if (format === "twiml") {
          return new Response(twiml(play, action, step.expectDigits, step.hangup), {
            headers: { "content-type": "application/xml; charset=utf-8" },
          });
        }
        if (format === "exotel") {
          return new Response(exotel(play, step.expectDigits, step.hangup), {
            headers: { "content-type": "application/xml; charset=utf-8" },
          });
        }

        return Response.json({
          say: step.say,
          audioUrl: play,
          expectDigits: step.expectDigits,
          hangup: step.hangup,
          state: step.next.state,
          lang: step.next.lang,
          route: step.next.route ?? null,
          stopId: step.next.stopId ?? null,
          alert: step.alert ?? null,
          dryRun,
        });
      },
      GET: async () =>
        Response.json({
          service: "drishti-ivr",
          status: process.env["IVR_WEBHOOK_SECRET"] ? "live" : "dry-run",
          usage: "POST { callSid, from, digits } — add ?format=twiml or ?format=exotel for provider XML",
        }),
    },
  },
});
