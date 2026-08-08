# Driver Console — Bus & Route Selection

Right now the Driver page always shows the first simulated bus (`MH17-AB-1023`). Drivers should be able to pick which bus they are driving and which route they are running, and everything on the page should follow that choice.

## What the driver sees

1. A short "Start of shift" selector at the top of the phone mock:
   - **Bus** dropdown — all buses in the fleet, shown as registration number + current status.
   - **Route** dropdown — R1 / R2 / R3 with their friendly names (Depot ↔ Malpani, Hospital ↔ Akole, Pravara Circuit).
2. Once selected, the phone header, speed, next stop, onboard count, GPS log, and the map on the right all reflect the chosen bus.
3. Choosing a route different from the bus's default updates the route name, next stop, and the route line drawn on the map.
4. Selection is remembered on the device, so reopening the app restores the last bus/route.
5. Selectors lock while a shift is running (ending the shift unlocks them) — you can't swap buses mid-trip.

## Technical notes

- `src/routes/driver.tsx`: replace the hardcoded `buses[0]` with `selectedBusId` state; derive `me` from the live bus list, falling back to the first bus if the id is missing.
- Add `selectedRoute` state; when it differs from the bus's own route, override `route`, `routeName` and pick `nextStop` from that route's stop list in `ROUTES`/`STOPS` (`src/lib/mockData.ts`).
- Persist both values in `localStorage` inside a `useEffect` (read after mount to avoid SSR hydration mismatch, same pattern used by `LiveClock` in `src/routes/index.tsx`).
- Pass `selectedRoute` through `ClientMap` → `LiveMap` (it already accepts a `selectedRoute` prop) so only the driver's route polyline is drawn.
- Disable both selects when `shift === true`.
- No database or backend changes; this stays frontend-only on the existing simulated data.
