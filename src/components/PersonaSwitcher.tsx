import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users, X, Smartphone, Bus, Building2, Shield } from "lucide-react";

export const PERSONAS = [
  { to: "/live", label: "Passenger", icon: Smartphone },
  { to: "/driver", label: "Driver", icon: Bus },
  { to: "/depot", label: "Depot", icon: Building2 },
  { to: "/authority", label: "Authority", icon: Shield },
] as const;

export function PersonaSwitcher() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch app"
        className="size-11 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg glow"
      >
        {open ? <X className="size-5" /> : <Users className="size-5" />}
      </button>
      {open && (
        <div className="flex gap-1 p-1 rounded-full surface border border-border shadow-lg backdrop-blur-xl">
          {PERSONAS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-muted-foreground hover:text-foreground"
              activeProps={{ className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs bg-primary text-primary-foreground" }}
            >
              <Icon className="size-3.5" /> {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
