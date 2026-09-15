// FitTrack Phase 4 – lib/reminders.ts
// Fix für fitX.js Reminder-Check (Z. 317-335) + getNextEvent (Z. 407-432).
//
// Bugs im Original:
//  - exakter Stringvergleich rem.time === hhmm verpasst das Fenster, wenn das
//    20s-Intervall den Minutenwechsel nicht trifft (P1-1).
//  - notified-Set wächst unbegrenzt, kein Persist -> nach Reload doppelte Banner (P1-2).
//  - kein visibilitychange-Trigger -> Hintergrund-Tab verpasst Reminder (P1-3).

export interface Reminder {
  id: string;
  label?: string;
  time: string; // "HH:MM"
  days: string[]; // ["Mo","Mi","Fr"]
  active?: boolean;
}

export const DAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export const REMINDER_WINDOW_MS = 60_000;
export const NOTIFIED_CAP = 200;
export const NOTIFIED_TTL_MS = 48 * 3600 * 1000;
const STORAGE_KEY = "fittrack.notified.v1";

export function dayLabel(date: Date): string {
  return DAYS_DE[(date.getDay() + 6) % 7];
}

/** Zielzeit für einen Reminder am gegebenen Kalendertag berechnen. Gibt null bei ungültiger time. */
export function targetForDay(day: Date, time: string): Date | null {
  if (typeof time !== "string" || !time.includes(":")) return null;
  const [hRaw, mRaw] = time.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  const t = new Date(day);
  t.setHours(h, m, 0, 0);
  return t;
}

export interface Occurrence {
  reminder: Reminder;
  target: Date;
}

/** Alle Occurrences der nächsten N Tage (inkl. heute) für aktive Reminder. */
export function buildOccurrencesNextDays(
  reminders: Reminder[],
  now: Date = new Date(),
  daysAhead = 7
): Occurrence[] {
  const out: Occurrence[] = [];
  const list = Array.isArray(reminders) ? reminders : [];
  for (let offset = 0; offset <= daysAhead; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const label = dayLabel(d);
    for (const r of list) {
      if (!r || r.active === false) continue;
      if (!Array.isArray(r.days) || !r.days.includes(label)) continue;
      const target = targetForDay(d, r.time);
      if (!target) continue;
      out.push({ reminder: r, target });
    }
  }
  return out.sort((a, b) => a.target.getTime() - b.target.getTime());
}

// ---------- notified-Set mit Cap 200 + 48h Prune + localStorage persist ----------

type NotifiedEntry = { key: string; at: number }; // key = `${id}|${dateString}`

export function loadNotified(): Map<string, number> {
  const map = new Map<string, number>();
  try {
    if (typeof localStorage === "undefined") return map;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return map;
    const arr = JSON.parse(raw) as NotifiedEntry[];
    if (!Array.isArray(arr)) return map;
    const now = Date.now();
    for (const e of arr) {
      if (!e || typeof e.key !== "string" || typeof e.at !== "number") continue;
      if (now - e.at > NOTIFIED_TTL_MS) continue; // 48h Prune beim Laden
      map.set(e.key, e.at);
    }
  } catch {
    // korruptes JSON -> leer starten
  }
  return map;
}

export function persistNotified(map: Map<string, number>): void {
  try {
    if (typeof localStorage === "undefined") return;
    // Cap 200: älteste zuerst raus (Map ist insertion-ordered)
    const entries = [...map.entries()].sort((a, b) => a[1] - b[1]);
    const capped = entries.slice(Math.max(0, entries.length - NOTIFIED_CAP));
    const arr: NotifiedEntry[] = capped.map(([key, at]) => ({ key, at }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Quota voll o.ä. -> still ignorieren
  }
}

export function pruneNotified(map: Map<string, number>, now = Date.now()): Map<string, number> {
  for (const [k, at] of map) {
    if (now - at > NOTIFIED_TTL_MS) map.delete(k);
  }
  // Cap 200
  if (map.size > NOTIFIED_CAP) {
    const sorted = [...map.entries()].sort((a, b) => a[1] - b[1]);
    const drop = sorted.slice(0, map.size - NOTIFIED_CAP);
    drop.forEach(([k]) => map.delete(k));
  }
  return map;
}

export function notifiedKey(reminderId: string, when: Date = new Date()): string {
  return `${reminderId}|${when.toDateString()}`;
}

// ---------- Kern-Fix: Fenster-Check ----------

export interface WindowCheckResult {
  due: Reminder[];
  targetById: Map<string, Date>;
}

/**
 * fixReminderWindow – drop-in Ersatz für den fitX.js check() (Z. 318-331).
 * - Berechnet echte Zielzeit statt Stringvergleich.
 * - ±60s Fenster (REMOTE_WINDOW_MS), damit 20s-Poll den Minutenwechsel trifft.
 * - Respektiert notified-Map (persistiert, geprunt, gecappt).
 */
export function fixReminderWindow(
  reminders: Reminder[],
  now: Date = new Date(),
  notified: Map<string, number>,
  windowMs: number = REMINDER_WINDOW_MS
): WindowCheckResult {
  const due: Reminder[] = [];
  const targetById = new Map<string, Date>();
  const today = dayLabel(now);
  for (const rem of reminders || []) {
    if (!rem || rem.active === false) continue;
    if (!Array.isArray(rem.days) || !rem.days.includes(today)) continue;
    const target = targetForDay(now, rem.time);
    if (!target) continue;
    targetById.set(String(rem.id), target);
    const diff = target.getTime() - now.getTime();
    if (Math.abs(diff) > windowMs) continue;
    // Optional: nur feuern wenn target nicht zu weit in der Zukunft liegt?
    // Abs() deckt "knapp verpasst" und "gleich fällig" ab – wie gewünscht.
    const key = notifiedKey(String(rem.id), now);
    if (notified.has(key)) continue;
    notified.set(key, now.getTime());
    due.push(rem);
  }
  pruneNotified(notified, now.getTime());
  persistNotified(notified);
  return { due, targetById };
}

/** visibilitychange-Trigger: feuert callback sobald Tab wieder sichtbar wird. Gibt cleanup zurück. */
export function attachVisibilityTrigger(callback: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const onVis = () => {
    if (document.visibilityState === "visible") callback();
  };
  document.addEventListener("visibilitychange", onVis);
  return () => document.removeEventListener("visibilitychange", onVis);
}
