import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// FitTrack Phase 6 – Performance + PWA + QA + Release-Prep
// Quelle: FitX (fitX.js Single-File) -> Migration nach ../fittrack (Vite + React + TS)
// Diese Datei ist die Vorlage für ../fittrack/vite.config.ts
// (../fittrack existiert aktuell NICHT – Datei liegt daher in FitX/vite.config.ts bereit zum Kopieren).

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "FitTrack",
        short_name: "FitTrack",
        description: "Workouts, Ernährung, Erinnerungen und Ziele – offlinefähig.",
        display: "standalone",
        start_url: ".",
        scope: ".",
        lang: "de",
        dir: "ltr",
        background_color: "#0D0F13",
        theme_color: "#FF5A36",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Muss auf index.html fallen, sonst White-Screen bei Deep-Link / Offline-Reload
        // (Capacitor / TWA lädt file:// bzw. https://de.fittrack.app/*).
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Runtime-Caching: nur OFF (Open Food Facts) – NetworkFirst mit 4s Timeout.
        // Alles andere: App-Shell aus Cache (precache), keine generischen http-Caches.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "off-api",
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 Tage
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: "es2020",
    sourcemap: true,
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: {
          // React-Kern separat -> stabiler Hash, besserer Long-Term-Cache
          "vendor-react": ["react", "react-dom"],
          // Virtualisierung nur auf Verlauf-Seite geladen, trotzdem eigener Chunk
          "vendor-virtual": ["@tanstack/react-virtual"],
        },
      },
    },
  },
});
