# Sarthi real fleet, operations, and mobile release

## Outcome
Replace moving demo buses with the registered Sarthi fleet and verified live GPS; use the same current positions for maps and SMS/IVR ETAs; complete depot workflows; release refreshed Android apps and publish the web update.

## Work
1. **Fleet and live locations**
   - Use `buses` as the authoritative fleet list; retain existing fleet records and support adding/editing vehicles in Depot.
   - Authenticate drivers, connect confirmed driver accounts to existing crew records by verified email, and allow only their active roster assignment to submit GPS.
   - Store each accepted fix with its capture time/accuracy; keep a sanitized latest-position feed for passenger/authority maps, with no simulated fallback or stale-marker reuse.
   - Calculate map, SMS, and IVR ETAs from the same fresh positions and configured route/stop geometry; return unavailable when no fresh fix exists.
2. **Depot operations**
   - Complete crew add/edit, fuel and service history/forms, and persisted trip start/end records with GPS-derived distance where samples are available.
   - Check and display database errors rather than reporting failed saves as successful; preserve existing operational rows.
3. **Release and verification**
   - Add focused tests for live-only fleet selection, freshness, and real-position ETA behavior; verify driver-to-assignment enforcement and depot flows in the preview where an authorized account is available.
   - Rebuild the three named APKs to load the published Sarthi app, then publish the site so installed shells receive the updated web experience.

## Technical details
- Use the existing `buses`, `drivers`, `roster`, `bus_pings`, `fuel_logs`, `service_logs`, and `trip_logs` tables; add only the driver-account link and live-position fields/table required for secure ingestion and a safe latest-position feed. Apply database changes through a migration with explicit grants and row policies.
- Keep email confirmation enabled. Driver access requires a crew email already entered by depot staff and a valid roster assignment; do not invent or seed real fleet/crew records or promote an account to staff automatically.
- Existing depot mutations require an admin/dispatcher account. No such user-role assignment was found during inspection; staff-only operations and authenticated end-to-end verification may remain gated until an authorized account is available.
- The previous APKs exist, but the persistent build script, Java, Android SDK, and Gradle are currently absent. Recreate/provision the build environment before delivering fresh APKs; never claim older APKs include these changes.
- Check current security scan before publishing. A publish request only schedules deployment; publishing is required for installed web-loading APKs to receive these site changes.
