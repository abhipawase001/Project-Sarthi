
# Project Sarthi → INDIA RUNS Winning Upgrade Plan

INDIA RUNS (Redrob AI × Hack2skill, ₹50L pool) rewards tools built for **real Indian subcontinent realities** — localized, multi-language, affordable, low-bandwidth, inclusive AI. Below is a focused upgrade path to make Sarthi a top-3 contender. We'll layer real intelligence and real backend on top of the current simulation, plus the storytelling that wins demos.

## 1. Turn the simulation into a real product (Lovable Cloud)

Right now everything is mock. Judges score heavily on "is this actually built?"
- Enable Lovable Cloud and add tables: `routes`, `stops`, `buses`, `gps_pings`, `trips`, `users`, `user_roles` (passenger/driver/authority), `rewards_ledger`, `incident_reports`, `feedback`.
- RLS + `has_role()` so Driver Console and Authority Dashboard are actually access-controlled.
- Driver app writes GPS pings → Authority + Live map subscribe via Supabase Realtime. No more `setInterval` fake data.
- Auth: phone/OTP for drivers (India-first), email for authority, anonymous browsing for passengers.

## 2. Multi-language AI Sarthi Assistant (the hackathon's core theme)

A chat + voice assistant that answers in **Hindi, Marathi, English, Hinglish** — the single most on-theme feature.
- Lovable AI Gateway (Gemini) for chat: "अगली बस कब आएगी संगमनेर से?" → parses intent → queries live data → replies in same language/script.
- Browser SpeechRecognition + TTS for voice mode (works on cheap Android).
- Code-switch friendly prompts; fallback to transliteration.
- Shown on `/live`, embedded in WhatsApp/SMS/IVR simulators on `/channels`.

## 3. Real low-bandwidth + offline story

Judges love proven inclusivity, not just claims.
- PWA install + service worker: cache routes/stops, queue GPS pings when offline, sync on reconnect.
- "2G mode" toggle: text-only stripped UI, <50KB payload, no map tiles (ASCII route strip instead).
- Lighthouse score visible on `/about`.

## 4. Predictive ETA + crowd forecast (real ML-lite, not a chart)

Replace the "AI Forecast" line chart with something defensible.
- Server function: ETA = haversine distance / rolling-median speed of last N pings + dwell-time per stop (learned from history).
- Crowd forecast: simple gradient-boosted-ish heuristic on (hour, weekday, weather, route) — implement with a tiny JS model or call Gemini with structured prompt + history. Display confidence band.
- Expose `/api/public/eta?bus=...` so judges can hit it from Postman during demo.

## 5. Safety + women-first features (high-impact India angle)

- SOS button on passenger app → creates `incident_reports` row, alerts Authority dashboard in realtime, optional WhatsApp to emergency contact.
- "Travel with me" share-live-trip link (read-only token).
- Night-route lighting/CCTV overlay on map (data field on stops).

## 6. Authority command center upgrades

- Anomaly detection: bus stopped >X min off-route → red pin + toast.
- Bunching detection: two buses on same route within Y meters → suggest hold.
- Demand heatmap from passenger searches + boardings (already have occupancy).
- One-click "reroute / add trip" that publishes to drivers in realtime.

## 7. Eco-Rewards becomes real

- Points are written to `rewards_ledger` on tap-in (QR scan at stop) — verifiable, not clickable.
- Leaderboard is a real Supabase view.
- Partner coupons table seeded with local Sangamner businesses.

## 8. Demo polish that wins rooms

- `/about` page: problem, approach, architecture diagram, team, "Built for Bharat" framing, judging-criteria mapping.
- 60-second auto-playing demo mode on landing (`?demo=1`) that scripts a passenger journey end-to-end.
- Bilingual landing copy (toggle EN / हिंदी / मराठी).
- Open data export (`/api/public/gtfs`) — GTFS-realtime feed, shows interoperability.
- Footer: "Open source • MIT" + GitHub link placeholder.

## 9. SEO + sharing for judging-period virality

- Per-route head() metadata, OG images per page, sitemap already exists — extend.
- JSON-LD `GovernmentService` schema on landing.

## 10. Stretch (only if time permits)

- USSD simulator alongside IVR (truly featurephone-grade).
- Carbon credit certificate PDF generated server-side for top eco-users.
- Driver fatigue check-in (selfie + 3 questions) before trip start.

---

## Technical sequencing (suggested build order)

```text
Phase 1  Cloud + schema + auth + roles               (foundation)
Phase 2  Driver pings → realtime map                 (kills the "it's fake" objection)
Phase 3  Multi-language AI Sarthi (chat + voice)     (the theme win)
Phase 4  PWA / offline / 2G mode                     (inclusivity proof)
Phase 5  Real ETA + anomaly/bunching detection       (technical depth)
Phase 6  SOS + share-trip + QR tap-in rewards        (impact features)
Phase 7  /about, demo mode, bilingual landing, GTFS  (polish + storytelling)
```

## Judging-criteria mapping

- **Innovation** → Multi-language voice Sarthi, GTFS export, bunching detection
- **Impact / Bharat fit** → SMS/IVR/WhatsApp/USSD, 2G mode, women safety, Sangamner-specific
- **Technical depth** → Realtime pipeline, ETA model, anomaly detection, RLS, PWA
- **Completeness** → Real auth, real DB, real driver→passenger loop (not mocks)
- **Presentation** → Demo mode, /about narrative, bilingual UI

## What I need from you before building

1. Should I scope **Phase 1–3** for the first build pass, or go straight through Phase 5?
2. Which **3 languages** to ship in the AI Sarthi v1? (suggest: English, Hindi, Marathi)
3. OK to enable **Lovable Cloud** now (required for real auth/DB/realtime)?
4. Any features above you want to **drop or add** before I plan the implementation?
