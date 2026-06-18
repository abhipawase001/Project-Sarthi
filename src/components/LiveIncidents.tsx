import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Clock, MapPin } from "lucide-react";

type Incident = {
  id: string;
  kind: string;
  bus_id: string | null;
  message: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  created_at: string;
};

export function LiveIncidents() {
  const [items, setItems] = useState<Incident[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("incident_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => { if (mounted && data) setItems(data as Incident[]); });

    const ch = supabase
      .channel("incidents")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incident_reports" },
        (payload) => setItems((prev) => [payload.new as Incident, ...prev].slice(0, 15)))
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2"><ShieldAlert className="size-4 text-warn" /> Live Incidents</h3>
        <span className="text-[10px] font-mono text-warn animate-pulse">REAL-TIME</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground py-8 text-center">No incidents reported. The map is calm.</div>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {items.map((x) => (
            <li key={x.id} className="surface-2 border border-border rounded-xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`px-2 py-0.5 rounded-full uppercase font-mono ${x.kind === "sos" ? "bg-warn/20 text-warn" : "bg-primary/15 text-primary"}`}>{x.kind}</span>
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> {new Date(x.created_at).toLocaleTimeString()}</span>
              </div>
              <div className="mt-1.5 text-sm">{x.message ?? "(no message)"}</div>
              <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-2">
                {x.bus_id && <span className="font-mono">{x.bus_id}</span>}
                {x.lat && x.lng && <span className="flex items-center gap-0.5"><MapPin className="size-3" /> {x.lat.toFixed(3)}, {x.lng.toFixed(3)}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
