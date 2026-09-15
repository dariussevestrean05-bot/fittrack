# PHASE4 Patch – Core-Fixes (fitX.js 108 / 232-243 / 463 / 899-905 / 1499)

## 1. uid (Z. 108) → crypto.randomUUID

```diff
-function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
+function uid() {
+  try { if (globalThis.crypto?.randomUUID) return crypto.randomUUID(); } catch {}
+  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
+}
```

## 2. lastWorkout (Z. 463) → max(ts)

```diff
-  const lastWorkout = safeWorkouts[0];
+  // Phase4: nicht Index 0 (unsortiert), sondern max(ts)
+  const lastWorkout = (() => {
+    let best, bestTs = -Infinity;
+    for (const w of safeWorkouts) {
+      const t = Number(w?.ts);
+      if (Number.isFinite(t) && t > bestTs) { bestTs = t; best = w; }
+    }
+    return best ?? safeWorkouts[0];
+  })();
```

## 3. ISO-Woche (Z. 232-243) → startOfIsoWeek

```diff
 function countInPeriod(workouts, period) {
   if (period === "all") return workouts.length;
   const now = new Date();
+  // Phase4: ISO-Woche Mo-So statt rolling-7-Tage
+  if (period === "week") {
+    const s = new Date(now); s.setHours(0,0,0,0);
+    s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
+    const start = s.getTime(), end = start + 7*86400000;
+    return workouts.filter((w) => {
+      const t = Number(w?.ts);
+      return Number.isFinite(t) && t >= start && t < end && t <= now.getTime();
+    }).length;
+  }
   return workouts.filter((w) => {
     const d = new Date(w.ts);
     if (isNaN(d) || d > now) return false;
-    if (period === "week") return (now - d) / 86400000 <= 7;
     if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
     if (period === "year") return d.getFullYear() === now.getFullYear();
     return true;
   }).length;
 }
```

## 4. num() Validierung (Z. 908 u.a.)

```diff
+function num(v, fallback = 0, opts = {}) {
+  const n = (typeof v === "string" && v.trim() === "") ? NaN : Number(v);
+  if (!Number.isFinite(n)) return fallback;
+  let out = n;
+  if (opts.min !== undefined && out < opts.min) out = opts.min;
+  if (opts.max !== undefined && out > opts.max) out = opts.max;
+  return out;
+}
+
   const commit = () => {
-    const dailyGoal = Math.max(0, Math.min(20000, Number(draft.dailyGoal) || 0));
+    const dailyGoal = num(draft.dailyGoal, 0, { min: 0, max: 20000 });
     setNutrition({ ...draft, dailyGoal });
     setEditing(false);
   };
```

## 5. Nutrition-Draft dirty-Flag (Z. 892-905)

```diff
 function NutritionProfile({ nutrition, setNutrition, profile }) {
   const [editing, setEditing] = useState(false);
   const [draft, setDraft] = useState(nutrition);
   const [initialized, setInitialized] = useState(false);
+  const [dirty, setDirty] = useState(false); // Phase4
   const [calcInfo, setCalcInfo] = useState("");
-  // nutrition lädt asynchron: Draft übernehmen und Formular nur beim ersten Laden
-  // automatisch öffnen, wenn noch keine Daten vorhanden sind.
   useEffect(() => {
-    setDraft(nutrition);
+    if (!dirty) setDraft(nutrition); // Phase4: Eingabe nicht überschreiben
     if (!initialized) {
       setEditing(!(nutrition.height || nutrition.weight));
       setInitialized(true);
     }
-  }, [nutrition]);
+  }, [nutrition, dirty]);
```
Alle `setDraft(...)` in onChange zusätzlich mit `setDirty(true)`; in `commit()` nach
`setEditing(false)` noch `setDirty(false)`.

## 6. localDayKey für propDay (Z. 1499)

```diff
-  const [propDay, setPropDay] = useState(() => new Date().toISOString().slice(0, 10));
+  // Phase4: lokal statt UTC (toISOString liefert um 00:30 den Vortag)
+  const [propDay, setPropDay] = useState(() => {
+    const d = new Date();
+    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
+    return `${y}-${m}-${day}`;
+  });
```

TS-Sammelversion: `../code-samples/lib/coreFixes.ts`. Doku: `../code-samples/FIXES.md`.
