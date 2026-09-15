<!-- PR-Template – beim Öffnen eines Pull Requests ausfüllen -->
## Was ändert sich?

<!-- Kurz beschreiben: Welches Problem wird gelöst, was ist neu? -->

## Art der Änderung

- [ ] Feature (neue Funktion)
- [ ] Bugfix
- [ ] Refactoring / Performance
- [ ] Doku / Tooling / CI
- [ ] Breaking Change (bitte unten beschreiben)

## Test

<!-- Wie wurde getestet? Gerät/Emulator, Schritte, Screenshots. -->

- [ ] `./gradlew assembleDebug` läuft lokal durch
- [ ] `scripts/sync-assets.*` ausgeführt (falls `fitX.js`, `index.html`, `splash.png` geändert)
- [ ] Dark- **und** Light-Mode geprüft (bei UI-Änderungen)
- [ ] Screenshot/Video angehängt (bei UI-Änderungen)

## Checkliste

- [ ] Kein Secret, kein Keystore, keine `local.properties` im Diff
- [ ] Farben nur über CSS-Variablen (`var(--accent)` …)
- [ ] Neue interaktive Elemente ≥ 44 px und mit `aria-label` (Icon-Buttons)
- [ ] Keine neuen Netzwerk-/CDN-Abhängigkeiten (App muss offline laufen)

## Screenshots

<!-- Vorher/Nachher, Dark + Light -->
