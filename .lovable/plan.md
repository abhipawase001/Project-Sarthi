
## Goal

Add two flagship AI features that strengthen the hackathon pitch:

1. **AI Anomaly Detection Engine** — watches live GPS pings, flags route deviations, bus bunching, traffic jams, and unscheduled idling with severity scores on the Authority dashboard.
2. **AI Depot Admin Console** — a fully paperless depot module covering driver assignments, bus allocation, shift/duty rosters, fueling logs, and trip records. AI generates the daily roster automatically and natural-language commands replace manual data entry.

---

## 1. AI Anomaly Detection Engine

**New file:** `src/lib/anomaly.ts` — pure-TS detectors run client-side on the live bus stream (no extra backend cost):

- `detectRouteDeviation(bus, route)` — haversine distance from expected polyline; >300m for 60s = HIGH.
- `detectBunching(buses)` — two buses on same route within 400m & same heading = MEDIUM.
- `detectTrafficJam(bus)` — speed <5 km/h for >90s outside known stops = MEDIUM.
- `detectGhostBus(bus)` — no ping update for 120s = HIGH.
- `detectOverspeed(bus)` — >55 km/h in city = LOW.

Each returns `{ id, busId, type, severity, message, lat, lng, ts }`.

**New file:** `src/lib/anomaly-ai.functions.ts` — server fn `explainAnomaly` calls Lovable AI Gateway (`google/gemini-3-flash-preview`) to produce a 1-line plain-Hindi/English root-cause suggestion + recommended action for any anomaly the operator clicks.

**New component:** `src/components/AnomalyPanel.tsx` — replaces the static "Live Alerts" list on `/authority`. Shows live count by severity, color-coded list, "Ask AI why" button per row that streams the AI explanation inline.

**Map overlay:** `src/components/LiveMap.tsx` gets pulse markers at anomaly coordinates (red/amber/yellow).

---

## 2. AI Depot Admin Console (paperless)

**New route:** `src/routes/depot.tsx` (added to Nav, role-gated behind a simple "admin" toggle for the demo).

Tabs:

- **Today's Roster** — auto-generated table: `Bus | Driver | Conductor | Route | Shift Start | Shift End | Status`. Inline edit, drag-drop reassignment.
- **Fleet** — bus register with reg no, capacity, fuel type, last service, odometer, health score (from anomaly engine).
- **Crew** — driver/conductor register with license expiry, rest-hours compliance, rating.
- **Trip Log** — every completed trip auto-recorded from bus pings (distance, duration, passengers, fuel est.). CSV export.
- **Fueling & Maintenance** — log refuel + service entries; AI flags overdue services.

**AI Roster Generator** (`src/lib/depot-ai.functions.ts`):
- Server fn `generateRoster({ date, constraints })` → calls Gemini with structured output (Zod schema) returning a JSON roster respecting: driver rest hours (≥8h between shifts), license validity, route familiarity, bus capacity vs predicted demand from `HOURLY_RIDERSHIP`.
- "Regenerate with AI" button on the Roster tab. Shows reasoning trace.

**Natural-language command bar** at top of `/depot`:
- "Assign Ramesh to R2 morning shift", "Mark MH17-CD-4521 in maintenance", "Show drivers idle today".
- Server fn `depotCommand({ text })` uses Gemini tool-calling with 5 tools (assign_driver, set_bus_status, query_roster, log_fuel, schedule_service); returns the action it took + a confirmation message. Replaces paper logbooks.

---

## 3. Database (Lovable Cloud)

One migration adds:

- `buses` (reg_no PK, capacity, fuel_type, status, odometer, last_service_at, health_score)
- `drivers` (id, name, license_no, license_expiry, rating, phone)
- `roster` (id, date, bus_id, driver_id, conductor_id, route, shift_start, shift_end, status)
- `trip_logs` (id, bus_id, driver_id, route, started_at, ended_at, distance_km, passengers_est)
- `fuel_logs` (id, bus_id, liters, cost, odometer, refueled_at)
- `service_logs` (id, bus_id, kind, notes, serviced_at, next_due_km)
- `anomalies` (id, bus_id, type, severity, message, lat, lng, ai_explanation, status, created_at) — realtime enabled

All tables: public RLS read + admin-write for demo simplicity (matches existing `incident_reports`/`bus_pings` pattern). Each `CREATE TABLE` followed by required `GRANT` statements.

Seed migration inserts 6 buses, 8 drivers, today's sample roster so the depot screen is populated on first load.

---

## 4. Wiring

- `/authority` page: swap static alerts → `<AnomalyPanel />`; add anomaly count to KPI strip ("Active Anomalies").
- Live anomaly persistence: a small `useEffect` in `/authority` inserts new anomalies to the `anomalies` table (debounced) so they appear on reload + via Realtime.
- Nav: add **Depot** link.
- Landing page features grid: add "AI Anomaly Detection" + "Paperless Depot Ops" tiles.
- About page: update judging-criteria row to mention these two features.

---

## Technical Details

- AI model: `google/gemini-3-flash-preview` for both `explainAnomaly` (text) and `generateRoster`/`depotCommand` (tools + structured output via `Output.object` with Zod).
- Anomaly detectors are pure functions, fully unit-testable, run every 2s on the existing `useLiveBuses` hook output — no new polling.
- All AI calls live in `*.functions.ts` server functions per TanStack rules; no key leakage.
- Roster generator uses `stepCountIs(50)` for tool-loop safety.

---

## Out of Scope (this pass)

- Real auth for the admin role (uses a demo toggle; real `_authenticated/` + role table can come next).
- Mobile depot app.
- Push notifications on anomalies (in-app feed only).
