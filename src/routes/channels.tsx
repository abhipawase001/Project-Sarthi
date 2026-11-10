import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { MessageSquare, Phone, Send, Smartphone } from "lucide-react";
import { STOPS } from "@/lib/mockData";
import { smsReply } from "@/lib/sms.functions";
import { emptySession, type SmsSession } from "@/lib/sms-engine";
import { SmsEtaConsole } from "@/components/SmsEtaConsole";
import { IvrConsole } from "@/components/IvrConsole";

export const Route = createFileRoute("/channels")({
  head: () => ({
    meta: [
      { title: "SMS Bus ETA · WhatsApp · IVR — Sarthi" },
      { name: "description", content: "Get live bus ETAs over plain SMS: pick a route and stop, get the next 3 buses. Plus WhatsApp bot and IVR for feature-phone users." },
      { property: "og:title", content: "SMS Bus ETA — Sarthi" },
      { property: "og:description", content: "Route + stop over SMS returns the next 3 buses with arrival time and seats. No smartphone, no data needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChannelsPage,
});

type Msg = { from: "user" | "bot"; text: string };

function ChannelsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">SMS Bus ETA · WhatsApp · IVR</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">40% of tier-2 commuters don't have smartphones. Sarthi reaches them on whatever phone they own — pick a route and stop below and get the exact SMS a feature phone receives.</p>
        </div>

        <SmsEtaConsole />

        <div className="grid lg:grid-cols-2 gap-4">
          <ChatBox title="WhatsApp Bot · +91 90000 56161" subtitle="Rich replies with map links" icon={Smartphone} placeholder="Hi Sarthi" />
          <IvrConsole />
        </div>




        <div className="surface border border-border rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold mb-3">How the inclusion stack works</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="surface-2 rounded-xl p-4 border border-border">
              <div className="text-primary font-mono text-xs uppercase tracking-widest">1 · Channel Gateway</div>
              <p className="mt-2 text-muted-foreground">Twilio + Exotel + Meta Cloud API normalize every channel into one webhook.</p>
            </div>
            <div className="surface-2 rounded-xl p-4 border border-border">
              <div className="text-primary font-mono text-xs uppercase tracking-widest">2 · NLU Router</div>
              <p className="mt-2 text-muted-foreground">Hindi/Marathi/English keyword + intent classifier (FastText) routes to the right service.</p>
            </div>
            <div className="surface-2 rounded-xl p-4 border border-border">
              <div className="text-primary font-mono text-xs uppercase tracking-widest">3 · Live Transit API</div>
              <p className="mt-2 text-muted-foreground">Same ETA/seat data that powers the app — formatted for 160-char SMS or voice playback.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBox({ title, subtitle, icon: Icon, placeholder }: { title: string; subtitle: string; icon: any; placeholder: string }) {
  const sendReply = useServerFn(smsReply);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Try: ETA R1 MARKET. Replies use registered buses with a fresh GPS location." },
  ]);
  const [session, setSession] = useState<SmsSession>(emptySession);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!input.trim()) return;
    const body = input;
    setMsgs((m) => [...m, { from: "user", text: body }]);
    setInput("");
    setBusy(true);
    try {
      const result = await sendReply({ data: { body, session } });
      setSession(result.session as SmsSession);
      setMsgs((m) => [...m, { from: "bot", text: result.reply }]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: "Live arrival service is unavailable right now." }]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="surface border border-border rounded-2xl overflow-hidden flex flex-col h-[520px]">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="size-9 rounded-lg bg-primary/15 grid place-items-center text-primary"><Icon className="size-4" /></div>
        <div>
          <div className="font-display font-semibold text-sm">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${m.from === "user" ? "ml-auto bg-primary text-primary-foreground" : "surface-2 border border-border"}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg surface-2 border border-border outline-none text-sm focus:border-primary" />
        <button onClick={() => void send()} disabled={busy} className="px-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button>
      </div>
    </div>
  );
}

function IvrBox() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const lines = [
    "📞 Calling 1800-56-SARTHI…",
    "“Namaste! Sarthi mein swagat hai. Bus ki jaankari ke liye 1 dabaiye. Marathi ke liye 2.”",
    "“Aapka nazdeeki stop: Market Yard. Agli bus MH17-AB-1023 — 4 minute mein aayegi. Seat upload: 14.”",
    "“Agla bus ke alert ke liye 1 dabaiye. Dhanyavaad!”",
  ];
  return (
    <div className="surface border border-border rounded-2xl overflow-hidden flex flex-col h-[520px]">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="size-9 rounded-lg bg-accent/15 grid place-items-center text-accent"><Phone className="size-4" /></div>
        <div>
          <div className="font-display font-semibold text-sm">IVR · 1800-56-SARTHI (toll-free)</div>
          <div className="text-[11px] text-muted-foreground">Voice flow in Hindi · Marathi · English</div>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {lines.slice(0, step + 1).map((l, i) => (
          <div key={i} className="surface-2 border border-border rounded-xl p-3 text-sm">
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">Step {i + 1}</div>
            {l}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <button onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
          className="flex-1 px-3 py-2 rounded-lg bg-accent text-accent-foreground font-semibold text-sm">
          {step === 0 ? "📞 Place call" : step < 3 ? "Press next digit" : "Call complete"}
        </button>
        <button onClick={() => setStep(0)} className="px-3 py-2 rounded-lg surface-2 border border-border text-sm">Reset</button>
      </div>
    </div>
  );
}
