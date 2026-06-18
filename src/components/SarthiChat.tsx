import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askSarthi } from "@/lib/sarthi.functions";
import { MessageCircle, X, Send, Mic, Loader2, Languages } from "lucide-react";
import type { Bus } from "@/lib/mockData";

type Lang = "en" | "hi" | "mr";
type Msg = { role: "user" | "assistant"; content: string };

const PLACEHOLDER: Record<Lang, string> = {
  en: "Ask: when is the next bus to Market Yard?",
  hi: "पूछें: मार्केट यार्ड की अगली बस कब है?",
  mr: "विचारा: मार्केट यार्डची पुढची बस कधी?",
};
const GREETING: Record<Lang, string> = {
  en: "Hi, I'm Sarthi. Ask me about live buses, ETAs, or how to reach a stop.",
  hi: "नमस्ते! मैं सारथी हूँ। लाइव बस, ETA या किसी स्टॉप का रास्ता पूछें।",
  mr: "नमस्कार! मी सारथी आहे. लाइव बस, ETA किंवा थांब्याबद्दल विचारा.",
};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function SarthiChat({ buses }: { buses: Bus[] }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(askSarthi);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const liveContext = buses
    .slice(0, 10)
    .map(
      (b) =>
        `${b.id} route ${b.route} (${b.routeName}) at ${b.lat.toFixed(4)},${b.lng.toFixed(4)} speed ${Math.round(b.speed)}km/h, next stop ${b.nextStop} in ${b.etaMin}min, seats ${b.seatsAvailable}/${b.seatsTotal}, occupancy ${b.occupancy}`,
    )
    .join("\n");

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next);
    setLoading(true);
    try {
      const { reply } = await ask({
        data: { message: t, language: lang, history: msgs.slice(-10), liveContext },
      });
      setMsgs([...next, { role: "assistant", content: reply }]);
      speak(reply, lang);
    } catch (e: any) {
      setMsgs([...next, { role: "assistant", content: `⚠️ ${e.message ?? "Something went wrong"}` }]);
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return alert("Voice input not supported in this browser");
    const rec = new SR();
    rec.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      send(t);
    };
    rec.start();
  }

  function speak(text: string, l: Lang) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = l === "hi" ? "hi-IN" : l === "mr" ? "mr-IN" : "en-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-gradient-to-br from-primary to-eco grid place-items-center glow shadow-2xl hover:scale-105 transition"
          aria-label="Open Sarthi assistant"
        >
          <MessageCircle className="size-6 text-primary-foreground" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[560px] surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-eco/10">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-eco grid place-items-center">
                <MessageCircle className="size-4 text-primary-foreground" />
              </div>
              <div>
                <div className="font-display font-semibold text-sm">Sarthi AI</div>
                <div className="text-[10px] text-muted-foreground">Multilingual transit assistant</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </div>

          <div className="px-3 py-2 border-b border-border flex items-center gap-1 text-xs">
            <Languages className="size-3.5 text-muted-foreground" />
            {(["en", "hi", "mr"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-2 py-0.5 rounded-md ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {l === "en" ? "English" : l === "hi" ? "हिंदी" : "मराठी"}
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {msgs.length === 0 && (
              <div className="text-muted-foreground text-xs surface-2 border border-border rounded-xl p-3">{GREETING[lang]}</div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "surface-2 border border-border"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Sarthi is thinking…</div>}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-2 flex items-center gap-1"
          >
            <button type="button" onClick={startVoice} className="p-2 rounded-lg hover:bg-surface text-muted-foreground" aria-label="Voice input"><Mic className="size-4" /></button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDER[lang]}
              className="flex-1 bg-transparent outline-none text-sm px-2 placeholder:text-muted-foreground"
            />
            <button type="submit" disabled={loading || !input.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
