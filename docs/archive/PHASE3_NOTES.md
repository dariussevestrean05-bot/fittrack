# FitTrack Phase 3 – Dexie Data-Layer + Migration

> Referenz-Ablage (da `../fittrack` noch nicht existiert):
> `FitX/_migration/code-samples/src/lib/...`
> Ziel im echten Projekt: `fittrack/src/lib/...` (1:1 kopieren).
>
> Legacy-Quelle: `FitX/fitX.js`
> Gelesene Abschnitte: K-Keys (Z.9–21), loadJSON/saveJSON (Z.23–37),
> fileToPhotoDataUrl (Z.120–158), computePhotoStreak/hasTodayCheckin (Z.160–187),
> macroTargets/calcDailyGoal (Z.813–890).

## 1. Dateien

| Datei (Referenz) | Ziel (`fittrack/...`) | Zweck |
|---|---|---|
| `code-samples/src/lib/storage/types.ts` | `src/lib/storage/types.ts` | zod-Schemas + TS-Typen (Workout, Meal, Checkin mit `photoId`, SkillsMap, Nutrition, Reminder, Proposal, Plan, SharedPlan mit `authorId/updatedAt/v/deleted`, Photo/FoodsCache/Meta) |
| `code-samples/src/lib/storage/db.ts` | `src/lib/storage/db.ts` | `FitTrackDB extends Dexie`, Versionen v1–v3, `dataUrlToBlob()` via `fetch(dataUrl).blob()`, Upgrades v2 (checkins) / v3 (skills) |
| `code-samples/src/lib/storage/repositories.ts` | `src/lib/storage/repositories.ts` | `workoutsRepo`, `mealsRepo`, `checkinsRepo`, `skillsRepo`, `plansRepo`, `sharedPlansRepo`, `remindersRepo`, `proposalsRepo`, `photosRepo.putFullAndThumb()` + `thumbUrl()/fullUrl()` + `revoke/revokeAll` |
| `code-samples/src/lib/storage/legacyAdapter.ts` | `src/lib/storage/legacyAdapter.ts` | `migrateFromLocalStorage()` – liest `fitness:*`, zod-validiert, DataURL→Blob, `bulkPut` in Transaktion, `meta.legacyMigratedAt`, Backup-Kopie `fitness:backup:*`, löscht nie |
| `code-samples/src/lib/storage/backup.ts` | `src/lib/storage/backup.ts` | `exportBackup()/importBackup()` (+ `wipeAll()`, `downloadBackupFile()`), `quotaStatus()` via `navigator.storage.estimate()` + `persist()` |
| `code-samples/src/lib/dates.ts` | `src/lib/dates.ts` | `localDayKey()/localDayStart()` statt `toDateString()`, inkl. `hasTodayCheckin()/computePhotoStreak()`-Ersatz |
| `code-samples/src/lib/images.ts` | `src/lib/images.ts` | `fileToPhotoBlobs()` (max 1280 WebP-Loop bis <280 KB + 256-Thumb + `imageOrientation: from-image`), `num()/int()/clamp()` |

## 2. Schema-Diagramm (IndexedDB via Dexie)

```
┌─────────────┐  ┌──────────┐  ┌────────┐  ┌─────────────┐  ┌───────────┐  ┌───────────┐
│ workouts    │  │ meals    │  │ plans  │  │ sharedPlans │  │ reminders │  │ proposals │
│ id* ts      │  │ id* ts   │  │ id*    │  │ id*         │  │ id*       │  │ id* day   │
│ name        │  │ name     │  │ name   │  │ +originId   │  │ label     │  │ title     │
│ sets[]      │  │ kcal/P/C/F│ │ emoji  │  │ +author     │  │ time HH:MM│  │ day+time  │
└─────────────┘  └──────────┘  │ exerc. │  │ +authorId!  │  │ days[Mo..]│ │ status    │
                               └────────┘  │ +updatedAt! │  │ active    │  │ author    │
                                           │ +v +deleted │  └───────────┘  └───────────┘
                                           └─────────────┘
┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐
│ checkins │  │ skills   │  │ photos │  │ meta   │  │ foodsCache│  │nutrition│  │ profile │
│ id* ts   │  │ id*      │  │ id*    │  │ key*   │  │ name*     │  │ id=def. │  │ id=def. │
│ photoId→ │──│ photoId→ │→ │ full   │  │ value  │  │ kcal/P/C/F│  │ value   │  │ value   │
│ photos.id│  │ photos.id│  │ thumb  │  │        │  │ brand/... │  │         │  │         │
└──────────┘  └──────────┘  └────────┘  └────────┘  └───────────┘  └─────────┘  └─────────┘
  * = Primärschlüssel / Index. → = Blob-Referenz (kein DataURL mehr in Tabellen).
```

Primärschlüssel/Indizes (Dexie):

- v1: `workouts: id,ts` · `meals: id,ts` · `plans: id` · `sharedPlans: id,updatedAt` ·
  `reminders: id` · `proposals: id,day` · `checkins: id,ts` · `skills: id` ·
  `meta: key` · `photos: id,createdAt` · `foodsCache: name,updatedAt` ·
  `nutrition: id` · `profile: id`
- v3: `sharedPlans` zusätzlich `deleted` (Tombstone-Query für Sync).

## 3. Migrationsablauf

```
Boot (main.tsx)
  │
  ├─ db = new FitTrackDB()            // Dexie öffnet, fährt v1→v2→v3 Upgrades
  │    ├─ v2.upgrade: checkins.photo (data:image…) ─fetch().blob()→ photos.put
  │    │              → checkins := { id, ts, photoId }  (photo-Feld gedroppt)
  │    └─ v3.upgrade: skills[*].photo (data:image…) ─fetch().blob()→ photos.put
  │                   → skills := { id, done, ts, photoId? }
  │
  ├─ hasMigrated()? ── ja ──→ fertig (idempotent, kein Zweitlauf)
  │                    nein
  │                     ↓
  ├─ migrateFromLocalStorage()
  │    1. window.storage.get (shared=true für proposals/sharedPlans) ∥ localStorage
  │       Keys: fitness:reminders/workouts/meals/theme/profile/proposals/plans/
  │             sharedPlans/nutritionProfile/checkins/skills   (K, Z.9-21)
  │    2. zod-safeParse pro Eintrag → gültige übernehmen, Rest in skippedInvalid zählen
  │       SharedPlan anreichern: authorId:=deviceId, updatedAt:=now, v:=1, deleted:=false
  │    3. DataURL→Blob VOR der Transaktion (fetch(dataUrl).blob()):
  │          checkins[].photo → photos["<id>-photo"], skills{}[].photo → photos[...]
  │    4. EINE rw-Transaktion über alle Tabellen → bulkPut (+ meta.legacyMigratedAt,
  │       meta.legacyMigratedCounts)
  │    5. Backup: jeden gelesenen fitness:*-Wert nach fitness:backup:<key> kopieren
  │       (window.storage + localStorage). NIEMALS löschen/überschreiben von fitness:*.
  │
  └─ UI nutzt danach nur noch Repositories (kein loadJSON/saveJSON mehr).
```

Fehler-Prinzipien: einzelnes defektes Foto / einzelner invalider Eintrag bricht
nie die Gesamt-Migration ab (gezählt in `skippedInvalid` / `errors`).

## 4. Warum die Neu-Helfer?

- `localDayKey()` statt `toDateString()`: `dateKey()` (Z.117) liefert
  `"Wed Sep 10 2026"` – nicht sortierbar, locale-abhängig. `localDayKey()`
  liefert `YYYY-MM-DD` lokal, sortierbar, testbar. `computePhotoStreak` und
  `hasTodayCheckin` sind in `lib/dates.ts` mit identischer Semantik neu
  implementiert (Streak toleriert fehlendes Heute, zählt ab Gestern).
- `fileToPhotoBlobs()` statt `fileToPhotoDataUrl()` (Z.120–158): statt
  900px-JPEG-DataURL in `localStorage` (Quota-Killer, +33 % Overhead) jetzt
  1280px-WebP <280 KB + 256px-Thumb als `Blob` in IndexedDB, mit
  EXIF-Korrektur (`imageOrientation: from-image`) – löst verdrehte
  Handy-Fotos. `num()` ersetzt `Number(x)||0`-Streuung aus Z.813–890
  (versteht `"82,5"`, `""`, `null` → `fallback`).
- `photosRepo.thumbUrl()` cached `URL.createObjectURL()` und **muss** via
  `revoke(id)` / `revokeAll()` freigegeben werden (sonst Speicher-Leak bei 50+ Fotos).
- `quotaStatus()` warnt VOR dem Schreiben (ersetzt stummes `console.error`
  in `saveJSON`, Z.31–37): `percent > 85 %` oder `< 50 MB frei` → kritisch,
  Backup anbieten.

## 5. Tests (manuell, gefordert)

### T1 – 50 Fotos (Speicher + Thumb-Leak)

1. 50× Check-in-Foto (verschiedene Bilder, auch Hochkant) hochladen.
2. Erwartung: jedes Vollbild <280 KB (in DevTools → IndexedDB `photos` prüfen),
   Thumb vorhanden, Streak = 1 (heute), kein Quota-Fehler.
3. Galerie 10× öffnen/schließen → im Memory-Profil keine wachsenden
   `blob:`-URLs (dank `revokeAll()` beim Unmount).
4. `await quotaStatus()` → `percent` notieren (Soll: <50 % auf Desktop).

### T2 – Export → Wipe → Import (Roundtrip)

```ts
import { exportBackup, importBackup, wipeAll } from "./lib/storage/backup";
import { db } from "./lib/storage/db";

const before = {
  workouts: await db.workouts.count(),
  meals: await db.meals.count(),
  checkins: await db.checkins.count(),
  photos: await db.photos.count(),
};
const backup = await exportBackup();          // ggf. downloadBackupFile(backup)
console.assert(backup.photos.length === before.photos, "alle Fotos exportiert?");
await wipeAll();
console.assert((await db.workouts.count()) === 0, "wipe ok?");
const res = await importBackup(backup, { wipeFirst: false });
console.assert(res.skippedPhotos === 0, JSON.stringify(res));
const after = {
  workouts: await db.workouts.count(),
  meals: await db.meals.count(),
  checkins: await db.checkins.count(),
  photos: await db.photos.count(),
};
console.assert(JSON.stringify(before) === JSON.stringify(after), "Roundtrip verlustfrei?");
```

Erwartung: `before == after`, `skippedPhotos == 0`, Streak nach Re-Import
identisch (`computePhotoStreak` auf importierten Check-ins).

### T3 – Legacy-Migration ( FitX → FitTrack )

1. In `FitX/index.html`-WebView `localStorage` mit echten `fitness:*`-Daten füllen
   (mind. 1 Workout, 1 Meal, 1 Check-in mit DataURL-Foto, 1 Skill mit Foto).
2. `await migrateFromLocalStorage()` → Report prüfen:
   `counts.checkins == 1`, `photoCount == 2`, `skippedInvalid.* == 0`.
3. Zweitaufruf ohne `force` → `{ migrated: false, skippedAlreadyMigrated: true }`.
4. `localStorage` enthält `fitness:backup:fitness:checkins` etc., Originale
   `fitness:*` unverändert vorhanden (nie gelöscht).
5. Check-in-Bild rendert via `photosRepo.thumbUrl(photoId)`.

## 6. Offene Todos (nächste Phase)

- [ ] `fittrack`-Vite-Projekt anlegen (`npm create vite@latest fittrack -- --template react-ts`,
      `npm i dexie zod`) und diese 7 Dateien nach `src/lib/...` kopieren.
- [ ] `node --check` / `tsc --noEmit` im echten Projekt laufen lassen
      (hier kein Node verfügbar – nur Grep/Read-verifiziert, s. §7).
- [ ] Boot-Verdrahtung in `main.tsx`: `await migrateFromLocalStorage()` genau einmal,
      danach Repos als Single-Source-of-Truth (alte `saveJSON`-Effects entfernen).
- [ ] UI-Umschreibung: `CheckinCard` + `SkillTreeSection` auf
      `fileToPhotoBlobs()` + `photosRepo` umstellen (inkl. `revoke` beim Unmount).
- [ ] `FoodTab`: `apiFoods`/OFF-Ergebnisse in `foodsCache` persistieren (TTL noch festlegen).
- [ ] E2E-Test für T1–T3 als Vitest + fake-indexeddb nachziehen.
- [ ] Sync für `sharedPlans` (`authorId/updatedAt/v/deleted` + LWW-Merge) implementieren.

## 7. Verifikation (diese Umgebung)

- `Test-Path ../fittrack` → **False** → Referenz-Ablage verwendet (wie beauftragt).
- Alle 7 Dateien via `Read`/`Grep` verifiziert (s. Dateiliste §1).
- `node --check`: **nicht möglich** – kein `node`/`npm` im PATH dieser Maschine
  (`Get-Command node,npm` → nicht gefunden). Ersatz: manuelle Klammer-/Import-
  Prüfung + TS-idiomatischer Code (Dexie-/zod-API konform). Im echten Projekt
  `npx tsc --noEmit` nachholen (s. Todo).
