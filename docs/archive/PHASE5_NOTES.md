# FitTrack Phase 5 – UI/UX Design-System + Tabs Redesign + A11y

Basis: `FitX/fitX.js` – css-String ab Z.1626, `THEMES` Z.190–224, `SkillTree` Z.1337–1477.
Ablage (weil `../fittrack` fehlt): `FitX/_migration/code-samples/src/...`

| Datei | Zweck |
|---|---|
| `src/styles/tokens.css` | Alle CSS-Vars (Dark + `[data-theme="light"]`), WCAG-AA-Fixes, Tree-Wrap-Fix, Legacy-Aliase |
| `src/styles/components.css` | 44px-Targets, `:focus-visible`, Reduced-Motion, Safe-Area, 16px-Inputs, `content-visibility`, Blur 60px + `.no-fx` |
| `src/utils/icon-mapping.ts` | `exerciseEmoji` → `exerciseIcon` (Lucide-Tabelle, Fallback `Dumbbell`) |
| `src/components/SystemFeedback.tsx` | `DeleteConfirmSheet`, `UndoSnackbar`, `SkeletonCards`, `EmptyState`, `ErrorBanner` |

---

## M1 – Home: Hero-Empty Redesign

**Problem (fitX.js):** `.hero-card` + `.dashed-box` + `.empty-hint` sind drei verschiedene Empty-Sprachen;
`hero-cta` nur 10px Padding (≈36px hoch, < 44px); Streak-Emoji `🔥` im Text (Z.1312).

**Redesign:**
- Ein einziges `EmptyState`-Pattern (aus `SystemFeedback.tsx`): 72px Lucide-Kreis
  (`.empty-state-illustration`), Headline (`--font-h2`), Body (`--text-secondary`), CTA
  (`primary-btn`, `min-height: var(--touch-min)`, `color: var(--accent-contrast)`).
- Hero behält `.hero-card`, CTA wird `EmptyState`-CTA (44px). `hero-dash` bleibt als
  Markenzeichen, Farbe `var(--accent)`.
- Streak: `Flame`-Lucide statt `🔥`-Emoji (`<Flame size={18} color="var(--accent)" />` bleibt,
  Text-Emoji entfernen).
- Historie: `details.hist-day` behalten, aber `hist-day-head` als `<button aria-expanded>`
  oder `summary` mit 44px Mindesthöhe; `row-card` mit `content-visibility: auto`.
- Live-Region: Workout-Counter (`X Workouts`) in `aria-live="polite"` Container.

**Vorher → Nachher:**
- `{exerciseEmoji(name)} {name}` → `{ const Icon = exerciseIcon(name); <Icon size={16} aria-hidden /> } {name}`
- `.dashed-box` / `.empty-hint` (reiner Text) → `<EmptyState icon={Dumbbell} headline="..." ctaLabel="..." />`

---

## M2 – Training: Bottom-Sheet Logger + Satz-Stepper + Queue-Progress

**Problem:** Logger ist Inline-`form-card` (schiebt Liste weg); Satz-Reps via kleinem
`.input-small` (70px, ~38px hoch); Queue nur `.queue-banner`-Text ohne Fortschritt (Z.1686).

**Redesign:**
- Logger als Bottom-Sheet (`Sheet`-Pattern aus `SystemFeedback.tsx`: `role="dialog"`
  `aria-modal`, Backdrop-Klick + Escape schließen, Fokus-Falle light, Fokus-Rückgabe).
- Satz-Stepper statt Freitext: `[-] [12 Reps] [+]`, Buttons je 44×44px,
  `aria-label="Wiederholungen verringern/erhöhen"`, Wert in `output aria-live="polite"`.
  Gewicht analog (`[-] [60 kg] [+]`, Schrittweite 2,5 kg).
- Queue-Progress: `Queue-Label + "Übung 2/5"` + `.progress-bar` (`role="progressbar"`
  `aria-valuenow/min/max`), pro Satz Häkchen-Liste. Banner-Text bleibt, erhält zusätzlich
  Fortschrittsbalken.
- Templates: `.template-chip` 44px (siehe `components.css`), Icon via `planTemplateIcon()`,
  `Plus`-Lucide als Hinzufügen-Affordanz. Kein `{tpl.emoji}` mehr.
- Verlauf: `row-card` + `DeleteConfirmSheet` + `UndoSnackbar` (5s) statt sofortigem Löschen
  (`removeReminder`/`remove`-Direktlöschung ersetzen).

---

## M3 – Ernährung: Ring + Tabs 48px + Foto-Disclaimer

**Problem:** Nur Balken (`.macro-rows`), kein Tagesüberblick; Calc-Suggest `suggest-item`
nur ~38px; Foto-Upload ohne Hinweis (OXA/Health-Claim-Risiko); `{f.emoji}` in Liste (Z.1177).

**Redesign:**
- Tages-Ring (SVG, `role="img"` + `aria-label="1820 von 2400 kcal"`): Kalorien-Ring außen,
  Protein-Ring innen; darunter `macro-rows` als Text-Alternative (nicht nur Farbe).
- Tabs (Übersicht / Rechner / Tagebuch) als `.nutri-tab` mit **48px** Mindesthöhe
  (`components.css`), `role="tablist"`/`tab`/`tabpanel`, Pfeiltasten-Navigation.
- Foto: Disclaimer unter Upload-Button — „Foto dient nur als Erinnerung, keine
  Nährwert-Analyse. Max. 900px, JPEG." + `meal-preview` mit `alt`-Pflicht.
- Calc-Autocomplete: `combobox`/`listbox`-Pattern (siehe A11y-Checkliste),
  `suggest-item` 44px, Icon via `foodIcon()` statt `{f.emoji}` / `{calcFood.emoji}`.
- `calc-result` erhält `role="status"` (Live-Ansage des Ergebnisses).

---

## M4 – Erinnerung: Switch + Create-Sheet + Proposal-Badges

**Problem:** `toggle-btn` „An/Aus"-Textbutton (~28px, Z.1750); Create-Form inline (`adding`);
Proposals nur Fließtext-Status (`offen/bestätigt/abgelehnt`, Z.1610); `day-chip` ~30px (Z.1702).

**Redesign:**
- Switch: echter `role="switch"` `aria-checked`, 44px Hit-Area (visueller Track 48×28,
  unsichtbares 44px-Padding via `components.css .toggle-btn`). Tastatur: Space/Enter.
  Label immer sichtbar (`<label id>` + `aria-labelledby`), nicht nur „An/Aus"-Farbe.
- Create-Sheet: `+`-Button öffnet Bottom-Sheet (`label` + `time` + `day-picker` 44px-Chips),
  Validierungsfehler in `ErrorBanner role="alert"`, Fokus auf erstes fehlerhaftes Feld.
- Proposal-Badges: `offen` (Gold-Badge, `Clock`-Icon), `bestätigt` (Success-Badge,
  `Check`-Icon), `abgelehnt` (Muted-Badge, `X`-Icon) — nie nur Farbe, immer Icon + Text.
  Aktionen `Zusagen` (44px `accept-btn`, `color: var(--danger-contrast)`-Analogon
  `var(--accent-contrast)`) / `Absagen` (`link-btn` 44px).
- Löschen: `icon-btn-ghost` 44px + `DeleteConfirmSheet` + `UndoSnackbar`.
- Profil-Name/Age/Gender: echte `<label>` (siehe Checkliste), Gender-Chips als
  `radiogroup` oder 44px-Toggle-Buttons mit `aria-pressed`.

---

## M5 – Ziele: Checkin-Ring + Skill-Timeline statt Node-Graph

**Problem (Z.1377–1476):** `COL = { zug: 70, druck: 180, core: 290 }` + `ROW_Y(r) = 64 + r*118`
+ `ZIG`-Offsets sind absolute Pixel auf 360px-`viewBox` mit `preserveAspectRatio="none"`
(Z.1426) → verzerrte Linien auf jedem Screen ≠ 360px; Labels überlappen (`width: 104px`
bei 110px Spaltenabstand); Touch-Ziele 48px-Kreise aber dicht gepackt; Emoji-Labels
(`{s.emoji} {s.name}`, Z.1466); keine Sperr-Logik sichtbar (alle Nodes klickbar).

**Redesign (Skill-Timeline):**
- **Branch-Tabs:** `Zug / Druck / Core / Beine` als 44px-Tabs (`role="tablist"`),
  Icon via `skillBranchIcon()`. Ersetzt `tree-branch-tag`-Absolute-Labels (Z.1445–1448).
- **Stepper-Liste:** pro Branch vertikale Liste (Basic → Elite): Zustandskreis
  (Lucide: `Check` = done, `Lock` = gesperrt, Nummer = offen), Name + Tier-Badge
  (`skillTierIcon()`), Fortschritt `3/5` + `progress-bar slim`.
- **Detail-Sheet:** Tap öffnet Sheet mit Beschreibung (`desc`), Nachweis-Foto
  (`tree-thumb`-Äquivalent), CTA „Per Foto freischalten" / „Entfernen" (mit
  `DeleteConfirmSheet`). Foto-Input behält `accept="image/*"`.
- **Sperre:** nur jeweils erster offener Skill pro Branch ist aktiv (`nextInChain`-Logik
  aus Z.1405–1409 wiederverwenden); spätere Skills `disabled` + `aria-disabled="true"`
  + `Lock`-Icon + Hinweis „Schalte erst X frei". Bisher konnten alle Nodes getippt werden.
- **SVG-Graph entfernen:** kein `COL`/`ROW_Y`/`ZIG`, kein `viewBox 0 0 360` +
  `preserveAspectRatio="none"`, keine `calc(x/360*100%)`-Positionierung. Falls Graph
  als Deko bleiben soll: `preserveAspectRatio="xMidYMid meet"` + `vector-effect="non-scaling-stroke"`.
- Checkin-Card: Streak-Ring (SVG `role="img"`) + `primary-btn` 44px + Grid bleibt,
  Löschen via Sheet + Snackbar. `🔥`-Emoji im Streak-Text entfernen (nur `Flame`-Icon).

---

## M6 – Design-System + A11y (Querschnitt)

- **Tokens:** `tokens.css` ist einzige Hex-Quelle. Alle Komponenten nutzen Vars.
  Legacy-Aliase (`--bg`, `--text`, ...) lassen alten `css-String` weiterlaufen,
  bis Klassen migriert sind.
- **Motion:** `drift-a/b` (18/22/26s) bleiben, aber `prefers-reduced-motion` schaltet
  Blobs/`cardIn`/`treePulse`/`spin` ab; `.no-fx`-Guard für Low-End (`components.css`).
- **Blur:** `90px → 60px` (GPU), `.no-fx` entfernt Blobs + Backdrop-Blurs ganz.
- **Icons:** `icon-mapping.ts` deckt 18 Exercises + 4 Templates + 20 Skills + 4 Branches
  + 26 Foods ab; Fallback `Dumbbell` (Foods `Apple`). Alte `emoji`-Felder bleiben in
  Daten (Abwärtskompat), werden im UI nicht mehr gerendert.
- **Feedback:** alle destruktiven Aktionen (Checkin/Reminder/Proposal/Plan/Skill-Reset)
  über `DeleteConfirmSheet` + `UndoSnackbar`; alle Ladevorgänge über `SkeletonCards`;
  alle Empty-Zustände über `EmptyState`; alle Fehler über `ErrorBanner`.

---

## A11y-Checkliste (Abnahme)

- [ ] **Labels für alle Inputs:** jedes `input/select/textarea` hat `<label for>` oder
  `aria-label`/`aria-labelledby`. Betrifft: Reminder-Titel/Zeit/Tage, Proposal-Titel/Tag/Zeit,
  Profil-Name/Alter/Geschlecht, Training-Name/Reps/Gewicht, Calc-Query/Grams, Meal-Foto-Input
  (`aria-label="Essensfoto auswählen"`), Plan-Name.
- [ ] **`listbox`/`combobox`:** Training-Autocomplete + Calc-Autocomplete als
  `combobox[aria-expanded][aria-controls]` + `listbox` + `option[aria-selected]`,
  Pfeiltasten + Enter + Escape, `aria-activedescendant`. Keine reinen `onClick`-Divs.
- [ ] **Live-Regions:** `UndoSnackbar role="status"`, Calc-Ergebnis `role="status"`,
  Queue-Fortschritt `role="progressbar"` + sr-only Text, Fehler `role="alert"`,
  Checkin-Streak-Änderung `aria-live="polite"`. Keine `alert()`-Dialoge.
- [ ] **200 % Zoom:** Layout bis 200 % Browser-Zoom ohne horizontales Scrollen
  (max-width 480px bleibt, Chips wrappen, Sheet scrollt intern, Tabs scrollen horizontal
  mit sichtbarem Fokus). Test: Chrome 200 % + 360px-Viewport.
- [ ] **TalkBack-Tour (Android):** Home → Training loggen (Sheet + Stepper) →
  Mahlzeit suchen (Combobox) → Erinnerung anlegen (Sheet + Switch) → Skill freischalten
  (Tabs + Detail-Sheet). Jedes Ziel per Swipe erreichbar, Rollen („Schaltfläche",
  „Registerkarte", „Schalter") korrekt angesagt, keine Emoji-Vorlesung („Muskel-Emoji").
- [ ] **Kontrast (AA):** Light-Accent `#C93E16`, `text-tertiary #5F6675`, `danger #B42318`
  verifiziert (Text auf `--surface-0/1` ≥ 4.5:1, Großtext/UI ≥ 3:1). Buttons nutzen
  `var(--accent-contrast)` statt `#fff`.
- [ ] **Touch:** alle interaktiven Elemente ≥ 44×44px (verifiziert via `components.css`
  + Abnahme-Grep unten). Keine überlappenden Hit-Areas (Skill-Liste statt Node-Graph).
- [ ] **Fokus:** `:focus-visible`-Ring überall, Fokus-Falle im Sheet, Fokus-Rückgabe
  nach Schließen, Skip-Link „Zum Inhalt".
- [ ] **Motion:** `prefers-reduced-motion` getestet (Blobs aus, `cardIn` aus,
  `treePulse` aus).

---

## Akzeptanz-Abnahme (Befehle)

```powershell
# 1) Kein hardcodiertes Hex ausserhalb tokens.css (0 Treffer erwartet)
Select-String -Path "C:\Users\dariu\OneDrive - HBU\Dokumente\FitX\_migration\code-samples\src\styles\components.css","C:\Users\dariu\OneDrive - HBU\Dokumente\FitX\_migration\code-samples\src\components\SystemFeedback.tsx","C:\Users\dariu\OneDrive - HBU\Dokumente\FitX\_migration\code-samples\src\utils\icon-mapping.ts" -Pattern "#[0-9a-fA-F]{3,8}\b" | Measure-Object

# 2) Kein Emoji im neuen UI (0 Treffer erwartet; Datenfelder 'emoji' nur als Wort, keine Glyphen)
Select-String -Path "C:\Users\dariu\OneDrive - HBU\Dokumente\FitX\_migration\code-samples\src\*" -Pattern "[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]" | Measure-Object

# 3) Touch-Targets: alle betroffenen Klassen enthalten --touch-min oder 44px/48px/56px
Select-String -Path "C:\Users\dariu\OneDrive - HBU\Dokumente\FitX\_migration\code-samples\src\styles\components.css" -Pattern "touch-min|44px|48px|56px" | Measure-Object
```
