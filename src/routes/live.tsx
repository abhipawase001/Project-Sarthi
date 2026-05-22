import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { ClientMap } from "@/components/ClientMap";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import { ROUTES, STOPS } from "@/lib/mockData";
import { Bus as BusIcon, Users, Clock, Navigation, Search } from "lucide-react";

export const Route = createFileRoute("/live")({
  head: () => ({ meta: [{ title: "Live Tracking — Sarthi" }, { name: "description", content: "Real-time bus positions, ETAs and seat availability across the city." }] }),
  component: LivePage,
});

function LivePage() {
  const buses = useLiveBuses(1500);
  const [route, setRoute] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const visible = buses.filter(b => (!route || b.route === route) && (!q || b.id.toLowerCase().includes(q.toLowerCase()) || b.nextStop.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Live Tracking</h1>
            <p className="text-sm text-muted-foreground">Sangamner pilot · {buses.length} buses streaming</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRoute(null)} className={`px-3 py-1.5 rounded-lg text-sm border ${!route ? "bg-primary text-primary-foreground border-primary" : "surface border-border"}`}>All routes</button>
            {Object.entries(ROUTES).map(([rid, r]) => (
              <button key={rid} onClick={() => setRoute(rid)}
                className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 ${route === rid ? "bg-primary text-primary-foreground border-primary" : "surface border-border"}`}>
                <span className="size-2 rounded-full" style={{ background: r.color }} />
                {rid}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          {/* Map */}
          <div className="surface border border-border rounded-2xl overflow-hidden h-[70vh]">
            <ClientMap buses={visible} selectedRoute={route} />
          </div>

          {/* Side panel */}
          <div className="space-y-3">
            <div className="surface border border-border rounded-2xl p-3 flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bus or stop…" className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-2 max-h-[63vh] overflow-y-auto pr-1">
              {visible.map((b) => (
                <div key={b.id} className="surface border border-border rounded-xl p-4 hover:border-primary/60 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-primary/15 grid place-items-center text-primary"><BusIcon className="size-4" /></div>
                      <div>
                        <div className="font-mono text-xs">{b.id}</div>
                        <div className="text-[11px] text-muted-foreground">{b.routeName}</div>
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${b.status === "on-time" ? "bg-eco/15 text-eco" : b.status === "delayed" ? "bg-accent/15 text-accent" : "bg-warn/15 text-warn"}`}>
                      {b.status}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <Pill icon={Clock}      label="ETA"   value={`${b.etaMin}m`} />
                    <Pill icon={Users}      label="Seats" value={`${b.seatsAvailable}/${b.seatsTotal}`} />
                    <Pill icon={Navigation} label="km/h"  value={Math.round(b.speed)} />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">Next: <span className="text-foreground">{b.nextStop}</span></div>
                </div>
              ))}
              {visible.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">No buses match</div>}
            </div>

            <div className="surface border border-border rounded-2xl p-4">
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Nearby stops</div>
              <ul className="text-sm space-y-1.5">
                {STOPS.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex justify-between"><span>{s.name}</span><span className="text-muted-foreground text-xs">{s.routes.join(", ")}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="surface-2 rounded-lg p-2 border border-border">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"><Icon className="size-3" />{label}</div>
      <div className="font-mono text-sm mt-0.5">{value}</div>
    </div>
  );
}
