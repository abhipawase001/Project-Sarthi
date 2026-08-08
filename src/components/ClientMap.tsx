import { Suspense, lazy, useEffect, useState } from "react";
import type { LiveMap as LiveMapType } from "./LiveMap";

// Leaflet touches `window` at import time — load the module only in the browser.
const LiveMap = lazy(() => import("./LiveMap").then((m) => ({ default: m.LiveMap })));

function MapFallback() {
  return (
    <div className="h-full w-full grid place-items-center surface rounded-xl">
      <div className="text-sm text-muted-foreground font-mono">Loading map…</div>
    </div>
  );
}

export function ClientMap(props: React.ComponentProps<typeof LiveMapType>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <MapFallback />;
  return (
    <Suspense fallback={<MapFallback />}>
      <LiveMap {...props} />
    </Suspense>
  );
}
