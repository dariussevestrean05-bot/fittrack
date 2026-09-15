# PHASE4 Patch – Checkin-Pagination (fitX.js 1322)

## Problem
```js
{safe.slice(0, 6).map((c) => (...))}
```
- keine Sortierung (Persistenz-Reihenfolge ≠ Zeit)
- hart auf 6 begrenzt, Rest unsichtbar

## Patch (drop-in, pageSize 12 + Mehr laden + ts desc)

```diff
+  // Phase4: Checkin-Pagination (ts desc, pageSize 12)
+  const [checkinVisible, setCheckinVisible] = useState(12);
+  const sortedCheckins = useMemo(() => {
+    const tsOf = (c) => {
+      const t = Number(c?.ts);
+      if (Number.isFinite(t)) return t;
+      const d = new Date(c?.ts).getTime();
+      return Number.isFinite(d) ? d : 0;
+    };
+    return [...safe].sort((a, b) => tsOf(b) - tsOf(a));
+  }, [safe]);
+  useEffect(() => { setCheckinVisible(12); }, [safe.length]);
+
       <div className="section-title">Nachweise</div>
       {safe.length === 0 && <div className="empty-hint">Noch keine Nachweise. Checke dein erstes Training mit Foto ein.</div>}
       <div className="checkin-grid">
-        {safe.slice(0, 6).map((c) => (
+        {sortedCheckins.slice(0, checkinVisible).map((c) => (
           <div key={c.id} className="checkin-item">
             {c.photo && <img src={c.photo} alt="Gym-Nachweis" className="checkin-thumb" />}
             <div className="row-sub">{c.ts != null && !isNaN(new Date(c.ts)) ? new Date(c.ts).toLocaleDateString("de-DE") : "–"}</div>
             <button className="icon-btn-ghost" onClick={() => remove(c.id)} aria-label="Nachweis löschen"><Trash2 size={14} /></button>
           </div>
         ))}
       </div>
+      {sortedCheckins.length > checkinVisible && (
+        <button className="link-btn" onClick={() => setCheckinVisible((v) => v + 12)}>
+          Mehr laden ({sortedCheckins.length - checkinVisible} weitere)
+        </button>
+      )}
+      {sortedCheckins.length > 0 && (
+        <div className="row-sub">{Math.min(checkinVisible, sortedCheckins.length)} von {sortedCheckins.length} Nachweisen</div>
+      )}
```

Hinweis: `useState`/`useMemo`/`useEffect` sind in `CheckinCard`-Scope bereits verfügbar
(React-Import am Dateikopf prüfen). Komponente: `../code-samples/components/CheckinPagination.tsx`.
