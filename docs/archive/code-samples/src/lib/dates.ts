/**
 * FitTrack Phase 3 – Datums-Helper (lokal, stabil).
 *
 * Referenz: FitX/_migration/code-samples/src/lib/dates.ts
 * Ziel:     fittrack/src/lib/dates.ts
 *
 * Warum NICHT toDateString() (fitX.js dateKey Z.117)?
 *  - toDateString() ist locale-/implementierungsabhängig ("Wed Sep 10 2026"
 *    vs. andere Formate), enthält Wochentag-Namen und ist damit als
 *    Gruppierungs-Key fragil.
 *  - new Date(ts).toDateString() vergleicht implizit LOKAL, aber der Key ist
 *    kein sortierbarer ISO-String und bricht bei Serialisierung/Tests.
 *  - localDayKey() liefert YYYY-MM-DD in LOKALZEIT: sortierbar, lesbar,
 *    timezone-korrekt (Mitternachts-Grenze wie User sie erlebt).
 */

// ---------------------------------------------------------------------------
// Kern
// ---------------------------------------------------------------------------

/** YYYY-MM-DD in LOKALZEIT (nicht UTC!). Ersatz für dateKey()/toDateString(). */
export function localDayKey(ts: number | Date = Date.now()): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ms-Timestamp für 00:00:00.000 LOKAL am Tag von ts. */
export function localDayStart(ts: number | Date = Date.now()): number {
  const d = ts instanceof Date ? new Date(ts) : new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** ms-Timestamp für 23:59:59.999 LOKAL am Tag von ts. */
export function localDayEnd(ts: number | Date = Date.now()): number {
  const d = ts instanceof Date ? new Date(ts) : new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// ---------------------------------------------------------------------------
// Vergleich / Arithmetik
// ---------------------------------------------------------------------------

/** true, wenn a und b am selben lokalen Kalendertag liegen. */
export function isSameLocalDay(a: number | Date, b: number | Date = Date.now()): boolean {
  return localDayKey(a) === localDayKey(b);
}

/** Verschiebt einen DayKey um n Tage (z.B. für Streak-Loop). */
export function addDaysToKey(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + n);
  return localDayKey(dt);
}

/** Heute als DayKey. */
export function todayKey(): string {
  return localDayKey(Date.now());
}

/** "YYYY-MM-DD" → lokaler Mitternachts-Timestamp (Gegenstück zu localDayKey). */
export function parseDayKey(dayKey: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

// ---------------------------------------------------------------------------
// Domain-Helper (ersetzen hasTodayCheckin/computePhotoStreak aus fitX.js Z.160-187)
// ---------------------------------------------------------------------------

/**
 * true, wenn heute schon ein Check-in existiert.
 * Drop-in-Ersatz für hasTodayCheckin(checkins) – aber mit stabilem DayKey.
 */
export function hasTodayCheckin(checkins: Array<{ ts: number | string | null | undefined }>): boolean {
  if (!Array.isArray(checkins) || !checkins.length) return false;
  const today = todayKey();
  return checkins.some((c) => {
    if (!c || c.ts == null) return false;
    const t = new Date(c.ts as never).getTime();
    if (!Number.isFinite(t)) return false;
    return localDayKey(t) === today;
  });
}

/**
 * Strikte Tages-Streak aus Foto-Check-ins: heute darf fehlen (zählt ab gestern).
 * Ersatz für computePhotoStreak(checkins) – gleiche Semantik, stabiler Key.
 */
export function computePhotoStreak(
  checkins: Array<{ ts: number | string | null | undefined }>,
): number {
  if (!Array.isArray(checkins) || !checkins.length) return 0;
  const days = new Set<string>();
  for (const c of checkins) {
    if (!c || c.ts == null) continue;
    const t = new Date(c.ts as never).getTime();
    if (!Number.isFinite(t)) continue;
    days.add(localDayKey(t));
  }
  if (!days.size) return 0;
  let cursor = todayKey();
  if (!days.has(cursor)) cursor = addDaysToKey(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}
