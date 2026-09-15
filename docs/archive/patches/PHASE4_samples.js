// FitTrack Phase 4 – direkt anwendbare JS-Samples für FitX/fitX.js
// Kopieren ohne Build-Step. TS-Varianten unter ../code-samples/.

// --- P1-7 uid (Z.108) ---
function uid() {
  try { if (globalThis.crypto && globalThis.crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- P1-10 num() (neu, bei Helpers einfügen) ---
function num(v, fallback, opts) {
  fallback = fallback === undefined ? 0 : fallback;
  opts = opts || {};
  const n = (typeof v === "string" && v.trim() === "") ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  let out = n;
  if (opts.min !== undefined && out < opts.min) out = opts.min;
  if (opts.max !== undefined && out > opts.max) out = opts.max;
  return out;
}

// --- P1-5 sortedLastWorkout (Z.463 Ersatz) ---
function sortedLastWorkout(workouts) {
  if (!Array.isArray(workouts) || !workouts.length) return undefined;
  let best, bestTs = -Infinity;
  for (const w of workouts) {
    if (!w) continue;
    const t = Number(w.ts);
    if (Number.isFinite(t) && t > bestTs) { bestTs = t; best = w; }
  }
  return best !== undefined ? best : workouts[0];
}
// Verwendung: const lastWorkout = sortedLastWorkout(safeWorkouts);

// --- P1-6 startOfIsoWeek + countInPeriodIso (Z.232-243 Ersatz) ---
function startOfIsoWeek(d) {
  const c = new Date(d === undefined ? new Date() : d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return c;
}
function countInPeriodIso(workouts, period) {
  if (!Array.isArray(workouts)) return 0;
  if (period === "all") return workouts.length;
  const now = new Date();
  if (period === "week") {
    const start = startOfIsoWeek(now).getTime();
    const end = start + 7 * 86400000;
    return workouts.filter((w) => {
      const t = Number(w && w.ts);
      return Number.isFinite(t) && t >= start && t < end && t <= now.getTime();
    }).length;
  }
  return workouts.filter((w) => {
    const t = Number(w && w.ts);
    if (!Number.isFinite(t)) return false;
    const d = new Date(t);
    if (isNaN(d) || d > now) return false;
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "year") return d.getFullYear() === now.getFullYear();
    return true;
  }).length;
}

// --- P1-12 localDayKey (Z.1499 Ersatz) ---
function localDayKey(d) {
  const x = d || new Date();
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}
// Verwendung: useState(() => localDayKey(new Date()))

// --- P1-1/P1-2 fixReminderWindow (Z.317-335 Ersatz, Logik ohne React) ---
const REMINDER_WINDOW_MS = 60000;
function targetForDay(day, time) {
  if (typeof time !== "string" || time.indexOf(":") < 0) return null;
  const parts = time.split(":");
  const h = Number(parts[0]), m = Number(parts[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  const t = new Date(day);
  t.setHours(h, m, 0, 0);
  return t;
}
function fixReminderWindow(reminders, now, notified, windowMs) {
  now = now || new Date();
  windowMs = windowMs === undefined ? REMINDER_WINDOW_MS : windowMs;
  const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const today = DAYS[(now.getDay() + 6) % 7];
  const due = [];
  (reminders || []).forEach((rem) => {
    if (!rem || !rem.active || !Array.isArray(rem.days) || rem.days.indexOf(today) < 0) return;
    const target = targetForDay(now, rem.time);
    if (!target) return;
    if (Math.abs(target.getTime() - now.getTime()) > windowMs) return;
    const key = rem.id + "|" + now.toDateString();
    if (notified.has(key)) return;
    notified.set(key, now.getTime());
    // Cap 200
    if (notified.size > 200) notified.delete(notified.keys().next().value);
    due.push(rem);
  });
  // 48h Prune + persist
  try {
    const t = now.getTime();
    // Prune braucht gespeicherte Zeiten; simple Variante: nur Cap + persist der Keys mit at=t
    const arr = Array.from(notified.keys()).map((k) => ({ key: k, at: t }));
    localStorage.setItem("fittrack.notified.v1", JSON.stringify(arr.slice(-200)));
  } catch {}
  return due;
}

// --- P1-11 Checkin-Sort + Pagination (Z.1322 Ersatz, Logik) ---
function sortedCheckins(checkins) {
  const tsOf = (c) => {
    const t = Number(c && c.ts);
    if (Number.isFinite(t)) return t;
    const d = new Date(c && c.ts).getTime();
    return Number.isFinite(d) ? d : 0;
  };
  return Array.isArray(checkins) ? [...checkins].filter(Boolean).sort((a, b) => tsOf(b) - tsOf(a)) : [];
}
// Verwendung: sortedCheckins(safe).slice(0, checkinVisible), pageSize 12, Button +12.
