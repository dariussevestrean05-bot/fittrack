# FitTrack PWA – Manifest Hinweise + Icons TODO (Phase 6)

## Manifest
- Datei: `public/manifest.webmanifest` (VitePWA generiert/validiert, Werte identisch in `vite.config.ts` halten!)
  - `name`: FitTrack
  - `short_name`: FitTrack
  - `display`: standalone
  - `theme_color`: #FF5A36
  - `background_color`: #0D0F13
  - `icons`: 192 + 512 + 512 maskable (siehe unten)
- In `index.html` einbinden (VitePWA macht das automatisch, manuell prüfen):
  ```html
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#FF5A36" />
  ```

## Icons TODO – Liste (fehlen noch, müssen generiert werden)
- [ ] `public/icons/icon-192.png` (192×192, PNG)
- [ ] `public/icons/icon-512.png` (512×512, PNG)
- [ ] `public/icons/icon-512-maskable.png` (512×512, maskable, 10% Safe-Zone Padding)
- [ ] optional: `public/apple-touch-icon.png` (180×180)
- [ ] optional: `public/favicon.svg`

Quelle: hochauflösendes Logo / SVG in `public/logo-source.svg` (TODO: ablegen).

## Generieren via pwa-asset-generator (manuell ausführen)
```bash
# in ../fittrack (bzw. FitX nach Migration):
npx pwa-asset-generator public/logo-source.svg public/icons \
  --manifest public/manifest.webmanifest \
  --path "%PUBLIC_URL%/icons" \
  --background "#0D0F13" \
  --padding "10%" \
  --opaque false
```

Danach prüfen:
1. `manifest.webmanifest` Icons-Pfade stimmen mit `vite.config.ts` überein.
2. Maskable-Icon hat `purpose: "maskable"`.
3. Lighthouse PWA-Check: installable, maskable, theme-color, standalone.

## Workbox (in vite.config.ts – NICHT ändern ohne QA)
- `navigateFallback: "index.html"` (Offline-Kaltstart / Deep-Link)
- `runtimeCaching`: nur OFF `NetworkFirst` 4s (`off-api` Cache, 7 Tage, max 100 Einträge)
- Rest: Precache App-Shell, keine generischen http-Caches.
