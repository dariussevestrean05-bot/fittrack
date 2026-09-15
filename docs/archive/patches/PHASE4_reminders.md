# PHASE4 Patch – Reminders (fitX.js 317-335 + 407-432)

## A. `notifiedRef` persistiert + gecappt initialisieren (ca. Z. 261)

```diff
-  const notifiedRef = useRef(new Set());
+  const NOTIFIED_KEY = "fittrack.notified.v1";
+  const notifiedRef = useRef(new Set());
+  // Phase4: persistiertes notified-Set laden (Cap 200 + 48h Prune)
+  useEffect(() => {
+    try {
+      const raw = localStorage.getItem(NOTIFIED_KEY);
+      if (raw) {
+        const arr = JSON.parse(raw);
+        const now = Date.now();
+        const fresh = (Array.isArray(arr) ? arr : []).filter((e) => e && now - e.at < 48*3600*1000).slice(-200);
+        notifiedRef.current = new Set(fresh.map((e) => e.key));
+      }
+    } catch {}
+  }, []);
```

## B. `check()` mit Zielzeit + ±60s-Fenster ersetzen (Z. 317-335)

```diff
   useEffect(() => {
     const check = () => {
       const now = new Date();
       const day = DAYS[(now.getDay() + 6) % 7];
-      const hhmm = now.toTimeString().slice(0, 5);
       (reminders || []).forEach((rem) => {
         if (!rem || !rem.active || !Array.isArray(rem.days) || !rem.days.includes(day)) return;
         if (typeof rem.time !== "string" || !rem.time.includes(":")) return;
-        const key = rem.id + "|" + now.toDateString();
-        if (rem.time === hhmm && !notifiedRef.current.has(key)) {
-          notifiedRef.current.add(key);
+        const [h, m] = rem.time.split(":").map(Number);
+        if (!Number.isInteger(h) || !Number.isInteger(m)) return;
+        const target = new Date(now); target.setHours(h, m, 0, 0);
+        if (Math.abs(target - now) > 60000) return;
+        const key = rem.id + "|" + now.toDateString();
+        if (!notifiedRef.current.has(key)) {
+          notifiedRef.current.add(key);
+          // Phase4: Cap 200 + persist
+          if (notifiedRef.current.size > 200) {
+            const first = notifiedRef.current.values().next().value;
+            notifiedRef.current.delete(first);
+          }
+          try {
+            const arr = [...notifiedRef.current].map((k) => ({ key: k, at: Date.now() }));
+            localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr.slice(-200)));
+          } catch {}
           setDueReminder(rem);
         }
       });
     };
     const iv = setInterval(check, 20000);
     check();
-    return () => clearInterval(iv);
+    const onVis = () => { if (document.visibilityState === "visible") check(); };
+    document.addEventListener("visibilitychange", onVis);
+    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
   }, [reminders]);
```

Fertige TS-Version: `../code-samples/lib/reminders.ts` (`fixReminderWindow`).
Hook mit nativer Planung: `../code-samples/hooks/useLocalNotifications.ts`.
