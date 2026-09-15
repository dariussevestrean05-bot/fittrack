# FitTrack Phase 4 – Funktionale Bugs + Notifications + Validierung

Basis: `FitX/fitX.js` (1647 Zeilen, Stand 2026-09-10).
Zielprojekt `../fittrack/src` existiert **nicht** → alle Fixes liegen als
direkt anwendbare Patches + TS-Samples in `_migration/`:

- `code-samples/hooks/useLocalNotifications.ts` – Capacitor schedule/cancel, Permission, Web-Fallback, due-banner, Reboot-Hinweis
- `code-samples/lib/reminders.ts` – `fixReminderWindow`, notified-Cap/Prune/Persist, visibility-Trigger
- `code-samples/lib/offClient.ts` – `searchOnline` + Debounce 350ms, Abort, Timeout 8000, Cache 5min/50, fields, UA
- `code-samples/lib/coreFixes.ts` – `uid`, `num`, `sortedLastWorkout`, `startOfIsoWeek`, `localDayKey`, dirty-Flag
- `code-samples/components/CheckinPagination.tsx` – pageSize 12, Mehr laden, ts-desc
- `code-samples/FIXES.md` – Fix-Doku
- `patches/PHASE4_reminders.md`, `PHASE4_offClient.md`, `PHASE4_checkin-pagination.md`, `PHASE4_core-fixes.md`, `PHASE4_samples.js`
- `FitX/fitX.js` wurde **nicht** geändert (bewusst: Patches bevorzugt, kein Risk im Live-File).

## Bug-Tabelle P1-1 bis P1-13

| ID | Stelle fitX.js | Bug | Fix | Status |
|----|---------------|-----|-----|--------|
| P1-1 | 317-335 Reminder-`check()` | `rem.time === hhmm` Stringvergleich; 20s-Poll verpasst Minutenwechsel | echte Zielzeit + ±60s-Fenster (`fixReminderWindow`, `REMINDER_WINDOW_MS=60000`) | ✅ Sample+Patch (`lib/reminders.ts`, `patches/PHASE4_reminders.md`) |
| P1-2 | 261, 325-327 `notifiedRef` | Set wächst unbegrenzt, kein Persist → Doppel-Banner nach Reload | Cap 200 + 48h-Prune + localStorage `fittrack.notified.v1` (`loadNotified/persistNotified/pruneNotified`) | ✅ Sample+Patch |
| P1-3 | 317-335 Effect | kein `visibilitychange`-Trigger → Hintergrund-Tab verpasst Fälligkeit | `attachVisibilityTrigger(check)` + Check bei `visible` | ✅ Sample+Patch |
| P1-4 | 407-432 `getNextEvent` | `delta >= -60000` zeigt Vergangenes als „nächstes"; keine `targetForDay`-Normalisierung | `targetForDay()` + `buildOccurrencesNextDays()` sortiert; vergangene Occurrences filtern | ✅ Sample (`lib/reminders.ts`) |
| P1-5 | 463 `lastWorkout` | `safeWorkouts[0]` ohne Sort → falscher „letzter" Workout | `sortedLastWorkout()` (max-ts) | ✅ Sample+Patch+JS (`coreFixes.ts`, `PHASE4_core-fixes.md`, `PHASE4_samples.js`) |
| P1-6 | 232-243 `countInPeriod` | Woche = rolling 7×24h statt ISO-Woche Mo-So | `startOfIsoWeek()` + `countInPeriodIso()` | ✅ Sample+Patch+JS |
| P1-7 | 108 `uid()` | `Date.now()+Math.random` kollidiert bei Doppelklick | `crypto.randomUUID()` mit Fallback (signatur-identisch) | ✅ Sample+Patch+JS |
| P1-8 | 1015-1048 `searchOnline` | kein Debounce/Abort/Timeout/Cache/fields/UA → Request-Flut + Races + Hänger | Debounce 350ms, AbortController, Timeout 8000, 5min-Cache Map max 50, fields-Param, User-Agent | ✅ Sample+Patch (`lib/offClient.ts`, `PHASE4_offClient.md`) |
| P1-9 | 899-905 Nutrition-Draft | `useEffect setDraft(nutrition)` bei jedem Change überschreibt Eingabe | dirty-Flag: nur syncen wenn `!dirty`; `setDirty(true)` onChange, `false` bei commit/abort | ✅ Sample+Patch (`coreFixes.shouldSyncDraft`, `PHASE4_core-fixes.md`) |
| P1-10 | 908, 999, 1003 `Number()` | `Number(x)\|\|0` verschleiert NaN/leer, keine Clamps | `num(v, fallback, {min,max})` | ✅ Sample+Patch+JS |
| P1-11 | 1322 `safe.slice(0,6)` | unsortiert + hart 6, Rest unsichtbar | ts-desc-Sort + pageSize 12 + Mehr-laden (`CheckinPagination`) | ✅ Sample+Patch (`CheckinPagination.tsx`, `PHASE4_checkin-pagination.md`) |
| P1-12 | 1499 `propDay` (+425) | `toISOString().slice(0,10)` = UTC-Tag → um 00:30 falscher Tag | `localDayKey()` (lokal YYYY-MM-DD) | ✅ Sample+Patch+JS |
| P1-13 | 355-364 due-banner | nur In-App-Banner, keine System-Notification, keine Permission, kein Reboot-Reschedule | `useLocalNotifications`: Capacitor `schedule/cancel`, Permission-Request, Web-Notification-Fallback, In-App-due, Reschedule bei Start (+ Manifest-Hinweis RECEIVE_BOOT_COMPLETED/POST_NOTIFICATIONS) | ✅ Sample (`hooks/useLocalNotifications.ts`) |

## Test-Ideen

### T1. Kill + Reboot Notification
1. Reminder in 2 Min anlegen, App schließen (kill).
2. Gerät neu starten, App **nicht** öffnen → nativ geplant? (Erwartung ohne Receiver: nein – dokumentiert.)
3. App öffnen → `rescheduleAll()` läuft, Reminder erscheint als native Notification (falls Zeit noch +60s) bzw. In-App-Banner beim nächsten Poll.
4. Pass: nach Reboot + Öffnen kein Verlust der Planung; `scheduledRef` neu befüllt.

### T2. Schnell tippen → 1 Request (OFF)
1. Network-Tab öffnen, Filter `search.pl`.
2. „Hähnchenbrustfilet" schnell tippen (10 Tasten < 350ms).
3. Erwartung: genau **1** fetch, Vorgänger aborted (`AbortError`, still, kein Fehlerbanner).
4. Gleiche Query erneut → 0 fetches (Cache-Hit, 5min).
5. Offline/Flugmodus → „Keine Verbindung – Offline-Datenbank wird verwendet."

### T3. 00:30 TZ-Grenze (propDay / getNextEvent)
1. Gerätezeit auf 00:30 (Europe/Berlin) stellen.
2. Vorschlag anlegen → `propDay` muss **heute lokal** sein (nicht Vortag via UTC).
3. Reminder 00:31 anlegen → `fixReminderWindow` feuert innerhalb ±60s trotz Tageswechsel; `dayLabel` = korrektes `DAYS[(getDay()+6)%7]`.
4. `getNextEvent`/`buildOccurrencesNextDays` über Mitternacht: Event 00:05 morgen als `best` mit Countdown „in X Min".

### T4 (Bonus). Reminder-Fenster
- Reminder auf aktuelle Minute stellen, Tab in Hintergrund + 90s warten → bei Rückkehr (`visibilitychange`) feuert Banner genau **1×** (notified-Key `id|dateString`); Reload → kein Doppel (Persist).

### T5 (Bonus). Checkin-Pagination
- 15 Check-ins mit gemischten `ts` anlegen → Reihenfolge ts-desc, initial 12 sichtbar, „Mehr laden" zeigt Rest + Zähler „X von Y".

## Sofort-Fix in FitX/fitX.js?
Bewusst **nicht** durchgeführt: `../fittrack` fehlt, `_migration`-Patches sind die geforderte Ablage;
direktes Editieren des Live-Files hätte Reload-/_review_-Risiko. Alle Patches oben sind copy-paste-fähig
(siehe `patches/PHASE4_*.md` + `patches/PHASE4_samples.js`).
