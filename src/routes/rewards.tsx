import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { LEADERBOARD } from "@/lib/mockData";
import { Leaf, Trophy, Gift, Sparkles, TreePine, Award } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/rewards")({
  head: () => ({ meta: [{ title: "Eco Rewards — Sarthi" }, { name: "description", content: "Earn points for every kg of CO₂ saved. Redeem at local partners." }] }),
  component: RewardsPage,
});

const perks = [
  { name: "₹50 Amul voucher",        cost: 800,  partner: "Amul" },
  { name: "Free chai at MSRTC stand", cost: 250,  partner: "MSRTC" },
  { name: "20% off BookMyShow",       cost: 1500, partner: "BMS" },
  { name: "Plant a tree in your name",cost: 2000, partner: "Sankalp Foundation" },
  { name: "Sarthi T-shirt",           cost: 3500, partner: "Sarthi" },
  { name: "Monthly bus pass",         cost: 5000, partner: "City Transport" },
];

const challenges = [
  { name: "Green Commuter", desc: "Take the bus 5 days in a row", reward: 300, progress: 60 },
  { name: "Off-Peak Hero",  desc: "10 rides during off-peak hours", reward: 200, progress: 80 },
  { name: "First Timer",    desc: "Refer a friend who rides 3x",     reward: 500, progress: 33 },
];

function RewardsPage() {
  const you = LEADERBOARD.find((l) => l.name === "You")!;
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 surface border border-border">
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-eco/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <div className="text-xs font-mono uppercase tracking-widest text-eco flex items-center gap-2">
                <Leaf className="size-3.5" /> Your Eco Wallet
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <div className="font-display text-6xl font-bold text-eco">{you.points.toLocaleString()}</div>
                <div className="text-muted-foreground">pts</div>
              </div>
              <p className="text-muted-foreground mt-2">
                You've saved <span className="text-eco font-semibold">{you.co2} kg of CO₂</span> across <span className="font-semibold">{you.trips} trips</span> — that's <span className="text-eco">3 trees worth</span> of carbon.
              </p>
              <div className="mt-6 flex gap-3 flex-wrap">
                <button className="px-5 py-2.5 rounded-xl bg-eco text-eco-foreground font-semibold flex items-center gap-2 glow-eco"><Gift className="size-4" /> Redeem perks</button>
                <button className="px-5 py-2.5 rounded-xl surface-2 border border-border font-semibold">Invite a friend (+500 pts)</button>
              </div>
            </div>
            <div className="surface-2 rounded-2xl p-6 border border-border text-center">
              <Trophy className="size-10 text-accent mx-auto" />
              <div className="mt-3 font-display text-3xl font-bold">#{you.rank}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">City rank</div>
              <div className="text-xs text-muted-foreground mt-2">328 pts to overtake Kavita P.</div>
            </div>
          </div>
        </div>

        {/* Challenges */}
        <div>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2"><Sparkles className="size-5 text-accent" /> Active Challenges</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {challenges.map((c, i) => (
              <motion.div key={c.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="surface border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="font-display font-semibold">{c.name}</div>
                  <div className="text-xs text-eco font-mono">+{c.reward} pts</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                <div className="mt-4 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full bg-eco" style={{ width: `${c.progress}%` }} />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{c.progress}% complete</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-4">
          {/* Perks marketplace */}
          <div className="surface border border-border rounded-2xl p-5">
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><Gift className="size-5 text-primary" /> Reward Marketplace</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {perks.map((p) => (
                <div key={p.name} className="surface-2 border border-border rounded-xl p-4 hover:border-primary/60 transition">
                  <div className="text-xs text-muted-foreground">{p.partner}</div>
                  <div className="font-display font-semibold mt-1">{p.name}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-eco font-mono text-sm">{p.cost} pts</span>
                    <button disabled={you.points < p.cost}
                      className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground font-semibold disabled:opacity-40">
                      {you.points >= p.cost ? "Redeem" : "Locked"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="surface border border-border rounded-2xl p-5">
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><Award className="size-5 text-accent" /> City Leaderboard</h2>
            <ul className="space-y-1">
              {LEADERBOARD.map((u) => (
                <li key={u.rank} className={`flex items-center gap-3 p-2.5 rounded-xl ${u.name === "You" ? "bg-primary/10 border border-primary/30" : ""}`}>
                  <div className={`size-8 rounded-lg grid place-items-center font-mono text-sm font-bold ${u.rank === 1 ? "bg-accent text-accent-foreground" : u.rank <= 3 ? "bg-primary/20 text-primary" : "surface-2 text-muted-foreground"}`}>
                    {u.rank}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground">{u.trips} trips · {u.co2} kg CO₂</div>
                  </div>
                  <div className="text-eco font-mono text-sm">{u.points}</div>
                </li>
              ))}
            </ul>
            <div className="mt-4 surface-2 rounded-xl p-3 text-xs text-muted-foreground flex gap-2 items-center">
              <TreePine className="size-4 text-eco" /> City total: 1,240 kg CO₂ avoided this week.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
