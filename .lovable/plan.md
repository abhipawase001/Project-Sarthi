# Hackathon Winning-Edge Plan

You already have the core (Live map, SOS, Sarthi chat, Anomaly AI, Depot console, RLS). To stand out at India Runs judging, add features that hit the rubric judges actually score: **Innovation, Social Impact, Technical Depth, Demo Polish, Scalability**.

## 1. Judge Demo Mode (highest ROI)
A `/demo` route with a scripted 90-second walkthrough:
- "Play Scenario" buttons: *Bus breakdown*, *Route deviation*, *Crowd surge*, *SOS triggered*
- Auto-drives the map, fires anomalies, triggers Sarthi alerts, shows AI response live
- Floating narrator card explains each step
- Wins because judges see every feature in one click without you fumbling.

## 2. Voice-First Multilingual Sarthi
- Add Web Speech API mic button → STT → Sarthi → TTS reply
- Language toggle: Hindi / English / Marathi / Tamil (Gemini handles translation)
- Huge accessibility + Bharat-first story for judges

## 3. Predictive ETA & Crowd Forecast
- New `src/lib/eta-ai.functions.ts`: Gemini + historical `HOURLY_RIDERSHIP` predicts:
  - Arrival ETA per stop (with confidence band)
  - "Bus will be crowded in 15 min" warnings on Live map
- Show as colored pills on stop markers

## 4. Accessibility Layer (Divyangjan)
- High-contrast mode toggle
- Screen-reader-friendly bus announcements ("Bus 42 arriving platform 3")
- Wheelchair-accessible bus filter
- Strong DEI judge points

## 5. Offline PWA + SMS Fallback
- Add `manifest.webmanifest` + service worker → installable, works offline
- "Last known location" cache for low-network areas
- Optional: server route `/api/public/sms-eta` that returns plain-text ETA (mention Twilio in pitch even if not wired)

## 6. Impact Dashboard (`/impact`)
Public-facing KPIs auto-computed from DB:
- CO₂ saved vs car trips
- Avg wait time reduced
- SOS response time
- Anomalies auto-resolved by AI
Gives judges concrete numbers to quote.

## 7. Citizen Reporting + Gamification
- "Report" button on each bus: overcrowded / rash driving / AC broken
- Points + leaderboard for verified reports
- Feeds depot console as a new data source

## 8. Pitch Polish
- Landing page hero: 1 killer line + animated stats counter
- `/about` → add architecture diagram (Mermaid) + tech stack badges
- README with problem→solution→impact→roadmap
- 30-sec Loom-style auto-play video on landing (optional)

## Technical Notes
- All AI via existing Lovable AI Gateway (`google/gemini-3-flash-preview`); no new keys.
- New tables: `citizen_reports`, `impact_metrics` (RLS + GRANTs per project rules).
- New routes: `/demo`, `/impact`, `/report`. PWA via `vite-plugin-pwa`.
- Voice: browser-native APIs, no extra deps.

## Suggested Build Order (if time-boxed)
1. Demo Mode + Impact Dashboard (4 hrs) — biggest judge impact
2. Voice Sarthi + Multilingual (3 hrs)
3. Predictive ETA (2 hrs)
4. Accessibility + PWA (2 hrs)
5. Citizen Reporting (2 hrs)

---

**Which slice should I build first?** Reply with numbers (e.g. "1, 2, 6") or "all in order" and I'll start implementing.
