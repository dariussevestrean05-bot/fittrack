# FitTrack Release – Phase 6 (versionCode 3 / versionName 2.0)

> Paket: `de.fittrack.app` – Keystore MUSS identisch bleiben, sonst Update-Bruch!

## 1. Version anheben
`android/app/build.gradle`:
```gradle
android {
  defaultConfig {
    applicationId "de.fittrack.app"
    versionCode 3
    versionName "2.0"
  }
}
```
- [ ] `versionCode 3` gesetzt (immer +1, nie zurücksetzen).
- [ ] `versionName "2.0"` gesetzt.
- [ ] `applicationId` exakt `de.fittrack.app` (case-sensitiv).

## 2. Keystore-Check (Pflicht vor jedem Bundle)
```bash
# Fingerprint des Release-Keys anzeigen:
keytool -list -v -keystore android/fittrack-release.keystore -alias fittrack
# Erwarteter Owner/Issuer muss mit Vorrelease übereinstimmen.
# APK-Signatur prüfen:
apksigner verify --print-certs android/app/build/outputs/bundle/release/app-release.aab
```
- [ ] Gleicher Keystore wie versionCode 1/2 (SHA-256 Fingerprint verglichen, notiert: ________).
- [ ] `android/local.properties` / CI-Secret `KEYSTORE_PASSWORD` gültig, kein neues Keystore erzeugt.
- [ ] Bei Verlust: KEIN Workaround – neuer Paketname nötig (nicht tun, erst melden).

## 3. Build
```bash
# in ../fittrack (bzw. FitX nach Migration):
npm ci
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```
- [ ] Build ohne `esm.sh`-Importe (siehe Grep-Checks).
- [ ] `dist/index.html` enthält CSP-Meta (siehe `dist/index.html` Sample).
- [ ] Sourcemaps vorhanden (`sourcemap: true`), aber NICHT im Store-Bundle zusätzlich ausliefern.

## 4. Internal Track 10%
1. Play Console → FitTrack → Release → Interner Test → Neuen Release erstellen → `.aab` hochladen.
2. Rollout auf 10% (Staged Rollout / prozentualer Rollout, halt bei Crash-Rate > 1%).
3. 48h beobachten (ANR, Crashes, QA_CHECKLIST Stichprobe Offline-Kaltstart + Notification).
4. Danach: auf Produktion hochstufen ODER fix + versionCode 4.
- [ ] 10%-Rollout aktiv, Monitoring-Link notiert: ________.

## 5. Grep-Checks (müssen ALLE leer sein – vor Upload ausführen)
```bash
# 1. Kein periodischer Shared-Refresh (Batterie + Race):
grep -rn "setInterval.*refreshShared" src fitX.js || echo "OK: kein refreshShared-Interval"
# 2. Kein notifiedRef-Leak (Set muss pro Tag gecappt / gecleart werden):
grep -rn "notifiedRef" src fitX.js
#    -> manuell prüfen: add(key) nur mit Datum-Key `id|dateString`, Clear beim Tageswechsel / max 100 Einträge.
# 3. Kein esm.sh im Build (CSP + Offline-Bruch):
grep -rn "esm\.sh" dist index.html src || echo "OK: kein esm.sh"
```
- [ ] Check 1 leer / begründet.
- [ ] Check 2 reviewed (kein unbegrenztes Wachstum).
- [ ] Check 3 leer.

Aktueller Stand FitX (`fitX.js`): `setInterval(refreshShared, 15000)` (Z. ~313) und
`notifiedRef = useRef(new Set())` (Z. ~261) sowie `esm.sh`-Imports (index.html + fitX.js)
sind BEKANNT und müssen bei Migration nach `../fittrack/src` entfernt/ersetzt werden
(native Sync via Capacitor + LocalNotifications, Bundling via Vite).

## 6. CHANGELOG Draft (2.0)
```markdown
## [2.0] – 2026-09-10 (versionCode 3)
### Neu
- Virtualisierte Workout-Historie (60fps bei 1000 Einträgen, overscan 4)
- Bild-Pipeline: Thumbs 320px + Lazy/Async + Blur-Up, Low-End no-fx Modus
- PWA: installierbar (standalone), Offline-Kaltstart via navigateFallback, OFF-Suche mit 4s NetworkFirst-Cache
- CSP gehärtet (kein eval, kein esm.sh im Build)
### Fix
- Back-Button / Rotation / Theme-Persistenz stabilisiert
- Notification nach Kill+Reboot verlässlich
### Bekannt / TODO
- PWA-Icons müssen final generiert werden (siehe public/PWA_ICONS_TODO.md)
- Keystore-Fingerprint: ________ (eintragen)
```
- [ ] CHANGELOG in Release-Notes (Play Console, de-DE) kopiert.

## 7. Offene manuelle Schritte (nicht automatisierbar)
- PWA-Icons generieren (`pwa-asset-generator`, siehe `public/PWA_ICONS_TODO.md`).
- Keystore-Fingerprint vergleichen + notieren.
- 2-Geräte-QA (Low-End + Flagship) laut `QA_CHECKLIST.md` abhaken.
- Play Console: Datenschutzerklärung + Berechtigungen (Kamera, Notifications, Fotos) prüfen.
- Backup-Restore-Test mit echten Nutzerdaten (identisch-Bestätigung).
