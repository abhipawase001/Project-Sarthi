import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Bus, Globe2, Languages, ShieldAlert, Radio, Leaf, Cpu, Smartphone, MessageSquare, Trophy } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Sarthi — Built for Bharat" },
      { name: "description", content: "Why Sarthi: a multilingual, low-bandwidth, AI-powered public transit platform built for tier-2 and tier-3 Indian cities." },
      { property: "og:title", content: "About Sarthi — Built for Bharat" },
      { property: "og:description", content: "Multilingual AI Sarthi, real-time GPS, women-safety SOS, eco-rewards and SMS/IVR/WhatsApp inclusion — engineered for the Indian subcontinent." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full surface-2 border border-border text-xs font-mono text-eco">
            <Trophy className="size-3.5" /> INDIA RUNS · Built for Bharat
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">
            Public transit, <span className="text-primary">re-engineered</span> for small-city India.
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Sarthi is a multilingual, AI-powered, low-bandwidth transit platform for the 4,000+ Indian cities that don't have an app-based bus system. One product, four user surfaces, three languages, zero left behind.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <Stat label="Languages" value="3" sub="EN · हिंदी · मराठी" icon={Languages} />
          <Stat label="Tap-to-help SOS" value="<2s" sub="Realtime to Authority" icon={ShieldAlert} />
          <Stat label="Works on 2G" value="✓" sub="SMS · IVR · WhatsApp fallback" icon={Smartphone} />
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold mb-4">What's inside</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Feature icon={Radio}        title="Realtime GPS pipeline" body="Driver app pushes pings → Supabase Realtime → passengers and Authority see updates in <1s. No polling, no fake data." />
            <Feature icon={MessageSquare} title="Sarthi AI (Hindi · Marathi · English)" body="Gemini-powered voice + chat assistant grounded in live bus data. Speak in your language, get an answer in your language." />
            <Feature icon={ShieldAlert}  title="Women-first safety" body="One-tap SOS with geolocation alerts the Authority dashboard instantly. Share-trip links let a family member follow your ride." />
            <Feature icon={Leaf}         title="Verifiable eco-rewards" body="Every confirmed ride mints points to a public ledger. Redeem with local Sangamner businesses — not vapor." />
            <Feature icon={Globe2}       title="Multi-channel inclusion" body="Featurephone-grade access via SMS shortcodes, IVR, and a WhatsApp bot. Every Indian, not just every smartphone." />
            <Feature icon={Cpu}          title="Smart Authority command center" body="Live ridership forecast, bunching detection, demand heatmaps, and one-click reserve-bus dispatch." />
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Judging criteria → how we win</h2>
          <div className="surface border border-border rounded-2xl divide-y divide-border text-sm">
            <Row k="Innovation" v="Multilingual voice Sarthi, GTFS-realtime export, bus bunching detection" />
            <Row k="Impact / Bharat fit" v="SMS · IVR · WhatsApp inclusion, women-safety SOS, Sangamner-specific" />
            <Row k="Technical depth" v="Realtime pings, AI gateway, RLS, anomaly detection, PWA-ready" />
            <Row k="Completeness" v="Real database + realtime + AI — not a clickable mock" />
            <Row k="Presentation" v="Bilingual landing, scripted demo mode, public /about narrative" />
          </div>
        </section>

        <section className="text-center py-6">
          <Link to="/live" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold">
            <Bus className="size-4" /> Try the live demo
          </Link>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon }: any) {
  return (
    <div className="surface border border-border rounded-2xl p-5">
      <Icon className="size-5 text-primary mb-2" />
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
      <div className="text-xs text-eco mt-1">{sub}</div>
    </div>
  );
}
function Feature({ icon: Icon, title, body }: any) {
  return (
    <div className="surface border border-border rounded-2xl p-5">
      <div className="size-9 rounded-lg bg-primary/15 text-primary grid place-items-center mb-3"><Icon className="size-4" /></div>
      <div className="font-display font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-1 p-4">
      <div className="md:w-48 font-semibold text-primary">{k}</div>
      <div className="flex-1 text-muted-foreground">{v}</div>
    </div>
  );
}
