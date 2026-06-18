import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function callAI(body: unknown) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI busy, retry in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/* ---------- Roster generator ---------- */
const RosterInput = z.object({
  date: z.string(),
  buses: z.array(z.object({ reg_no: z.string(), route: z.string().nullable(), status: z.string() })),
  drivers: z.array(z.object({ id: z.string(), name: z.string(), role: z.string(), status: z.string(), rating: z.number() })),
  notes: z.string().optional(),
});

export const generateRoster = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RosterInput.parse(d))
  .handler(async ({ data }) => {
    const sys = `You are the depot scheduling AI for a small Indian city bus operation. Assign EXACTLY ONE driver and ONE conductor per active bus (skip buses with status='maintenance'). Rules:
- A driver appears at most once for the date.
- Prefer drivers with rating >= 4.5 for morning peak (6:00-10:00).
- Output strict JSON only, no prose.`;
    const user = `Date: ${data.date}
BUSES: ${JSON.stringify(data.buses)}
CREW:  ${JSON.stringify(data.drivers)}
NOTES: ${data.notes ?? "(none)"}

Return JSON: { "roster": [ { "bus_reg":"...", "driver_id":"uuid", "conductor_id":"uuid", "route":"R1", "shift_start":"06:00", "shift_end":"14:00" } ], "reasoning": "1-2 short lines" }`;

    const j = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });
    const txt = (j as any).choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(txt);
    } catch {
      return { roster: [], reasoning: "AI returned malformed JSON." };
    }
  });

/* ---------- NL command parser ---------- */
const CmdInput = z.object({ text: z.string().min(1).max(400) });
export const depotCommand = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CmdInput.parse(d))
  .handler(async ({ data }) => {
    const sys = `You parse depot supervisor commands into structured actions. Available actions:
- assign_driver { driver_name, bus_reg, shift_start?, shift_end? }
- set_bus_status { bus_reg, status: "active"|"maintenance"|"reserve" }
- log_fuel       { bus_reg, liters, cost? }
- schedule_service { bus_reg, kind, when? }
- query          { what: "idle_drivers"|"today_roster"|"overdue_service"|"low_health_buses" }
Reply ONLY with JSON: { "action":"...", "args":{...}, "speak":"short confirmation in English" }`;
    const j = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: data.text },
      ],
      response_format: { type: "json_object" },
    });
    const txt = (j as any).choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(txt);
    } catch {
      return { action: "unknown", args: {}, speak: "Sorry, I couldn't parse that command." };
    }
  });
