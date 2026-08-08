/**
 * Drishti IVR engine — pure, stateless DTMF state machine.
 *
 * The phone line, the on-screen keypad console and the provider webhook all
 * run this same function, so the demo is literally the production flow.
 *
 * Input:  current call state + the digit the caller pressed.
 * Output: what to say, what state comes next, and whether to keep listening.
 */
import { INITIAL_BUSES, ROUTES, STOPS, type Bus } from "./mockData";
import { etasForStop, stopsForRoute, ROUTE_IDS, type SmsLang } from "./sms-engine";

export type IvrLang = SmsLang;

export type IvrState = "lang" | "route" | "stop" | "result" | "done";

export interface IvrCallState {
  state: IvrState;
  lang: IvrLang;
  route?: string | null;
  stopId?: string | null;
  attempts: number;
}

export interface IvrStep {
  /** Text to speak to the caller. */
  say: string;
  /** State to store for the next callback. */
  next: IvrCallState;
  /** How many digits to gather (0 = don't gather, just play and hang up). */
  expectDigits: number;
  hangup: boolean;
  /** Set when the caller asked to be called/SMSed when the bus is close. */
  alert?: { busId: string; route: string; stopId: string; stopName: string };
}

export const initialCall: IvrCallState = { state: "lang", lang: "en", attempts: 0 };

/* ------------------------------------------------------------------ */
/* Copy                                                                 */
/* ------------------------------------------------------------------ */

const T = {
  en: {
    welcome:
      "Namaste. Welcome to Drishti bus information. For Hindi press 1. For Marathi press 2. For English press 3.",
    routePrompt: "Press the number for your route.",
    routeItem: (i: number, name: string) => `For ${name}, press ${i}.`,
    stopPrompt: "Press the number for your stop.",
    stopItem: (i: number, name: string) => `For ${name}, press ${i}.`,
    etaLead: (stop: string) => `Buses arriving at ${stop}.`,
    etaLine: (i: number, bus: string, min: number, seats: number) =>
      `${i}. Bus ${spellBus(bus)} in ${min} ${min === 1 ? "minute" : "minutes"}, ${seats} seats free.`,
    noBus: (stop: string) => `Sorry, no live bus towards ${stop} right now.`,
    resultFooter: "Press 1 to hear this again. Press 9 for an arrival alert. Press 0 for the main menu.",
    alertOk: (bus: string, stop: string) =>
      `Alert set. We will call and message you when bus ${spellBus(bus)} is five minutes from ${stop}. Thank you for using Drishti.`,
    invalid: "Sorry, I did not get that.",
    bye: "Thank you for calling Drishti. Goodbye.",
  },
  hi: {
    welcome:
      "Namaste. Drishti bus jaankari mein aapka swagat hai. Hindi ke liye ek dabaiye. Marathi ke liye do. English ke liye teen.",
    routePrompt: "Apne route ka number dabaiye.",
    routeItem: (i: number, name: string) => `${name} ke liye ${hiNum(i)} dabaiye.`,
    stopPrompt: "Apne stop ka number dabaiye.",
    stopItem: (i: number, name: string) => `${name} ke liye ${hiNum(i)} dabaiye.`,
    etaLead: (stop: string) => `${stop} par aane wali buses.`,
    etaLine: (i: number, bus: string, min: number, seats: number) =>
      `${hiNum(i)}. Bus ${spellBus(bus)}, ${min} minute mein. ${seats} seat khali hain.`,
    noBus: (stop: string) => `Maaf kijiye, ${stop} ke liye abhi koi bus nahi hai.`,
    resultFooter: "Dobara sunne ke liye ek dabaiye. Alert ke liye nau dabaiye. Mukhya menu ke liye shunya.",
    alertOk: (bus: string, stop: string) =>
      `Alert lag gaya. Jab bus ${spellBus(bus)} ${stop} se paanch minute door hogi, hum aapko call aur message karenge. Drishti ka dhanyavaad.`,
    invalid: "Maaf kijiye, samajh nahi aaya.",
    bye: "Drishti ko call karne ke liye dhanyavaad. Namaste.",
  },
  mr: {
    welcome:
      "Namaskar. Drishti bus mahiti madhe aaple swagat aahe. Hindi sathi ek dabava. Marathi sathi don. English sathi teen.",
    routePrompt: "Aaplya route cha kramank dabava.",
    routeItem: (i: number, name: string) => `${name} sathi ${mrNum(i)} dabava.`,
    stopPrompt: "Aaplya thambyacha kramank dabava.",
    stopItem: (i: number, name: string) => `${name} sathi ${mrNum(i)} dabava.`,
    etaLead: (stop: string) => `${stop} la yenarya bus.`,
    etaLine: (i: number, bus: string, min: number, seats: number) =>
      `${mrNum(i)}. Bus ${spellBus(bus)}, ${min} minitat. ${seats} jaga rikamya aahet.`,
    noBus: (stop: string) => `Kshama kara, ${stop} sathi sadhya bus nahi.`,
    resultFooter: "Punha aikanyasathi ek dabava. Alert sathi nau dabava. Mukhya menu sathi shunya.",
    alertOk: (bus: string, stop: string) =>
      `Alert lavla. Bus ${spellBus(bus)} ${stop} pasun paach minit lamb astana aamhi call ani message karu. Drishti chi aabhari aahot.`,
    invalid: "Kshama kara, samajle nahi.",
    bye: "Drishti la call kelyabaddal dhanyavaad. Namaskar.",
  },
} as const;

const HI_NUM = ["shunya", "ek", "do", "teen", "chaar", "paanch", "chhah", "saat", "aath", "nau"];
const MR_NUM = ["shunya", "ek", "don", "teen", "chaar", "paach", "saha", "saat", "aath", "nau"];
function hiNum(n: number) {
  return HI_NUM[n] ?? String(n);
}
function mrNum(n: number) {
  return MR_NUM[n] ?? String(n);
}

/** "MH17-AB-1023" -> "M H 1 7 A B 1 0 2 3" so TTS reads it out clearly. */
function spellBus(id: string) {
  return id.replace(/-/g, " ").split("").join(" ").replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* Prompt builders                                                      */
/* ------------------------------------------------------------------ */

function routePrompt(lang: IvrLang) {
  const t = T[lang];
  const items = ROUTE_IDS.map((r, i) => t.routeItem(i + 1, ROUTES[r].name.replace(/ ↔ /g, " to ")));
  return [t.routePrompt, ...items].join(" ");
}

function stopPrompt(lang: IvrLang, routeId: string) {
  const t = T[lang];
  const items = stopsForRoute(routeId)
    .slice(0, 9)
    .map((s, i) => t.stopItem(i + 1, s.name));
  return [t.stopPrompt, ...items].join(" ");
}

function resultPrompt(lang: IvrLang, routeId: string, stopId: string, buses: Bus[]) {
  const t = T[lang];
  const stop = STOPS.find((s) => s.id === stopId);
  if (!stop) return t.invalid;
  const etas = etasForStop(routeId, stopId, buses);
  if (!etas.length) return `${t.noBus(stop.name)} ${t.resultFooter}`;
  const lines = etas.map((e, i) => t.etaLine(i + 1, e.busId, e.etaMin, e.seats));
  return [t.etaLead(stop.name), ...lines, t.resultFooter].join(" ");
}

/* ------------------------------------------------------------------ */
/* State machine                                                        */
/* ------------------------------------------------------------------ */

const LANG_BY_DIGIT: Record<string, IvrLang> = { "1": "hi", "2": "mr", "3": "en" };

/**
 * Advance the call. Pass `digit = null` for the very first callback
 * (call answered, nothing pressed yet) or for a no-input timeout.
 */
export function ivrStep(
  call: IvrCallState = initialCall,
  digit: string | null = null,
  buses: Bus[] = INITIAL_BUSES,
): IvrStep {
  const lang = call.lang ?? "en";
  const t = T[lang];
  const d = (digit ?? "").trim();

  // Call just connected — greet and ask for language.
  if (!d && call.state === "lang") {
    return {
      say: T.en.welcome,
      next: { ...call, state: "lang", attempts: 0 },
      expectDigits: 1,
      hangup: false,
    };
  }

  // No input at all: retry twice, then end the call politely.
  if (!d) return retry(call, t.invalid);

  switch (call.state) {
    case "lang": {
      const picked = LANG_BY_DIGIT[d];
      if (!picked) return retry(call, `${t.invalid} ${T.en.welcome}`);
      return {
        say: routePrompt(picked),
        next: { state: "route", lang: picked, attempts: 0 },
        expectDigits: 1,
        hangup: false,
      };
    }

    case "route": {
      const idx = Number(d);
      const routeId = ROUTE_IDS[idx - 1];
      if (!routeId) return retry(call, `${t.invalid} ${routePrompt(lang)}`);
      return {
        say: stopPrompt(lang, routeId),
        next: { state: "stop", lang, route: routeId, attempts: 0 },
        expectDigits: 1,
        hangup: false,
      };
    }

    case "stop": {
      const list = stopsForRoute(call.route ?? "").slice(0, 9);
      const stop = list[Number(d) - 1];
      if (!stop) return retry(call, `${t.invalid} ${stopPrompt(lang, call.route ?? "")}`);
      return {
        say: resultPrompt(lang, call.route!, stop.id, buses),
        next: { state: "result", lang, route: call.route, stopId: stop.id, attempts: 0 },
        expectDigits: 1,
        hangup: false,
      };
    }

    case "result": {
      if (d === "1") {
        return {
          say: resultPrompt(lang, call.route!, call.stopId!, buses),
          next: { ...call, attempts: 0 },
          expectDigits: 1,
          hangup: false,
        };
      }
      if (d === "0") {
        return {
          say: routePrompt(lang),
          next: { state: "route", lang, attempts: 0 },
          expectDigits: 1,
          hangup: false,
        };
      }
      if (d === "9") {
        const etas = etasForStop(call.route!, call.stopId!, buses);
        const stop = STOPS.find((s) => s.id === call.stopId);
        if (!etas.length || !stop) return retry(call, t.invalid);
        return {
          say: t.alertOk(etas[0].busId, stop.name),
          next: { ...call, state: "done", attempts: 0 },
          expectDigits: 0,
          hangup: true,
          alert: { busId: etas[0].busId, route: call.route!, stopId: stop.id, stopName: stop.name },
        };
      }
      return retry(call, `${t.invalid} ${t.resultFooter}`);
    }

    default:
      return { say: t.bye, next: { ...call, state: "done" }, expectDigits: 0, hangup: true };
  }
}

function retry(call: IvrCallState, say: string): IvrStep {
  const attempts = (call.attempts ?? 0) + 1;
  const t = T[call.lang ?? "en"];
  if (attempts >= 3) {
    return { say: t.bye, next: { ...call, state: "done", attempts }, expectDigits: 0, hangup: true };
  }
  return { say, next: { ...call, attempts }, expectDigits: 1, hangup: false };
}

/** Menu labels for the on-screen keypad console. */
export function ivrKeypadHint(state: IvrState, lang: IvrLang, route?: string | null) {
  if (state === "lang") return ["1 Hindi", "2 Marathi", "3 English"];
  if (state === "route") return ROUTE_IDS.map((r, i) => `${i + 1} ${ROUTES[r].name}`);
  if (state === "stop")
    return stopsForRoute(route ?? "")
      .slice(0, 9)
      .map((s, i) => `${i + 1} ${s.name}`);
  if (state === "result") return ["1 Repeat", "9 Alert me", "0 Main menu"];
  return [];
}

export const IVR_LANG_LABEL: Record<IvrLang, string> = { en: "English", hi: "हिंदी", mr: "मराठी" };
