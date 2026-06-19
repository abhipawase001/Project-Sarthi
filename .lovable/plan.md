## Drishti — Competition Submission PDF (fills the Ideathon Track 3 template)

Produce a single judge-ready PDF that mirrors your uploaded `IDEATHON_TRACK_3.pptx` template, with every required slide filled in for **Project Drishti** (the smart public-transit + depot-automation app currently in this repo). Output: `/mnt/documents/drishti-ideathon-track3.pdf`, surfaced via `<presentation-artifact>` for one-click download.

### Approach
1. Unpack the uploaded `.pptx` template so the original **Redrob × Hack2Skill branding, layout, fonts and background images stay intact** — we edit the XML in place rather than rebuilding from scratch. This guarantees the deck visually matches the official template.
2. Replace the placeholder text on each content slide with Drishti-specific copy (see content map below).
3. Add a small Appendix (≤5 slides) with architecture, data model, security model, and AI-feature roadmap — all allowed by the template's own rules.
4. Repack to `.pptx`, convert to PDF via LibreOffice, then render every page to JPEG and visually QA each one (overflow, clipping, contrast, leftover placeholders). Iterate until clean.

### Slide-by-slide content map
| # | Template slide | Drishti content |
|---|---|---|
| 1 | Cover (India.Runs / Track 3) | unchanged |
| 2 | Redrob context | unchanged |
| 3 | "Important" | unchanged |
| 4 | Team / Problem statement | **Team Name**, **Problem Statement: "Unreliable, opaque public transit + paperwork-choked bus depots"**, **Team Members** (placeholders you can edit) |
| 5 | Problem We Want To Solve | Daily commuter pain (no live ETAs, safety gaps, language barriers) + depot pain (manual rosters, fuel/service logbooks). Who: 50M+ daily bus riders, drivers, depot managers, transit authorities. Why it matters: time lost, safety, ₹ wasted, no data trail. |
| 6 | Idea Overview | Drishti = AI-native transit OS: Live map + Sarthi chat + Anomaly AI + Paperless Depot + Authority dashboard. Redrob fit: plugs into Redrob's AI workflow + recommendation layer; depot module mirrors Redrob's hiring/productivity DNA for transit ops. |
| 7 | (visual divider) | Hero screenshot/illustration of Drishti map + chat |
| 8 | User Journey & Experience | 3 personas walkthrough: **Commuter** (open app → see live bus → ask Sarthi in Hindi → SOS if needed), **Driver** (start shift → roster auto-assigns → anomalies flagged), **Depot Manager** (one console for buses/drivers/roster/fuel/service — zero paperwork). |
| 9 | (visual divider) | Screenshot grid: /, /authority, /depot, /demo, /impact |
| 10 | Accessibility & Inclusivity | Multilingual Sarthi (HI/EN/MR/TA roadmap), high-contrast + screen-reader announcements, Divyangjan-friendly bus filter, offline/SMS fallback for low-bandwidth users, voice-first option. |
| 11 | (visual divider) | Impact KPI mock (CO₂ saved, 31% wait reduction, ₹14.2L savings, SDG 9/11) |
| 12 | (visual divider) | Architecture sketch |
| 13 | Appendix intro | kept as-is |
| 14 | Thank You | kept as-is |

### Appendix slides we add (within the 5-slide allowance)
- **A1 — Architecture**: TanStack Start + React 19, Lovable Cloud (Postgres+Auth+Storage), Lovable AI Gateway (Gemini), server functions vs edge routes.
- **A2 — Data Model**: tables (buses, drivers, roster, anomalies, trip_logs, fuel_logs, service_logs, user_roles) + `public_drivers` sanitized view.
- **A3 — Security**: RLS on every table, `app_role` enum (admin/dispatcher/viewer), `has_role`/`has_any_role` security-definer fns, PII hidden from anon.
- **A4 — AI Features**: Sarthi chat, Anomaly severity scoring, Depot AI assistants, Predictive ETA + Voice (roadmap).
- **A5 — Roadmap & Ask**: Voice Sarthi, PWA+SMS, Citizen Reporting, Predictive ETA, pilot ask.

### Out of scope
- No app code changes.
- No new routes, components, or migrations.
- Won't change the template's branded slides (1, 2, 3, 13, 14).

### Things you can tweak after I generate it
- Team name + member names on slide 4 (I'll insert clearly marked placeholders).
- Any wording on slides 5/6/8/10 — easy to swap before submission.

Reply **approve** (or "go") and I'll generate the PDF.
