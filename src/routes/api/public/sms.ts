import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { parseSms, emptySession, type SmsSession } from "@/lib/sms-engine";

/**
 * Inbound SMS webhook.
 *
 * Providers (Twilio / GatewayAPI) POST the incoming text here; we run the
 * shared Drishti SMS engine and return the reply. Session state (which route
 * the sender picked) is persisted server-side against a salted hash of the
 * phone number — the raw number is never stored or logged.
 *
 * Auth: a shared secret must be supplied as `x-sms-secret` header or `?key=`.
 * Without SMS_WEBHOOK_SECRET configured the endpoint answers in dry-run mode
 * (engine runs, nothing is persisted) so the demo stays usable.
 */

const payloadSchema = z.object({
  from: z.string().min(3).max(24),
  body: z.string().max(320).default(""),
});

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function hashPhone(phone: string, salt: string) {
  return createHash("sha256").update(`${salt}:${phone}`).digest("hex");
}

function twiml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

async function readPayload(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    return payloadSchema.parse({
      from: String(json["from"] ?? json["From"] ?? json["msisdn"] ?? ""),
      body: String(json["body"] ?? json["Body"] ?? json["message"] ?? ""),
    });
  }
  const form = await request.formData();
  return payloadSchema.parse({
    from: String(form.get("From") ?? form.get("from") ?? form.get("msisdn") ?? ""),
    body: String(form.get("Body") ?? form.get("body") ?? form.get("message") ?? ""),
  });
}

export const Route = createFileRoute("/api/public/sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SMS_WEBHOOK_SECRET"];
        const dryRun = !secret;

        if (secret) {
          const url = new URL(request.url);
          const provided = request.headers.get("x-sms-secret") ?? url.searchParams.get("key") ?? "";
          if (!safeEqual(provided, secret)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let payload: z.infer<typeof payloadSchema>;
        try {
          payload = await readPayload(request);
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const salt = secret ?? "drishti-demo-salt";
        const phoneHash = hashPhone(payload.from, salt);

        let session: SmsSession = emptySession;
        let admin: typeof import("@/integrations/supabase/client.server")["supabaseAdmin"] | null = null;

        if (!dryRun) {
          try {
            admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
            const { data } = await admin
              .from("sms_sessions")
              .select("route, stop_id, lang, last_buses, expires_at")
              .eq("phone_hash", phoneHash)
              .maybeSingle();
            if (data && new Date(data.expires_at).getTime() > Date.now()) {
              session = {
                route: data.route,
                stopId: data.stop_id,
                lang: (data.lang as SmsSession["lang"]) ?? "en",
                lastBuses: (data.last_buses as string[] | null) ?? null,
              };
            }
          } catch (err) {
            console.error("sms session load failed", err);
          }
        }

        const result = parseSms(payload.body, session);

        if (admin) {
          const next = result.session;
          try {
            await admin.from("sms_sessions").upsert(
              {
                phone_hash: phoneHash,
                route: next.route ?? null,
                stop_id: next.stopId ?? null,
                lang: next.lang,
                last_buses: next.lastBuses ?? null,
                expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "phone_hash" },
            );
            if (result.alert) {
              await admin.from("sms_alerts").insert({
                phone_hash: phoneHash,
                bus_id: result.alert.busId,
                route: result.alert.route,
                stop_id: result.alert.stopId,
                stop_name: result.alert.stopName,
              });
            }
          } catch (err) {
            console.error("sms session persist failed", err);
          }
        }

        const wantsXml = (request.headers.get("user-agent") ?? "").includes("Twilio")
          || new URL(request.url).searchParams.get("format") === "twiml";

        if (wantsXml) {
          return new Response(twiml(result.reply), {
            headers: { "content-type": "application/xml; charset=utf-8" },
          });
        }
        return Response.json({ reply: result.reply, dryRun });
      },
      GET: async () =>
        Response.json({
          service: "drishti-sms",
          status: process.env["SMS_WEBHOOK_SECRET"] ? "live" : "dry-run",
          usage: "POST { from, body } or provider form-encoded payload",
        }),
    },
  },
});
