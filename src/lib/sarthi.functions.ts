import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ChatInput = z.object({
  message: z.string().min(1).max(2000),
  language: z.enum(["en", "hi", "mr"]).default("en"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .default([]),
  liveContext: z.string().max(4000).optional(),
});

const LANG_NAME = {
  en: "English",
  hi: "Hindi (Devanagari)",
  mr: "Marathi (Devanagari)",
} as const;

export const askSarthi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const system = `You are Sarthi, a friendly multilingual assistant for a small-city bus network in Sangamner, Maharashtra, India.
- ALWAYS reply in ${LANG_NAME[data.language]}. If the user code-switches, mirror their script but stay primarily in ${LANG_NAME[data.language]}.
- Be concise (max 4 short sentences). Use simple words a first-time bus rider would understand.
- If asked about ETAs, fares, or seats, use the LIVE CONTEXT below; if data is missing, say so honestly and suggest checking the Live Tracking page.
- If a user describes danger, harassment, or emergency, instruct them to tap the red SOS button immediately and call 112.
- Never invent bus IDs, routes, or stop names that are not in the live context.

LIVE CONTEXT:\n${data.liveContext ?? "(no live data attached)"}\n`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          ...data.history,
          { role: "user", content: data.message },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Sarthi is busy — please retry in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = j.choices?.[0]?.message?.content?.trim() ?? "…";
    return { reply };
  });
