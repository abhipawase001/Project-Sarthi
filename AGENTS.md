# Project decisions

- Android apps are Capacitor debug-APK shells that load the published web app (`server.url` in `capacitor.config.json`); all data and features stay in the web app, and app updates ship by publishing the site — no APK rebuild needed for content changes. Why: one data source, smallest maintenance.
- Rebuild script for the three APKs lives at `/root/build-apks.sh` in the build sandbox (JDK 21 + Android SDK 35 under `/root/android-tools`); it is idempotent and copies finished APKs to `/mnt/documents`. Why: the sandbox wipes /tmp and /root between restarts, so the script must be rerunnable.
- Depot and Authority are one portal: `/portal` (tabs `?tab=ops` = Depot Ops, `?tab=command` = Authority Command Center); `/depot` and `/authority` redirect there. Consoles live in `src/components/DepotConsole.tsx` and `src/components/AuthorityConsole.tsx`. Why: the user merged both roles into a single operations portal.
