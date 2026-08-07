# Offline & Low-Connectivity Mode for Drishti

Tier-2 India riders often have patchy 2G or no data at all. Right now the app needs a live connection for everything: map tiles, bus positions, AI chat, SOS. This plan makes Drishti usable when the network drops — and makes that visibly part of the pitch.

## What users get

1. **Installable app** — Drishti can be added to a phone home screen with its own icon and splash screen, so it opens like a native app.
2. **Works offline** — the app shell, routes, stops and last-known timetable open instantly with no network. A clear "Offline — showing last synced data" banner with the sync timestamp appears instead of stale numbers pretending to be live.
3. **Offline timetable & stop finder** — static route/stop/schedule data is cached on first visit, so a rider without data can still see which bus runs from which stop and its scheduled times.
4. **Last-known live snapshot** — the most recent bus positions, ETAs and seat counts are stored on the device and shown greyed-out with "as of HH:MM" when offline.
5. **Queued actions (offline SOS & incident reports)** — pressing SOS or filing an incident with no network saves it on the device and auto-sends the moment connectivity returns, with a "1 pending, will send when online" indicator.
6. **Driver console offline-first** — drivers lose signal mid-route constantly. Trip logs, fuel entries and stop check-ins are queued locally and flushed on reconnect.
7. **Low-data / 2G mode** — a toggle that stops map tile loading (list view only), slows the live poll, and disables AI calls, cutting data use dramatically.
8. **Zero-internet fallback signposting** — the existing SMS/IVR/WhatsApp channels page becomes the explicit "no smartphone / no data" path, surfaced from the offline banner itself.

## Judging angle

Offline-first is a strong inclusion story for an India-focused hackathon: it turns "nice app" into "works for the person standing at a village stop with one bar". The demo can toggle airplane mode live and show the app still working plus a queued SOS firing on reconnect.

## Technical approach

- **PWA**: add `public/manifest.webmanifest` (name, standalone, theme `#0b1220`, icons) plus head tags in `src/routes/__root.tsx`, and app icons in `public/`.
- **Service worker**: `vite-plugin-pwa` with `generateSW`, `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions.enabled: false`. Registration goes through one guarded wrapper module that refuses to register in dev, inside an iframe, on Lovable preview hostnames, or with `?sw=off` (unregistering any matching `/sw.js` in those cases). Navigations use `NetworkFirst`; hashed same-origin assets use `CacheFirst`; `/~oauth` excluded from navigation fallback. Offline in the Lovable editor preview is intentionally disabled — it only works on the published app.
- **Map tiles**: runtime `CacheFirst` cache for OpenStreetMap tiles with a capped entry count and expiry, so previously viewed areas render offline.
- **Local persistence**: `localStorage` for the low-data toggle and last-synced snapshot; IndexedDB (small wrapper in `src/lib/offlineQueue.ts`) for the pending-action queue since SOS payloads must survive reload.
- **Sync**: a `useOnlineStatus` hook (`navigator.onLine` + `online`/`offline` events, read in `useEffect` only) drives the banner; on reconnect the queue flushes to the existing server functions / Supabase inserts, deduped by client-generated UUID so retries can't double-post.
- **AI guards**: `askSarthi`, `explainAnomaly` and the depot command bar short-circuit with a friendly "needs internet" message when offline instead of throwing.
- **Live hook**: `useLiveBuses` writes each tick's snapshot to storage and, when offline or in low-data mode, stops stepping and serves the stored snapshot with its timestamp.
- **Hydration safety**: all clock/timestamp rendering (currently a locale time string on the landing page, and similar spots in driver/incidents/anomaly views) moves behind `useEffect`/`useHydrated` so server and client HTML match.
