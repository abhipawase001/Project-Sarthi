import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  type: z.string(),
  busId: z.string(),
  message: z.string(),
  severity: z.string(),
});

export const explainAnomaly = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are an Indian city bus operations expert. A live anomaly was detected:
- Type: ${data.type}
- Bus: ${data.busId}
- Severity: ${data.severity}
- Detail: ${data.message}

Reply with EXACTLY two short lines:
LIKELY CAUSE: <one line, plain English, India-context (traffic, festival, market, school, breakdown)>
ACTION: <one concrete action the depot supervisor should take in the next 5 minutes>`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.status === 429) throw new Error("AI busy, retry in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { explanation: j.choices?.[0]?.message?.content?.trim() ?? "—" };
  });
