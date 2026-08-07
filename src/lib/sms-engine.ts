/**
 * Drishti SMS engine — pure, stateless conversation logic.
 *
 * Takes an inbound SMS body + the sender's short-lived session and returns
 * the reply text (<=160 chars per part) plus the next session state.
 * The very same engine powers the on-screen simulator and the real
 * provider webhook, so what judges see is what a phone receives.
 */
import { INITIAL_BUSES, ROUTES, STOPS, type Bus } from "./mockData";

export type SmsLang = "en" | "hi" | "mr";

export interface SmsSession {
  route?: string | null;
  stopId?: string | null;
  lang: SmsLang;
  lastBuses?: string[] | null;
}

export interface SmsEta {
  busId: string;
  etaMin: number;
  seats: number;
  status: Bus["status"];
}

export interface SmsResult {
  reply: string;
  session: SmsSession;
  /** set when the user asked for an arrival alert */
  alert?: { busId: string; route: string; stopId: string; stopName: string };
}

export const ROUTE_IDS = Object.keys(ROUTES) as Array<keyof typeof ROUTES>;

export const emptySession: SmsSession = { lang: "en" };

/* ------------------------------------------------------------------ */
/* ETA computation                                                      */
/* ------------------------------------------------------------------ */

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function stopsForRoute(routeId: string) {
  const route = ROUTES[routeId as keyof typeof ROUTES];
  if (!route) return [];
  return route.path
    .map((id) => STOPS.find((s) => s.id === id))
    .filter((s): s is (typeof STOPS)[number] => Boolean(s));
}

/**
 * ETAs for the next buses on `routeId` heading to `stopId`.
 * Distance along the road network is approximated as crow-flies x1.35.
 */
export function etasForStop(routeId: string, stopId: string, buses: Bus[] = INITIAL_BUSES): SmsEta[] {
  const stop = STOPS.find((s) => s.id === stopId);
  if (!stop) return [];
  return buses
    .filter((b) => b.route === routeId)
    .map((b) => {
      const km = haversineKm(b.lat, b.lng, stop.lat, stop.lng) * 1.35;
      const speed = Math.max(12, b.speed || 18); // km/h, idling buses still get moving
      const dwell = 0.6 * Math.max(0, stopsForRoute(routeId).length - 1);
      const etaMin = Math.max(1, Math.round((km / speed) * 60 + dwell));
      return { busId: b.id, etaMin, seats: b.seatsAvailable, status: b.status };
    })
    .sort((a, b) => a.etaMin - b.etaMin)
    .slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Copy                                                                 */
/* ------------------------------------------------------------------ */

const T = {
  en: {
    menu: (rs: string) => `DRISHTI ETA\nReply route no:\n${rs}`,
    stops: (r: string, ss: string) => `${r} stops - reply no:\n${ss}`,
    footer: "Reply A=alert, M=menu",
    noBus: (s: string) => `No live bus towards ${s} right now. Reply M for menu.`,
    help: "DRISHTI SMS\nETA = bus times\nM = menu\nA = alert me\nH = Hindi, MR = Marathi\nSOS = emergency",
    badRoute: (rs: string) => `Route not found. Reply route no:\n${rs}`,
    badStop: (ss: string) => `Stop not found. Reply no:\n${ss}`,
    alertOk: (b: string, s: string) => `Alert set. We will SMS you when ${b} is 5 min from ${s}.`,
    alertNone: "Ask for ETAs first: reply ETA.",
    sos: "SOS received. Depot alerted, control room calling you in 30s. Stay safe.",
    seats: "seats",
    full: "FULL",
  },
  hi: {
    menu: (rs: string) => `DRISHTI ETA\nRoute no bhejein:\n${rs}`,
    stops: (r: string, ss: string) => `${r} stop - no bhejein:\n${ss}`,
    footer: "A=alert, M=menu",
    noBus: (s: string) => `${s} ke liye abhi koi bus nahi. M bhejein.`,
    help: "DRISHTI SMS\nETA = bus samay\nM = menu\nA = alert\nE = English, MR = Marathi\nSOS = madad",
    badRoute: (rs: string) => `Route nahi mila. Route no bhejein:\n${rs}`,
    badStop: (ss: string) => `Stop nahi mila. No bhejein:\n${ss}`,
    alertOk: (b: string, s: string) => `Alert set. ${b} jab ${s} se 5 min door hogi, SMS aayega.`,
    alertNone: "Pehle ETA maangein: ETA bhejein.",
    sos: "SOS mila. Depot ko soochit kiya. 30 sec mein call aayegi. Surakshit rahein.",
    seats: "seat",
    full: "BHARI",
  },
  mr: {
    menu: (rs: string) => `DRISHTI ETA\nRoute kramank pathva:\n${rs}`,
    stops: (r: string, ss: string) => `${r} thambe - kramank pathva:\n${ss}`,
    footer: "A=alert, M=menu",
    noBus: (s: string) => `${s} sathi sadhya bus nahi. M pathva.`,
    help: "DRISHTI SMS\nETA = bus vel\nM = menu\nA = alert\nE = English, H = Hindi\nSOS = madat",
    badRoute: (rs: string) => `Route sapadla nahi. Kramank pathva:\n${rs}`,
    badStop: (ss: string) => `Thamba sapadla nahi. Kramank pathva:\n${ss}`,
    alertOk: (b: string, s: string) => `Alert set. ${b} ${s} pasun 5 min var astana SMS yeil.`,
    alertNone: "Adhi ETA magava: ETA pathva.",
    sos: "SOS milala. Depot la kalavle. 30 sec madhe call yeil. Surakshit raha.",
    seats: "jaga",
    full: "BHARLI",
  },
} as const;

function routeMenu() {
  return ROUTE_IDS.map((r, i) => `${i + 1} ${r} ${ROUTES[r].name.replace(/ ↔ /g, "-")}`).join("\n");
}

function stopMenu(routeId: string) {
  return stopsForRoute(routeId)
    .map((s, i) => `${i + 1} ${s.name}`)
    .join("\n");
}

/** Trim to a single 160-char SMS without cutting a line in half where possible. */
export function clamp160(text: string) {
  if (text.length <= 160) return text;
  const lines = text.split("\n");
  let out = "";
  for (const line of lines) {
    if ((out ? out.length + 1 : 0) + line.length > 157) break;
    out = out ? `${out}\n${line}` : line;
  }
  return (out || text.slice(0, 157)) + "...";
}

/* ------------------------------------------------------------------ */
/* Parser                                                               */
/* ------------------------------------------------------------------ */

function detectLang(raw: string, current: SmsLang): SmsLang {
  if (/[\u0900-\u097F]/.test(raw)) return current === "mr" ? "mr" : "hi";
  return current;
}

function findRoute(token: string): string | null {
  const t = token.trim().toUpperCase();
  if (!t) return null;
  const byIndex = Number(t);
  if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= ROUTE_IDS.length) {
    return ROUTE_IDS[byIndex - 1];
  }
  if (ROUTE_IDS.includes(t as keyof typeof ROUTES)) return t;
  const match = ROUTE_IDS.find((r) => ROUTES[r].name.toUpperCase().includes(t));
  return match ?? null;
}

function findStop(routeId: string, token: string): string | null {
  const list = stopsForRoute(routeId);
  const t = token.trim().toUpperCase();
  if (!t) return null;
  const idx = Number(t);
  if (Number.isInteger(idx) && idx >= 1 && idx <= list.length) return list[idx - 1].id;
  const match =
    list.find((s) => s.name.toUpperCase() === t) ??
    list.find((s) => s.name.toUpperCase().includes(t)) ??
    list.find((s) => t.includes(s.name.split(" ")[0].toUpperCase()));
  return match?.id ?? null;
}

function formatEtas(routeId: string, stopId: string, lang: SmsLang, buses: Bus[]): SmsResult {
  const t = T[lang];
  const stop = STOPS.find((s) => s.id === stopId)!;
  const etas = etasForStop(routeId, stopId, buses);
  if (!etas.length) {
    return { reply: t.noBus(stop.name), session: { lang, route: routeId, stopId: null } };
  }
  const lines = etas
    .map((e, i) => `${i + 1}) ${e.busId} ${e.etaMin}min ${e.seats <= 4 ? t.full : `${e.seats} ${t.seats}`}`)
    .join("\n");
  const reply = clamp160(`${routeId} > ${stop.name}\n${lines}\n${t.footer}`);
  return {
    reply,
    session: { lang, route: routeId, stopId, lastBuses: etas.map((e) => e.busId) },
  };
}

/**
 * Core entry point. Pure: same input -> same output (given the same bus list).
 */
export function parseSms(
  body: string,
  prev: SmsSession = emptySession,
  buses: Bus[] = INITIAL_BUSES,
): SmsResult {
  const raw = (body ?? "").trim();
  const lang = detectLang(raw, prev.lang ?? "en");
  const t = T[lang];
  const upper = raw.toUpperCase();
  const session: SmsSession = { ...prev, lang };

  // language switches
  if (upper === "E" || upper === "ENGLISH") {
    return { reply: T.en.menu(routeMenu()), session: { ...session, lang: "en", stopId: null } };
  }
  if (upper === "H" || upper === "HINDI") {
    return { reply: T.hi.menu(routeMenu()), session: { ...session, lang: "hi", stopId: null } };
  }
  if (upper === "MR" || upper === "MARATHI") {
    return { reply: T.mr.menu(routeMenu()), session: { ...session, lang: "mr", stopId: null } };
  }

  if (upper === "SOS" || upper === "HELP ME") return { reply: t.sos, session };
  if (upper === "HELP" || upper === "?") return { reply: t.help, session };

  // alert on the first bus of the last ETA reply
  if (upper === "A" || upper === "ALERT" || upper === "ALERT 1") {
    const busId = prev.lastBuses?.[0];
    if (!busId || !prev.route || !prev.stopId) return { reply: t.alertNone, session };
    const stop = STOPS.find((s) => s.id === prev.stopId)!;
    return {
      reply: clamp160(t.alertOk(busId, stop.name)),
      session,
      alert: { busId, route: prev.route, stopId: stop.id, stopName: stop.name },
    };
  }

  // explicit shortcut: ETA R1 COLLEGE
  const shortcut = upper.match(/^(?:ETA|BUS)\s+(\S+)(?:\s+(.+))?$/);
  if (shortcut) {
    const routeId = findRoute(shortcut[1]);
    if (!routeId) return { reply: clamp160(t.badRoute(routeMenu())), session: { ...session, route: null, stopId: null } };
    if (shortcut[2]) {
      const stopId = findStop(routeId, shortcut[2]);
      if (!stopId) {
        return { reply: clamp160(t.badStop(stopMenu(routeId))), session: { ...session, route: routeId, stopId: null } };
      }
      return formatEtas(routeId, stopId, lang, buses);
    }
    return {
      reply: clamp160(t.stops(routeId, stopMenu(routeId))),
      session: { ...session, route: routeId, stopId: null },
    };
  }

  // menu / greetings / empty
  if (!raw || ["M", "MENU", "ETA", "BUS", "HI", "HELLO", "START", "NAMASTE"].includes(upper)) {
    return { reply: clamp160(t.menu(routeMenu())), session: { ...session, route: null, stopId: null, lastBuses: null } };
  }

  // numbered replies inside the flow
  if (!prev.route) {
    const routeId = findRoute(upper);
    if (routeId) {
      return {
        reply: clamp160(t.stops(routeId, stopMenu(routeId))),
        session: { ...session, route: routeId, stopId: null },
      };
    }
    return { reply: clamp160(t.badRoute(routeMenu())), session: { ...session, route: null, stopId: null } };
  }

  const stopId = findStop(prev.route, upper);
  if (stopId) return formatEtas(prev.route, stopId, lang, buses);

  // maybe they switched route instead
  const otherRoute = findRoute(upper);
  if (otherRoute) {
    return {
      reply: clamp160(t.stops(otherRoute, stopMenu(otherRoute))),
      session: { ...session, route: otherRoute, stopId: null },
    };
  }

  return { reply: clamp160(t.badStop(stopMenu(prev.route))), session };
}

/** Compose the SMS a web user would send for a given route/stop pick. */
export function composeSms(routeId: string, stopId?: string | null) {
  if (!stopId) return `ETA ${routeId}`;
  const stop = STOPS.find((s) => s.id === stopId);
  const word = stop?.name.split(" ").slice(-1)[0] ?? "";
  return `ETA ${routeId} ${word.toUpperCase()}`;
}
