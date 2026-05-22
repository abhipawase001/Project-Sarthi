import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { MessageSquare, Phone, Send, Smartphone } from "lucide-react";
import { INITIAL_BUSES, STOPS } from "@/lib/mockData";

export const Route = createFileRoute("/channels")({
  head: () => ({ meta: [{ title: "SMS · WhatsApp · IVR — Sarthi" }, { name: "description", content: "Try the inclusive multi-channel access: SMS short-code, WhatsApp bot and IVR for feature-phone users." }] }),
  component: ChannelsPage,
});

type Msg = { from: "user" | "bot"; text: string };

function reply(input: string): string {
  const q = input.trim().toUpperCase();
  if (!q) return "Send STOP <code> e.g. 'BUS MARKET' to get next 3 ETAs. Reply HELP for menu.";
  if (q === "HELP" || q === "MENU") return "SARTHI menu:\n1) BUS <stop>  — next 3 ETAs\n2) ROUTE <id> — bus list\n3) SOS — alert depot\n4) ECO — your points";
  if (q.startsWith("BUS")) {
    const term = q.replace("BUS", "").trim().toLowerCase();
    const stop = STOPS.find(s => s.name.toLowerCase().includes(term)) ?? STOPS[1];
    const arr = INITIAL_BUSES.filter(b => b.nextStop.toLowerCase().includes(stop.name.toLowerCase().split(" ")[0].toLowerCase())).slice(0,3);
    const lines = arr.length
      ? arr.map((b,i) => `${i+1}) ${b.id} (${b.route}) ETA ${b.etaMin}m · ${b.seatsAvailable}/${b.seatsTotal} seats`).join("\n")
      : `1) MH17-AB-1023 (R1) ETA 4m · 14/42\n2) MH17-EF-7788 (R2) ETA 7m · 28/42\n3) MH17-IJ-9090 (R3) ETA 12m · 31/42`;
    return `Next buses → ${stop.name}\n${lines}\nReply ALERT 1 to get notified.`;
  }
  if (q.startsWith("ROUTE")) {
    return "Route R1 Depot↔Malpani:\n• MH17-AB-1023 — 4m → College\n• MH17-CD-4521 — 7m → Malpani (HIGH occ)\nReply BUS <stop> for ETAs.";
  }
  if (q === "ECO") return "Eco wallet:\n• 2,190 pts  • 43 kg CO₂ saved\n• Rank #6 in Sangamner\nReply REDEEM to spend points.";
  if (q === "SOS") return "🚨 SOS received. Depot notified. Stay safe — operator calling in 30s.";
  return "Sorry, I didn't get that. Reply HELP for menu.";
}

function ChannelsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inclusive Access · SMS · WhatsApp · IVR</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">40% of tier-2 commuters don't have smartphones. Sarthi reaches them on whatever phone they own — try each channel below.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <ChatBox title="SMS · Send to 56161" subtitle="Works on any phone, no data needed" icon={MessageSquare} placeholder="BUS MARKET" />
          <ChatBox title="WhatsApp Bot · +91 90000 56161" subtitle="Rich replies with map links" icon={Smartphone} placeholder="Hi Sarthi" />
          <IvrBox />
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
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Welcome to Sarthi! Reply HELP for menu, or BUS <stop> to find a bus." },
  ]);
  const [input, setInput] = useState("");
  const send = () => {
    if (!input.trim()) return;
    setMsgs((m) => [...m, { from: "user", text: input }, { from: "bot", text: reply(input) }]);
    setInput("");
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
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg surface-2 border border-border outline-none text-sm focus:border-primary" />
        <button onClick={send} className="px-3 rounded-lg bg-primary text-primary-foreground"><Send className="size-4" /></button>
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
