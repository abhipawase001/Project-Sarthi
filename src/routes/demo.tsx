import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, AlertTriangle, Siren, Users, Navigation, Zap, CheckCircle2 } from "lucide-react";
import { Nav } from "@/components/Nav";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Judge Demo — Sarthi Smart Transit" },
      { name: "description", content: "90-second guided walkthrough of every Sarthi feature: live tracking, AI anomaly detection, SOS, depot automation." },
    ],
  }),
  component: DemoPage,
});

type Scenario = {
  id: string;
  title: string;
  icon: typeof AlertTriangle;
  color: string;
  steps: { t: number; label: string; detail: string }[];
};

const SCENARIOS: Scenario[] = [
  {
    id: "breakdown",
    title: "Bus Breakdown Recovery",
    icon: AlertTriangle,
    color: "text-amber-400",
    steps: [
      { t: 0, label: "Bus MH17-CD-4521 stalls on Route R1", detail: "GPS pings stop updating for 90 seconds near Sangamner College." },
      { t: 2, label: "AI flags 'Ghost Bus' anomaly", detail: "Anomaly engine raises severity 8/10 alert on Authority dashboard." },
      { t: 4, label: "Sarthi notifies waiting passengers", detail: "Multilingual push: 'Bus delayed — next R1 in 12 min.'" },
      { t: 6, label: "Depot AI auto-reassigns relief bus", detail: "Natural-language command: 'send reserve bus to Malpani route'." },
      { t: 9, label: "Resolved — service restored", detail: "Anomaly auto-closes when GPS resumes. Logged for maintenance." },
    ],
  },
  {
    id: "deviation",
    title: "Route Deviation Detected",
    icon: Navigation,
    color: "text-cyan-400",
    steps: [
      { t: 0, label: "Driver takes wrong turn on R2", detail: "Bus drifts 340m off planned polyline." },
      { t: 2, label: "Haversine detector triggers", detail: "Real-time geofence check fires within 2s." },
      { t: 4, label: "Gemini explains root cause", detail: "AI: 'Likely roadwork on Akole Rd — suggest reroute via Civil Hospital.'" },
      { t: 7, label: "Driver app shows turn-by-turn fix", detail: "One-tap accept reroute. ETA recalculated." },
    ],
  },
  {
    id: "crowd",
    title: "Crowd Surge Forecast",
    icon: Users,
    color: "text-fuchsia-400",
    steps: [
      { t: 0, label: "5PM rush detected at Market Yard", detail: "Hourly ridership model predicts 640+ riders incoming." },
      { t: 3, label: "AI dispatches 2 extra buses", detail: "Depot console auto-suggests roster change; admin one-click approves." },
      { t: 6, label: "Passengers see 'extra service' alert", detail: "Sarthi chat: 'Bonus R1 buses every 4 min until 7PM.'" },
    ],
  },
  {
    id: "sos",
    title: "Emergency SOS Triggered",
    icon: Siren,
    color: "text-red-400",
    steps: [
      { t: 0, label: "Passenger hits SOS button", detail: "GPS + bus ID + nearest stop sent to Authority within 800ms." },
      { t: 2, label: "Driver app vibrates with alert", detail: "Silent panic — driver sees discreet red badge only." },
      { t: 4, label: "Authority sees live incident", detail: "Pulse marker on map with full context + one-tap dispatch." },
      { t: 7, label: "Response logged + audited", detail: "End-to-end response time: 6.2s. RLS-protected audit trail." },
    ],
  },
];

function DemoPage() {
  const [active, setActive] = useState<Scenario>(SCENARIOS[0]);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    ref.current = window.setInterval(() => setElapsed((e) => e + 0.5), 500);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [playing]);

  useEffect(() => {
    const last = active.steps[active.steps.length - 1].t + 3;
    if (elapsed >= last) setPlaying(false);
  }, [elapsed, active]);

  function play(s: Scenario) {
    setActive(s);
    setElapsed(0);
    setPlaying(true);
  }

  const currentStep = [...active.steps].reverse().find((s) => elapsed >= s.t);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-eco grid place-items-center glow">
            <Zap className="size-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Judge Demo Mode</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Tap any scenario to watch Sarthi handle it end-to-end. Each runs in under 15 seconds — perfect for a 90-second pitch.
        </p>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 mt-8">
          {/* Scenario picker */}
          <div className="space-y-3">
            {SCENARIOS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === active.id;
              return (
                <button
                  key={s.id}
                  onClick={() => play(s)}
                  className={`w-full text-left surface border rounded-2xl p-4 transition-all hover:border-primary/50 ${isActive ? "border-primary shadow-lg shadow-primary/10" : "border-border"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`size-10 rounded-lg surface-2 grid place-items-center ${s.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.steps.length} steps · ~{s.steps[s.steps.length - 1].t + 3}s
                      </div>
                    </div>
                    <Play className="size-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Player */}
          <div className="surface border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-eco/5">
              <div className="flex items-center gap-2">
                <active.icon className={`size-5 ${active.color}`} />
                <h2 className="font-display font-semibold">{active.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="p-2 rounded-lg surface-2 hover:bg-surface text-foreground"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <button
                  onClick={() => { setElapsed(0); setPlaying(true); }}
                  className="p-2 rounded-lg surface-2 hover:bg-surface text-foreground"
                  aria-label="Restart"
                >
                  <RotateCcw className="size-4" />
                </button>
              </div>
            </div>

            {/* Timeline scrubber */}
            <div className="px-5 pt-4">
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-eco"
                  style={{ width: `${Math.min(100, (elapsed / (active.steps[active.steps.length - 1].t + 3)) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1 text-right">{elapsed.toFixed(1)}s</div>
            </div>

            {/* Narrator */}
            <div className="px-5 py-6">
              <AnimatePresence mode="wait">
                {currentStep ? (
                  <motion.div
                    key={currentStep.t}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="surface-2 border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 text-xs text-eco font-mono mb-2">
                      <CheckCircle2 className="size-3.5" /> T+{currentStep.t}s
                    </div>
                    <div className="font-semibold text-lg">{currentStep.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{currentStep.detail}</div>
                  </motion.div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">Press play to start scenario…</div>
                )}
              </AnimatePresence>
            </div>

            {/* All steps */}
            <div className="px-5 pb-5 space-y-2">
              {active.steps.map((s, i) => {
                const reached = elapsed >= s.t;
                return (
                  <div key={i} className={`flex items-start gap-3 text-sm transition-opacity ${reached ? "opacity-100" : "opacity-40"}`}>
                    <div className={`mt-1 size-2 rounded-full ${reached ? "bg-eco" : "bg-border"}`} />
                    <div className="flex-1">
                      <div className={reached ? "text-foreground" : "text-muted-foreground"}>{s.label}</div>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">{s.t}s</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 surface-2 border border-border rounded-2xl p-5 text-sm text-muted-foreground">
          <strong className="text-foreground">For judges:</strong> every scenario above is wired to real components — Live map, Anomaly engine, Depot console, and SOS — visible on their respective pages. This demo simulates events for a clean pitch flow.
        </div>
      </main>
    </div>
  );
}
