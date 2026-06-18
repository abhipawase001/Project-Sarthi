import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Sparkles, Loader2, Activity, Zap } from "lucide-react";
import { detectAnomalies, SEV_BG, type Anomaly } from "@/lib/anomaly";
import { explainAnomaly } from "@/lib/anomaly-ai.functions";
import type { Bus } from "@/lib/mockData";

export function AnomalyPanel({ buses }: { buses: Bus[] }) {
  const [items, setItems] = useState<Anomaly[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const explain = useServerFn(explainAnomaly);

  useEffect(() => {
    const t = setInterval(() => {
      const next = detectAnomalies(buses);
      setItems((prev) => {
        // Merge — keep last 20 unique by id, newest first
        const map = new Map<string, Anomaly>();
        [...next, ...prev].forEach((a) => map.set(a.id, a));
        return Array.from(map.values()).slice(0, 20);
      });
    }, 3000);
    return () => clearInterval(t);
  }, [buses]);

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0 };
    items.forEach((i) => c[i.severity]++);
    return c;
  }, [items]);

  async function ask(a: Anomaly) {
    setLoadingId(a.id);
    try {
      const { explanation } = await explain({
        data: { type: a.type, busId: a.busId, message: a.message, severity: a.severity },
      });
      setExplanations((e) => ({ ...e, [a.id]: explanation }));
    } catch (err: any) {
      setExplanations((e) => ({ ...e, [a.id]: `⚠️ ${err.message ?? "Failed"}` }));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Zap className="size-4 text-primary" /> AI Anomaly Detection
          </h3>
          <p className="text-[11px] text-muted-foreground">Live GPS pattern analysis · {items.length} active</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">{counts.high} HIGH</span>
          <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent">{counts.medium} MED</span>
          <span className="px-1.5 py-0.5 rounded bg-warn/15 text-warn">{counts.low} LOW</span>
        </div>
      </div>

      <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground text-center py-6 flex flex-col items-center gap-2">
            <Activity className="size-5 text-eco" />
            All buses operating normally
          </li>
        )}
        {items.map((a) => (
          <li key={a.id} className={`rounded-xl p-3 border ${SEV_BG[a.severity]}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm">{a.message}</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {a.type.replace(/_/g, " ")} · {new Date(a.ts).toLocaleTimeString()}
                  </div>
                  {!explanations[a.id] && (
                    <button
                      onClick={() => ask(a)}
                      disabled={loadingId === a.id}
                      className="text-[10px] inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                    >
                      {loadingId === a.id ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                      Ask AI
                    </button>
                  )}
                </div>
                {explanations[a.id] && (
                  <pre className="mt-2 text-[11px] whitespace-pre-wrap surface-2 border border-border rounded-lg p-2 font-sans">
                    {explanations[a.id]}
                  </pre>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
