import { useEffect, useRef, useState } from "react";
import { INITIAL_BUSES, ROUTES, stepBus, type Bus, type Occupancy } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";

export type LiveBus = Bus & { live?: boolean; lastPingAt?: number };

type Ping = { bus_id: string; route: string; lat: number; lng: number; speed: number; heading: number; occupancy: string; created_at: string };

const FRESH_MS = 60_000;

/** Simulated fleet, overridden by real driver-phone GPS pings (bus_pings) when fresh. */
export function useLiveBuses(intervalMs = 1500) {
  const [sim, setSim] = useState<Bus[]>(INITIAL_BUSES);
  const [pings, setPings] = useState<Record<string, Ping>>({});
  const [now, setNow] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    const t = setInterval(() => {
      setSim((prev) => prev.map(stepBus));
      setNow(Date.now());
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  useEffect(() => {
    mounted.current = true;
    const since = new Date(Date.now() - FRESH_MS).toISOString();
    supabase
      .from("bus_pings")
      .select("bus_id,route,lat,lng,speed,heading,occupancy,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (!mounted.current || !data) return;
        setPings((p) => {
          const n = { ...p };
          for (const r of data as Ping[]) n[r.bus_id] = r;
          return n;
        });
      });
    const ch = supabase
      .channel(`bus-pings-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bus_pings" }, (payload) => {
        const r = payload.new as Ping;
        setPings((p) => ({ ...p, [r.bus_id]: r }));
      })
      .subscribe();
    return () => {
      mounted.current = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const t = now || 0;
  const buses: LiveBus[] = sim.map((b) => {
    const p = pings[b.id];
    if (!p || !t) return b;
    const at = new Date(p.created_at).getTime();
    if (t - at > FRESH_MS) return b;
    const route = p.route in ROUTES ? p.route : b.route;
    return {
      ...b,
      route,
      routeName: ROUTES[route as keyof typeof ROUTES]?.name ?? b.routeName,
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      heading: p.heading,
      occupancy: p.occupancy as Occupancy,
      live: true,
      lastPingAt: at,
    };
  });
  return buses;
}
