# Contributing – FitTrack

Danke, dass du mitarbeitest! Damit beide Contributors ohne Reibung parallel arbeiten können,
gelten die folgenden Regeln.

## 1. Setup (einmalig)

```bash
# Repo klonen
git clone git@github.com:__OWNER__/fittrack.git
cd fittrack

# Android: SDK-Pfad eintragen (nicht committen!)
echo "sdk.dir=/pfad/zum/Android/sdk" > android/local.properties
```

Voraussetzungen:

- JDK 21 (z. B. Temurin)
- Android SDK mit `compileSdk 36` + `Build-Tools 36.1.0`
- Optional: Android Studio (Ladybug+)

Build testen:

```bash
cd android
./gradlew assembleDebug      # Windows: gradlew.bat assembleDebug
```

## 2. Branch-Modell

| Branch | Bedeutung |
|---|---|
| `main` | Immer lauffähig. **Geschützt** – nur per Pull Request. |
| `feat/<thema>` | Neues Feature, z. B. `feat/wasser-tracker` |
| `fix/<thema>` | Bugfix, z. B. `fix/streak-dst` |
| `docs/<thema>` | Doku/README |
| `chore/<thema>` | Tooling, Build, Aufräumen |

Direktes Pushen auf `main` ist technisch blockiert (Branch Protection).
Jeder PR braucht **mindestens 1 Review** der anderen Person und einen grünen CI-Lauf.

## 3. Änderungen einreichen

```bash
git checkout main && git pull
git checkout -b feat/mein-thema
# … arbeiten …
git add -A
git commit -m "feat(training): Übungssuche mit Kategorien"
git push -u origin feat/mein-thema
gh pr create --fill
```

- Kleine, thematisch getrennte PRs (ein Thema pro PR).
- PR-Template ausfüllen, Screenshots von UI-Änderungen anhängen.
- Kein Merge ohne Review; bei Konflikten rebasen (`git rebase main`), nicht mergen.

## 4. Commit-Konvention (Conventional Commits)

```
<typ>(<bereich>): <kurze Beschreibung>
```

Typen: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`.
Bereiche: `home`, `training`, `ernaehrung`, `ziele`, `profil`, `android`, `ci`.

Beispiele:

```
feat(ernaehrung): Wasserziel automatisch berechnen
fix(android): Wöchentliche Reminder nach Alarm neu planen
docs(readme): Build-Anleitung ergänzt
```

## 5. Code-Stil

- **App-Logik:** `fitX.js` (Single-File React, JSX). Keine neuen Abhängigkeiten ohne Absprache –
  die App läuft offline über `vendor/` und darf keinen CDN-Zugriff einführen.
- **Dark/Light:** Beide Themes müssen funktionieren. Farben **nur** über CSS-Variablen
  (`var(--accent)`, `var(--bg)`, …), nie hartkodiert.
- **Android:** Java, 4 Spaces, keine stillen `catch`-Blöcke ohne Log im Fehlerfall.
- **Barrierefreiheit:** Interaktive Elemente ≥ 44 px hoch, `aria-label` bei Icon-Buttons.

## 6. Assets synchron halten

`fitX.js`, `index.html` und `splash.png` liegen doppelt: im Root (für die Web-Version)
und in `android/app/src/main/assets/` (für die APK). Nach Änderungen an Root-Dateien:

```powershell
powershell -File scripts/sync-assets.ps1      # Windows
bash scripts/sync-assets.sh                   # macOS/Linux
```

Der CI-Job `asset-sync-check` schlägt fehl, wenn beide Stände auseinanderlaufen.

## 7. Pull-Request-Checkliste

- [ ] Build läuft lokal (`./gradlew assembleDebug`)
- [ ] Assets gesynct (`scripts/sync-assets.*`)
- [ ] Dark- **und** Light-Mode geprüft (bei UI-Änderungen)
- [ ] Keine Secrets, keine `local.properties`, kein Keystore im Diff
- [ ] Screenshot/Video bei UI-Änderungen angehängt
