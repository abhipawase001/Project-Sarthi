import { Link } from "@tanstack/react-router";
import { Bus, Radio } from "lucide-react";

const links = [
  { to: "/", label: "Overview" },
  { to: "/live", label: "Live Tracking" },
  { to: "/driver", label: "Driver" },
  { to: "/authority", label: "Authority" },
  { to: "/rewards", label: "Eco Rewards" },
  { to: "/channels", label: "SMS / IVR" },
  { to: "/about", label: "About" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-eco grid place-items-center glow">
            <Bus className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lg">SARTHI</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">Smart Transit</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              activeProps={{ className: "px-3 py-2 text-sm rounded-lg text-foreground bg-surface" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-xs font-mono text-eco">
          <Radio className="size-3.5 animate-pulse" /> LIVE
        </div>
      </div>
    </header>
  );
}
