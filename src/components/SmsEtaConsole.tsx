import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, Signal, Bell, Loader2 } from "lucide-react";
import { ROUTES, STOPS } from "@/lib/mockData";
import { composeSms, stopsForRoute, type SmsSession } from "@/lib/sms-engine";
import { smsReply } from "@/lib/sms.functions";

type Msg = { from: "user" | "bot"; text: string; chars?: number; parts?: number };

const ROUTE_IDS = Object.keys(ROUTES) as Array<keyof typeof ROUTES>;

/**
 * SMS bus-ETA console: pick route -> pick stop -> get the exact SMS reply a
 * feature phone would receive. Same server engine as the real webhook.
 */
export function SmsEtaConsole() {
  const send = useServerFn(smsReply);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "DRISHTI ETA\nText ETA for bus times.\nH = Hindi, MR = Marathi" },
  ]);
  const [session, setSession] = useState<SmsSession>({ lang: "en" });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [route, setRoute] = useState<string>("");
  const [stopId, setStopId] = useState<string>("");

  const stops = useMemo(() => (route ? stopsForRoute(route) : []), [route]);

  const submit = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { from: "user", text: value }]);
    setInput("");
    try {
      const res = await send({ data: { body: value, session } });
      setSession(res.session as SmsSession);
      setMsgs((m) => [...m, { from: "bot", text: res.reply, chars: res.chars, parts: res.parts }]);
      if (res.alert) {
        setAlerts((a) => [`${res.alert!.busId} → ${res.alert!.stopName}`, ...a].slice(0, 4));
      }
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: "Network busy. Resend your message." }]);
    } finally {
      setBusy(false);
    }
  };

  const runPicker = () => {
    if (!route) return;
    submit(composeSms(route, stopId || null));
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Picker */}
      <div className="surface border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/15 grid place-items-center text-primary">
            <Signal className="size-4" />
          </div>
          <div>
            <div className="font-display font-semibold">Get bus ETA by SMS</div>
            <div className="text-[11px] text-muted-foreground">
              Pick a route and stop — we compose the text for you
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">1 · Route</label>
          <div className="grid gap-2">
            {ROUTE_IDS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRoute(r);
                  setStopId("");
                }}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  route === r ? "border-primary bg-primary/10" : "border-border surface-2 hover:bg-surface-2"
                }`}
              >
                <span className="font-mono text-xs text-primary mr-2">{r}</span>
                {ROUTES[r].name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">2 · Stop</label>
          <div className="flex flex-wrap gap-2">
            {stops.length === 0 && <span className="text-xs text-muted-foreground">Choose a route first.</span>}
            {stops.map((s) => (
              <button
                key={s.id}
                onClick={() => setStopId(s.id)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                  stopId === s.id ? "border-primary bg-primary/10 text-primary" : "border-border surface-2"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="surface-2 border border-border rounded-xl p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Message that gets sent to 56161
          </div>
          <div className="font-mono text-sm">{route ? composeSms(route, stopId || null) : "ETA"}</div>
        </div>

        <button
          onClick={runPicker}
          disabled={!route || busy}
          className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send SMS
        </button>

        {alerts.length > 0 && (
          <div className="surface-2 border border-border rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent flex items-center gap-1">
              <Bell className="size-3" /> Alerts queued
            </div>
            {alerts.map((a, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                {a} · SMS when 5 min away
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phone */}
      <div className="surface border border-border rounded-2xl overflow-hidden flex flex-col h-[560px]">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/15 grid place-items-center text-primary">
            <MessageSquare className="size-4" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm">SMS · 56161</div>
            <div className="text-[11px] text-muted-foreground">Live engine · works on any feature phone</div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {msgs.map((m, i) => (
            <div key={i} className={m.from === "user" ? "flex justify-end" : ""}>
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line font-mono ${
                  m.from === "user" ? "bg-primary text-primary-foreground" : "surface-2 border border-border"
                }`}
              >
                {m.text}
                {m.chars != null && (
                  <div className="mt-1 text-[10px] opacity-60">
                    {m.chars} chars · {m.parts} SMS
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="text-xs text-muted-foreground">Delivering…</div>}
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(input)}
            maxLength={160}
            placeholder="ETA R1 COLLEGE"
            className="flex-1 px-3 py-2 rounded-lg surface-2 border border-border outline-none text-sm focus:border-primary font-mono"
          />
          <button
            onClick={() => submit(input)}
            disabled={busy}
            className="px-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const SMS_STOP_COUNT = STOPS.length;
