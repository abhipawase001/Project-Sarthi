import { Link, useLocation } from "@tanstack/react-router";
import { Bus, Radio, LogOut } from "lucide-react";

type Portal = "home" | "passenger" | "driver" | "depot" | "authority";

const PORTALS: Record<Portal, { name: string; tag: string; links: { to: string; label: string }[] }> = {
  home: {
    name: "DRISHTI",
    tag: "Smart Transit",
    links: [
      { to: "/", label: "Overview" },
      { to: "/impact", label: "Impact" },
      { to: "/demo", label: "Demo" },
      { to: "/about", label: "About" },
    ],
  },
  passenger: {
    name: "DRISHTI",
    tag: "Passenger App",
    links: [
      { to: "/live", label: "Live Map" },
      { to: "/channels", label: "SMS & Call" },
      { to: "/rewards", label: "Rewards" },
    ],
  },
  driver: { name: "DRISHTI", tag: "Driver Cockpit", links: [{ to: "/driver", label: "Cockpit" }] },
  depot: { name: "DRISHTI", tag: "Depot Portal", links: [{ to: "/depot", label: "Operations" }] },
  authority: {
    name: "DRISHTI",
    tag: "Authority Command",
    links: [
      { to: "/authority", label: "Command Center" },
      { to: "/impact", label: "Impact" },
    ],
  },
};

function portalFor(path: string): Portal {
  if (path.startsWith("/live") || path.startsWith("/channels") || path.startsWith("/rewards")) return "passenger";
  if (path.startsWith("/driver")) return "driver";
  if (path.startsWith("/depot")) return "depot";
  if (path.startsWith("/authority")) return "authority";
  return "home";
}

export function Nav() {
  const { pathname } = useLocation();
  const portal = portalFor(pathname);
  const p = PORTALS[portal];
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-eco grid place-items-center glow">
            <Bus className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lg">{p.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">{p.tag}</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {p.links.map((l) => (
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-eco">
            <Radio className="size-3.5 animate-pulse" /> LIVE
          </div>
          {portal !== "home" && (
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">
              <LogOut className="size-3.5" /> Exit
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
