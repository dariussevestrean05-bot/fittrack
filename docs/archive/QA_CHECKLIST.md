# FitTrack QA-Checkliste – Phase 6 (manuelle Tests)

> Arbeitsverzeichnis: `FitX` (+ `../fittrack` nach Migration).
> Release-Ziel: versionCode 3 / versionName 2.0, Paket `de.fittrack.app`.
> Alle Punkte auf beiden Geräteklassen prüfen, Ergebnis mit [x] abhaken.

## 1. Offline-Kaltstart
- [ ] Flugmodus AN, App komplett beenden (kill), neu starten.
- [ ] Erwartet: App-Shell lädt < 3s (High-End) / < 5s (Low-End), keine White-Screen, keine esm.sh-Fehler.
- [ ] Workouts / Meals / Check-ins aus lokalem Storage sichtbar.
- [ ] Open-Food-Facts-Suche zeigt Offline-Hinweis, stürzt nicht ab.
- Hinweis: setzt `workbox.navigateFallback: "index.html"` + Precache voraus.

## 2. Zwei Geräte (Low-End + Flagship)
- [ ] Low-End: z. B. 4× Cortex-A53 / 3 GB RAM, `hardwareConcurrency<=4` → `html.no-fx` aktiv, kein Blur/Glow.
- [ ] Flagship: z. B. Snapdragon 8 Gen / 8 GB RAM → Blur-Up + Glow aktiv, trotzdem 60fps.
- [ ] Auf beiden: Boot-Zeit notieren, Screenshots Dark/Light.

## 3. Back-Button (Android)
- [ ] Von Tabs Training/Ernährung/Erinnerung/Ziele → Back geht zum Start-Tab, nicht App-Exit.
- [ ] Auf Start-Tab → Back minimiert / beendet ohne Crash, kein doppelter Dialog.
- [ ] Modal / dueReminder-Banner → Back schließt zuerst Banner, dann navigiert.

## 4. Rotation
- [ ] Portrait → Landscape → Portrait auf Start, Training (Formular offen), Ernährung.
- [ ] Erwartet: kein Datenverlust im Formular (name/sets/meal-draft), kein Layout-Overflow, Tabbar erreichbar.

## 5. Dark / Light
- [ ] Toggle Sun/Moon auf Start, alle Tabs visuell prüfen (Text-Kontrast, Cards, Inputs).
- [ ] Theme persistiert nach Kill + Neustart (`fitness:theme`).
- [ ] Light: Accent #E1481D lesbar auf #F5F5FA; Dark: #FF5A36 auf #0D0F13.

## 6. 1000 Workouts Scroll 60fps
- [ ] Testdaten: 1000 Workouts importieren (Script / Backup-Restore).
- [ ] Verlauf mit `WorkoutHistory.virtualized.tsx` (overscan 4, estimateSize 148) scrollen.
- [ ] Erwartet: keine sichtbaren Lücken, kein Jank (Chrome DevTools FPS-Meter ~60, Low-End ≥ 45 toleriert).
- [ ] Alte gruppierte `<details>`-Liste darf bei >50 Einträgen NICHT mehr verwendet werden.

## 7. 20 Fotos Speicher
- [ ] 20 Gym-Fotos via Check-in aufnehmen (Thumb 320px q0.6 + Full 900px q0.72 + Blur 60px).
- [ ] Erwartet: Speichern ohne Quota-Fehler, Liste scrollt mit `loading="lazy" decoding="async"`.
- [ ] Storage-Größe notieren (DevTools → Application → Storage), Grenzwert < 50 MB für 20 Fotos.

## 8. TalkBack / VoiceOver Tour
- [ ] Android TalkBack AN: Start → Training (+ Button) → Workout speichern → Verlauf löschen (aria-label „… löschen").
- [ ] iOS VoiceOver (falls PWA): gleiche Tour.
- [ ] Erwartet: alle Icon-Buttons haben Label, Fokus-Reihenfolge logisch, keine Falle im Modal.

## 9. CSP: eval blockiert
- [ ] Build öffnen, Konsole: `eval("1")` → muss per CSP geblockt sein.
- [ ] Erwartet: kein `@babel/standalone`, kein `esm.sh` im Build (Grep-Checks siehe RELEASE.md).
- [ ] CSP-Header/Meta aktiv (siehe `dist/index.html` Sample).

## 10. Backup-Restore identisch
- [ ] Backup (alle `fitness:*` Keys) exportieren → App-Daten löschen → importieren.
- [ ] Erwartet: Workouts, Meals, Pläne, SharedPlans, Check-ins, Skills, Nutrition, Reminders, Theme, Profile byte-identisch (Count + Spot-Check 3 Einträge).

## 11. Notification nach Kill + Reboot
- [ ] Erinnerung (z. B. in 2 Min, heute) anlegen, App killen.
- [ ] Gerät rebooten, bis Reminder-Zeit warten.
- [ ] Erwartet: System-Notification erscheint (Capacitor LocalNotifications / AlarmManager), Tapp öffnet App, `dueReminder`-Banner erscheint.
- [ ] Negativ: kein Doppel-Feuern (notifiedRef / nativer Dedupe-Key `id|date`).

---
## Abnahme
- Datum: ________  Tester Low-End: ________  Tester Flagship: ________
- Offene Bugs: Link zu Issues: ________
- Freigabe Internal Track 10%: [ ] ja / [ ] nein (Begründung: ________)
