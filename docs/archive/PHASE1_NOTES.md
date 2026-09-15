# Phase 1 P0 Security-Hotfix – FitTrack – NOTES

Datum: 2026-09-09
Arbeitsverzeichnis: `C:\Users\dariu\OneDrive - HBU\Dokumente\FitX`

## 1. MainActivity.java (`android/app/src/main/java/de/fittrack/app/MainActivity.java`)

Basis: `Activity` → `androidx.activity.ComponentActivity` (für `OnBackPressedDispatcher` + `ActivityResultLauncher`).

- **WebContentsDebugging-Gate:**
  - Vorher: `WebView.setWebContentsDebuggingEnabled(true)` immer an (Release remote-debuggbar).
  - Nachher: nur `if (BuildConfig.DEBUG) { WebView.setWebContentsDebuggingEnabled(true); }`
  - Benötigt `buildFeatures { buildConfig true }` in `android/app/build.gradle` (AGP 8+ generiert sonst kein `BuildConfig`).
- **WebSettings-Härtung:**
  - Entfernt: `setDatabaseEnabled(true)`
  - `setAllowFileAccess(true)` → `false`
  - `setAllowFileAccessFromFileURLs(true)` → `false`
  - `setAllowUniversalAccessFromFileURLs(true)` → `false`
  - `setJavaScriptCanOpenWindowsAutomatically(true)` → `false`
  - `setMediaPlaybackRequiresUserGesture(false)` → `true`
  - `MIXED_CONTENT_ALWAYS_ALLOW` → `MIXED_CONTENT_NEVER_ALLOW`
  - Neu: `if (SDK >= O) settings.setSafeBrowsingEnabled(true)`
  - Behalten: `setJavaScriptEnabled(true)`, `setDomStorageEnabled(true)`, `setAllowContentAccess(true)` (für File-Chooser-Upload, kein `file://`-Load mehr).
- **Sicherer WebViewClient (statt nacktem `new WebViewClient()`):**
  - `shouldOverrideUrlLoading(WebResourceRequest)` + Legacy-Overload `(WebView, String)`:
    - Host `appassets.androidplatform.net` → `return false` (intern weiter).
    - Sonst: `Intent(ACTION_VIEW, uri)` extern öffnen, `return true`. `try/catch` mit `Log.w`.
  - `onReceivedSslError` → `handler.cancel()` (kein `proceed()`).
  - `onSafeBrowsingHit` → `callback.backToSafety(true)`.
  - `shouldInterceptRequest` (beide Overloads) → `assetLoader.shouldInterceptRequest(...)` delegieren.
- **WebViewAssetLoader (androidx.webkit):**
  - ```java
    assetLoader = new WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
        .build();
    view.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    ```
  - Ersetzt `file:///android_asset/index.html`. Liefert `src/main/assets/{index.html,fitX.js}` über `https`-Origin aus, daher können `AllowFileAccess*` auf `false` ohne weißen Screen.
- **Moderner Back + File-Picker:**
  - Entfernt: `onBackPressed()`, `onActivityResult()`, `PICK_IMAGE`, `startActivityForResult`.
  - Neu: `getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) { ... view.goBack() else setEnabled(false)+dispatch })`
  - Neu: `filePickerLauncher = registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> ...)`; `onShowFileChooser` ruft `filePickerLauncher.launch("image/*")`.
- **Lifecycle-Leakfix:**
  - Neu: `onDestroy() { if (view != null) { view.destroy(); view = null; } super.onDestroy(); }`
- **Neue Imports:**
  - `android.net.http.SslError`, `android.webkit.{SafeBrowsingResponse,SslErrorHandler,WebResourceRequest,WebResourceResponse}`, `androidx.activity.{ComponentActivity,OnBackPressedCallback}`, `androidx.activity.result.{ActivityResultLauncher}`, `androidx.activity.result.contract.ActivityResultContracts`, `androidx.webkit.WebViewAssetLoader`. `android.app.Activity` entfernt.

## 2. AndroidManifest.xml

- `<application android:allowBackup="true"` → `"false"` (siehe Begründung unten).
- Neu: `android:usesCleartextTraffic="false"`.
- `<activity>`: `android:launchMode="singleTask"`, `android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|smallestScreenSize|density|layoutDirection|uiMode"`, `android:windowSoftInputMode="adjustResize"`.
- Neu: `<uses-permission POST_NOTIFICATIONS />`, `<uses-permission READ_MEDIA_IMAGES />`.
- Neu: `<uses-feature android.hardware.camera required=false />` (kein `CAMERA`-Permission angefordert; Foto nur via System-Picker `ACTION_GET_CONTENT`, daher kein Runtime-Camera-Permission nötig; `required=false` verhindert Play-Filterung).

### Begründung `allowBackup=false` (Fotoschutz)
Mahlzeitenfotos / lokale App-Daten (`WebView`-Storage, `localStorage`, hochgeladene Bilder) würden mit `allowBackup=true` in Google-Drive-Auto-Backup landen (unverschlüsselt für Dritte lesbar bei Kontokompromittierung, schwer löschbar, DSGVO-Aufwand). Bis selektive Backup-Regeln (`backup_rules.xml` / `dataExtractionRules.xml` mit `exclude` für Foto-/Cache-Domains) + ggf. `android:fullBackupOnly` / verschlüsseltes Backup implementiert sind, als P0-Default `false`. Re-Enable erst nach Phase-2 mit Exclude-Regeln.

## 3. index.html

- `index.html` (Root) + gespiegelte Kopie `android/app/src/main/assets/index.html`:
  - `<meta name="viewport" content="width=device-width, initial-scale=1">` → `content="width=device-width, initial-scale=1, viewport-fit=cover"` (Edge-to-Edge Android 15, Notch-/Gesture-Nav).
- Hinweis: `fitX.js`-XHR-Kommentar (`AllowFileAccessFromFileURLs`) ist mit AssetLoader obsolet – relative XHR `fitX.js` läuft jetzt über `https://appassets.../assets/fitX.js` (CORS-/file-Schema-Problem entfällt).

## 4. Gradle – offene / bereits erledigte Schritte

Benötigte Dependencies (in `android/app/build.gradle` bereits ergänzt, um Build nicht zu brechen):
```gradle
android { buildFeatures { buildConfig true } }
dependencies {
    implementation "androidx.activity:activity:1.9.2"
    implementation "androidx.webkit:webkit:1.10.0"
}
```

Offen für dich (manuell):
1. `cd android; ./gradlew :app:dependencies | findstr webkit` prüfen, dann Sync in Android Studio.
2. `./gradlew :app:assembleDebug` muss grün sein. Falls `Duplicate class` / `minSdk`-Warnung: `activity:1.9.2` benötigt `minSdk 21+` (wir haben 24 – OK), `webkit:1.10.0` benötigt `compileSdk 34+` (wir haben 36 – OK).
3. Release-Build prüfen: `./gradlew :app:assembleRelease` – `BuildConfig.DEBUG=false` → Debugging aus.
4. Falls noch `file:///android_asset`-Referenzen in Docs/Skripten: auf `https://appassets.androidplatform.net/assets/` umstellen.
5. Phase 2: `backup_rules.xml` + `READ_MEDIA_IMAGES` vs. `READ_EXTERNAL_STORAGE` (API<33) + `POST_NOTIFICATIONS`-Runtime-Request + Network-Security-Config.

## 5. Manuelle Tests (P0-Abnahme)

1. **chrome://inspect leer (Release):** Release-APK auf Gerät installieren, `chrome://inspect#devices` öffnen – kein `FitTrack WebView`-Eintrag. Debug-APK dagegen inspectbar. Negativtest: vorher war Release immer sichtbar.
2. **mixed-content blockiert:** In `fitX.js`/Console eine `http://`-Ressource laden (z.B. `http://neverssl.com/test.png` als `<img>`). Erwartet: `net::ERR_BLOCKED_BY_CLIENT` / `Mixed Content`-Warnung in Logcat (`FitXConsole`), Bild lädt nicht. Vorher mit `ALWAYS_ALLOW` lud es.
3. **Rotation ohne Reload:** App öffnen, Text in Eingabefeld tippen / Scrollposition merken, Gerät rotieren (Portrait↔Landscape). Erwartet: kein Reload, State bleibt, `onCreate` wird nicht neu durchlaufen (Logcat). Dank `configChanges=orientation|screenSize|...`. Vorher: Reload/weißer Screen.
4. Zusatz: Externer Link (`https://example.com` via `window.open`/`target=_blank` oder Test-Button) öffnet Chrome/Custom-Tab, nicht WebView. `https://appassets...`-Navigation bleibt intern.
5. Zusatz: SSL-Fehler (z.B. `https://expired.badssl.com` in Test-WebView) → Seite blockiert, kein Proceed-Dialog.
6. Zusatz: Foto-Picker: Mahlzeitenfoto wählen → Bild erscheint; Abbrechen → kein Crash, Callback mit `null`.
7. Zusatz: Back-Navigation: WebView-History → Back geht zurück, bei leerer History schließt App (kein Freeze).
8. Zusatz: `adb shell dumpsys package de.fittrack.app | findstr cleartext` → kein Cleartext; `allowBackup=false` verifizieren via `dumpsys`.

## 6. Verifikation (Grep)

- Kein `setAllowUniversalAccessFromFileURLs(true)` mehr.
- Kein `MIXED_CONTENT_ALWAYS_ALLOW` mehr.
- `file:///android_asset/index.html` nur noch ggf. in alten Docs, nicht mehr in `MainActivity.java`.
