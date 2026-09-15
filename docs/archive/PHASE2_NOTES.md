# Phase 2 – Vite + TS + Capacitor Skelett (FitTrack)

Stand: 2026-09-09 (UTC) · Quelle: `FitX/index.html` + `FitX/fitX.js` · Ziel: `../fittrack/`

## Status

- [x] `../fittrack/` als Sibling-Ordner angelegt (kein In-Place in `FitX/` gelöscht)
- [x] Tokens aus `fitX.js` → `THEMES` 1:1 nach `src/styles/tokens.css` übernommen (dark/light)
- [x] Konstanten `K`, `DAYS`, `EXERCISES`, `PLAN_TEMPLATES`, `SKILL_TREE`, `PERIODS` nach `src/lib/constants.ts` portiert
- [x] Pure Functions `dateKey`, `localDayKey` (neu, für Dexie-Indizes), `computePhotoStreak`, `countInPeriod`, `getNextEvent` (+ `hasTodayCheckin`, `formatCountdown`) nach `src/lib/dates.ts` portiert
- [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `capacitor.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/router.tsx` erstellt
- [x] Stores `theme`, `workout`, `nutrition`, `reminder`, `goal`, `profile` als Zustand-Skelette mit `hydrate()`-Stub erstellt
- [ ] `npm install` + `npm run build` – **noch offen (kein Node.js auf diesem Rechner)**

## Build-Status

**NICHT gebaut – kein Node.js verfügbar.**

- `node -v` / `npm -v`: beide nicht gefunden (`CommandNotFoundException`, PowerShell 5.1).
- `node_modules/` existiert nicht → `npm run build` konnte nicht ausgeführt werden.
- `npx tsc --noEmit` und `node --check` ebenfalls nicht möglich (kein Node, kein Python – nur PowerShell + .NET).
- Ersatz-Verifikation via PowerShell (ohne Node):
  - `package.json`, `tsconfig.json`, `tsconfig.node.json`: `ConvertFrom-Json` OK.
  - Pflicht-Strings per `Select-String` geprüft: Scripts `dev/build/preview/test/lint/cap:sync` ✓, `base './'` + `manualChunks vendor-react/vendor-state/vendor-ui` + `VitePWA` ✓, `appId de.fittrack.app` + `webDir dist` + `androidScheme https` + `allowMixedContent false` ✓, `dateKey/localDayKey/computePhotoStreak/countInPeriod/getNextEvent` ✓, Tokens `--bg/--accent` in dark+light ✓, `K/DAYS/EXERCISES/PLAN_TEMPLATES/SKILL_TREE` ✓, alle 6 Stores mit `create()` + `hydrate()` ✓.
  - `FitX/fitX.js` + `FitX/index.html` unverändert (nur `_migration/` ergänzt).

## Was noch `npm install` braucht (nächste Schritte auf Rechner mit Node.js LTS)

```powershell
cd "C:\Users\dariu\OneDrive - HBU\Dokumente\fittrack"
npm install
npm run build     # tsc --noEmit --skipLibCheck && vite build
npm test          # vitest run (src/lib/dates.test.ts)
npx cap add android
npm run cap:sync
```

Optional: `@capacitor/preferences` nachinstallieren (wird von `src/lib/storage.ts` dynamisch importiert, Build läuft auch ohne – dann localStorage-Fallback).

```powershell
npm i @capacitor/preferences
```

Fehlend für PWA-Release (Phase 3+): `public/icon-192.png`, `public/icon-512.png` (derzeit nur `README.txt`-Platzhalter).

## Hinweise zur Token-/Konstanten-Übernahme

- `THEMES.dark` / `THEMES.light` + `cssVars()`-Mapping (`--bg`, `--bg-elevated`, `--bg-input`, `--border`, `--border-strong`, `--text`, `--text-muted`, `--text-faint`, `--accent`, `--accent-contrast`, `--accent2`, `--accent2-contrast`, `--danger`, `--tabbar-bg`, `--shadow`, `--blob-a/b/c`, `--bg-glow`) exakt übernommen; Umschaltung über `data-theme` auf `<html>`.
- `K`-Keys (`fitness:*`) exakt übernommen, auch in `src/lib/storage.ts` + Stores wiederverwendet.
- `DAYS`, `PERIODS`, `SKILL_TREE`-IDs/Tiers/Struktur 1:1; **Umlaute/Emojis bereinigt**: `fitX.js` ist defekt kodiert (`Bankdr�cken`, `???`-Emojis) – im Skelett stehen korrekte Umlaute (Bankdrücken, Klimmzüge, Rudergerät …) und stabile Emojis (🏋️/💪/🦵/🔥/🏃/🚴/🚣/🧘). Bei Phase-3-Migration Original-Texte aus der laufenden App gegenprüfen.
- `getNextEvent`/`countInPeriod`/`computePhotoStreak` logikgleich portiert, zusätzlich `now`-Parameter für Testbarkeit (Default `Date.now()` → produktiv identisch zu FitX).
- Router: Tabs wie FitX (`/`, `/training`, `/ernaehrung`, `/erinnerungen`, `/ziele`); für Capacitor-`file://` ggf. später `createHashRouter` evaluieren (derzeit `createBrowserRouter` mit `basename './'`).

## Erstellte Dateien in `../fittrack/`

- `package.json` (Scripts dev/build/preview/test/lint/cap:sync; react 18.3.1, react-router-dom 6, zustand, dexie, lucide-react, vite-plugin-pwa)
- `vite.config.ts` (base './', react automatic runtime, VitePWA-Manifest FitTrack, manualChunks vendor-react/vendor-state/vendor-ui)
- `tsconfig.json`, `tsconfig.node.json`
- `capacitor.config.ts` (appId de.fittrack.app, webDir dist, androidScheme https, allowMixedContent false)
- `index.html`
- `src/main.tsx`, `src/App.tsx`, `src/router.tsx`, `src/vite-env.d.ts`
- `src/styles/tokens.css`, `src/styles/global.css`
- `src/lib/constants.ts`, `src/lib/dates.ts`, `src/lib/dates.test.ts`, `src/lib/storage.ts`
- `src/db/database.ts` (Dexie-Skelett v1: workouts/meals/checkins)
- `src/stores/theme.ts`, `src/stores/workout.ts`, `src/stores/nutrition.ts`, `src/stores/reminder.ts`, `src/stores/goal.ts`, `src/stores/profile.ts`
- `src/pages/HomePage.tsx`, `TrainingPage.tsx`, `NutritionPage.tsx`, `RemindersPage.tsx`, `GoalsPage.tsx`
- `.gitignore`, `public/README.txt` (Icon-Platzhalter)
