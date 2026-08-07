import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseSms, emptySession, type SmsSession } from "./sms-engine";

const sessionSchema = z.object({
  route: z.string().max(16).nullish(),
  stopId: z.string().max(16).nullish(),
  lang: z.enum(["en", "hi", "mr"]).default("en"),
  lastBuses: z.array(z.string().max(32)).max(3).nullish(),
});

const inputSchema = z.object({
  body: z.string().max(320),
  session: sessionSchema.optional(),
});

/**
 * Simulator-facing RPC. Runs the exact same engine as the provider webhook,
 * but keeps the session on the client so no phone number is ever stored.
 */
export const smsReply = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = (data.session ?? emptySession) as SmsSession;
    const result = parseSms(data.body, session);
    return {
      reply: result.reply,
      session: result.session,
      alert: result.alert ?? null,
      chars: result.reply.length,
      parts: Math.max(1, Math.ceil(result.reply.length / 160)),
    };
  });

/** Whether a real SMS provider is wired up (drives the badge on the UI). */
export const smsProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const hasTwilio = Boolean(process.env["TWILIO_API_KEY"]);
  const hasGateway = Boolean(process.env["GATEWAYAPI_API_KEY"]);
  return {
    live: hasTwilio || hasGateway,
    provider: hasTwilio ? "twilio" : hasGateway ? "gatewayapi" : null,
    webhookConfigured: Boolean(process.env["SMS_WEBHOOK_SECRET"]),
  };
});
