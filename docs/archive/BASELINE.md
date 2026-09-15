# FitTrack – Phase 0 Baseline (2026-09-10)

> Nur Messung + Backup, keine App-Logik geändert.

- Arbeitsverzeichnis: `C:\Users\dariu\OneDrive - HBU\Dokumente\FitX`
- Backup-Ordner: `C:\Users\dariu\OneDrive - HBU\Dokumente\FitX-backup-20260910`
- Messdatum (UTC): 2026-09-10
- Methode: `Get-ChildItem` (Length in Bytes), Zeilen per Read/`Get-Content -Raw` Split, Keys aus `K`-Objekt in `fitX.js:9-21`, Risiken aus `index.html` Boot-Sequenz.

## 1. Datei-Tabelle

| Datei | Größe (Bytes) | Größe (KB) | Zeilen | Risiko |
|---|---|---|---|---|
| `index.html` | 3876 | 3,79 | 79 | **HOCH (Kaltstart):** 4× `esm.sh`-Netzwerkimports (react@18.3.1, react-dom@18.3.1/client, @babel/standalone@7.26.3, lucide-react@0.468.0), sequenzielle `await`-Kette, kein Offline-Fallback/Service-Worker, `file://`-XHR braucht `AllowFileAccessFromFileURLs` |
| `fitX.js` | 93163 | 90,99 | 1755 | **MITTEL:** Laufzeit-JSX-Kompilierung via Babel `classic`-Runtime + Bare-Specifier-Rewrite per Regex, `window.storage`-Shim auf `localStorage`, Fotos als JPEG-dataURL in `localStorage` (Quota-Risiko), 11 Keys, kein Schema/Version |
| `android/app/src/main/java/de/fittrack/app/MainActivity.java` | 4768 | 4,66 | 105 | **MITTEL:** `file:///android_asset/index.html`, `setAllowFileAccessFromFileURLs(true)` + `setAllowUniversalAccessFromFileURLs(true)` erforderlich (sonst Weißbild), `setWebContentsDebuggingEnabled(true)` in Release unerwünscht, nur Image-FileChooser |
| `android/app/src/main/AndroidManifest.xml` | 592 | 0,58 | 11 | **NIEDRIG:** nur `INTERNET`-Permission, `allowBackup="true"` sichert WebView-`localStorage` (Restore-Risiko bei Downgrade), kein `usesCleartextTraffic`-Flag |
| `android/app/build.gradle` | 293 | 0,29 | 17 | **NIEDRIG:** `compileSdk 36`, `targetSdk 36`, `minSdk 24`, `versionCode 2` / `versionName "1.1"`, keine Signing-/Release-Config in Datei |

Summe Kern-Dateien (ohne Build-Artefakte): **102692 Bytes (~100,3 KB)**.

## 2. localStorage-Keys (`K`-Objekt, `fitX.js:9-21`)

```js
const K = {
  reminders: "fitness:reminders",
  workouts: "fitness:workouts",
  meals: "fitness:meals",
  theme: "fitness:theme",
  profile: "fitness:profile",
  proposals: "fitness:proposals",
  plans: "fitness:plans",
  sharedPlans: "fitness:sharedPlans",
  nutrition: "fitness:nutritionProfile",
  checkins: "fitness:checkins",
  skills: "fitness:skills",
};
```

Liste (11 Keys, alle Prefix `fitness:`):
1. `fitness:reminders`
2. `fitness:workouts`
3. `fitness:meals`
4. `fitness:theme`
5. `fitness:profile`
6. `fitness:proposals`
7. `fitness:plans`
8. `fitness:sharedPlans`
9. `fitness:nutritionProfile`
10. `fitness:checkins`
11. `fitness:skills`

Zugriff nur über `loadJSON`/`saveJSON` (`fitX.js:23-37`) mit `window.storage`-Shim (`index.html:38-48`).

## 3. Kaltstart-Risiken (Boot-Pfad `index.html:23-77`)

Schritt-Kette (`step`-Variable): `init` → `lade react` → `lade react-dom` → `lade babel` → `lade fitX.js` → `kompiliere JSX` → `starte App`.

1. **esm.sh-Ausfall = Weißbild:** Importmap (`index.html:12-17`) + direkte `import("https://esm.sh/...")` für React, React-DOM/Client, Babel, Lucide. Kein Vendor-Bundle, kein SRI-Hash, kein Retry.
2. **Babel-Standalone (~3 MB) zur Laufzeit:** `await import("https://esm.sh/@babel/standalone@7.26.3")` + `Babel.transform(source, { presets: [["react", { runtime: "classic" }]] })` bei jedem Start über ~93 KB `fitX.js`. Langsam auf Low-End-Geräten, belegt Speicher.
3. **Blob-URL + Importmap-Lücke:** Kompilat wird per `URL.createObjectURL(new Blob(...))` importiert; Bare-Specifier (`react`, `lucide-react`) müssen vorher per Regex auf `https://esm.sh/...` umgeschrieben werden (`index.html:65-67`). Bricht bei neuen Imports.
4. **`file://`-XHR:** `fitX.js` wird per `XMLHttpRequest GET "fitX.js"` geladen (kein `fetch`), funktioniert nur mit `AllowFileAccessFromFileURLs` im WebView. Über `npx serve`/Hosting Status 200, im WebView Status 0-Fallback.
5. **Kein Offline-Cache:** kein Service-Worker, kein lokales React-Bundle. Flugmodus → Fehlerbox „Start fehlgeschlagen bei Schritt […]".

## 4. Backup-Verifikation

Backup-Pfad: `C:\Users\dariu\OneDrive - HBU\Dokumente\FitX-backup-20260910\`

Erwarteter Inhalt (5 Einträge, Größen identisch zu Quelle):
- `index.html` (3876 Bytes)
- `fitX.js` (93163 Bytes)
- `android/app/build.gradle` (293 Bytes)
- `android/app/src/main/AndroidManifest.xml` (592 Bytes)
- `android/app/src/main/java/de/fittrack/app/MainActivity.java` (4768 Bytes)

Verifiziert per `Get-ChildItem -Recurse` (siehe Phase-0-Protokoll).
