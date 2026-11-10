import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateRoster, depotCommand } from "@/lib/depot-ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Loader2, Send, Bus as BusIcon, Users, ClipboardList,
  Fuel, Wrench, Download, RefreshCw, AlertCircle, CheckCircle2, Pencil, Save,
} from "lucide-react";


type Tab = "roster" | "fleet" | "crew" | "trips" | "fuel";

interface Bus { reg_no: string; route: string | null; status: string; fuel_type: string; odometer_km: number; health_score: number; next_service_km: number | null; last_service_at: string | null; capacity: number; }
interface Driver { id: string; name: string; role: string; license_no: string | null; license_expiry: string | null; rating: number; status: string; phone: string | null; email: string | null; }
interface Roster { id: string; duty_date: string; bus_reg: string | null; driver_id: string | null; conductor_id: string | null; route: string | null; shift_start: string; shift_end: string; status: string; }
interface Trip { id: string; bus_reg: string | null; route: string | null; started_at: string; ended_at: string | null; distance_km: number | null; driver_id: string | null; }
interface FuelLog { id: string; bus_reg: string; liters: number; cost: number | null; odometer_km: number | null; refueled_at: string; }
interface ServiceLog { id: string; bus_reg: string; kind: string; notes: string | null; serviced_at: string; next_due_km: number | null; }

function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function DepotConsole() {
  const [tab, setTab] = useState<Tab>("roster");
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [crewForm, setCrewForm] = useState({ name: "", email: "", phone: "", role: "driver", license_no: "", license_expiry: "" });
  const [editingCrewId, setEditingCrewId] = useState<string | null>(null);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [busEdit, setBusEdit] = useState({ route: "", fuel_type: "diesel", capacity: "42" });
  const [busForm, setBusForm] = useState({ reg_no: "", route: "R1", capacity: "42", fuel_type: "diesel" });
  const [rosterForm, setRosterForm] = useState({ bus_reg: "", driver_id: "", route: "R1", shift_start: "06:00", shift_end: "14:00" });
  const [saving, setSaving] = useState(false);
  const [accessChecking, setAccessChecking] = useState(true);
  const [staffAllowed, setStaffAllowed] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffAuthError, setStaffAuthError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string>("");
  const [cmd, setCmd] = useState("");
  const [cmdLog, setCmdLog] = useState<{ q: string; a: string; ok: boolean }[]>([]);

  const genRoster = useServerFn(generateRoster);
  const runCmd = useServerFn(depotCommand);

  async function refresh() {
    setLoadError("");
    const today = todayInIndia();
    const [b, d, r, t, f, s] = await Promise.all([
      supabase.from("buses").select("*").order("reg_no"),
      supabase.from("drivers").select("*").order("name"),
      supabase.from("roster").select("*").eq("duty_date", today).order("shift_start"),
      supabase.from("trip_logs").select("id,bus_reg,route,started_at,ended_at,distance_km,driver_id").order("started_at", { ascending: false }).limit(100),
      supabase.from("fuel_logs").select("id,bus_reg,liters,cost,odometer_km,refueled_at").order("refueled_at", { ascending: false }).limit(100),
      supabase.from("service_logs").select("id,bus_reg,kind,notes,serviced_at,next_due_km").order("serviced_at", { ascending: false }).limit(100),
    ]);
    const failed = [b.error, d.error, r.error, t.error, f.error, s.error].filter(Boolean);
    if (failed.length) setLoadError(failed[0]?.message ?? "Some operations data could not be loaded.");
    if (b.data) setBuses(b.data as Bus[]);
    if (d.data) setDrivers(d.data as Driver[]);
    if (r.data) setRoster(r.data as Roster[]);
    if (t.data) setTrips(t.data as Trip[]);
    if (f.data) setFuelLogs(f.data as FuelLog[]);
    if (s.data) setServiceLogs(s.data as ServiceLog[]);
    setLoading(false);
  }
  useEffect(() => {
    let active = true;
    const checkAccess = async (userId: string | null) => {
      if (!userId) {
        if (active) { setStaffAllowed(false); setAccessChecking(false); setLoading(false); }
        return;
      }
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (!active) return;
      const allowed = !error && (data ?? []).some((item) => item.role === "admin" || item.role === "dispatcher");
      setStaffAllowed(allowed);
      setStaffAuthError(error?.message ?? (allowed ? "" : "This account does not have depot access."));
      setAccessChecking(false);
      if (allowed) await refresh();
      else setLoading(false);
    };
    void supabase.auth.getUser().then(({ data }) => checkAccess(data.user?.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setAccessChecking(true);
        void checkAccess(session?.user.id ?? null);
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signInStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStaffAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: staffEmail.trim(), password: staffPassword });
    if (error) setStaffAuthError(error.message);
  }

  const driverById = (id: string | null) => drivers.find((d) => d.id === id)?.name ?? "—";

  async function aiRoster() {
    setAiBusy(true);
    setAiNote("");
    try {
      const res = await genRoster({
        data: {
          date: todayInIndia(),
          buses: buses.map((b) => ({ reg_no: b.reg_no, route: b.route, status: b.status })),
          drivers: drivers.map((d) => ({ id: d.id, name: d.name, role: d.role, status: d.status, rating: Number(d.rating) })),
          notes: "Morning peak 6-10, evening peak 17-20",
        },
      });
      const rows = (res as any).roster ?? [];
      if (rows.length) {
        const today = todayInIndia();
        const existing = new Set(roster.map((r) => `${r.bus_reg}:${r.driver_id}:${r.shift_start}`));
        const additions = rows.filter((r: any) => !existing.has(`${r.bus_reg}:${r.driver_id}:${r.shift_start}`));
        if (!additions.length) {
          setAiNote("No new assignments to add; existing roster entries were preserved.");
          return;
        }
        const { error } = await supabase.from("roster").insert(additions.map((r: any) => ({ ...r, duty_date: today, status: "scheduled" })));
        if (error) throw error;
        setAiNote((res as any).reasoning ?? "Roster regenerated.");
        await refresh();
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
        const { error } = await supabase.from("buses").update({ status: res.args.status }).eq("reg_no", res.args.bus_reg);
        if (error) throw error;
        await refresh();
      } else if (res.action === "log_fuel" && res.args?.bus_reg) {
        const { error } = await supabase.from("fuel_logs").insert({ bus_reg: res.args.bus_reg, liters: res.args.liters ?? 0, cost: res.args.cost });
        if (error) throw error;
        await refresh();
      } else if (res.action === "schedule_service" && res.args?.bus_reg) {
        const { error } = await supabase.from("service_logs").insert({ bus_reg: res.args.bus_reg, kind: res.args.kind ?? "general", notes: "Scheduled via AI command" });
        if (error) throw error;
        await refresh();
      } else if (res.action === "assign_driver" && res.args?.bus_reg && res.args?.driver_name) {
        const drv = drivers.find((d) => d.name.toLowerCase().includes(String(res.args.driver_name).toLowerCase()));
        if (drv) {
          const today = todayInIndia();
          const { error } = await supabase.from("roster").insert({
            duty_date: today, bus_reg: res.args.bus_reg, driver_id: drv.id,
            route: buses.find((b) => b.reg_no === res.args.bus_reg)?.route ?? null,
            shift_start: res.args.shift_start ?? "06:00", shift_end: res.args.shift_end ?? "14:00",
            status: "scheduled",
          });
          if (error) throw error;
          await refresh();
        } else ok = false;
      } else {
        ok = false;
      }
      setCmdLog((l) => [{ q: text, a: res.speak ?? `Action: ${res.action}`, ok }, ...l].slice(0, 8));
    } catch (e: any) {
      setCmdLog((l) => [{ q: text, a: `⚠️ ${e.message}`, ok: false }, ...l].slice(0, 8));
    }
  }

  async function saveCrew(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setSaveError(""); setSaveMessage("");
    const crewPayload = {
      name: crewForm.name.trim(), email: crewForm.email.trim().toLowerCase() || null,
      phone: crewForm.phone.trim() || null, role: crewForm.role,
      license_no: crewForm.license_no.trim() || null, license_expiry: crewForm.license_expiry || null,
    };
    const { error } = editingCrewId
      ? await supabase.from("drivers").update(crewPayload).eq("id", editingCrewId)
      : await supabase.from("drivers").insert(crewPayload);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setEditingCrewId(null);
    setCrewForm({ name: "", email: "", phone: "", role: "driver", license_no: "", license_expiry: "" });
    setSaveMessage(editingCrewId ? "Crew record updated." : "Crew record saved.");
    await refresh();
  }

  function editCrew(driver: Driver) {
    setEditingCrewId(driver.id);
    setCrewForm({
      name: driver.name,
      email: driver.email ?? "",
      phone: driver.phone ?? "",
      role: driver.role,
      license_no: driver.license_no ?? "",
      license_expiry: driver.license_expiry ?? "",
    });
    setSaveError(""); setSaveMessage("");
  }

  async function updateBus(busReg: string) {
    setSaving(true); setSaveError(""); setSaveMessage("");
    const { error } = await supabase.from("buses").update({
      route: busEdit.route.trim() || null,
      fuel_type: busEdit.fuel_type,
      capacity: Number(busEdit.capacity),
    }).eq("reg_no", busReg);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setEditingBusId(null); setSaveMessage(`${busReg} fleet details updated.`);
    await refresh();
  }

  async function saveBus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setSaveError(""); setSaveMessage("");
    const { error } = await supabase.from("buses").insert({
      reg_no: busForm.reg_no.trim().toUpperCase(), route: busForm.route,
      capacity: Number(busForm.capacity), fuel_type: busForm.fuel_type, status: "active",
    });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setBusForm({ reg_no: "", route: "R1", capacity: "42", fuel_type: "diesel" });
    setSaveMessage("Bus added to the registered fleet.");
    await refresh();
  }

  async function saveAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setSaveError(""); setSaveMessage("");
    const { error } = await supabase.from("roster").insert({
      duty_date: todayInIndia(), bus_reg: rosterForm.bus_reg, driver_id: rosterForm.driver_id,
      route: rosterForm.route, shift_start: rosterForm.shift_start, shift_end: rosterForm.shift_end, status: "scheduled",
    });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaveMessage("Driver assignment saved for today.");
    await refresh();
  }

  async function changeBusStatus(busReg: string, status: string) {
    setSaveError(""); setSaveMessage("");
    const { error } = await supabase.from("buses").update({ status }).eq("reg_no", busReg);
    if (error) { setSaveError(error.message); return; }
    setSaveMessage(`${busReg} updated.`);
    await refresh();
  }

  function exportTrips() {
    const csv = ["bus,route,driver,started_at,ended_at,distance_km"]
      .concat(trips.map((trip) => `${trip.bus_reg ?? ""},${trip.route ?? ""},"${driverById(trip.driver_id)}",${trip.started_at},${trip.ended_at ?? ""},${trip.distance_km ?? 0}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sarthi-trips-${todayInIndia()}.csv`;
    a.click();
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-5">
        {accessChecking ? <div className="surface border border-border p-8 text-center text-sm text-muted-foreground">Checking depot access…</div> : !staffAllowed ? (
          <section className="mx-auto max-w-md surface border border-border p-6">
            <h1 className="font-display text-2xl font-bold">Depot staff sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Use an account already assigned the depot manager or dispatcher role.</p>
            <form onSubmit={signInStaff} className="mt-5 space-y-3">
              <div className="space-y-1"><Label htmlFor="staff-email">Email</Label><Input id="staff-email" type="email" autoComplete="email" value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} required /></div>
              <div className="space-y-1"><Label htmlFor="staff-password">Password</Label><Input id="staff-password" type="password" autoComplete="current-password" value={staffPassword} onChange={(event) => setStaffPassword(event.target.value)} required /></div>
              <Button className="w-full" type="submit"><Users />Sign in</Button>
            </form>
            {staffAuthError && <p className="mt-3 text-sm text-destructive" role="alert">{staffAuthError}</p>}
          </section>
        ) : <>
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
        {loadError && <div className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{loadError}</div>}
        {saveError && <div className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{saveError}</div>}
        {saveMessage && <div className="border border-eco/40 bg-eco/10 p-3 text-sm text-eco" role="status">{saveMessage}</div>}

        {tab === "roster" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">{roster.length} duties scheduled for {todayInIndia()}</div>
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
            <form onSubmit={saveAssignment} className="grid gap-3 border border-border p-4 md:grid-cols-6 md:items-end">
              <label className="space-y-1 text-xs text-muted-foreground">Bus<select required value={rosterForm.bus_reg} onChange={(event) => setRosterForm({ ...rosterForm, bus_reg: event.target.value, route: buses.find((bus) => bus.reg_no === event.target.value)?.route ?? rosterForm.route })} className="h-9 w-full border border-input bg-background px-2 text-foreground"><option value="">Select bus</option>{buses.filter((bus) => bus.status === "active").map((bus) => <option key={bus.reg_no} value={bus.reg_no}>{bus.reg_no}</option>)}</select></label>
              <label className="space-y-1 text-xs text-muted-foreground">Driver<select required value={rosterForm.driver_id} onChange={(event) => setRosterForm({ ...rosterForm, driver_id: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground"><option value="">Select driver</option>{drivers.filter((driver) => driver.role === "driver").map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>
              <label className="space-y-1 text-xs text-muted-foreground">Route<select value={rosterForm.route} onChange={(event) => setRosterForm({ ...rosterForm, route: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground">{[...new Set(buses.map((bus) => bus.route).filter((route): route is string => Boolean(route)))].map((route) => <option key={route} value={route}>{route}</option>)}</select></label>
              <label className="space-y-1 text-xs text-muted-foreground">Start<input type="time" required value={rosterForm.shift_start} onChange={(event) => setRosterForm({ ...rosterForm, shift_start: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
              <label className="space-y-1 text-xs text-muted-foreground">End<input type="time" required value={rosterForm.shift_end} onChange={(event) => setRosterForm({ ...rosterForm, shift_end: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
              <Button type="submit" disabled={saving || !buses.length || !drivers.length}><ClipboardList />Assign</Button>
            </form>
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
              {!roster.length && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No assignments for today. Add one above or use AI Auto-Generate.</td></tr>}
            </Table>
          </div>
        )}

        {tab === "fleet" && (
          <div className="space-y-4">
          <form onSubmit={saveBus} className="grid gap-3 border border-border p-4 md:grid-cols-5 md:items-end">
            <label className="space-y-1 text-xs text-muted-foreground">Registration<input required value={busForm.reg_no} onChange={(event) => setBusForm({ ...busForm, reg_no: event.target.value })} placeholder="MH17-AB-1234" className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
            <label className="space-y-1 text-xs text-muted-foreground">Route<select value={busForm.route} onChange={(event) => setBusForm({ ...busForm, route: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground">{[...new Set(buses.map((bus) => bus.route).filter((route): route is string => Boolean(route)))].map((route) => <option key={route} value={route}>{route}</option>)}</select></label>
            <label className="space-y-1 text-xs text-muted-foreground">Capacity<input type="number" min="1" max="100" required value={busForm.capacity} onChange={(event) => setBusForm({ ...busForm, capacity: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
            <label className="space-y-1 text-xs text-muted-foreground">Fuel type<select value={busForm.fuel_type} onChange={(event) => setBusForm({ ...busForm, fuel_type: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground"><option value="diesel">Diesel</option><option value="cng">CNG</option><option value="electric">Electric</option><option value="hybrid">Hybrid</option></select></label>
            <Button type="submit" disabled={saving}><BusIcon />Add to fleet</Button>
          </form>
          <Table headers={["Reg No", "Route", "Fuel", "Odometer", "Health", "Status", "Next Service", "Edit"]}>
            {buses.map((b) => {
              const due = b.next_service_km != null && b.odometer_km > b.next_service_km - 2000;
              return (
                <tr key={b.reg_no} className="border-b border-border">
                  <td className="p-3 font-mono text-xs">{b.reg_no}</td>
                  <td className="p-3">{editingBusId === b.reg_no ? <select value={busEdit.route} onChange={(event) => setBusEdit({ ...busEdit, route: event.target.value })} className="h-8 border border-input bg-background px-2 text-xs">{[...new Set(buses.map((bus) => bus.route).filter((route): route is string => Boolean(route)))].map((route) => <option key={route} value={route}>{route}</option>)}</select> : b.route ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-xs uppercase">{editingBusId === b.reg_no ? <select value={busEdit.fuel_type} onChange={(event) => setBusEdit({ ...busEdit, fuel_type: event.target.value })} className="h-8 border border-input bg-background px-2"><option value="diesel">Diesel</option><option value="cng">CNG</option><option value="electric">Electric</option><option value="hybrid">Hybrid</option></select> : b.fuel_type}</td>
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
                      onChange={async (e) => { await changeBusStatus(b.reg_no, e.target.value); }}
                      className="text-xs surface-2 border border-border rounded px-2 py-1"
                    >
                      <option value="active">active</option>
                      <option value="maintenance">maintenance</option>
                      <option value="reserve">reserve</option>
                    </select>
                  </td>
                  <td className="p-3 text-xs">{due ? <span className="text-warn">⚠ due soon</span> : <span className="text-muted-foreground">{b.next_service_km?.toLocaleString()} km</span>}</td>
                  <td className="p-3">{editingBusId === b.reg_no ? <div className="flex items-center gap-1"><input type="number" min="1" max="100" value={busEdit.capacity} onChange={(event) => setBusEdit({ ...busEdit, capacity: event.target.value })} aria-label={`Capacity for ${b.reg_no}`} className="h-8 w-16 border border-input bg-background px-2 text-xs" /><Button size="icon" aria-label={`Save ${b.reg_no}`} disabled={saving} onClick={() => void updateBus(b.reg_no)}><Save /></Button></div> : <Button size="icon" variant="ghost" aria-label={`Edit ${b.reg_no}`} onClick={() => { setEditingBusId(b.reg_no); setBusEdit({ route: b.route ?? "", fuel_type: b.fuel_type, capacity: String(b.capacity) }); }}><Pencil /></Button>}</td>
                </tr>
              );
            })}
          </Table>
          </div>
        )}

        {tab === "crew" && (
          <div className="space-y-4">
          <form onSubmit={saveCrew} className="grid gap-3 border border-border p-4 md:grid-cols-3">
            <label className="space-y-1 text-xs text-muted-foreground">Name<input required value={crewForm.name} onChange={(event) => setCrewForm({ ...crewForm, name: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
            <label className="space-y-1 text-xs text-muted-foreground">Email for driver sign-in<input type="email" value={crewForm.email} onChange={(event) => setCrewForm({ ...crewForm, email: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
            <label className="space-y-1 text-xs text-muted-foreground">Phone<input value={crewForm.phone} onChange={(event) => setCrewForm({ ...crewForm, phone: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
            <label className="space-y-1 text-xs text-muted-foreground">Crew role<select value={crewForm.role} onChange={(event) => setCrewForm({ ...crewForm, role: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground"><option value="driver">Driver</option><option value="conductor">Conductor</option></select></label>
            <label className="space-y-1 text-xs text-muted-foreground">License number<input value={crewForm.license_no} onChange={(event) => setCrewForm({ ...crewForm, license_no: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
            <label className="space-y-1 text-xs text-muted-foreground">License expiry<input type="date" value={crewForm.license_expiry} onChange={(event) => setCrewForm({ ...crewForm, license_expiry: event.target.value })} className="h-9 w-full border border-input bg-background px-2 text-foreground" /></label>
            <div className="flex gap-2 md:col-span-3"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : editingCrewId ? <Save /> : <Users />}{editingCrewId ? "Save crew changes" : "Add crew record"}</Button>{editingCrewId && <Button type="button" variant="outline" onClick={() => { setEditingCrewId(null); setCrewForm({ name: "", email: "", phone: "", role: "driver", license_no: "", license_expiry: "" }); }}>Cancel</Button>}</div>
          </form>
          <Table headers={["Name", "Role", "License", "Expiry", "Phone", "Rating", "Status", "Edit"]}>
            {drivers.map((d) => {
              const expSoon = d.license_expiry && new Date(d.license_expiry) < new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
              return (
                <tr key={d.id} className="border-b border-border">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 text-xs uppercase">{d.role}{d.email ? <div className="mt-1 text-[10px] normal-case text-muted-foreground">{d.email}</div> : null}</td>
                  <td className="p-3 font-mono text-xs">{d.license_no ?? "—"}</td>
                  <td className={`p-3 text-xs ${expSoon ? "text-warn" : "text-muted-foreground"}`}>{d.license_expiry ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{d.phone ?? "—"}</td>
                  <td className="p-3 text-eco font-mono">{Number(d.rating).toFixed(1)} ★</td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{d.status}</span></td>
                  <td className="p-3"><Button size="icon" variant="ghost" aria-label={`Edit ${d.name}`} onClick={() => editCrew(d)}><Pencil /></Button></td>
                </tr>
              );
            })}
          </Table>
          </div>
        )}

        {tab === "trips" && (
          <Table headers={["Bus", "Route", "Driver", "Started", "Ended", "GPS distance"]}>
            {trips.map((trip) => <tr key={trip.id} className="border-b border-border"><td className="p-3 font-mono text-xs">{trip.bus_reg ?? "—"}</td><td className="p-3">{trip.route ?? "—"}</td><td className="p-3">{driverById(trip.driver_id)}</td><td className="p-3 text-xs">{new Date(trip.started_at).toLocaleString()}</td><td className="p-3 text-xs">{trip.ended_at ? new Date(trip.ended_at).toLocaleString() : <span className="text-eco">In progress</span>}</td><td className="p-3 font-mono">{trip.ended_at ? `${Number(trip.distance_km ?? 0).toFixed(2)} km` : "—"}</td></tr>)}
            {!trips.length && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No trip records yet.</td></tr>}
          </Table>
        )}

        {tab === "fuel" && (
          <FuelTab buses={buses} fuelLogs={fuelLogs} serviceLogs={serviceLogs} onChange={refresh} onError={setSaveError} onSuccess={setSaveMessage} />
        )}
        </>}
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

function FuelTab({ buses, fuelLogs, serviceLogs, onChange, onError, onSuccess }: { buses: Bus[]; fuelLogs: FuelLog[]; serviceLogs: ServiceLog[]; onChange: () => Promise<void>; onError: (message: string) => void; onSuccess: (message: string) => void }) {
  const [reg, setReg] = useState("");
  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [serviceKind, setServiceKind] = useState("Oil change");
  const [serviceNotes, setServiceNotes] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    onError(""); onSuccess("");
    if (!reg || !liters || Number(liters) <= 0 || (cost && Number(cost) < 0) || (odometer && Number(odometer) < 0)) {
      onError("Choose a bus and enter valid fuel, cost, and odometer values.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("fuel_logs").insert({ bus_reg: reg, liters: Number(liters), cost: cost ? Number(cost) : null, odometer_km: odometer ? Number(odometer) : null });
    if (error) { onError(error.message); setBusy(false); return; }
    setLiters(""); setCost("");
    setOdometer(""); onSuccess("Fuel entry saved.");
    setBusy(false);
    await onChange();
  }
  async function service(kind: string) {
    onError(""); onSuccess("");
    if (!reg) { onError("Choose a fleet bus first."); return; }
    setBusy(true);
    const { error: serviceError } = await supabase.from("service_logs").insert({ bus_reg: reg, kind, notes: serviceNotes.trim() || null, next_due_km: nextDue ? Number(nextDue) : null });
    if (serviceError) { onError(serviceError.message); setBusy(false); return; }
    const updates: { last_service_at: string; next_service_km?: number } = { last_service_at: new Date().toISOString() };
    if (nextDue) updates.next_service_km = Number(nextDue);
    const { error: busError } = await supabase.from("buses").update(updates).eq("reg_no", reg);
    if (busError) onError(`Service record saved, but the bus summary could not be updated: ${busError.message}`);
    else onSuccess("Service entry saved.");
    setServiceNotes(""); setNextDue(""); setBusy(false);
    await onChange();
  }
  return (
    <div className="space-y-5">
    <div className="grid md:grid-cols-2 gap-4">
      <div className="surface border border-border rounded-2xl p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Fuel className="size-4 text-primary" /> Log Refuel</h3>
        <select required value={reg} onChange={(e) => setReg(e.target.value)} className="w-full surface-2 border border-border rounded-lg px-3 py-2 mb-2 text-sm">
          <option value="">Choose a fleet bus</option>
          {buses.map((b) => <option key={b.reg_no} value={b.reg_no}>{b.reg_no} ({b.fuel_type})</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Input type="number" min="0.1" step="0.1" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="Liters" />
          <Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost (₹)" />
          <Input type="number" min="0" step="1" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="Odometer km" />
        </div>
        <Button onClick={save} disabled={busy || !reg} className="w-full">{busy ? <Loader2 className="animate-spin" /> : <Fuel />}Save fuel entry</Button>
      </div>
      <div className="surface border border-border rounded-2xl p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Wrench className="size-4 text-accent" /> Quick Service Log</h3>
        <select required value={reg} onChange={(e) => setReg(e.target.value)} className="w-full surface-2 border border-border rounded-lg px-3 py-2 mb-3 text-sm">
          <option value="">Choose a fleet bus</option>
          {buses.map((b) => <option key={b.reg_no} value={b.reg_no}>{b.reg_no}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Label className="space-y-1 text-xs">Service type<select value={serviceKind} onChange={(event) => setServiceKind(event.target.value)} className="mt-1 h-9 w-full border border-input bg-background px-2 text-sm"><option>Oil change</option><option>Tyre check</option><option>Brake service</option><option>General inspection</option></select></Label>
          <Label className="space-y-1 text-xs">Next service at km<Input type="number" min="0" value={nextDue} onChange={(event) => setNextDue(event.target.value)} placeholder="Optional" /></Label>
        </div>
        <Input value={serviceNotes} onChange={(event) => setServiceNotes(event.target.value)} placeholder="Service notes" className="mt-2" />
        <div className="grid grid-cols-2 gap-2">
          <Button className="col-span-2 mt-2" onClick={() => void service(serviceKind)} disabled={busy || !reg}>{busy ? <Loader2 className="animate-spin" /> : <Wrench />}Save service log</Button>
        </div>
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Table headers={["Date", "Bus", "Fuel", "Cost", "Odometer"]}>
        {fuelLogs.map((entry) => <tr key={entry.id} className="border-b border-border"><td className="p-3 text-xs">{new Date(entry.refueled_at).toLocaleString()}</td><td className="p-3 font-mono text-xs">{entry.bus_reg}</td><td className="p-3">{Number(entry.liters).toFixed(1)} L</td><td className="p-3">{entry.cost == null ? "—" : `₹${Number(entry.cost).toLocaleString()}`}</td><td className="p-3">{entry.odometer_km == null ? "—" : `${entry.odometer_km.toLocaleString()} km`}</td></tr>)}
        {!fuelLogs.length && <tr><td colSpan={5} className="p-5 text-center text-sm text-muted-foreground">No fuel entries recorded.</td></tr>}
      </Table>
      <Table headers={["Date", "Bus", "Service", "Notes", "Next due"]}>
        {serviceLogs.map((entry) => <tr key={entry.id} className="border-b border-border"><td className="p-3 text-xs">{new Date(entry.serviced_at).toLocaleString()}</td><td className="p-3 font-mono text-xs">{entry.bus_reg}</td><td className="p-3">{entry.kind}</td><td className="p-3 text-xs">{entry.notes ?? "—"}</td><td className="p-3">{entry.next_due_km == null ? "—" : `${entry.next_due_km.toLocaleString()} km`}</td></tr>)}
        {!serviceLogs.length && <tr><td colSpan={5} className="p-5 text-center text-sm text-muted-foreground">No service entries recorded.</td></tr>}
      </Table>
    </div>
    </div>
  );
}
