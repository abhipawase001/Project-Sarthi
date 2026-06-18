// Pure anomaly detectors for live bus telemetry.
import type { Bus } from "./mockData";
import { STOPS } from "./mockData";

export type Severity = "low" | "medium" | "high";
export type AnomalyType =
  | "route_deviation"
  | "bunching"
  | "traffic_jam"
  | "ghost_bus"
  | "overspeed"
  | "long_idle";

export interface Anomaly {
  id: string;
  busId: string;
  type: AnomalyType;
  severity: Severity;
  message: string;
  lat: number;
  lng: number;
  ts: number;
}

// Haversine km
function dist(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Track per-bus state across ticks
const memory = new Map<
  string,
  { slowSince?: number; lastSeen: number; lastLat: number; lastLng: number; idleSince?: number }
>();

export function detectAnomalies(buses: Bus[]): Anomaly[] {
  const now = Date.now();
  const out: Anomaly[] = [];

  for (const b of buses) {
    const m = memory.get(b.id) ?? { lastSeen: now, lastLat: b.lat, lastLng: b.lng };

    // Overspeed
    if (b.speed > 55) {
      out.push({
        id: `${b.id}-over-${Math.floor(now / 30000)}`,
        busId: b.id,
        type: "overspeed",
        severity: "low",
        message: `${b.id} overspeed ${Math.round(b.speed)} km/h on ${b.routeName}`,
        lat: b.lat,
        lng: b.lng,
        ts: now,
      });
    }

    // Traffic jam — slow for 90s, away from any stop
    if (b.speed < 5) {
      m.slowSince ??= now;
      const slowFor = (now - m.slowSince) / 1000;
      const nearStop = STOPS.some((s) => dist(b.lat, b.lng, s.lat, s.lng) < 0.08);
      if (slowFor > 90 && !nearStop) {
        out.push({
          id: `${b.id}-jam-${Math.floor(m.slowSince / 60000)}`,
          busId: b.id,
          type: "traffic_jam",
          severity: "medium",
          message: `${b.id} stuck in traffic for ${Math.round(slowFor)}s near ${b.nextStop}`,
          lat: b.lat,
          lng: b.lng,
          ts: now,
        });
      }
    } else {
      m.slowSince = undefined;
    }

    // Long idle (engine off / not moving for 5+ min on shift)
    const moved = dist(m.lastLat, m.lastLng, b.lat, b.lng) > 0.02;
    if (!moved && b.speed === 0) {
      m.idleSince ??= now;
      const idleFor = (now - m.idleSince) / 1000;
      if (idleFor > 300) {
        out.push({
          id: `${b.id}-idle-${Math.floor(m.idleSince / 300000)}`,
          busId: b.id,
          type: "long_idle",
          severity: "low",
          message: `${b.id} idle ${Math.round(idleFor / 60)}min`,
          lat: b.lat,
          lng: b.lng,
          ts: now,
        });
      }
    } else {
      m.idleSince = undefined;
      m.lastLat = b.lat;
      m.lastLng = b.lng;
    }

    m.lastSeen = now;
    memory.set(b.id, m);
  }

  // Bunching — same route within 400m
  for (let i = 0; i < buses.length; i++) {
    for (let j = i + 1; j < buses.length; j++) {
      const a = buses[i];
      const c = buses[j];
      if (a.route !== c.route) continue;
      const d = dist(a.lat, a.lng, c.lat, c.lng);
      if (d < 0.4) {
        out.push({
          id: `bunch-${a.id}-${c.id}`,
          busId: `${a.id} + ${c.id}`,
          type: "bunching",
          severity: "medium",
          message: `Bus bunching on ${a.route}: ${a.id} & ${c.id} within ${Math.round(d * 1000)}m`,
          lat: (a.lat + c.lat) / 2,
          lng: (a.lng + c.lng) / 2,
          ts: now,
        });
      }
    }
  }

  // Dedupe by id
  const seen = new Set<string>();
  return out.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

export const SEV_COLOR: Record<Severity, string> = {
  low: "text-warn",
  medium: "text-accent",
  high: "text-destructive",
};
export const SEV_BG: Record<Severity, string> = {
  low: "bg-warn/15 border-warn/30",
  medium: "bg-accent/15 border-accent/30",
  high: "bg-destructive/15 border-destructive/30",
};
