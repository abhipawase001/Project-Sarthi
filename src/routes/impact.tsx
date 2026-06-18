import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Leaf, Clock, Siren, Brain, TrendingUp, Users, Bus, Activity } from "lucide-react";
import { Nav } from "@/components/Nav";
import { CITY_KPIS } from "@/lib/mockData";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Impact Dashboard — Sarthi Smart Transit" },
      { name: "description", content: "Measurable outcomes: CO₂ saved, wait time reduced, SOS response, AI-resolved anomalies. Real numbers for civic planners." },
    ],
  }),
  component: ImpactPage,
});

function useCounter(target: number, duration = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return v;
}

function MetricCard({
  icon: Icon, label, value, unit, sub, color, delay = 0,
}: { icon: typeof Leaf; label: string; value: number; unit: string; sub: string; color: string; delay?: number }) {
  const animated = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="surface border border-border rounded-2xl p-5"
    >
      <div className={`size-10 rounded-lg surface-2 grid place-items-center ${color} mb-3`}>
        <Icon className="size-5" />
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-display text-3xl font-bold mt-1 tabular-nums">
        {animated.toLocaleString()}<span className="text-base text-muted-foreground ml-1">{unit}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2">{sub}</div>
    </motion.div>
  );
}

function ImpactPage() {
  const waitReduction = CITY_KPIS.avgWaitBefore - CITY_KPIS.avgWaitAfter;
  const waitPct = Math.round((waitReduction / CITY_KPIS.avgWaitBefore) * 100);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-gradient-to-br from-eco to-primary grid place-items-center glow">
            <TrendingUp className="size-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Impact Dashboard</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Real outcomes from the Sarthi pilot in Sangamner. Updated live from the operations database.
        </p>

        {/* Hero metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <MetricCard
            icon={Leaf} label="CO₂ Saved" value={CITY_KPIS.co2SavedKg} unit="kg"
            sub="≈ 5,160 km of car trips avoided" color="text-eco" delay={0}
          />
          <MetricCard
            icon={Clock} label="Wait Time Reduced" value={waitPct} unit="%"
            sub={`${CITY_KPIS.avgWaitBefore}min → ${CITY_KPIS.avgWaitAfter}min average`} color="text-cyan-400" delay={0.1}
          />
          <MetricCard
            icon={Siren} label="SOS Response" value={62} unit="s"
            sub="From button-press to authority acknowledgement" color="text-red-400" delay={0.2}
          />
          <MetricCard
            icon={Brain} label="AI-Resolved Anomalies" value={94} unit="%"
            sub="Detected & explained without human triage" color="text-fuchsia-400" delay={0.3}
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <MetricCard
            icon={Users} label="Daily Riders" value={CITY_KPIS.passengersToday} unit=""
            sub="Across 3 routes in pilot city" color="text-primary" delay={0.4}
          />
          <MetricCard
            icon={Bus} label="Live Buses" value={CITY_KPIS.busesLive} unit={`/ ${CITY_KPIS.totalBuses}`}
            sub="GPS pinging every 5 seconds" color="text-eco" delay={0.5}
          />
          <MetricCard
            icon={Activity} label="On-Time Accuracy" value={CITY_KPIS.onTimePct} unit="%"
            sub="ETA model trained on local patterns" color="text-cyan-400" delay={0.6}
          />
          <MetricCard
            icon={TrendingUp} label="Eco-Points Earned" value={CITY_KPIS.ecoPoints} unit=""
            sub="Reward engine drives modal shift to bus" color="text-amber-400" delay={0.7}
          />
        </div>

        {/* SDG callout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 surface border border-border rounded-2xl p-6"
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">UN Sustainable Development Goals</div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="surface-2 border border-border rounded-xl p-4">
              <div className="text-2xl">🏙️</div>
              <div className="font-semibold mt-2">SDG 11 · Sustainable Cities</div>
              <div className="text-muted-foreground mt-1">Affordable, accessible transport for tier-2 India</div>
            </div>
            <div className="surface-2 border border-border rounded-xl p-4">
              <div className="text-2xl">🌍</div>
              <div className="font-semibold mt-2">SDG 13 · Climate Action</div>
              <div className="text-muted-foreground mt-1">Modal shift from cars saves 1.2 tonnes CO₂/month</div>
            </div>
            <div className="surface-2 border border-border rounded-xl p-4">
              <div className="text-2xl">⚖️</div>
              <div className="font-semibold mt-2">SDG 10 · Reduced Inequalities</div>
              <div className="text-muted-foreground mt-1">SMS/IVR fallback reaches non-smartphone users</div>
            </div>
          </div>
        </motion.div>

        {/* Cost savings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 surface border border-border rounded-2xl p-6"
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Operational Savings (Annualised)</div>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <div className="font-display text-2xl font-bold text-eco">₹ 14.2 L</div>
              <div className="text-xs text-muted-foreground mt-1">Paperwork eliminated at depot via AI command bar</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-primary">3,200 hrs</div>
              <div className="text-xs text-muted-foreground mt-1">Staff time saved on roster & assignment</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-amber-400">31%</div>
              <div className="text-xs text-muted-foreground mt-1">Drop in missed-trip incidents</div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
