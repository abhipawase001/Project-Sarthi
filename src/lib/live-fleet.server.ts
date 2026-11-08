import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildLiveFleet, type LivePosition, type RegisteredBus } from "@/lib/live-fleet";

export async function getFreshLiveFleet() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Live bus service is not configured");

  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const [busesResult, positionsResult] = await Promise.all([
    client.from("buses").select("reg_no,route,capacity,status").eq("status", "active"),
    client.from("live_bus_positions")
      .select("bus_id,route,lat,lng,speed,heading,occupancy,observed_at,accuracy_m")
      .gte("observed_at", new Date(Date.now() - 60_000).toISOString()),
  ]);
  if (busesResult.error) throw new Error("Could not load the registered fleet");
  if (positionsResult.error) throw new Error("Could not load current bus locations");

  return buildLiveFleet(
    (busesResult.data ?? []) as RegisteredBus[],
    (positionsResult.data ?? []) as LivePosition[],
    Date.now(),
  );
}