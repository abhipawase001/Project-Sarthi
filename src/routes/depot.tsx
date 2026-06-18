import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/Nav";
import { supabase } from "@/integrations/supabase/client";
import { generateRoster, depotCommand } from "@/lib/depot-ai.functions";
import {
  Sparkles, Loader2, Send, Bus as BusIcon, Users, ClipboardList,
  Fuel, Wrench, Download, RefreshCw, AlertCircle, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/depot")({
  head: () => ({
    meta: [
      { title: "Depot Admin — Sarthi" },
      { name: "description", content: "Paperless depot operations: AI-generated rosters, fleet register, crew, fuel logs and maintenance records." },
    ],
  }),
  component: DepotPage,
});

type Tab = "roster" | "fleet" | "crew" | "trips" | "fuel";

interface Bus { reg_no: string; route: string | null; status: string; fuel_type: string; odometer_km: number; health_score: number; next_service_km: number | null; last_service_at: string | null; capacity: number; }
interface Driver { id: string; name: string; role: string; license_no: string | null; license_expiry: string | null; rating: number; status: string; phone: string | null; }
interface Roster { id: string; duty_date: string; bus_reg: string | null; driver_id: string | null; conductor_id: string | null; route: string | null; shift_start: string; shift_end: string; status: string; }

function DepotPage() {
  const [tab, setTab] = useState<Tab>("roster");
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string>("");
  const [cmd, setCmd] = useState("");
  const [cmdLog, setCmdLog] = useState<{ q: string; a: string; ok: boolean }[]>([]);

  const genRoster = useServerFn(generateRoster);
  const runCmd = useServerFn(depotCommand);

  async function refresh() {
    const [b, d, r] = await Promise.all([
      supabase.from("buses").select("*").order("reg_no"),
      supabase.from("drivers").select("*").order("name"),
      supabase.from("roster").select("*").eq("duty_date", new Date().toISOString().slice(0, 10)).order("shift_start"),
    ]);
    if (b.data) setBuses(b.data as any);
    if (d.data) setDrivers(d.data as any);
    if (r.data) setRoster(r.data as any);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const driverById = (id: string | null) => drivers.find((d) => d.id === id)?.name ?? "—";

  async function aiRoster() {
    setAiBusy(true);
    setAiNote("");
    try {
      const res = await genRoster({
        data: {
          date: new Date().toISOString().slice(0, 10),
          buses: buses.map((b) => ({ reg_no: b.reg_no, route: b.route, status: b.status })),
          drivers: drivers.map((d) => ({ id: d.id, name: d.name, role: d.role, status: d.status, rating: Number(d.rating) })),
          notes: "Morning peak 6-10, evening peak 17-20",
        },
      });
      const rows = (res as any).roster ?? [];
      if (rows.length) {
        const today = new Date().toISOString().slice(0, 10);
        await supabase.from("roster").delete().eq("duty_date", today);
        await supabase.from("roster").insert(rows.map((r: any) => ({ ...r, duty_date: today, status: "scheduled" })));
        setAiNote((res as any).reasoning ?? "Roster regenerated.");
        refresh();
      } else {
        setAiNote("AI did not return any assignments.");
      }
    } catch (e: any) {
      setAiNote(`⚠️ ${e.message}`);
    } finally {
      setAiBusy(false);
    }
  }

  async function sendCmd() {
    const text = cmd.trim();
    if (!text) return;
    setCmd("");
    try {
      const res = (await runCmd({ data: { text } })) as { action: string; args: any; speak: string };
      let ok = true;
      // Execute a few common actions
      if (res.action === "set_bus_status" && res.args?.bus_reg) {
        await supabase.from("buses").update({ status: res.args.status }).eq("reg_no", res.args.bus_reg);
        refresh();
      } else if (res.action === "log_fuel" && res.args?.bus_reg) {
        await supabase.from("fuel_logs").insert({ bus_reg: res.args.bus_reg, liters: res.args.liters ?? 0, cost: res.args.cost });
      } else if (res.action === "schedule_service" && res.args?.bus_reg) {
        await supabase.from("service_logs").insert({ bus_reg: res.args.bus_reg, kind: res.args.kind ?? "general", notes: "Scheduled via AI command" });
      } else if (res.action === "assign_driver" && res.args?.bus_reg && res.args?.driver_name) {
        const drv = drivers.find((d) => d.name.toLowerCase().includes(String(res.args.driver_name).toLowerCase()));
        if (drv) {
          const today = new Date().toISOString().slice(0, 10);
          await supabase.from("roster").insert({
            duty_date: today, bus_reg: res.args.bus_reg, driver_id: drv.id,
            route: buses.find((b) => b.reg_no === res.args.bus_reg)?.route ?? null,
            shift_start: res.args.shift_start ?? "06:00", shift_end: res.args.shift_end ?? "14:00",
            status: "scheduled",
          });
          refresh();
        } else ok = false;
      }
      setCmdLog((l) => [{ q: text, a: res.speak ?? `Action: ${res.action}`, ok }, ...l].slice(0, 8));
    } catch (e: any) {
      setCmdLog((l) => [{ q: text, a: `⚠️ ${e.message}`, ok: false }, ...l].slice(0, 8));
    }
  }

  function exportTrips() {
    const csv = ["bus,route,shift_start,shift_end,driver,conductor,status"]
      .concat(roster.map((r) => `${r.bus_reg},${r.route ?? ""},${r.shift_start},${r.shift_end},"${driverById(r.driver_id)}","${driverById(r.conductor_id)}",${r.status}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roster-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Depot Admin · Paperless Ops</h1>
            <p className="text-sm text-muted-foreground">Drivers, buses, shifts, fuel & service — all in one AI-assisted console.</p>
          </div>
          <div className="text-[11px] font-mono text-eco flex items-center gap-2">
            <CheckCircle2 className="size-3.5" /> ZERO PAPERWORK
          </div>
        </div>

        {/* AI Command Bar */}
        <div className="surface border border-primary/30 rounded-2xl p-4 bg-gradient-to-r from-primary/5 to-eco/5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary mb-2">
            <Sparkles className="size-3.5" /> AI Command — speak in plain English
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendCmd(); }} className="flex gap-2">
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder='e.g. "Mark MH17-CD-4521 in maintenance" or "Log 40 liters fuel for MH17-AB-1023"'
              className="flex-1 px-3 py-2.5 rounded-lg surface-2 border border-border outline-none text-sm focus:border-primary"
            />
            <button className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2">
              <Send className="size-4" /> Run
            </button>
          </form>
          {cmdLog.length > 0 && (
            <div className="mt-3 space-y-1.5 text-xs">
              {cmdLog.map((l, i) => (
                <div key={i} className="surface-2 border border-border rounded-lg p-2 flex items-start gap-2">
                  {l.ok ? <CheckCircle2 className="size-3.5 text-eco mt-0.5" /> : <AlertCircle className="size-3.5 text-warn mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-mono text-muted-foreground">› {l.q}</div>
                    <div>{l.a}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border">
          {([
            ["roster", ClipboardList, "Today's Roster"],
            ["fleet", BusIcon, "Fleet"],
            ["crew", Users, "Crew"],
            ["trips", ClipboardList, "Trip Log"],
            ["fuel", Fuel, "Fuel & Service"],
          ] as const).map(([k, Icon, label]) => (
            <button
              key={k}
              onClick={() => setTab(k as Tab)}
              className={`px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 -mb-px transition ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading depot data…</div>}

        {tab === "roster" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">{roster.length} duties scheduled for {new Date().toLocaleDateString()}</div>
              <div className="flex gap-2">
                <button onClick={exportTrips} className="px-3 py-2 text-xs rounded-lg surface-2 border border-border inline-flex items-center gap-1.5">
                  <Download className="size-3.5" /> Export CSV
                </button>
                <button onClick={aiRoster} disabled={aiBusy} className="px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-50">
                  {aiBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  AI Auto-Generate
                </button>
                <button onClick={refresh} className="px-3 py-2 text-xs rounded-lg surface-2 border border-border"><RefreshCw className="size-3.5" /></button>
              </div>
            </div>
            {aiNote && <div className="text-xs surface-2 border border-primary/30 rounded-lg p-3 text-muted-foreground"><Sparkles className="size-3 inline text-primary mr-1" /> {aiNote}</div>}
            <Table headers={["Bus", "Route", "Driver", "Conductor", "Shift", "Status"]}>
              {roster.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-surface-2/40">
                  <td className="p-3 font-mono text-xs">{r.bus_reg ?? "—"}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-xs font-mono">{r.route ?? "—"}</span></td>
                  <td className="p-3 text-sm">{driverById(r.driver_id)}</td>
                  <td className="p-3 text-sm text-muted-foreground">{driverById(r.conductor_id)}</td>
                  <td className="p-3 font-mono text-xs">{r.shift_start.slice(0, 5)}–{r.shift_end.slice(0, 5)}</td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-eco/15 text-eco">{r.status}</span></td>
                </tr>
              ))}
              {!roster.length && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No duties yet. Click <b>AI Auto-Generate</b> above.</td></tr>}
            </Table>
          </div>
        )}

        {tab === "fleet" && (
          <Table headers={["Reg No", "Route", "Fuel", "Odometer", "Health", "Status", "Next Service"]}>
            {buses.map((b) => {
              const due = b.next_service_km != null && b.odometer_km > b.next_service_km - 2000;
              return (
                <tr key={b.reg_no} className="border-b border-border">
                  <td className="p-3 font-mono text-xs">{b.reg_no}</td>
                  <td className="p-3">{b.route ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-xs uppercase">{b.fuel_type}</td>
                  <td className="p-3 font-mono text-xs">{b.odometer_km.toLocaleString()} km</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-surface-2 overflow-hidden">
                        <div className={`h-full ${b.health_score >= 90 ? "bg-eco" : b.health_score >= 75 ? "bg-primary" : "bg-warn"}`} style={{ width: `${b.health_score}%` }} />
                      </div>
                      <span className="text-xs font-mono">{b.health_score}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      value={b.status}
                      onChange={async (e) => { await supabase.from("buses").update({ status: e.target.value }).eq("reg_no", b.reg_no); refresh(); }}
                      className="text-xs surface-2 border border-border rounded px-2 py-1"
                    >
                      <option value="active">active</option>
                      <option value="maintenance">maintenance</option>
                      <option value="reserve">reserve</option>
                    </select>
                  </td>
                  <td className="p-3 text-xs">{due ? <span className="text-warn">⚠ due soon</span> : <span className="text-muted-foreground">{b.next_service_km?.toLocaleString()} km</span>}</td>
                </tr>
              );
            })}
          </Table>
        )}

        {tab === "crew" && (
          <Table headers={["Name", "Role", "License", "Expiry", "Phone", "Rating", "Status"]}>
            {drivers.map((d) => {
              const expSoon = d.license_expiry && new Date(d.license_expiry) < new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
              return (
                <tr key={d.id} className="border-b border-border">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 text-xs uppercase">{d.role}</td>
                  <td className="p-3 font-mono text-xs">{d.license_no ?? "—"}</td>
                  <td className={`p-3 text-xs ${expSoon ? "text-warn" : "text-muted-foreground"}`}>{d.license_expiry ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{d.phone ?? "—"}</td>
                  <td className="p-3 text-eco font-mono">{Number(d.rating).toFixed(1)} ★</td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{d.status}</span></td>
                </tr>
              );
            })}
          </Table>
        )}

        {tab === "trips" && (
          <div className="surface border border-border rounded-2xl p-6 text-sm text-muted-foreground">
            Trip logs are auto-recorded from live bus pings (GPS distance + driver shift). Today's {roster.length} active duties will populate here as shifts end. Use <b>Export CSV</b> on the Roster tab for the daily report.
          </div>
        )}

        {tab === "fuel" && (
          <FuelTab buses={buses} onChange={refresh} />
        )}
      </div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="surface border border-border rounded-2xl overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground bg-surface-2/40">
            {headers.map((h) => <th key={h} className="p-3 font-mono">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function FuelTab({ buses, onChange }: { buses: Bus[]; onChange: () => void }) {
  const [reg, setReg] = useState(buses[0]?.reg_no ?? "");
  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!reg || !liters) return;
    setBusy(true);
    await supabase.from("fuel_logs").insert({ bus_reg: reg, liters: Number(liters), cost: cost ? Number(cost) : null });
    setLiters(""); setCost("");
    setBusy(false);
    onChange();
  }
  async function service(kind: string) {
    if (!reg) return;
    await supabase.from("service_logs").insert({ bus_reg: reg, kind });
    await supabase.from("buses").update({ last_service_at: new Date().toISOString() }).eq("reg_no", reg);
    onChange();
  }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="surface border border-border rounded-2xl p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Fuel className="size-4 text-primary" /> Log Refuel</h3>
        <select value={reg} onChange={(e) => setReg(e.target.value)} className="w-full surface-2 border border-border rounded-lg px-3 py-2 mb-2 text-sm">
          {buses.map((b) => <option key={b.reg_no} value={b.reg_no}>{b.reg_no} ({b.fuel_type})</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="Liters" className="surface-2 border border-border rounded-lg px-3 py-2 text-sm" />
          <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost (₹)" className="surface-2 border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={save} disabled={busy} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Save fuel entry</button>
      </div>
      <div className="surface border border-border rounded-2xl p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Wrench className="size-4 text-accent" /> Quick Service Log</h3>
        <select value={reg} onChange={(e) => setReg(e.target.value)} className="w-full surface-2 border border-border rounded-lg px-3 py-2 mb-3 text-sm">
          {buses.map((b) => <option key={b.reg_no} value={b.reg_no}>{b.reg_no}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          {["Oil change", "Tyre check", "Brake service", "General inspection"].map((k) => (
            <button key={k} onClick={() => service(k)} className="py-2 rounded-lg surface-2 border border-border text-xs hover:border-accent">{k}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
