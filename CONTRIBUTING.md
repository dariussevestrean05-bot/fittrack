# Contributing â€“ FitTrack

Danke, dass du mitarbeitest! Damit beide Contributors ohne Reibung parallel arbeiten kÃ¶nnen,
gelten die folgenden Regeln.

## 1. Setup (einmalig)

```bash
# Repo klonen
git clone git@github.com:dariussevestrean05-bot/fittrack.git
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
| `main` | Immer lauffÃ¤hig. **GeschÃ¼tzt** â€“ nur per Pull Request. |
| `feat/<thema>` | Neues Feature, z. B. `feat/wasser-tracker` |
| `fix/<thema>` | Bugfix, z. B. `fix/streak-dst` |
| `docs/<thema>` | Doku/README |
| `chore/<thema>` | Tooling, Build, AufrÃ¤umen |

Direktes Pushen auf `main` ist technisch blockiert (Branch Protection).
Jeder PR braucht **mindestens 1 Review** der anderen Person und einen grÃ¼nen CI-Lauf.

## 3. Ã„nderungen einreichen

```bash
git checkout main && git pull
git checkout -b feat/mein-thema
# â€¦ arbeiten â€¦
git add -A
git commit -m "feat(training): Ãœbungssuche mit Kategorien"
git push -u origin feat/mein-thema
gh pr create --fill
```

- Kleine, thematisch getrennte PRs (ein Thema pro PR).
- PR-Template ausfÃ¼llen, Screenshots von UI-Ã„nderungen anhÃ¤ngen.
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
fix(android): WÃ¶chentliche Reminder nach Alarm neu planen
docs(readme): Build-Anleitung ergÃ¤nzt
```

## 5. Code-Stil

- **App-Logik:** `fitX.js` (Single-File React, JSX). Keine neuen AbhÃ¤ngigkeiten ohne Absprache â€“
  die App lÃ¤uft offline Ã¼ber `vendor/` und darf keinen CDN-Zugriff einfÃ¼hren.
- **Dark/Light:** Beide Themes mÃ¼ssen funktionieren. Farben **nur** Ã¼ber CSS-Variablen
  (`var(--accent)`, `var(--bg)`, â€¦), nie hartkodiert.
- **Android:** Java, 4 Spaces, keine stillen `catch`-BlÃ¶cke ohne Log im Fehlerfall.
- **Barrierefreiheit:** Interaktive Elemente â‰¥ 44 px hoch, `aria-label` bei Icon-Buttons.

## 6. Assets synchron halten

`fitX.js`, `index.html` und `splash.png` liegen doppelt: im Root (fÃ¼r die Web-Version)
und in `android/app/src/main/assets/` (fÃ¼r die APK). Nach Ã„nderungen an Root-Dateien:

```powershell
powershell -File scripts/sync-assets.ps1      # Windows
bash scripts/sync-assets.sh                   # macOS/Linux
```

Der CI-Job `asset-sync-check` schlÃ¤gt fehl, wenn beide StÃ¤nde auseinanderlaufen.

## 7. Pull-Request-Checkliste

- [ ] Build lÃ¤uft lokal (`./gradlew assembleDebug`)
- [ ] Assets gesynct (`scripts/sync-assets.*`)
- [ ] Dark- **und** Light-Mode geprÃ¼ft (bei UI-Ã„nderungen)
- [ ] Keine Secrets, keine `local.properties`, kein Keystore im Diff
- [ ] Screenshot/Video bei UI-Ã„nderungen angehÃ¤ngt
