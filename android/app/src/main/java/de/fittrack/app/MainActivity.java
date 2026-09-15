package de.fittrack.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.SafeBrowsingResponse;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends ComponentActivity {
    private ValueCallback<Uri[]> filePickerCallback;
    private ActivityResultLauncher<String> filePickerLauncher;
    private WebViewAssetLoader assetLoader;
    private WebView view;
    private long lastBackPress = 0;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Splash-Theme (Cover) gegen AppTheme tauschen, sobald die Activity startet.
        setTheme(R.style.AppTheme);
        super.onCreate(savedInstanceState);
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        FrameLayout root = new FrameLayout(this);
        view = new WebView(this);
        root.addView(view, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        // Android 15 erzwingt Edge-to-Edge: ohne Insets-Padding läge die Tabbar
        // unter der System-Navigationsleiste und wäre nicht antipbar.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                l = bars.left; t = bars.top; r = bars.right; b = bars.bottom;
            } else {
                l = insets.getSystemWindowInsetLeft();
                t = insets.getSystemWindowInsetTop();
                r = insets.getSystemWindowInsetRight();
                b = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(l, t, r, b);
            return insets;
        });
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }
        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null && "appassets.androidplatform.net".equals(uri.getHost())) {
                    return false;
                }
                try {
                    view.getContext().startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception e) {
                    Log.w("FitTrack", "Externer Link konnte nicht geöffnet werden: " + uri, e);
                }
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if (uri != null && "appassets.androidplatform.net".equals(uri.getHost())) {
                    return false;
                }
                try {
                    view.getContext().startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception e) {
                    Log.w("FitTrack", "Externer Link konnte nicht geöffnet werden: " + url, e);
                }
                return true;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
            }

            @Override
            public void onSafeBrowsingHit(WebView view, WebResourceRequest request, int threatType,
                                          SafeBrowsingResponse callback) {
                callback.backToSafety(true);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }
        });
        filePickerLauncher = registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
            if (filePickerCallback == null) return;
            Uri[] result = uri != null ? new Uri[] { uri } : null;
            filePickerCallback.onReceiveValue(result);
            filePickerCallback = null;
        });
        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                Log.d("FitXConsole", msg.messageLevel() + " " + msg.sourceId() + ":" + msg.lineNumber() + " " + msg.message());
                return super.onConsoleMessage(msg);
            }
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePickerCallback != null) filePickerCallback.onReceiveValue(null);
                filePickerCallback = callback;
                try {
                    filePickerLauncher.launch("image/*");
                } catch (Exception e) {
                    Log.w("FitTrack", "File-Chooser konnte nicht geöffnet werden", e);
                    filePickerCallback.onReceiveValue(null);
                    filePickerCallback = null;
                    return false;
                }
                return true;
            }
        });
        // SPA: 1. Druck = JS (Banner zu / zu Start), 2. Druck <1,5s = Exit.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (view == null) {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    return;
                }
                long now = System.currentTimeMillis();
                try {
                    view.evaluateJavascript(
                            "(function(){try{window.dispatchEvent(new Event('fittrack-back'));return 'ok';}catch(e){return 'err';}})();",
                            v -> {
                            });
                } catch (Exception ignored) {
                }
                if (now - lastBackPress < 1500) {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    return;
                }
                lastBackPress = now;
            }
        });
        // Ergänzung Trainings-Erinnerungen: Runtime-Permission + JS-Bridge (Bestand unverändert).
        if (Build.VERSION.SDK_INT >= 33) {
            try {
                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 1001);
                }
            } catch (Exception ignored) {
            }
        }
        view.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        view.loadUrl("https://appassets.androidplatform.net/assets/index.html");
        setContentView(root);
        // Insets sofort anwenden, nicht erst bei der nächsten Layout-Änderung.
        root.requestApplyInsets();
    }

    // Ergänzung Trainings-Erinnerungen: Bridge für window.AndroidBridge.syncReminders(json).
    public static class AndroidBridge {
        private final Context appContext;

        AndroidBridge(Context context) {
            Context c = context.getApplicationContext();
            this.appContext = (c != null) ? c : context;
        }

        @JavascriptInterface
        public void syncReminders(String json) {
            try {
                if (json == null) {
                    json = "[]";
                }
                SharedPreferences prefs = appContext.getSharedPreferences("fitx_reminders", Context.MODE_PRIVATE);
                prefs.edit().putString("json", json).apply();
                ReminderScheduler.scheduleAll(appContext, json);
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    protected void onDestroy() {
        if (view != null) {
            view.destroy();
            view = null;
        }
        super.onDestroy();
    }
}
