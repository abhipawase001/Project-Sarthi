import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { ClientMap } from "@/components/ClientMap";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import { Play, Pause, AlertTriangle, Battery, Wifi, MapPin, Users, Gauge, Power } from "lucide-react";

export const Route = createFileRoute("/driver")({
  head: () => ({ meta: [{ title: "Driver App — Sarthi" }, { name: "description", content: "Simulated driver console: shift control, GPS streaming, occupancy report, SOS." }] }),
  component: DriverPage,
});

function DriverPage() {
  const buses = useLiveBuses(1500);
  const me = buses[0];
  const [online, setOnline] = useState(true);
  const [shift, setShift] = useState(false);
  const [occ, setOcc] = useState<"low" | "medium" | "high">("medium");
  const [battery, setBattery] = useState(78);
  const [sosCount, setSosCount] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBattery((b) => Math.max(8, b - 0.05)), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Driver Console</h1>
          <p className="text-sm text-muted-foreground">Phone-based driver app simulator · uses any Android device as a GPS tracker</p>
        </div>

        <div className="grid lg:grid-cols-[400px_1fr] gap-4">
          {/* Phone mock */}
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-[3rem] border-4 border-surface-2 bg-background p-3 shadow-[var(--shadow-card)]">
              <div className="rounded-[2.4rem] surface overflow-hidden h-[640px] flex flex-col">
                {/* Status bar */}
                <div className="flex items-center justify-between px-5 pt-4 text-xs font-mono text-muted-foreground">
                  <span>{new Date().toLocaleTimeString().slice(0, 5)}</span>
                  <div className="flex items-center gap-2">
                    <Wifi className={`size-3.5 ${online ? "text-eco" : "text-destructive"}`} />
                    <Battery className="size-3.5" /> {Math.round(battery)}%
                  </div>
                </div>
                {/* App header */}
                <div className="px-5 pt-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Sarthi Driver</div>
                  <div className="font-display text-xl font-bold mt-1">{me.driver}</div>
                  <div className="font-mono text-xs text-primary">{me.id} · {me.routeName}</div>
                </div>

                {/* Shift toggle */}
                <button
                  onClick={() => setShift((s) => !s)}
                  className={`mx-5 mt-4 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${shift ? "bg-eco text-eco-foreground glow-eco" : "surface-2 border border-border"}`}>
                  {shift ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {shift ? "End Shift" : "Start Shift"}
                </button>

                {/* Live status */}
                <div className="mx-5 mt-4 grid grid-cols-2 gap-2">
                  <Tile icon={Gauge} label="Speed" value={`${Math.round(me.speed)} km/h`} />
                  <Tile icon={MapPin} label="Next Stop" value={me.nextStop} small />
                  <Tile icon={Users} label="Onboard" value={`${me.seatsTotal - me.seatsAvailable}/${me.seatsTotal}`} />
                  <Tile icon={Wifi} label="GPS" value={online ? "Streaming" : "Cached"} ok={online} />
                </div>

                {/* Occupancy reporter */}
                <div className="mx-5 mt-4">
                  <div className="text-xs text-muted-foreground mb-2">Report occupancy</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((k) => (
                      <button key={k} onClick={() => setOcc(k)}
                        className={`py-2 rounded-lg text-xs uppercase tracking-widest border ${occ === k ? (k === "low" ? "bg-eco/20 border-eco text-eco" : k === "medium" ? "bg-primary/20 border-primary text-primary" : "bg-accent/20 border-accent text-accent") : "surface-2 border-border text-muted-foreground"}`}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mx-5 mt-auto mb-5 space-y-2">
                  <button onClick={() => setOnline((o) => !o)} className="w-full py-2.5 rounded-xl surface-2 border border-border text-sm flex items-center justify-center gap-2">
                    <Power className="size-4" /> {online ? "Go Offline (cache GPS)" : "Reconnect"}
                  </button>
                  <button onClick={() => setSosCount((c) => c + 1)} className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-2">
                    <AlertTriangle className="size-4" /> SOS · Alert Depot
                  </button>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">A real Android build streams location every 5s with offline cache fallback.</p>
          </div>

          {/* Map showing me + telemetry */}
          <div className="space-y-4">
            <div className="surface border border-border rounded-2xl overflow-hidden h-[460px]">
              <ClientMap buses={[me]} />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <Stat label="Trips today" value="6" />
              <Stat label="Distance" value="142 km" />
              <Stat label="On-time score" value="92%" accent />
              <Stat label="Fuel efficiency" value="4.8 km/L" />
              <Stat label="Eco-driving rating" value="A-" eco />
              <Stat label="SOS alerts" value={String(sosCount)} warn={sosCount > 0} />
            </div>
            <div className="surface border border-border rounded-2xl p-5">
              <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Edge AI · Local inference log</div>
              <pre className="font-mono text-xs text-muted-foreground leading-relaxed overflow-x-auto">
{`[edge] gps_fix accuracy=8m hdop=1.2
[edge] occupancy_cv frame=hash:9f3a → ${occ.toUpperCase()} (conf 0.91)
[edge] eta_model next_stop="${me.nextStop}" pred=${me.etaMin}m σ=1.4
[edge] anomaly route_deviation=NONE
[net]  ${online ? "ws://sarthi/ingest OK 28ms" : "OFFLINE → buffered 12 frames"}
`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value, small, ok }: { icon: any; label: string; value: React.ReactNode; small?: boolean; ok?: boolean }) {
  return (
    <div className="surface-2 rounded-xl p-3 border border-border">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground"><Icon className={`size-3 ${ok ? "text-eco" : ""}`} />{label}</div>
      <div className={`mt-1 font-display font-semibold ${small ? "text-xs" : "text-base"}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, accent, eco, warn }: { label: string; value: string; accent?: boolean; eco?: boolean; warn?: boolean }) {
  return (
    <div className="surface border border-border rounded-xl p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1 ${eco ? "text-eco" : accent ? "text-primary" : warn ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
