import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bus, MapPin, Radio, Smartphone, Brain, Leaf, MessageSquare, Trophy,
  Shield, Zap, Globe, ArrowRight, Activity, Users, TrendingDown, Sparkles
} from "lucide-react";
import { Nav } from "@/components/Nav";
import { CITY_KPIS } from "@/lib/mockData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sarthi — Real-Time Public Transport for Small Cities" },
      { name: "description", content: "Project Sarthi: Hybrid GPS + Edge AI bus tracking, multi-channel access (App/SMS/IVR/WhatsApp), eco-rewards. Built for tier-2 India." },
      { property: "og:title", content: "Sarthi — Smart Transit for Tier-2 India" },
      { property: "og:description", content: "Live bus tracking, AI ETA, eco-rewards. Designed for small cities — offline-first & inclusive." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: MapPin, title: "Hybrid GPS + Edge AI", desc: "Driver phone GPS fused with edge inference and crowd-sourced signals. Sub-30s positional accuracy even on patchy networks." },
  { icon: Brain, title: "AI ETA & Seat Prediction", desc: "Gradient-boosted ETA model trained on local traffic, weather and event patterns. Computer-vision-assisted occupancy." },
  { icon: MessageSquare, title: "Inclusive Multi-Channel", desc: "Native app, mobile web, SMS short-code, WhatsApp bot and IVR — reaching every commuter, smartphone or not." },
  { icon: Leaf, title: "Eco-Reward Engine", desc: "Gamified points, leaderboard and partner perks for every kilogram of CO₂ saved by choosing the bus." },
  { icon: Shield, title: "Offline-First & Private", desc: "Local SQLite cache, anonymized telemetry, driver-consent GPS — works in low-signal corridors." },
  { icon: Globe, title: "Authority Command Center", desc: "Real-time fleet ops, demand heatmaps, schedule optimization and emission reports for civic planners." },
];

const stats = [
  { value: "25%", label: "Reduction in avg wait time", icon: TrendingDown, color: "text-eco" },
  { value: "87%", label: "On-time arrival accuracy",   icon: Activity,   color: "text-primary" },
  { value: "20%", label: "Projected CO₂ reduction",    icon: Leaf,        color: "text-eco" },
  { value: "4.3k", label: "Pilot daily ridership",     icon: Users,       color: "text-primary" },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-28">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full surface border border-border text-xs font-mono uppercase tracking-widest text-primary">
              <Sparkles className="size-3.5" /> SIH 2025 · PS-25013 · Team Amrut Coders
            </div>
            <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-[1.05] max-w-4xl">
              Public transport that <span className="gradient-text">finally shows up</span> — for every Indian city.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
              Sarthi turns any city bus into a live, predictable, eco-rewarding service.
              Hybrid GPS, Edge AI and inclusive SMS/IVR access — designed for tier-2 India,
              not just metros.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/live" className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold glow hover:scale-[1.02] transition-transform">
                <Radio className="size-4" /> Open Live Map
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/authority" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl surface border border-border font-semibold hover:bg-surface-2 transition-colors">
                <Activity className="size-4" /> Authority Dashboard
              </Link>
              <Link to="/channels" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl surface border border-border font-semibold hover:bg-surface-2 transition-colors">
                <MessageSquare className="size-4" /> Try SMS / IVR
              </Link>
            </div>
          </motion.div>

          {/* live ticker mock */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 surface border border-border rounded-2xl p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-eco">
                <span className="relative inline-block size-2 rounded-full bg-eco pulse-dot" />
                Live · Sangamner Pilot
              </div>
              <div className="text-xs font-mono text-muted-foreground">{new Date().toLocaleTimeString()}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Kpi label="Buses Live"        value={CITY_KPIS.busesLive} suffix={`/ ${CITY_KPIS.totalBuses}`} />
              <Kpi label="Riders Today"      value={CITY_KPIS.passengersToday.toLocaleString()} />
              <Kpi label="On-Time"           value={`${CITY_KPIS.onTimePct}%`} accent />
              <Kpi label="CO₂ Saved (kg)"    value={CITY_KPIS.co2SavedKg.toLocaleString()} eco />
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-accent">The Problem</div>
            <h2 className="mt-3 text-4xl font-bold">Small cities are waiting blind.</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              78% of tier-2 commuters wait 25+ minutes without knowing if a bus is coming.
              Existing apps target metros — they ignore patchy networks, feature phones, and
              non-English speakers. The result: empty buses, frustrated riders, and more
              private vehicles on the road.
            </p>
          </div>
          <div className="surface rounded-2xl border border-border p-8 grid grid-cols-2 gap-6">
            {[
              { v: "28 min", l: "Average wait (before)", c: "text-destructive" },
              { v: "21 min", l: "Average wait with Sarthi", c: "text-eco" },
              { v: "40%",    l: "Tier-2 users on feature phones", c: "text-accent" },
              { v: "1 in 3", l: "Routes have no live data", c: "text-warn" },
            ].map((s, i) => (
              <div key={i} className="surface-2 rounded-xl p-5 border border-border">
                <div className={`font-display text-3xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-widest text-primary">What we built</div>
          <h2 className="mt-3 text-4xl font-bold">An entire transit stack, not just an app.</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
              className="surface border border-border rounded-2xl p-6 hover:border-primary/60 hover:bg-surface-2 transition-all group"
            >
              <div className="size-11 rounded-xl bg-primary/10 grid place-items-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-display font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* IMPACT */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="surface-2 rounded-3xl border border-border p-10 md:p-14 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-72 rounded-full bg-eco/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="text-xs font-mono uppercase tracking-widest text-eco">Pilot Impact · Sangamner</div>
            <h2 className="mt-3 text-4xl font-bold max-w-2xl">Numbers from the field, not the deck.</h2>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((s) => (
                <div key={s.label}>
                  <s.icon className={`size-6 ${s.color}`} />
                  <div className="mt-3 font-display text-4xl font-bold">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TECH */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-xs font-mono uppercase tracking-widest text-accent">Tech Stack</div>
        <h2 className="mt-3 text-4xl font-bold">Built to run on a ₹2k tracker and a 2G signal.</h2>
        <div className="mt-10 grid md:grid-cols-4 gap-4">
          {[
            { t: "Frontend", l: ["React 19", "TanStack Start", "Leaflet", "Framer Motion"] },
            { t: "Backend",  l: ["FastAPI", "WebSockets", "Redis Streams"] },
            { t: "Data",     l: ["PostgreSQL + PostGIS", "Neo4j (route graph)", "TimescaleDB"] },
            { t: "AI / Edge",l: ["XGBoost ETA model", "TFLite occupancy CV", "Twilio + Exotel SMS/IVR"] },
          ].map((g) => (
            <div key={g.t} className="surface border border-border rounded-2xl p-6">
              <div className="text-xs font-mono uppercase tracking-widest text-primary">{g.t}</div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {g.l.map((x) => <li key={x} className="flex items-center gap-2"><Zap className="size-3.5 text-eco" />{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-3xl p-12 md:p-16 text-center" style={{ background: "var(--gradient-primary)" }}>
          <Trophy className="size-12 text-primary-foreground mx-auto" />
          <h2 className="mt-4 text-4xl md:text-5xl font-bold text-primary-foreground">Explore the live demo</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Six simulated buses across three live Sangamner routes. Open the map, drive a bus, manage a fleet — it's all real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/live" className="px-6 py-3.5 rounded-xl bg-background text-foreground font-semibold inline-flex items-center gap-2">
              <MapPin className="size-4" /> Passenger Map
            </Link>
            <Link to="/driver" className="px-6 py-3.5 rounded-xl bg-background/20 text-primary-foreground font-semibold border border-primary-foreground/30 inline-flex items-center gap-2">
              <Smartphone className="size-4" /> Driver App
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Bus className="size-4 text-primary" />
            <span>Sarthi · Team Amrut Coders · SIH 2025 · PS-25013</span>
          </div>
          <div className="font-mono text-xs">"Designed for tier-2: low-cost, offline & inclusive."</div>
        </div>
      </footer>
    </div>
  );
}

function Kpi({ label, value, suffix, accent, eco }: { label: string; value: React.ReactNode; suffix?: string; accent?: boolean; eco?: boolean }) {
  return (
    <div>
      <div className={`font-display text-3xl font-bold ${eco ? "text-eco" : accent ? "text-primary" : ""}`}>
        {value}<span className="text-base text-muted-foreground ml-1">{suffix}</span>
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
