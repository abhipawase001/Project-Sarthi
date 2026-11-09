import { ROUTES, STOPS, type Bus, type Occupancy } from "@/lib/mockData";

export const LIVE_POSITION_TTL_MS = 60_000;

export interface RegisteredBus {
  reg_no: string;
  route: string | null;
  capacity: number;
  status: string;
}

export interface LivePosition {
  bus_id: string;
  route: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  occupancy: string;
  observed_at: string;
  accuracy_m: number | null;
}

export type LiveFleetBus = Bus & {
  live: true;
  lastPingAt: number;
  accuracyM: number | null;
};

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function isFreshLivePosition(position: LivePosition, now: number) {
  const observedAt = Date.parse(position.observed_at);
  return Number.isFinite(observedAt)
    && now - observedAt >= -30_000
    && now - observedAt <= LIVE_POSITION_TTL_MS;
}

export function estimateLiveEtaMinutes(
  lat: number,
  lng: number,
  speedKmh: number,
  stopId: string,
  routeId?: string,
) {
  const stop = STOPS.find((candidate) => candidate.id === stopId);
  if (!stop || (routeId && !stop.routes.includes(routeId)) || speedKmh <= 0) return null;
  const estimate = Math.round((distanceKm(lat, lng, stop.lat, stop.lng) * 1.35 / speedKmh) * 60);
  return Math.max(1, estimate);
}

function nextStopEstimate(position: LivePosition) {
  const route = ROUTES[position.route as keyof typeof ROUTES];
  if (!route) return { nextStop: "ETA unavailable", etaMin: -1 };

  const routeStops = route.path
    .map((id) => STOPS.find((stop) => stop.id === id))
    .filter((stop): stop is (typeof STOPS)[number] => Boolean(stop));
  if (!routeStops.length) return { nextStop: "ETA unavailable", etaMin: -1 };

  const closestIndex = routeStops.reduce((closest, stop, index) => {
    const currentDistance = distanceKm(position.lat, position.lng, stop.lat, stop.lng);
    const closestDistance = distanceKm(position.lat, position.lng, routeStops[closest].lat, routeStops[closest].lng);
    return currentDistance < closestDistance ? index : closest;
  }, 0);
  const next = routeStops[(closestIndex + 1) % routeStops.length];
  const etaMin = estimateLiveEtaMinutes(position.lat, position.lng, position.speed, next.id, position.route);
  return { nextStop: next.name, etaMin: etaMin ?? -1 };
}

export function buildLiveFleet(
  registry: RegisteredBus[],
  positions: LivePosition[],
  now: number,
): LiveFleetBus[] {
  const byBus = new Map<string, LivePosition>();
  for (const position of positions) {
    if (!isFreshLivePosition(position, now)) continue;
    const prior = byBus.get(position.bus_id);
    if (!prior || Date.parse(position.observed_at) > Date.parse(prior.observed_at)) {
      byBus.set(position.bus_id, position);
    }
  }

  return registry.flatMap((bus) => {
    if (bus.status !== "active") return [];
    const position = byBus.get(bus.reg_no);
    if (!position) return [];
    const route = position.route || bus.route || "";
    const routeName = ROUTES[route as keyof typeof ROUTES]?.name ?? route ?? "Unassigned route";
    const next = nextStopEstimate(position);
    const occupancy: Occupancy = ["low", "medium", "high"].includes(position.occupancy)
      ? position.occupancy as Occupancy
      : "medium";

    return [{
      id: bus.reg_no,
      route,
      routeName,
      driver: "Assigned driver",
      lat: position.lat,
      lng: position.lng,
      speed: position.speed,
      heading: position.heading,
      occupancy,
      seatsAvailable: 0,
      seatsTotal: bus.capacity,
      status: position.speed < 1 ? "idle" as const : "on-time" as const,
      ...next,
      live: true as const,
      lastPingAt: Date.parse(position.observed_at),
      accuracyM: position.accuracy_m,
    }];
  });
}