import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, PhoneOff, Volume2, Loader2, PhoneCall, Bell } from "lucide-react";
import { ivrKeypadHint, IVR_LANG_LABEL, type IvrLang, type IvrState } from "@/lib/ivr-engine";

type Turn = { who: "line" | "caller"; text: string };

interface StepResponse {
  say: string;
  audioUrl: string;
  expectDigits: number;
  hangup: boolean;
  state: IvrState;
  lang: IvrLang;
  route: string | null;
  stopId: string | null;
  alert: { busId: string; stopName: string } | null;
  dryRun: boolean;
}

const TOLL_FREE = "1800 202 5616";

/**
 * Live IVR console. Every keypress hits the same public webhook a telephony
 * provider calls, so what you hear here is exactly what a caller hears.
 */
export function IvrConsole() {
  const [callSid, setCallSid] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [step, setStep] = useState<StepResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiVoice, setAiVoice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const live = callSid !== null && !(step?.hangup ?? false);
  const hints = useMemo(
    () => (step ? ivrKeypadHint(step.state, step.lang, step.route) : []),
    [step],
  );

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const play = async (res: StepResponse) => {
    stopAudio();
    if (aiVoice) {
      try {
        const audio = new Audio(res.audioUrl);
        audioRef.current = audio;
        await audio.play();
        return;
      } catch {
        /* fall back to the browser voice below */
      }
    }
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(res.say);
    u.lang = res.lang === "en" ? "en-IN" : res.lang === "hi" ? "hi-IN" : "mr-IN";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  const call = async (sid: string, digits: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/public/ivr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ callSid: sid, from: "+919000056161", digits }),
      });
      if (!r.ok) throw new Error(`Line busy (${r.status})`);
      const res = (await r.json()) as StepResponse;
      setStep(res);
      setTurns((t) => [...t, { who: "line", text: res.say }]);
      void play(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Call failed");
    } finally {
      setBusy(false);
    }
  };

  const startCall = () => {
    const sid = `web-${Date.now()}`;
    setCallSid(sid);
    setStep(null);
    setTurns([{ who: "caller", text: `Dialling ${TOLL_FREE}…` }]);
    void call(sid, "");
  };

  const press = (d: string) => {
    if (!callSid || busy || !live) return;
    setTurns((t) => [...t, { who: "caller", text: `Pressed ${d}` }]);
    void call(callSid, d);
  };

  const hangUp = () => {
    stopAudio();
    setCallSid(null);
    setStep(null);
    setTurns([]);
    setError(null);
  };

  useEffect(() => stopAudio, []);

  return (
    <div className="surface border border-border rounded-2xl overflow-hidden flex flex-col h-[560px]">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="size-9 rounded-lg bg-accent/15 grid place-items-center text-accent">
          <PhoneCall className="size-4" />
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold text-sm">Toll-free IVR · {TOLL_FREE}</div>
          <div className="text-[11px] text-muted-foreground">
            Real voice line · Hindi · Marathi · English{step?.dryRun ? " · dry-run" : ""}
          </div>
        </div>
        <button
          onClick={() => setAiVoice((v) => !v)}
          className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-lg border ${
            aiVoice ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground"
          }`}
        >
          <Volume2 className="size-3 inline mr-1" />
          {aiVoice ? "AI voice" : "Device voice"}
        </button>
      </div>

      <div ref={logRef} className="flex-1 p-4 space-y-2 overflow-y-auto">
        {turns.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Press <span className="text-foreground font-semibold">Call</span> to dial the line. It answers in
            three languages, then reads live bus arrivals for the stop you choose on the keypad.
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.who === "caller" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                t.who === "caller"
                  ? "bg-accent text-accent-foreground font-mono text-xs"
                  : "surface-2 border border-border"
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> Connecting…
          </div>
        )}
        {error && <div className="text-xs text-destructive">{error}</div>}
        {step?.alert && (
          <div className="surface-2 border border-border rounded-xl p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Bell className="size-3 text-accent" />
            Alert queued · {step.alert.busId} → {step.alert.stopName}
          </div>
        )}
      </div>

      {hints.length > 0 && live && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {hints.map((h) => (
            <span
              key={h}
              className="text-[10px] font-mono px-2 py-1 rounded-full surface-2 border border-border text-muted-foreground"
            >
              {h}
            </span>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-border space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              disabled={!live || busy}
              className="py-2.5 rounded-lg surface-2 border border-border font-mono text-sm disabled:opacity-40 hover:border-accent transition-colors"
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={startCall}
            disabled={busy || live}
            className="flex-1 px-3 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Phone className="size-4" />
            {live ? `On call · ${IVR_LANG_LABEL[step?.lang ?? "en"]}` : "Call"}
          </button>
          <button
            onClick={hangUp}
            disabled={!callSid}
            className="px-3 py-2.5 rounded-lg surface-2 border border-border text-sm disabled:opacity-40 inline-flex items-center gap-2"
          >
            <PhoneOff className="size-4" /> End
          </button>
        </div>
      </div>
    </div>
  );
}
