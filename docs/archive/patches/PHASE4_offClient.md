# PHASE4 Patch – OFF-Suche (fitX.js 1015-1048)

Ersetzt `searchOnline` in `FoodTab` durch debounced + abort + timeout + cache.
Vollversion: `../code-samples/lib/offClient.ts`.

## Patch (in FoodTab, Imports + State ergänzen)

```diff
+  // Phase4: OFF-Client (Debounce 350ms, Abort, Timeout 8000, Cache 5min/50, fields, UA)
+  const offCtrlRef = useRef(null);
+  const offTimerRef = useRef(null);
+  const offCacheRef = useRef(new Map());
   const [offLoading, setOffLoading] = useState(false);
   const [offResults, setOffResults] = useState([]);
   const [offError, setOffError] = useState("");
```

```diff
-  // Gratis-Online-Suche über Open Food Facts (kein API-Key nötig), Offline-DB als Fallback.
-  const searchOnline = async () => {
-    const q = calcQuery.trim();
-    if (q.length < 3) { setOffError("Mindestens 3 Zeichen eingeben."); return; }
-    setOffLoading(true); setOffError(""); setOffResults([]);
-    try {
-      const url = "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(q)
-        + "&search_simple=1&action=process&json=1&page_size=8";
-      const res = await fetch(url);
+  const OFF_FIELDS = "code,product_name,product_name_de,brands,nutriments.energy-kcal_100g,nutriments.energy_100g,nutriments.proteins_100g,nutriments.carbohydrates_100g,nutriments.fat_100g";
+  const OFF_UA = "FitTrack/1.0 (Android; +https://fittrack.app)";
+
+  const doFetch = async (q, signal) => {
+    const ck = q.trim().toLowerCase();
+    const hit = offCacheRef.current.get(ck);
+    if (hit && Date.now() - hit.at < 5*60*1000) return hit.items;
+    const url = "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(q)
+      + "&search_simple=1&action=process&json=1&page_size=8&fields=" + encodeURIComponent(OFF_FIELDS);
+    const ctrl = new AbortController();
+    const onAbort = () => ctrl.abort(signal?.reason);
+    signal?.addEventListener("abort", onAbort, { once: true });
+    const timer = setTimeout(() => ctrl.abort(new DOMException("Timeout", "AbortError")), 8000);
+    try {
+      const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": OFF_UA, Accept: "application/json" } });
       if (!res.ok) throw new Error("Suche fehlgeschlagen");
       const data = await res.json();
       const r1 = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0; };
       const items = ((data && data.products) || []).map((p) => {
         const n = (p && p.nutriments) || {};
         const rawKcal = n["energy-kcal_100g"];
         const kcalPer100 = Number.isFinite(Number(rawKcal)) ? Number(rawKcal)
           : (Number.isFinite(Number(n.energy_100g)) ? Number(n.energy_100g) / 4.184 : NaN);
         if (!Number.isFinite(kcalPer100)) return null;
         return {
           name: p.product_name || p.product_name_de || "Unbekannt",
           brand: p.brands || "",
           emoji: "🌍",
           kcal: Math.round(kcalPer100),
           protein: r1(n.proteins_100g), carbs: r1(n.carbohydrates_100g), fat: r1(n.fat_100g),
           portion: 100,
         };
       }).filter((f) => f && f.name !== "Unbekannt");
+      offCacheRef.current.set(ck, { at: Date.now(), items });
+      while (offCacheRef.current.size > 50) {
+        offCacheRef.current.delete(offCacheRef.current.keys().next().value);
+      }
+      return items;
+    } finally {
+      clearTimeout(timer);
+      signal?.removeEventListener("abort", onAbort);
+    }
+  };
+
+  // Debounced Trigger für Search-Button / onChange (350ms)
+  const searchOnline = () => {
+    const q = calcQuery.trim();
+    if (q.length < 3) { setOffError("Mindestens 3 Zeichen eingeben."); return; }
+    if (offTimerRef.current) clearTimeout(offTimerRef.current);
+    offCtrlRef.current?.abort(new DOMException("Superseded", "AbortError"));
+    const ctrl = new AbortController();
+    offCtrlRef.current = ctrl;
+    setOffLoading(true); setOffError("");
+    offTimerRef.current = setTimeout(async () => {
+      try {
+        const items = await doFetch(q, ctrl.signal);
+        if (ctrl.signal.aborted) return;
+        if (!items.length) setOffError("Online nichts gefunden – nutze die Offline-Datenbank.");
+        setOffResults(items);
+      } catch (e) {
+        if (e?.name === "AbortError") return; // still, neuer Request läuft
+        setOffError("Keine Verbindung – Offline-Datenbank wird verwendet.");
+      } finally {
+        if (!ctrl.signal.aborted) setOffLoading(false);
+        else if (offCtrlRef.current === ctrl) setOffLoading(false);
+      }
+    }, 350);
+  };
-      if (!items.length) setOffError("Online nichts gefunden – nutze die Offline-Datenbank.");
-      setOffResults(items);
-    } catch {
-      setOffError("Keine Verbindung – Offline-Datenbank wird verwendet.");
-    } finally {
-      setOffLoading(false);
-    }
-  };
```

Test: schnell tippen → nur 1 Request (Network-Tab), alte Requests aborted.
