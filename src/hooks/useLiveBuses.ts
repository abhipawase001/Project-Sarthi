import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildLiveFleet,
  type LiveFleetBus,
  type LivePosition,
  type RegisteredBus,
} from "@/lib/live-fleet";

/** Only registered, active buses with a GPS sample newer than 60 seconds. */
export function useLiveBuses(_intervalMs = 10_000) {
  const [buses, setBuses] = useState<LiveFleetBus[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [registryResult, positionResult] = await Promise.all([
        supabase.from("buses").select("reg_no,route,capacity,status").eq("status", "active"),
        supabase.from("live_bus_positions")
          .select("bus_id,route,lat,lng,speed,heading,occupancy,observed_at,accuracy_m")
          .gte("observed_at", new Date(Date.now() - 60_000).toISOString()),
      ]);
      if (!active) return;
      setNow(Date.now());
      if (registryResult.error || positionResult.error) {
        setBuses([]);
        return;
      }
      setBuses(buildLiveFleet(
        (registryResult.data ?? []) as RegisteredBus[],
        (positionResult.data ?? []) as LivePosition[],
        Date.now(),
      ));
    };
    void refresh();

    const channel = supabase
      .channel(`live-bus-positions-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_bus_positions" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "buses" }, () => {
        void refresh();
      })
      .subscribe();
    const refreshTimer = window.setInterval(() => { void refresh(); }, 10_000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 5_000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setBuses((current) => current.filter((bus) => now - bus.lastPingAt <= 60_000));
  }, [now]);

  return buses;
}