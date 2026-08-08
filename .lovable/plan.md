# Real toll-free IVR (1800) for Drishti

Today the IVR box on the Channels page is a scripted animation. This plan makes the phone line real: a caller dials a number, hears an AI voice in Hindi/Marathi/English, presses digits to pick a route and stop, and hears the live bus ETA — the same engine that powers the SMS replies.

## What you get

1. **A working voice line.** A single phone endpoint that answers calls, plays menus, reads keypad input, and speaks live ETAs.
2. **AI voice output.** Prompts are spoken with Lovable AI text-to-speech (natural Hindi/Marathi/English), not robotic provider TTS. Fixed phrases are generated once and cached; only the ETA sentence is generated per call.
3. **Call flow**
   - "Namaste, Drishti mein swagat hai. Hindi ke liye 1, मराठीसाठी 2, English press 3."
   - "Press 1 for Depot–Malpani, 2 for Hospital–Akole, 3 for Pravara Circuit."
   - "Press the number for your stop: 1 …, 2 …, 3 …"
   - "Next bus MH17-AB-1023 arrives in 4 minutes, 14 seats free. Next one in 11 minutes. Press 1 to repeat, 9 for a call back alert."
   - Invalid/no input repeats the menu twice, then ends politely.
4. **Call log** so the depot can see how many calls, which routes, and drop-off points — shown as a small panel on the Channels page next to the SMS console.

## About the 1800 number itself

A genuine Indian 1800 toll-free number is issued by a telecom provider (Exotel / Knowlarity / Ozonetel) and needs your KYC — company/ID proof, address, and a monthly rental. That part is done in the provider's dashboard by you and typically takes 2–5 working days; it can't be provisioned from here.

What this build does: create the voice endpoint the number points to, so the moment your Exotel number is approved you paste one URL into their App Bazaar flow and the line is live. Until then the exact same endpoint is callable from the Channels page simulator and via test calls from any Exotel trial/virtual number.

You will need to provide the Exotel API key, API token, and subdomain/SID when the account is ready — I'll ask for them securely at that point.

## Technical notes

- **`src/lib/ivr-engine.ts`** — pure, stateless DTMF state machine reusing `etasForStop`, `stopsForRoute`, `ROUTES`, `STOPS` from `src/lib/sms-engine.ts` / `mockData.ts`. Input: `{ state, digit, lang }`; output: `{ say, nextState, expectDigits, hangup }`. Phrase text in en/hi/mr.
- **`src/routes/api/public/ivr.ts`** — Exotel-compatible server route (`createFileRoute` + `server.handlers`). Handles Exotel's `Passthru`/`Gather` callbacks (`CallSid`, `Digits`, `From`), returns the applet JSON/XML Exotel expects, and stays compatible with Twilio-style TwiML as a secondary format. Shared-secret auth via `IVR_WEBHOOK_SECRET` (header or `?key=`), same pattern as the SMS webhook; dry-run when unset.
- **`src/routes/api/public/ivr-audio/$id.ts`** — serves the spoken audio. Calls Lovable AI `POST /v1/audio/speech` with `google/gemini-2.5-flash-tts` (good Hindi/Marathi) from the server using `LOVABLE_API_KEY`, returns MP3/WAV with long cache headers. Static prompts are content-hashed and cached in a `ivr_audio_cache` table (base64 or storage bucket); dynamic ETA lines are generated per request. Fallback to the provider's own TTS if the gateway errors, so a call never fails silently.
- **Database migration** — `ivr_calls` (call_sid hash, lang, route, stop_id, last_state, ended_at) for per-call state across Exotel callbacks, plus `ivr_audio_cache`. Phone numbers stored only as a salted SHA-256 hash, matching the SMS tables. RLS: no anon access; `service_role` full; staff read via the existing `private.has_any_role` helper.
- **`src/components/IvrConsole.tsx`** — replaces the scripted `IvrBox` in `src/routes/channels.tsx`. A keypad that drives the real `ivr-engine` through a server function and plays the actual generated audio, so the demo is the production flow.
- **Small fix along the way:** the preview currently throws `window is not defined` during server rendering; that will be corrected as part of this work.

No changes to the SMS engine's behaviour — the IVR reuses it read-only.
