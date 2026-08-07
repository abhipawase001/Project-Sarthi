# SMS Bus ETA — Route + Stop

Let commuters get live bus ETAs over plain SMS: choose a route, then a stop, and receive the next 3 buses with arrival times, seats and delay status. Works on any feature phone, no data needed.

## The SMS conversation

```text
User:   ETA                (or HI / BUS / any greeting)
Drishti: DRISHTI ETA
         Reply route no:
         1 R1 Depot-Malpani
         2 R2 Hospital-Akole
         3 R3 Pravara Circuit

User:   1
Drishti: R1 stops - reply no:
         1 Sangamner Depot
         2 Market Yard
         3 Sangamner College
         4 Malpani Industrial

User:   3
Drishti: R1 -> Sangamner College
         1) MH17-AB-1023 4 min - 14 seats
         2) MH17-CD-4521 12 min - 3 seats FULL
         3) MH17-KL-3344 21 min - 17 seats
         Updated 11:42. Reply A to get an alert, M for menu.
```

Shortcuts for repeat users: `ETA R1 COLLEGE` skips both menus. `M` returns to the menu, `A` sets a one-time "bus 5 min away" alert. Replies are capped at 160 characters so they fit a single SMS. Hindi/Marathi replies when the user texts in those scripts or sends `H` / `M R`.

## What gets built

**1. Shared SMS engine (server-side)**
A single stateless conversation engine that takes the sender's phone number and message text and returns the reply text. It keeps a short-lived session (which route the user picked) so a bare `3` is understood. ETAs come from the same live bus data the map uses, so SMS and app never disagree.

**2. On-screen SMS simulator (works today, free)**
The existing SMS card on the Channels page is rewired to call the real engine instead of the local keyword stub — so what judges see on screen is byte-for-byte what a real phone would receive. Added next to it: a **route/stop picker** that composes the correct SMS for you and shows the exact reply, plus a "what the phone receives" preview.

**3. Real SMS path (flip on when a provider is connected)**
- A public webhook endpoint that an SMS provider posts inbound texts to, runs the same engine, and returns the reply.
- Outbound send helper for alerts.
- The provider (Twilio or GatewayAPI) is connected as a connector; until it is connected, the endpoint stays live but responds in dry-run mode and the simulator is the demo surface. Real SMS costs money per message and needs a provider account + number, so it is opt-in.

**4. Alerts**
`A` after an ETA reply stores a one-time alert (phone + bus + stop). When that bus is ~5 minutes out, an outbound SMS fires. In simulator mode the alert is shown on-screen instead of sent.

## Technical notes

- `src/lib/sms-engine.ts` — pure functions: `parseSms(text, session)` -> `{ reply, nextSession }`, route/stop matching with fuzzy name lookup, 160-char formatter, language detection.
- `src/lib/sms.functions.ts` — `createServerFn` wrapper used by the simulator UI.
- `src/routes/api/public/sms.ts` — provider webhook (`POST`), validates payload with Zod, verifies the provider signature/shared secret before replying, never echoes PII.
- New tables: `sms_sessions` (phone hash, route, stop, expires_at) and `sms_alerts` (phone hash, bus, stop, status). Phone numbers stored hashed; RLS locks both to service/staff only — no public reads.
- Channels page: replace the local `reply()` stub with engine calls; add the route/stop picker component.
- Outbound sending goes through the connector gateway once Twilio/GatewayAPI is linked.

## Out of scope

Two-way alerts beyond a single "bus approaching" ping, and buying/verifying an SMS short code.
