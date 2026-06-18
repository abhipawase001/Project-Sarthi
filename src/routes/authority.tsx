import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { ClientMap } from "@/components/ClientMap";
import { LiveIncidents } from "@/components/LiveIncidents";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { CITY_KPIS, HOURLY_RIDERSHIP, OCCUPANCY_DIST, ROUTE_PERF } from "@/lib/mockData";
import { Users, Activity, Leaf, AlertTriangle, Clock, TrendingUp, Bus as BusIcon } from "lucide-react";

export const Route = createFileRoute("/authority")({
  head: () => ({ meta: [{ title: "Authority Dashboard — Sarthi" }, { name: "description", content: "Fleet command center with live KPIs, ridership analytics and emissions impact." }] }),
  component: AuthorityPage,
});

const tooltipStyle = {
  contentStyle: { background: "oklch(0.21 0.045 252)", border: "1px solid oklch(0.32 0.04 255 / 0.6)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "oklch(0.97 0.01 240)" },
  itemStyle: { color: "oklch(0.97 0.01 240)" },
};

function AuthorityPage() {
  const buses = useLiveBuses(2000);
  const alerts = [
    { time: "14:02", level: "warn",  msg: "MH17-CD-4521 occupancy HIGH on Malpani route" },
    { time: "13:54", level: "info",  msg: "Route R2 average delay +3min — traffic on Akole road" },
    { time: "13:31", level: "ok",    msg: "Driver Vijay M. completed shift, 8 trips" },
    { time: "13:10", level: "warn",  msg: "Schedule optimizer recommends +1 bus on R1 17:00–19:00" },
  ];
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Authority Command Center</h1>
          <p className="text-sm text-muted-foreground">Sangamner Municipal Transport · live operations</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi icon={BusIcon}  label="Buses Live"     value={`${CITY_KPIS.busesLive}/${CITY_KPIS.totalBuses}`} />
          <Kpi icon={Users}    label="Riders Today"   value={CITY_KPIS.passengersToday.toLocaleString()} />
          <Kpi icon={Activity} label="On-Time"        value={`${CITY_KPIS.onTimePct}%`} accent />
          <Kpi icon={Clock}    label="Avg Wait"       value={`${CITY_KPIS.avgWaitAfter}m`} sub={`↓ ${CITY_KPIS.avgWaitBefore - CITY_KPIS.avgWaitAfter}m`} />
          <Kpi icon={Leaf}     label="CO₂ Saved"      value={`${CITY_KPIS.co2SavedKg} kg`} eco />
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* Live ops map */}
          <div className="surface border border-border rounded-2xl overflow-hidden h-[480px]">
            <ClientMap buses={buses} />
          </div>

          {/* Alerts feed */}
          <div className="surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">Live Alerts</h3>
              <span className="text-[10px] font-mono text-eco">REAL-TIME</span>
            </div>
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i} className="surface-2 border border-border rounded-xl p-3 flex items-start gap-3">
                  <div className={`mt-0.5 size-7 rounded-lg grid place-items-center text-xs ${a.level === "warn" ? "bg-accent/15 text-accent" : a.level === "info" ? "bg-primary/15 text-primary" : "bg-eco/15 text-eco"}`}>
                    {a.level === "warn" ? <AlertTriangle className="size-3.5" /> : a.level === "info" ? <Activity className="size-3.5" /> : "✓"}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{a.msg}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{a.time}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs">
              <div className="flex items-center gap-2 text-primary font-semibold"><TrendingUp className="size-3.5" /> AI Recommendation</div>
              <p className="mt-1 text-muted-foreground">Deploy reserve bus MH17-OP-6712 on R1 at 17:00 — predicted demand spike of 38% based on weather + college schedule.</p>
              <button className="mt-2 text-primary font-semibold">Approve dispatch →</button>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="surface border border-border rounded-2xl p-5 lg:col-span-2">
            <h3 className="font-display font-semibold mb-1">Hourly Ridership · Actual vs AI Forecast</h3>
            <p className="text-xs text-muted-foreground mb-4">XGBoost demand model, MAPE 4.2%</p>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={HOURLY_RIDERSHIP}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a3e635" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.32 0.04 255 / 0.3)" vertical={false} />
                  <XAxis dataKey="hour" stroke="oklch(0.72 0.03 250)" fontSize={11} />
                  <YAxis stroke="oklch(0.72 0.03 250)" fontSize={11} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="predicted" stroke="#a3e635" strokeDasharray="4 4" fill="url(#g2)" name="Predicted" />
                  <Area type="monotone" dataKey="riders" stroke="#22d3ee" strokeWidth={2} fill="url(#g1)" name="Actual" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface border border-border rounded-2xl p-5">
            <h3 className="font-display font-semibold mb-4">Occupancy Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={OCCUPANCY_DIST} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {OCCUPANCY_DIST.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="surface border border-border rounded-2xl p-5 lg:col-span-2">
            <h3 className="font-display font-semibold mb-4">Route Performance</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={ROUTE_PERF}>
                  <CartesianGrid stroke="oklch(0.32 0.04 255 / 0.3)" vertical={false} />
                  <XAxis dataKey="route" stroke="oklch(0.72 0.03 250)" fontSize={12} />
                  <YAxis stroke="oklch(0.72 0.03 250)" fontSize={11} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="onTime" stackId="a" fill="#a3e635" name="On-time %" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="delay"  stackId="a" fill="#fbbf24" name="Delayed %" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="surface border border-border rounded-2xl p-5">
            <h3 className="font-display font-semibold">Emissions Impact</h3>
            <div className="mt-3 font-display text-5xl font-bold text-eco">{CITY_KPIS.co2SavedKg} kg</div>
            <div className="text-xs text-muted-foreground">CO₂ avoided this week</div>
            <div className="mt-5 space-y-2 text-sm">
              <Row k="Equivalent trees" v="56 saplings/yr" />
              <Row k="Petrol displaced" v="528 L" />
              <Row k="Eco-points minted" v={CITY_KPIS.ecoPoints.toLocaleString()} />
              <Row k="Private trips avoided" v="892" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent, eco }: { icon: any; label: string; value: string; sub?: string; accent?: boolean; eco?: boolean }) {
  return (
    <div className="surface border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className={`size-4 ${eco ? "text-eco" : accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${eco ? "text-eco" : accent ? "text-primary" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-eco mt-0.5">{sub}</div>}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-border py-1.5"><span className="text-muted-foreground">{k}</span><span className="font-mono">{v}</span></div>;
}
