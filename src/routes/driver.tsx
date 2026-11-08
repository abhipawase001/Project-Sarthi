import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { ClientMap } from "@/components/ClientMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES, STOPS, type Bus } from "@/lib/mockData";
import { AlertTriangle, Battery, Bus as BusIcon, Loader2, LogIn, LogOut, MapPin, Pause, Play, Route as RouteIcon, Satellite, Wifi } from "lucide-react";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Driver App — Sarthi Live GPS" },
      { name: "description", content: "Driver shifts, assigned buses, and verified live GPS for Sarthi." },
      { property: "og:title", content: "Driver App — Sarthi Live GPS" },
      { property: "og:description", content: "Start your assigned shift and share a verified bus location with Sarthi passengers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DriverPage,
});

type Assignment = {
  id: string;
  bus_reg: string | null;
  route: string | null;
  shift_start: string;
  shift_end: string;
  status: string;
};
type GpsFix = { lat: number; lng: number; accuracy: number; speed: number; heading: number; capturedAt: string };
type QueuedPing = {
  bus_id: string;
  route: string;
  driver_id: string;
  roster_id: string;
  client_ping_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  occupancy: "low" | "medium" | "high";
  observed_at: string;
  accuracy_m: number;
};
type Trip = { id: string; bus_reg: string | null; route: string | null; started_at: string; ended_at: string | null; distance_km: number | null };
const PING_QUEUE_KEY = "sarthi.driver.pingQueue.v2";

function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function makeAssignedBus(assignment: Assignment, fix: GpsFix): Bus | null {
  const routeId = assignment.route;
  if (!routeId || !(routeId in ROUTES) || !assignment.bus_reg) return null;
  const route = ROUTES[routeId as keyof typeof ROUTES];
  const routeStops = route.path.map((id) => STOPS.find((stop) => stop.id === id)).filter((stop) => stop !== undefined);
  const nextStop = routeStops[0]?.name ?? "ETA unavailable";
  return {
    id: assignment.bus_reg,
    route: routeId,
    routeName: route.name,
    driver: "You",
    lat: fix.lat,
    lng: fix.lng,
    speed: fix.speed,
    heading: fix.heading,
    occupancy: "medium",
    seatsAvailable: 0,
    seatsTotal: 0,
    status: fix.speed < 1 ? "idle" : "on-time",
    nextStop,
    etaMin: -1,
  };
}

function DriverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [driverId, setDriverId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [shiftMessage, setShiftMessage] = useState("");
  const [occupancy, setOccupancy] = useState<"low" | "medium" | "high">("medium");
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [sent, setSent] = useState(0);
  const [queued, setQueued] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [battery] = useState(() => typeof navigator === "undefined" ? null : (navigator as Navigator & { getBattery?: () => Promise<{ level: number }> }).getBattery);
  const gpsRef = useRef<GpsFix | null>(null);

  const selectedAssignment = assignments.find((assignment) => assignment.id === assignmentId) ?? null;
  const shift = trip !== null && trip.ended_at === null;
  const meLive = useMemo(
    () => shift && selectedAssignment && gps ? makeAssignedBus(selectedAssignment, gps) : null,
    [shift, selectedAssignment, gps],
  );

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
      if (active) setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setUserId(session?.user.id ?? null);
        setDriverId(null);
        setAssignments([]);
        setTrip(null);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadDriverData = useCallback(async (linkedDriverId: string) => {
    const [rosterResult, tripResult] = await Promise.all([
      supabase.from("roster")
        .select("id,bus_reg,route,shift_start,shift_end,status")
        .eq("duty_date", todayInIndia())
        .in("status", ["scheduled", "active", "in_progress"])
        .order("shift_start"),
      supabase.from("trip_logs")
        .select("id,bus_reg,route,started_at,ended_at,distance_km")
        .eq("driver_id", linkedDriverId)
        .order("started_at", { ascending: false })
        .limit(15),
    ]);
    if (rosterResult.error) throw rosterResult.error;
    if (tripResult.error) throw tripResult.error;
    const nextAssignments = (rosterResult.data ?? []) as Assignment[];
    setAssignments(nextAssignments);
    setTrips((tripResult.data ?? []) as Trip[]);
    const openTrip = ((tripResult.data ?? []) as Trip[]).find((item) => item.ended_at === null);
    setTrip(openTrip ?? null);
    if (openTrip?.id) {
      const matchingAssignment = nextAssignments.find((assignment) => assignment.bus_reg === openTrip.bus_reg);
      if (matchingAssignment) setAssignmentId(matchingAssignment.id);
    } else if (nextAssignments.length === 1) {
      setAssignmentId(nextAssignments[0].id);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("link_driver_account");
        if (error) throw error;
        if (!active) return;
        setDriverId(data);
        setAuthMessage("");
        await loadDriverData(data);
      } catch (error) {
        if (active) {
          setDriverId(null);
          setAuthMessage(error instanceof Error ? error.message : "Could not connect this account to a crew record.");
        }
      }
    })();
    return () => { active = false; };
  }, [userId, loadDriverData]);

  useEffect(() => {
    const updateNetwork = () => setIsOnline(navigator.onLine);
    updateNetwork();
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: window.location.origin + "/driver" },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthMessage("Check your email and confirm your account. Your crew record must already use this email.");
        } else {
          setAuthMessage("Account created. Linking it to your crew assignment…");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setAuthMessage("Signed in. Loading your assigned shifts…");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Sign-in could not be completed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function refreshAssignments() {
    if (!driverId) return;
    setShiftMessage("");
    try {
      await loadDriverData(driverId);
    } catch (error) {
      setShiftMessage(error instanceof Error ? error.message : "Could not refresh your shift details.");
    }
  }

  async function startShift() {
    if (!selectedAssignment) return;
    setShiftBusy(true);
    setShiftMessage("");
    try {
      const { data, error } = await supabase.rpc("driver_start_shift", { _roster_id: selectedAssignment.id });
      if (error) throw error;
      const newTrip: Trip = {
        id: data,
        bus_reg: selectedAssignment.bus_reg,
        route: selectedAssignment.route,
        started_at: new Date().toISOString(),
        ended_at: null,
        distance_km: 0,
      };
      setTrip(newTrip);
      setTrips((current) => [newTrip, ...current.filter((item) => item.id !== newTrip.id)]);
      setGps(null);
      setGpsError("");
    } catch (error) {
      setShiftMessage(error instanceof Error ? error.message : "Could not start this shift.");
    } finally {
      setShiftBusy(false);
    }
  }

  async function endShift() {
    if (!selectedAssignment) return;
    setShiftBusy(true);
    setShiftMessage("");
    try {
      const { data, error } = await supabase.rpc("driver_end_shift", { _roster_id: selectedAssignment.id });
      if (error) throw error;
      const endedAt = new Date().toISOString();
      setTrip(null);
      setTrips((current) => current.map((item) => item.id === trip?.id
        ? { ...item, ended_at: endedAt, distance_km: data ?? 0 }
        : item));
      setGps(null);
      setShiftMessage(`Shift completed · ${Number(data ?? 0).toFixed(2)} km recorded.`);
      if (driverId) await loadDriverData(driverId);
    } catch (error) {
      setShiftMessage(error instanceof Error ? error.message : "Could not end this shift.");
    } finally {
      setShiftBusy(false);
    }
  }

  useEffect(() => {
    if (!shift || !selectedAssignment || !driverId) return;
    if (!navigator.geolocation) {
      setGpsError("This device does not support location sharing.");
      return;
    }
    let disposed = false;
    let sending = false;
    let previous: { lat: number; lng: number; capturedAt: number } | null = null;
    setGpsError("");
    const watchId = navigator.geolocation.watchPosition((position) => {
      const { latitude, longitude, accuracy } = position.coords;
      let speed = position.coords.speed == null ? 0 : position.coords.speed * 3.6;
      let heading = position.coords.heading ?? 0;
      if (previous && position.coords.speed == null) {
        const elapsedHours = (position.timestamp - previous.capturedAt) / 3_600_000;
        const dLat = ((latitude - previous.lat) * Math.PI) / 180;
        const dLng = ((longitude - previous.lng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(previous.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        if (elapsedHours > 0) speed = 6371 * 2 * Math.asin(Math.sqrt(a)) / elapsedHours;
        heading = (Math.atan2(longitude - previous.lng, latitude - previous.lat) * 180) / Math.PI;
      }
      previous = { lat: latitude, lng: longitude, capturedAt: position.timestamp };
      const fix: GpsFix = {
        lat: latitude,
        lng: longitude,
        accuracy,
        speed: Math.min(199, Math.max(0, speed)),
        heading: ((heading % 360) + 360) % 360,
        capturedAt: new Date(position.timestamp).toISOString(),
      };
      gpsRef.current = fix;
      setGps(fix);
    }, (error) => {
      setGpsError(error.code === 1 ? "Allow location access in your device settings to share bus GPS." : error.message);
    }, { enableHighAccuracy: true, maximumAge: 2_000, timeout: 15_000 });

    const send = async () => {
      const fix = gpsRef.current;
      if (disposed || sending || !fix || fix.accuracy > 1_000) return;
      sending = true;
      const current: QueuedPing = {
        bus_id: selectedAssignment.bus_reg ?? "",
        route: selectedAssignment.route ?? "",
        driver_id: driverId,
        roster_id: selectedAssignment.id,
        client_ping_id: crypto.randomUUID(),
        lat: fix.lat,
        lng: fix.lng,
        speed: Math.round(Math.min(199, Math.max(0, fix.speed)) * 100) / 100,
        heading: Math.round(fix.heading * 100) / 100,
        occupancy,
        observed_at: fix.capturedAt,
        accuracy_m: Math.round(fix.accuracy * 100) / 100,
      };
      const saved = localStorage.getItem(PING_QUEUE_KEY);
      let pending: QueuedPing[] = [];
      try { pending = saved ? JSON.parse(saved) as QueuedPing[] : []; } catch { pending = []; }
      pending = [...pending, current].slice(-200);
      localStorage.setItem(PING_QUEUE_KEY, JSON.stringify(pending));
      setQueued(pending.length);
      if (!navigator.onLine) { sending = false; return; }

      const valid = pending.filter((item) => Date.now() - Date.parse(item.observed_at) <= 24 * 60 * 60 * 1000);
      if (!valid.length) {
        localStorage.removeItem(PING_QUEUE_KEY);
        setQueued(0);
        sending = false;
        return;
      }
      const { error } = await supabase.from("bus_pings").insert(valid);
      if (disposed) { sending = false; return; }
      if (error) {
        setShiftMessage(error.message);
      } else {
        localStorage.removeItem(PING_QUEUE_KEY);
        setQueued(0);
        setSent((count) => count + valid.length);
      }
      sending = false;
    };
    const timer = window.setInterval(() => { void send(); }, 5_000);
    return () => {
      disposed = true;
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(timer);
    };
  }, [shift, selectedAssignment, driverId, occupancy]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Driver Console</h1>
            <p className="text-sm text-muted-foreground">Your assigned bus, verified location, and trip history.</p>
          </div>
          {userId && <Button variant="outline" size="sm" onClick={signOut}><LogOut />Sign out</Button>}
        </div>

        {authLoading ? (
          <div className="surface border border-border p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></div>
        ) : !userId ? (
          <section className="mx-auto max-w-md surface border border-border p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center bg-primary/10 text-primary"><LogIn className="size-5" /></div>
              <div><h2 className="font-display text-xl font-semibold">Driver account</h2><p className="text-sm text-muted-foreground">Use the email saved in your crew record.</p></div>
            </div>
            <form className="space-y-4" onSubmit={submitAuth}>
              <div className="space-y-2"><Label htmlFor="driver-email">Email</Label><Input id="driver-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="driver-password">Password</Label><Input id="driver-password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
              <Button className="w-full" type="submit" disabled={authBusy}>{authBusy ? <Loader2 className="animate-spin" /> : <LogIn />}{isSignUp ? "Create account" : "Sign in"}</Button>
            </form>
            <Button variant="link" className="mt-2 px-0" onClick={() => { setIsSignUp((value) => !value); setAuthMessage(""); }}>{isSignUp ? "Already have an account? Sign in" : "First time? Create your driver account"}</Button>
            {authMessage && <p className="mt-3 text-sm text-muted-foreground" role="status">{authMessage}</p>}
          </section>
        ) : !driverId ? (
          <section className="mx-auto max-w-xl surface border border-border p-6">
            <h2 className="font-display text-xl font-semibold">Crew record not linked</h2>
            <p className="mt-2 text-sm text-muted-foreground">{authMessage || "Checking your confirmed email against the crew list…"}</p>
            <p className="mt-3 text-sm text-muted-foreground">Ask depot staff to add your email to your existing crew record, then confirm that email before signing in here.</p>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[390px_1fr]">
            <section className="surface border border-border p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div><div className="text-xs uppercase text-muted-foreground">Today’s assignments</div><div className="mt-1 font-display text-xl font-semibold">{assignments.length} shift{assignments.length === 1 ? "" : "s"}</div></div>
                <Button variant="ghost" size="icon" aria-label="Refresh assignments" onClick={() => void refreshAssignments()}><Wifi /></Button>
              </div>
              {assignments.length === 0 ? (
                <div className="border border-border p-4 text-sm text-muted-foreground">No bus has been assigned to your crew record for today. Contact the depot to schedule your shift.</div>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <button key={assignment.id} type="button" disabled={shift} onClick={() => setAssignmentId(assignment.id)} className={`w-full border p-3 text-left transition ${assignmentId === assignment.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                      <div className="flex items-center justify-between gap-2"><span className="font-mono text-sm">{assignment.bus_reg ?? "Bus not assigned"}</span><span className="text-xs capitalize text-muted-foreground">{assignment.status}</span></div>
                      <div className="mt-1 text-sm text-muted-foreground">{assignment.route ?? "Route not set"} · {assignment.shift_start.slice(0, 5)}–{assignment.shift_end.slice(0, 5)}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedAssignment && <Button className="w-full" disabled={shiftBusy} onClick={() => void (shift ? endShift() : startShift())}>{shiftBusy ? <Loader2 className="animate-spin" /> : shift ? <Pause /> : <Play />}{shift ? "End assigned shift" : "Start assigned shift"}</Button>}
              {shiftMessage && <p className="text-sm text-destructive" role="alert">{shiftMessage}</p>}

              {shift && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm"><Satellite className="size-4 text-primary" />Phone GPS</span><span className={`text-xs ${gps && isOnline ? "text-eco" : "text-muted-foreground"}`}>{gpsError ? "Needs attention" : gps ? isOnline ? "Connected" : "Offline" : "Waiting for a fix"}</span></div>
                  {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
                  {gps && <p className="font-mono text-xs text-muted-foreground">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} · ±{Math.round(gps.accuracy)} m</p>}
                  <div className="text-xs text-muted-foreground">{sent} locations received · {queued} queued for retry</div>
                  <div>
                    <Label htmlFor="driver-occupancy">Passenger occupancy report</Label>
                    <select id="driver-occupancy" value={occupancy} onChange={(event) => setOccupancy(event.target.value as typeof occupancy)} className="mt-2 h-9 w-full border border-input bg-background px-3 text-sm capitalize">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="border-t border-border pt-4">
                <div className="mb-2 flex items-center gap-2 font-medium"><BusIcon className="size-4" />Recent trips</div>
                <div className="max-h-52 space-y-2 overflow-y-auto">
                  {trips.length === 0 && <p className="text-sm text-muted-foreground">Trips started from this phone will appear here.</p>}
                  {trips.map((item) => <div key={item.id} className="flex justify-between gap-3 border-b border-border py-2 text-xs"><span>{item.bus_reg} · {item.route}<br /><span className="text-muted-foreground">{new Date(item.started_at).toLocaleString()}</span></span><span className="shrink-0 text-right">{item.ended_at ? `${Number(item.distance_km ?? 0).toFixed(1)} km` : "In progress"}</span></div>)}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="surface border border-border p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium"><RouteIcon className="size-4 text-primary" />Assigned route</div>
                {selectedAssignment?.route && selectedAssignment.route in ROUTES
                  ? <p className="text-sm">{selectedAssignment.route} · {ROUTES[selectedAssignment.route as keyof typeof ROUTES].name}</p>
                  : <p className="text-sm text-muted-foreground">A route has not been configured for this shift.</p>}
              </div>
              <div className="surface h-[min(65vh,620px)] min-h-[360px] overflow-hidden border border-border">
                {meLive ? <ClientMap buses={[meLive]} selectedRoute={meLive.route} /> : <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground"><div><MapPin className="mx-auto mb-2 size-6" />The map shows your assigned bus after you start the shift and the phone receives a GPS fix.</div></div>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Battery className="size-4" />Location sharing requires an active shift and your device’s location permission.</div>
              <div className="sr-only">{battery ? "Battery level available" : ""}</div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}