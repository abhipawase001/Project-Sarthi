import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Loader2, Check } from "lucide-react";

export function SosButton({ busId }: { busId?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function fire() {
    if (state === "sending") return;
    setState("sending");
    const coords = await new Promise<GeolocationCoordinates | null>((res) => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition((p) => res(p.coords), () => res(null), { timeout: 4000 });
    });
    const { error } = await supabase.from("incident_reports").insert({
      kind: "sos",
      bus_id: busId ?? null,
      message: msg || "Passenger SOS alert",
      lat: coords?.latitude ?? null,
      lng: coords?.longitude ?? null,
    });
    if (error) { setState("error"); return; }
    setState("sent");
    setTimeout(() => setState("idle"), 4000);
  }

  return (
    <div className="surface border border-warn/40 rounded-2xl p-4 bg-warn/5">
      <div className="flex items-center gap-2 text-warn font-semibold mb-2">
        <ShieldAlert className="size-4" /> Emergency / SOS
      </div>
      <p className="text-xs text-muted-foreground mb-3">One tap alerts the Authority dashboard with your live location. Use only for real safety concerns.</p>
      <input
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Optional note (e.g. harassment, medical, breakdown)"
        className="w-full text-xs surface-2 border border-border rounded-lg px-2 py-1.5 mb-2 outline-none placeholder:text-muted-foreground"
      />
      <button
        onClick={fire}
        disabled={state === "sending"}
        className="w-full py-2.5 rounded-xl font-semibold text-sm bg-warn text-background hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {state === "sending" ? <><Loader2 className="size-4 animate-spin" /> Sending…</> :
         state === "sent" ? <><Check className="size-4" /> Authority alerted</> :
         state === "error" ? "Retry — could not send" :
         "🚨 Send SOS"}
      </button>
    </div>
  );
}
