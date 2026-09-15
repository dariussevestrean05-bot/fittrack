# FitTrack Phase 4 – Fix-Doku (fitX.js → fittrack/src)

Quelle: `FitX/fitX.js`. Ziel: `fittrack/src/**` (Fallback: `_migration/code-samples/**`).

## 1. lastWorkout Sort (Z. 463)

**Bug:** `const lastWorkout = safeWorkouts[0]` setzt voraus, dass Persistenz-Reihenfolge = Zeit-Reihenfolge ist.
Nach Reload / Import / manuellem Einfügen ist das falsch.

**Fix (`lib/coreFixes.ts → sortedLastWorkout`):**
```ts
import { sortedLastWorkout } from "../lib/coreFixes";
const lastWorkout = sortedLastWorkout(safeWorkouts);
```
Max-ts-Suche, ignoriert ungültige `ts`, Fallback `workouts[0]`.

## 2. ISO-Woche startOfIsoWeek (Z. 232-243)

**Bug:** `period === "week"` = rolling 7×24h (`(now-d)/864e5 <= 7`). Montag-Sonntag-Woche falsch.

**Fix (`lib/coreFixes.ts → startOfIsoWeek + countInPeriodIso`):**
```ts
import { countInPeriodIso } from "../lib/coreFixes";
const workoutCount = countInPeriodIso(safeWorkouts, period);
```
Montag 00:00 lokal bis +7 Tage, Zukunfts-ts ausgeschlossen.

## 3. num() Validierung (Z. 908, 999, 1003 u.a.)

**Bug:** `Number(x) || 0` schluckt `""`, `null`, `NaN` still; keine min/max-Clamps
(dailyGoal, Gramm, Makros).

**Fix (`lib/coreFixes.ts → num`):**
```ts
import { num } from "../lib/coreFixes";
const dailyGoal = num(draft.dailyGoal, 0, { min: 0, max: 20000 });
const grams = num(calcGrams, 0, { min: 1, max: 5000 });
```
Leere Strings → fallback statt 0-Verschleierung bei Pflichtfeldern (dort explizit prüfen).

## 4. dirty-Flag Nutrition-Draft (Z. 899-905)

**Bug:** `useEffect(() => { setDraft(nutrition); ... }, [nutrition])` überschreibt jede
laufende Eingabe, sobald `nutrition` von außen neu gesetzt wird.

**Fix:**
```tsx
const [draft, setDraft] = useState(nutrition);
const [dirty, setDirty] = useState(false);
useEffect(() => { if (!dirty) setDraft(nutrition); }, [nutrition, dirty]);
// onChange: setDraft({...}); setDirty(true);
// commit: setNutrition(...); setDirty(false); setEditing(false);
// abbrechen: setDraft(nutrition); setDirty(false);
```
Siehe `shouldSyncDraft()` in `lib/coreFixes.ts`.

## 5. localDayKey für propDay (Z. 1499, 425)

**Bug:** `new Date().toISOString().slice(0,10)` = UTC-Tag. Um 00:30 in DE (UTC+1/+2)
kommt der Vortag raus; `new Date(p.day + "T00:00:00")` ist dann ebenfalls verschoben.

**Fix (`lib/coreFixes.ts → localDayKey`):**
```ts
import { localDayKey } from "../lib/coreFixes";
const [propDay, setPropDay] = useState(() => localDayKey(new Date()));
```

## 6. crypto.randomUUID für uid (Z. 108)

**Bug:** `Date.now().toString(36) + Math.random()...` kollidiert bei schnellem
Doppelklick / gleichem Tick.

**Fix (`lib/coreFixes.ts → uid`):**
```ts
export function uid(): string {
  try { if (globalThis.crypto?.randomUUID) return crypto.randomUUID(); } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
```
Signatur-identisch, drop-in.

## 7. Reminder-Fenster (Z. 317-335) → `lib/reminders.ts`

`rem.time === hhmm` → `fixReminderWindow()` mit echter Zielzeit + ±60s-Fenster,
notified-Map Cap 200 + 48h-Prune + localStorage, `attachVisibilityTrigger()`.

## 8. OFF-Suche (Z. 1015-1048) → `lib/offClient.ts`

`searchOnline` + `createDebouncedSearch`: Debounce 350ms, AbortController,
Timeout 8000, 5min-Cache Map max 50, `fields`-Param, `User-Agent`.

## 9. Checkin-Pagination (Z. 1322) → `components/CheckinPagination.tsx`

`safe.slice(0,6)` → ts-desc-Sort + pageSize 12 + Mehr-laden.
