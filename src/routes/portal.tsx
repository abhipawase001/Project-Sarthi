import { createFileRoute, Link } from "@tanstack/react-router";
import { DepotConsole } from "@/components/DepotConsole";
import { AuthorityConsole } from "@/components/AuthorityConsole";
import { Building2, Shield } from "lucide-react";

export const Route = createFileRoute("/portal")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "command" ? ("command" as const) : ("ops" as const),
  }),
  head: () => ({
    meta: [
      { title: "Operations Portal — Sarthi" },
      { name: "description", content: "One portal for depot operations and the city authority command center: rosters, fleet, fuel, AI alerts, live KPIs and ridership analytics." },
      { property: "og:title", content: "Operations Portal — Sarthi" },
      { property: "og:description", content: "Depot ops + authority command center in one console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalPage,
});

function TabLink({ tab, label, icon: Icon, active }: { tab: "ops" | "command"; label: string; icon: typeof Building2; active: boolean }) {
  return (
    <Link
      to="/portal"
      search={{ tab }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-4" /> {label}
    </Link>
  );
}

function PortalPage() {
  const { tab } = Route.useSearch();
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pt-5">
        <div className="inline-flex gap-1 p-1 rounded-full surface border border-border">
          <TabLink tab="ops" label="Depot Ops" icon={Building2} active={tab === "ops"} />
          <TabLink tab="command" label="Command Center" icon={Shield} active={tab === "command"} />
        </div>
      </div>
      {tab === "command" ? <AuthorityConsole /> : <DepotConsole />}
    </div>
  );
}
