// FitTrack Phase 4 – lib/coreFixes.ts
// Direkt anwendbare Fixes für fitX.js Validierungs- + Datums-Bugs.
// Quellen: uid Z.108, lastWorkout Z.463, Nutrition-Draft Z.899-905,
// propDay Z.1499, countInPeriod Z.232-243.

/** P1-7: Kollisionsfeste UID. Nutzt crypto.randomUUID, Fallback wie bisher. */
export function uid(): string {
  try {
    const c = (globalThis as any)?.crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // Fallback unten
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** P1-10: strikte Zahlen-Validierung. Gibt fallback zurück statt NaN durchzulassen. */
export function num(v: unknown, fallback = 0, opts: { min?: number; max?: number } = {}): number {
  const n = typeof v === "string" && v.trim() === "" ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  let out = n;
  if (opts.min !== undefined && out < opts.min) out = opts.min;
  if (opts.max !== undefined && out > opts.max) out = opts.max;
  return out;
}

/** P1-5: letzter Workout = max(ts), nicht Array-Index 0 (setzt unsortierte Persistenz voraus). */
export function sortedLastWorkout<T extends { ts?: unknown }>(workouts: T[]): T | undefined {
  if (!Array.isArray(workouts) || !workouts.length) return undefined;
  let best: T | undefined;
  let bestTs = -Infinity;
  for (const w of workouts) {
    if (!w) continue;
    const ts = Number((w as any).ts);
    if (!Number.isFinite(ts)) continue;
    if (ts > bestTs) {
      bestTs = ts;
      best = w;
    }
  }
  return best ?? workouts[0];
}

/** P1-6: ISO-Wochenstart (Montag 00:00 lokal). */
export function startOfIsoWeek(d: Date = new Date()): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  const dow = (c.getDay() + 6) % 7; // Mo=0..So=6
  c.setDate(c.getDate() - dow);
  return c;
}

/** P1-6: countInPeriod mit echter ISO-Woche statt rolling-7-Tage. */
export function countInPeriodIso(
  workouts: Array<{ ts?: unknown }>,
  period: "week" | "month" | "year" | "all"
): number {
  if (!Array.isArray(workouts)) return 0;
  if (period === "all") return workouts.length;
  const now = new Date();
  if (period === "week") {
    const start = startOfIsoWeek(now).getTime();
    const end = start + 7 * 86400000;
    return workouts.filter((w) => {
      const t = Number((w as any)?.ts);
      return Number.isFinite(t) && t >= start && t < end && t <= now.getTime();
    }).length;
  }
  return workouts.filter((w) => {
    const t = Number((w as any)?.ts);
    if (!Number.isFinite(t)) return false;
    const d = new Date(t);
    if (isNaN(d.getTime()) || d > now) return false;
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "year") return d.getFullYear() === now.getFullYear();
    return true;
  }).length;
}

/**
 * P1-12: lokaler Tages-Key YYYY-MM-DD ohne UTC-Shift.
 * Ersetzt new Date().toISOString().slice(0,10) (fitX.js Z.1499):
 * um 00:30 in DE (UTC+1/+2) liefert toISOString() noch den Vortag.
 */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * P1-9: dirty-Flag für Nutrition-Draft.
 * Original (Z.899-905): useEffect setzt setDraft(nutrition) bei JEDEM nutrition-Change
 * und überschreibt laufende Eingaben. Fix: nur übernehmen wenn nicht dirty.
 *
 * Verwendung in NutritionProfile:
 *   const [draft, setDraft] = useState(nutrition);
 *   const [dirty, setDirty] = useState(false);
 *   useEffect(() => { if (!dirty) setDraft(nutrition); }, [nutrition, dirty]);
 *   // jedes onChange: setDraft(...); setDirty(true);
 *   // commit/abort: setDirty(false);
 */
export function shouldSyncDraft(dirty: boolean): boolean {
  return !dirty;
}
