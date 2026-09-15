import React, { useState, useEffect, useRef } from "react";
import {
  Dumbbell, Bell, Camera, Home, Plus, Trash2, Check, X, Flame,
  TrendingUp, Loader2, Sun, Moon, Users, Pencil,
  Share2, Copy, Trophy, Minus, User, Menu, Droplet,
} from "lucide-react";

// ---------- storage helpers ----------
const K = {
  reminders: "fitness:reminders",
  workouts: "fitness:workouts",
  meals: "fitness:meals",
  theme: "fitness:theme",
  profile: "fitness:profile",
  proposals: "fitness:proposals",
  plans: "fitness:plans",
  sharedPlans: "fitness:sharedPlans",
  nutrition: "fitness:nutritionProfile",
  water: "fitness:water",
  checkins: "fitness:checkins",
  skills: "fitness:skills",
  restDays: "fitness:restdays",
};

async function loadJSON(key, fallback, shared) {
  try {
    const r = await window.storage ? await window.storage.get(key, shared) : null;
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function saveJSON(key, value, shared) {
  try { 
    if (window.storage) await window.storage.set(key, JSON.stringify(value), shared); 
  } catch (e) { 
    console.error("Speichern fehlgeschlagen", e); 
  }
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const EXERCISES = [
  { name: "Bankdrücken", emoji: "🏋️" }, { name: "Schrägbankdrücken", emoji: "🏋️" },
  { name: "Kniebeugen", emoji: "🦵" }, { name: "Beinpresse", emoji: "🦵" },
  { name: "Ausfallschritte", emoji: "🦵" }, { name: "Kreuzheben", emoji: "🏋️‍♂️" },
  { name: "Klimmzüge", emoji: "💪" }, { name: "Latzug", emoji: "💪" },
  { name: "Rudern", emoji: "🚣" }, { name: "Schulterdrücken", emoji: "🙆" },
  { name: "Seitheben", emoji: "🙆" }, { name: "Bizepscurls", emoji: "💪" },
  { name: "Trizepsdrücken", emoji: "💪" }, { name: "Plank", emoji: "🧘" },
  { name: "Bauchpresse", emoji: "🧘" }, { name: "Laufband", emoji: "🏃" },
  { name: "Rudergerät", emoji: "🚣" }, { name: "Radfahren", emoji: "🚴" },
];
function exerciseEmoji(name) {
  const f = EXERCISES.find((e) => e.name.toLowerCase() === (name || "").trim().toLowerCase());
  return f ? f.emoji : "🏋️";
}

const PLAN_TEMPLATES = [
  { name: "Push Day", emoji: "💪", exercises: ["Bankdrücken", "Schulterdrücken", "Trizepsdrücken"] },
  { name: "Pull Day", emoji: "🏋️‍♂️", exercises: ["Klimmzüge", "Rudern", "Bizepscurls"] },
  { name: "Leg Day", emoji: "🦵", exercises: ["Kniebeugen", "Beinpresse", "Kreuzheben"] },
  { name: "Ganzkörper", emoji: "🔥", exercises: ["Kniebeugen", "Bankdrücken", "Rudern", "Plank"] },
];

// Calisthenics-Skill-Baum: 4 Äste × 5 Progressionen (Anfänger → Profi)
const SKILL_TREE = [
  {
    id: "zug", title: "Zug", emoji: "💪",
    skills: [
      { id: "dead-hang", name: "Dead Hang", emoji: "🦥", tier: "BASIC", desc: "30 Sekunden passiv an der Stange hängen." },
      { id: "scapula-pulls", name: "Scapula Pulls", emoji: "🔼", tier: "BASIC", desc: "Aus dem Hang nur die Schulterblätter aktiv nach unten ziehen." },
      { id: "negative-pullups", name: "Negative Klimmzüge", emoji: "🐢", tier: "INTERMEDIATE", desc: "Langsam (5 Sek.) aus der Top-Position ablassen." },
      { id: "pullups", name: "Klimmzüge", emoji: "💪", tier: "INTERMEDIATE", desc: "5 saubere Klimmzüge ohne Schwung schaffen." },
      { id: "muscle-up", name: "Muscle-Up", emoji: "🚀", tier: "ELITE", desc: "Einen sauberen Muscle-Up an Stange oder Ringen schaffen." },
    ],
  },
  {
    id: "druck", title: "Druck", emoji: "🔥",
    skills: [
      { id: "wand-liegestuetz", name: "Wand-Liegestütze", emoji: "🧱", tier: "BASIC", desc: "15 saubere Wiederholungen an der Wand drücken." },
      { id: "knie-liegestuetz", name: "Knie-Liegestütze", emoji: "🦵", tier: "BASIC", desc: "10 saubere Wiederholungen auf den Knien schaffen." },
      { id: "liegestuetz", name: "Liegestütze", emoji: "🔥", tier: "INTERMEDIATE", desc: "15 saubere Liegestütze am Boden schaffen." },
      { id: "dips", name: "Dips", emoji: "🪑", tier: "INTERMEDIATE", desc: "8 saubere Dips an Bank oder Barren schaffen." },
      { id: "hspu", name: "Handstand Push-Up", emoji: "🤸", tier: "ELITE", desc: "Handstand an der Wand halten und 1 Push-Up drücken." },
    ],
  },
  {
    id: "core", title: "Core", emoji: "🧘",
    skills: [
      { id: "plank", name: "Plank", emoji: "🪵", tier: "BASIC", desc: "60 Sekunden Unterarmstütz mit geradem Körper halten." },
      { id: "hollow-hold", name: "Hollow Hold", emoji: "🍌", tier: "BASIC", desc: "30 Sekunden Hohlkörperlage sauber halten." },
      { id: "side-plank", name: "Side Plank", emoji: "↔️", tier: "INTERMEDIATE", desc: "30 Sekunden Seitstütz pro Seite halten." },
      { id: "knee-raises", name: "Hängende Knee Raises", emoji: "🦶", tier: "INTERMEDIATE", desc: "10 kontrollierte Knieheber im Hang schaffen." },
      { id: "l-sit", name: "L-Sit", emoji: "🏆", tier: "ADVANCED", desc: "10 Sekunden L-Sit am Boden oder Barren halten." },
    ],
  },
  {
    id: "beine", title: "Beine / Skills", emoji: "🦵",
    skills: [
      { id: "kniebeuge", name: "Kniebeugen", emoji: "🦵", tier: "BASIC", desc: "20 saubere Air Squats mit voller Tiefe schaffen." },
      { id: "wandsitzen", name: "Wandsitzen", emoji: "🪑", tier: "BASIC", desc: "60 Sekunden Wandsitzen mit 90° Kniewinkel halten." },
      { id: "ausfallschritte", name: "Ausfallschritte", emoji: "🚶", tier: "INTERMEDIATE", desc: "10 Ausfallschritte pro Bein sauber ausführen." },
      { id: "pistol-assist", name: "Pistol Squat assistiert", emoji: "🪢", tier: "ADVANCED", desc: "5 einbeinige Kniebeugen mit Festhalten schaffen." },
      { id: "pistol-handstand", name: "Pistol Squat / Handstand", emoji: "🤸", tier: "ELITE", desc: "1 freie Pistol Squat oder 20 Sek. Handstand an der Wand." },
    ],
  },
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("Lesen fehlgeschlagen"));
    r.readAsDataURL(file);
  });
}
// Lokaler Tages-Key als yyyy-mm-dd (stabil gegen Locale/DST, ersetzt toDateString).
function dateKey(ts) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function parseNum(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
// Trainingsvolumen in kg: Summe (Wdh × Gewicht) über alle Sätze.
function workoutVolume(w) {
  return ((w && w.sets) || []).reduce((a, s) => a + parseNum(s.reps) * parseNum(s.weight), 0);
}
function bestSetLabel(w) {
  let best = null;
  ((w && w.sets) || []).forEach((s) => {
    const r = parseNum(s.reps), kg = parseNum(s.weight);
    if (kg > 0 && (!best || kg > best.kg || (kg === best.kg && r > best.r))) best = { r, kg };
  });
  return best ? `${best.r || "–"}×${best.kg}kg` : "";
}

// Verkleinert ein Bild proportional auf maxDim und gibt eine JPEG-dataURL zurück.
function fileToPhotoDataUrl(file, maxDim, quality) {
  const dim = Math.max(1, Number(maxDim) || 900);
  const q = Math.min(0.92, Math.max(0.4, Number(quality) || 0.72));
  return new Promise((resolve, reject) => {
    (async () => {
      let bmp = null, url = null;
      try {
        if (!file || !(file instanceof Blob)) throw new Error("Keine Bilddatei");
        if (file.type && !file.type.startsWith("image/")) throw new Error("Keine Bilddatei");
        if (typeof createImageBitmap === "function") {
          bmp = await createImageBitmap(file);
        } else {
          url = URL.createObjectURL(file);
          bmp = await new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error("Foto konnte nicht gelesen werden"));
            img.src = url;
          });
        }
        const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
        if (!w || !h) throw new Error("Foto konnte nicht gelesen werden");
        const scale = Math.min(1, dim / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(bmp, 0, 0, cw, ch);
        const dataUrl = canvas.toDataURL("image/jpeg", q);
        if (!dataUrl || !dataUrl.startsWith("data:image")) throw new Error("Foto konnte nicht gespeichert werden");
        resolve(dataUrl);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Foto konnte nicht verarbeitet werden"));
      } finally {
        try { if (bmp && typeof bmp.close === "function") bmp.close(); } catch {}
        try { if (url) URL.revokeObjectURL(url); } catch {}
      }
    })();
  });
}

// true, wenn heute schon ein Gym-Check-in existiert.
function hasTodayCheckin(checkins) {
  if (!Array.isArray(checkins) || !checkins.length) return false;
  const today = dateKey(Date.now());
  return checkins.some((c) => c && c.ts != null && !isNaN(new Date(c.ts)) && dateKey(c.ts) === today);
}

// Strikte Tages-Streak nur aus Foto-Check-ins: heute darf noch fehlen (zählt ab gestern).
function computePhotoStreak(checkins) {
  if (!Array.isArray(checkins) || !checkins.length) return 0;
  const days = new Set();
  checkins.forEach((c) => {
    if (!c || c.ts == null) return;
    const d = new Date(c.ts);
    if (isNaN(d)) return;
    days.add(dateKey(c.ts));
  });
  if (!days.size) return 0;
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  if (!days.has(dateKey(cur.getTime()))) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  while (days.has(dateKey(cur.getTime()))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

// ---------- theme ----------
const THEMES = {
  dark: {
    bg: "#0D0F13", bgElevated: "rgba(255,255,255,0.05)", bgInput: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.16)",
    text: "#F3F5F7", textMuted: "#9AA3AF", textFaint: "#6B7480",
    accent: "#FF5A36", accentContrast: "#0D0F13",
    accent2: "#8B6BFF", accent2Contrast: "#F3F5F7",
    danger: "#FF5C5C", tabbarBg: "rgba(20,22,28,0.75)",
    shadow: "0 25px 70px rgba(0,0,0,0.55)",
    blobA: "rgba(255,90,54,0.22)", blobB: "rgba(139,107,255,0.24)", blobC: "rgba(54,200,255,0.14)",
    bgGlow: "radial-gradient(120% 60% at 50% -10%, rgba(255,90,54,0.14), transparent 60%), radial-gradient(100% 50% at 50% 110%, rgba(139,107,255,0.16), transparent 60%)",
  },
  light: {
    bg: "#F5F5FA", bgElevated: "#FFFFFF", bgInput: "rgba(20,23,30,0.04)",
    border: "rgba(20,23,30,0.08)", borderStrong: "rgba(20,23,30,0.14)",
    text: "#14161C", textMuted: "#5B6270", textFaint: "#8990A0",
    accent: "#E1481D", accentContrast: "#FFFFFF",
    accent2: "#6A45E8", accent2Contrast: "#FFFFFF",
    danger: "#D8402F", tabbarBg: "rgba(255,255,255,0.85)",
    shadow: "0 12px 32px rgba(30,30,50,0.12)",
    blobA: "rgba(225,72,29,0.10)", blobB: "rgba(106,69,232,0.10)", blobC: "rgba(20,150,220,0.08)",
    bgGlow: "radial-gradient(120% 60% at 50% -10%, rgba(225,72,29,0.07), transparent 60%), radial-gradient(100% 50% at 50% 110%, rgba(106,69,232,0.08), transparent 60%)",
  },
};
function cssVars(t) {
  return {
    "--bg": t.bg, "--bg-elevated": t.bgElevated, "--bg-input": t.bgInput,
    "--border": t.border, "--border-strong": t.borderStrong,
    "--text": t.text, "--text-muted": t.textMuted, "--text-faint": t.textFaint,
    "--accent": t.accent, "--accent-contrast": t.accentContrast,
    "--accent2": t.accent2, "--accent2-contrast": t.accent2Contrast,
    "--danger": t.danger, "--tabbar-bg": t.tabbarBg, "--shadow": t.shadow,
    "--blob-a": t.blobA, "--blob-b": t.blobB, "--blob-c": t.blobC, "--bg-glow": t.bgGlow,
  };
}

// ---------- helpers ----------

const PERIODS = [
  { id: "week", label: "Woche" }, { id: "month", label: "Monat" },
  { id: "year", label: "Jahr" }, { id: "all", label: "Gesamt" },
];
function countInPeriod(workouts, period) {
  if (period === "all") return workouts.length;
  const now = new Date();
  return workouts.filter((w) => {
    const d = new Date(w.ts);
    if (isNaN(d) || d > now) return false;
    if (period === "week") return (now - d) / 86400000 <= 7;
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "year") return d.getFullYear() === now.getFullYear();
    return true;
  }).length;
}

// ---------- root ----------
export default function App() {
  const [tab, setTab] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [reminders, setReminders] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState([]);
  const [water, setWater] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [sharedPlans, setSharedPlans] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [skills, setSkills] = useState({});
  const [restDays, setRestDays] = useState(2);
  const [nutrition, setNutrition] = useState({ height: "", weight: "", bodyFat: "", rate: "0.5", age: "", gender: "", goal: "halten", activity: "normal", dailyGoal: 2200 });
  const [profile, setProfile] = useState({ name: "", age: "", gender: "" });
  const [loaded, setLoaded] = useState(false);
  const [dueReminder, setDueReminder] = useState(null);
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    (async () => {
      const [r, w, m, th, pr, prop, pl, spl, nu, ci, sk, rd, wt] = await Promise.all([
        loadJSON(K.reminders, [], false), loadJSON(K.workouts, [], false),
        loadJSON(K.meals, [], false), loadJSON(K.theme, "dark", false),
        loadJSON(K.profile, { name: "", age: "", gender: "" }, false), loadJSON(K.proposals, [], true),
        loadJSON(K.plans, [], false), loadJSON(K.sharedPlans, [], true),
        loadJSON(K.nutrition, { height: "", weight: "", bodyFat: "", rate: "0.5", age: "", gender: "", goal: "halten", activity: "normal", dailyGoal: 2200 }, false),
        loadJSON(K.checkins, [], false), loadJSON(K.skills, {}, false), loadJSON(K.restDays, 2, false),
        loadJSON(K.water, [], false),
      ]);
      setReminders(Array.isArray(r) ? r : []); setWorkouts(Array.isArray(w) ? w : []); setMeals(Array.isArray(m) ? m : []);
      setWater(Array.isArray(wt) ? wt.filter((x) => x && x.ts != null) : []);
      // Theme: gespeicherter Wert gewinnt, sonst System (prefers-color-scheme), sonst dark.
      // Low-End: teure Deko (Blobs/Glow/Blur) per .no-fx abschalten.
      try {
        let hasStored = false;
        try { hasStored = localStorage.getItem(K.theme) != null; } catch {}
        if (th === "light" || th === "dark") {
          if (!hasStored && typeof window.matchMedia === "function") {
            const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
            setTheme(prefersLight ? "light" : "dark");
          } else {
            setTheme(th === "light" ? "light" : "dark");
          }
        } else if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches) {
          setTheme("light");
        } else {
          setTheme("dark");
        }
        const low = (navigator.hardwareConcurrency || 8) <= 4;
        document.documentElement.classList.toggle("no-fx", !!low);
      } catch {
        setTheme(th === "light" ? "light" : "dark");
      }
      setProfile({
        name: (pr && pr.name) || "",
        age: (pr && pr.age) || "",
        gender: (pr && pr.gender) || "",
      });
      setProposals(Array.isArray(prop) ? prop : []); setPlans(Array.isArray(pl) ? pl : []); setSharedPlans(Array.isArray(spl) ? spl : []);
      // Migration: alte Check-ins mit Foto-Feld bereinigen – es wird nur {id, ts} behalten, Fotos nie gespeichert.
      setCheckins(Array.isArray(ci) ? ci.filter((c) => c && c.ts != null).map((c) => ({ id: c.id || uid(), ts: c.ts })) : []); setSkills(sk && typeof sk === "object" ? sk : {});
      setRestDays(Number.isFinite(Number(rd)) ? Math.max(0, Math.min(6, Number(rd))) : 2);
      setNutrition(nu && typeof nu === "object" ? nu : { height: "", weight: "", bodyFat: "", rate: "0.5", age: "", gender: "", goal: "halten", activity: "normal", dailyGoal: 2200 });
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) saveJSON(K.reminders, reminders, false); }, [reminders, loaded]);
  // Aktive Erinnerungen ans native Android weiterreichen (echte Benachrichtigungen).
  useEffect(() => {
    if (!loaded) return;
    try {
      const bridge = window.AndroidBridge;
      if (bridge && typeof bridge.syncReminders === "function") {
        bridge.syncReminders(JSON.stringify(
          (reminders || []).filter((r) => r && r.active).map((r) => ({ id: r.id, label: r.label, time: r.time, days: r.days }))
        ));
      }
    } catch {}
  }, [reminders, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.workouts, workouts, false); }, [workouts, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.meals, meals, false); }, [meals, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.water, water, false); }, [water, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.theme, theme, false); }, [theme, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.profile, profile, false); }, [profile, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.plans, plans, false); }, [plans, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.nutrition, nutrition, false); }, [nutrition, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.checkins, checkins, false); }, [checkins, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.skills, skills, false); }, [skills, loaded]);
  useEffect(() => { if (loaded) saveJSON(K.restDays, restDays, false); }, [restDays, loaded]);

  const refreshShared = async () => {
    const [p, spl] = await Promise.all([loadJSON(K.proposals, [], true), loadJSON(K.sharedPlans, [], true)]);
    if (Array.isArray(p)) setProposals(p);
    if (Array.isArray(spl)) setSharedPlans(spl);
  };
  const persistProposals = async (next) => {
    const value = typeof next === "function" ? next(proposals) : next;
    setProposals(value); await saveJSON(K.proposals, value, true);
  };
  const persistSharedPlans = async (next) => {
    const value = typeof next === "function" ? next(sharedPlans) : next;
    setSharedPlans(value); await saveJSON(K.sharedPlans, value, true);
  };

  useEffect(() => {
    if (!loaded) return;
    const iv = setInterval(refreshShared, 15000);
    return () => clearInterval(iv);
  }, [loaded]);

  // Android Back-Button (SPA): erst Menü, dann Banner schließen, sonst zurück zu Start statt App-Exit.
  useEffect(() => {
    const onBack = () => {
      if (menuOpen) { setMenuOpen(false); return; }
      if (dueReminder) { setDueReminder(null); return; }
      setTab((cur) => (cur === "home" ? cur : "home"));
    };
    window.addEventListener("fittrack-back", onBack);
    return () => window.removeEventListener("fittrack-back", onBack);
  }, [dueReminder, menuOpen]);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const todayStr = dateKey(now.getTime());
      // Tages-Cleanup + Cap (max 100) gegen unbegrenztes Wachstum.
      try {
        if (notifiedRef.current.size > 100) {
          const first = notifiedRef.current.values().next().value;
          notifiedRef.current.delete(first);
        }
        // Alte Keys anderer Tage entfernen.
        notifiedRef.current.forEach((k) => {
          if (typeof k === "string" && !k.endsWith(todayStr)) notifiedRef.current.delete(k);
        });
      } catch {}
      const day = DAYS[(now.getDay() + 6) % 7];
      const hhmm = now.toTimeString().slice(0, 5);
      (reminders || []).forEach((rem) => {
        if (!rem || !rem.active || !Array.isArray(rem.days) || !rem.days.includes(day)) return;
        if (typeof rem.time !== "string" || !rem.time.includes(":")) return;
        const key = rem.id + "|" + todayStr;
        if (rem.time === hhmm && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          if (notifiedRef.current.size > 100) {
            const first = notifiedRef.current.values().next().value;
            try { notifiedRef.current.delete(first); } catch {}
          }
          setDueReminder(rem);
        }
      });
    };
    const iv = setInterval(check, 20000);
    check();
    return () => clearInterval(iv);
  }, [reminders]);

  const t = THEMES[theme];
  const nextEvent = getNextEvent(reminders, proposals);

  return (
    <div className="app" style={cssVars(t)}>
      <style>{css}</style>
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />
      <div className="bg-glow" />
      <div className="statusbar" />
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="theme-toggle" onClick={() => setMenuOpen(true)} aria-label="Menü öffnen" aria-expanded={menuOpen}>
            <Menu size={18} />
          </button>
          <div className="brand"><Dumbbell size={16} /> FitTrack</div>
        </div>
        <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Modus wechseln">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className={"drawer" + (menuOpen ? " open" : "")} aria-hidden={!menuOpen} aria-label="Menü">
        <div className="drawer-head">
          <span className="row-title">Menü</span>
          <button className="icon-btn-ghost" onClick={() => setMenuOpen(false)} aria-label="Menü schließen"><X size={18} /></button>
        </div>
        {[
          ["home", "Start", Home],
          ["training", "Training", Dumbbell],
          ["ernaehrung", "Ernährung", Flame],
          ["erinnerungen", "Erinnerung", Bell],
          ["ziele", "Ziele", Trophy],
          ["profil", "Profil", User],
        ].map(([id, label, Icon]) => (
          <button key={id} className={"drawer-item" + (tab === id ? " active" : "")} onClick={() => { setTab(id); setMenuOpen(false); }}>
            <Icon size={18} /><span>{label}</span>
          </button>
        ))}
      </aside>
      <div className="screen">
        {dueReminder && (
          <div className="due-banner">
            <Bell size={18} />
            <div style={{ flex: 1 }}>
              <div className="due-title">Zeit fürs Training!</div>
              <div className="due-sub">{dueReminder.label}</div>
            </div>
            <button className="icon-btn-ghost" onClick={() => setDueReminder(null)}><X size={16} /></button>
          </div>
        )}
        {tab === "home" && (
          <HomeTab
            nextEvent={nextEvent} goTo={setTab}
            meals={meals} nutrition={nutrition} checkins={checkins}
          />
        )}
        {tab === "training" && (
          <TrainingTab
            workouts={workouts} setWorkouts={setWorkouts}
            plans={plans} setPlans={setPlans}
            sharedPlans={sharedPlans} persistSharedPlans={persistSharedPlans}
            profile={profile}
            restDays={restDays} setRestDays={setRestDays}
          />
        )}
        {tab === "ernaehrung" && (
          <FoodTab meals={meals} setMeals={setMeals} nutrition={nutrition} setNutrition={setNutrition} profile={profile} water={water} setWater={setWater} />
        )}
        {tab === "erinnerungen" && (
          <ReminderTab
            reminders={reminders} setReminders={setReminders}
            proposals={proposals} persistProposals={persistProposals}
            profile={profile}
          />
        )}
        {tab === "ziele" && (
          <ZieleTab
            checkins={checkins} setCheckins={setCheckins}
            skills={skills} setSkills={setSkills}
          />
        )}
        {tab === "profil" && (
          <ProfilTab
            profile={profile} setProfile={setProfile}
            checkins={checkins} workouts={workouts} skills={skills} nutrition={nutrition}
          />
        )}
      </div>
      <nav className="tabbar" role="tablist" aria-label="Hauptbereiche">
        <TabBtn icon={Home} label="Start" active={tab === "home"} onClick={() => setTab("home")} />
        <TabBtn icon={Dumbbell} label="Training" active={tab === "training"} onClick={() => setTab("training")} />
        <TabBtn icon={Flame} label="Ernährung" active={tab === "ernaehrung"} onClick={() => setTab("ernaehrung")} />
        <TabBtn icon={Trophy} label="Ziele" active={tab === "ziele"} onClick={() => setTab("ziele")} />
        <TabBtn icon={User} label="Profil" active={tab === "profil"} onClick={() => setTab("profil")} />
      </nav>
    </div>
  );
}

function getNextEvent(reminders, proposals) {
  const now = new Date();
  let best = null, bestDelta = Infinity;
  (reminders || []).filter((r) => r && r.active && Array.isArray(r.days) && r.days.length && typeof r.time === "string" && r.time.includes(":")).forEach((r) => {
    for (let offset = 0; offset < 8; offset++) {
      const d = new Date(now); d.setDate(d.getDate() + offset);
      const dayLabel = DAYS[(d.getDay() + 6) % 7];
      if (!r.days.includes(dayLabel)) continue;
      const [h, m] = r.time.split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
      const target = new Date(d); target.setHours(h, m, 0, 0);
      const delta = target - now;
      if (delta >= -60000 && delta < bestDelta) { bestDelta = delta; best = { label: r.label, time: r.time, target, shared: false }; }
    }
  });
  (proposals || []).filter((p) => p && p.status === "bestätigt" && typeof p.time === "string" && p.time.includes(":") && p.day).forEach((p) => {
    const [h, m] = p.time.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    const target = new Date(p.day + "T00:00:00");
    if (isNaN(target)) return;
    target.setHours(h, m, 0, 0);
    const delta = target - now;
    if (delta >= -60000 && delta < bestDelta) { bestDelta = delta; best = { label: p.title, time: p.time, target, shared: true }; }
  });
  return best;
}
function formatCountdown(target) {
  const diff = target - new Date();
  if (diff <= 0) return "Jetzt!";
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) { const d = Math.floor(h / 24); return `in ${d} Tag${d > 1 ? "en" : ""}`; }
  if (h > 0) return `in ${h} Std ${m} Min`;
  return `in ${m} Min`;
}

// ---------- Helpers & TabBtn ----------
function TabBtn({ icon: Icon, label, active, onClick }) {
  const tabId = `tab-${label}`;
  return (
    <button
      className={`tab-btn ${active ? "active" : ""}`} onClick={onClick}
      role="tab" id={tabId} aria-selected={active} aria-label={label}
    >
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function EmptyHint({ text }) {
  return <div className="empty-hint empty-state">{text}</div>;
}

// Makro-Ring (SVG): übersichtlicher als 3 Balken, Dark/Light via currentColor/Vars.
function MacroRing({ pct, label, sub }) {
  const r = 44, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg className="macro-ring" viewBox="0 0 100 100" role="img" aria-label={`${label} ${p}%`}>
        <circle className="trk" cx="50" cy="50" r={r} />
        <circle className="val" cx="50" cy="50" r={r} strokeDasharray={`${(p / 100) * c} ${c}`} />
      </svg>
      <div>
        <div className="row-title">{label}</div>
        <div className="row-sub">{sub}</div>
      </div>
    </div>
  );
}

// ---------- Home ----------

// Sauberes Cover: kein Workouts-gesamt (siehe Training-Tab), kein Verlauf.
// Nur: Hero (nächstes Training) + Streak-Pill + Heute-Card (Ring + Protein/KH/Fett) + Quick-Actions.
function HomeTab({ nextEvent, goTo, meals, nutrition, checkins }) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  const todayKey = dateKey(Date.now());
  const todayMeals = safeMeals.filter((m) => m && dateKey(m.ts) === todayKey);
  const todayKcal = todayMeals.reduce((a, c) => a + (c.kcal || 0), 0);
  const targetKcal = Number((nutrition || {}).dailyGoal) || 2000;
  const pct = targetKcal > 0 ? Math.min(100, Math.round((todayKcal / targetKcal) * 100)) : 0;
  const streak = computePhotoStreak(checkins);
  const checked = hasTodayCheckin(checkins);
  const sumMacro = (k) => Math.round(todayMeals.reduce((a, c) => a + (Number(c[k]) || 0), 0) * 10) / 10;
  const targets = macroTargets(nutrition || {});
  const macroPct = (v, t) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);
  const macros = [
    { label: "Protein", val: sumMacro("protein"), target: targets.protein },
    { label: "KH", val: sumMacro("carbs"), target: targets.carbs },
    { label: "Fett", val: sumMacro("fat"), target: targets.fat },
  ];

  return (
    <div className="pad home-cover">
      <div className="hero-card clean-cover card-in">
        <div className="hero-label">Nächstes Training{nextEvent?.shared ? " · mit Freund" : ""}</div>
        {nextEvent ? (
          <div className="hero-big">{formatCountdown(nextEvent.target)}</div>
        ) : (
          <div className="hero-big">Bereit?</div>
        )}
        <div className="hero-sub">
          {nextEvent ? `${nextEvent.label || "Fitnessstudio"} · ${nextEvent.time} Uhr` : "Kein Termin geplant – leg direkt los"}
        </div>
        <div className="streak-pill">🔥 {streak} Tage · {checked ? "heute ✓" : "heute offen"}</div>
        {!nextEvent && <button className="hero-cta" onClick={() => goTo("erinnerungen")}>Erinnerung anlegen</button>}
      </div>

      <div className="cover-card card-in section-card" onClick={() => goTo("ernaehrung")} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") goTo("ernaehrung"); }}
        style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <MacroRing pct={pct} label="Heute" sub={`${todayKcal} / ${targetKcal} kcal`} />
        <div className="macro-rows" style={{ flex: "1 1 150px", minWidth: "min(100%,150px)", marginTop: 0 }}>
          {macros.map((r) => (
            <div key={r.label} className="macro-row">
              <div className="macro-head"><span>{r.label}</span><span>{r.val} / {r.target} g</span></div>
              <div className="progress-bar slim"><div className="progress-fill" style={{ width: `${macroPct(r.val, r.target)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-grid">
        <button className="quick-btn primary" onClick={() => goTo("training")}>+ Workout</button>
        <button className="quick-btn" onClick={() => goTo("ernaehrung")}>+ Essen</button>
        <button className="quick-btn" onClick={() => goTo("ziele")}>{checked ? "Ziele ansehen" : "Einchecken"}</button>
      </div>
    </div>
  );
}

// ---------- Training ----------
function TrainingTab({ workouts, setWorkouts, plans, setPlans, sharedPlans, persistSharedPlans, profile, restDays, setRestDays }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [sets, setSets] = useState([{ reps: "", weight: "" }]);
  const [rpe, setRpe] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [note, setNote] = useState("");
  const [queue, setQueue] = useState([]);
  const [queueLabel, setQueueLabel] = useState(null);

  const [planCreating, setPlanCreating] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planEmoji, setPlanEmoji] = useState("🔥");
  const [planExercises, setPlanExercises] = useState([]);
  const PLAN_EMOJIS = ["🔥", "💪", "🦵", "🏋️", "🏃", "🧘", "🚴", "🚣"];

  const suggestions = name.trim() ? EXERCISES.filter((e) => e.name.toLowerCase().includes(name.trim().toLowerCase())).slice(0, 5) : [];

  const addSetRow = () => setSets((s) => [...s, { reps: "", weight: "" }]);
  const updateSet = (i, field, val) => setSets((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  const removeSet = (i) => setSets((s) => s.filter((_, idx) => idx !== i));

  const save = () => {
    if (!name.trim()) return;
    const entry = {
      id: uid(), name: name.trim(), ts: Date.now(),
      sets: sets.filter((s) => s.reps || s.weight),
      rpe: rpe === "" ? "" : Math.max(1, Math.min(10, Number(rpe) || "")),
      durationMin: durationMin === "" ? "" : Math.max(0, Number(durationMin) || 0),
      note: note.trim(),
    };
    setWorkouts((w) => [entry, ...w]);
    setSets([{ reps: "", weight: "" }]);
    setRpe(""); setDurationMin(""); setNote("");
    if (queue.length > 1) {
      const rest = queue.slice(1);
      setQueue(rest); setName(rest[0]);
    } else {
      setQueue([]); setQueueLabel(null); setName(""); setAdding(false);
    }
  };
  const [histLimit, setHistLimit] = useState(30);
  const remove = (id) => {
    try { if (!window.confirm("Workout wirklich löschen?")) return; } catch {}
    setWorkouts((w) => w.filter((x) => x.id !== id));
  };

  const startPlan = (plan) => {
    if (!plan || !Array.isArray(plan.exercises) || !plan.exercises.length) return;
    setQueue(plan.exercises); setQueueLabel(`${plan.emoji || "🔥"} ${plan.name || "Plan"}`);
    setName(plan.exercises[0] || ""); setSets([{ reps: "", weight: "" }]);
    setRpe(""); setDurationMin(""); setNote(""); setAdding(true);
    setShowSuggest(false);
  };
  const addTemplate = (tpl) => setPlans((p) => [...p, { id: uid(), ...tpl }]);
  const toggleExerciseInPlan = (ex) =>
    setPlanExercises((cur) => (cur.includes(ex) ? cur.filter((x) => x !== ex) : [...cur, ex]));
  const savePlan = () => {
    if (!planName.trim() || !planExercises.length) return;
    setPlans((p) => [...p, { id: uid(), name: planName.trim(), emoji: planEmoji, exercises: planExercises }]);
    setPlanName(""); setPlanExercises([]); setPlanEmoji("🔥"); setPlanCreating(false);
  };
  const removePlan = (id) => {
    try { if (!window.confirm("Plan wirklich löschen?")) return; } catch {}
    setPlans((p) => p.filter((x) => x.id !== id));
  };

  const sharePlan = (plan) => {
    const author = (profile.name || "").trim();
    if (!author || !plan) return;
    persistSharedPlans((prev) => {
      const list = Array.isArray(prev) ? prev : sharedPlans;
      if (list.some((s) => s && s.originId === plan.id && s.author === author)) return list;
      return [{ id: uid(), originId: plan.id, name: plan.name, emoji: plan.emoji, exercises: plan.exercises, author }, ...list];
    });
  };
  const adoptSharedPlan = (sp) => {
    if (!sp || !Array.isArray(sp.exercises)) return;
    setPlans((p) => [...p, { id: uid(), name: sp.name || "Geteilter Plan", emoji: sp.emoji || "🔥", exercises: sp.exercises }]);
  };

  const myName = (profile.name || "").trim();
  const friendsShared = (sharedPlans || []).filter((s) => s && (myName ? s.author !== myName : true));

  const nowTs = Date.now();
  const trainDays = new Set(
    (workouts || [])
      .filter((w) => w && w.ts && w.ts >= nowTs - 7 * 86400000 && w.ts <= nowTs)
      .map((w) => dateKey(w.ts))
  ).size;
  const trainTarget = Math.max(0, 7 - (Number(restDays) || 0));
  const trainPct = trainTarget > 0 ? Math.min(100, Math.round((trainDays / trainTarget) * 100)) : 100;

  return (
    <div className="pad">
      <div className="header-row">
        <div className="screen-title">Training</div>
        <button className="icon-btn" onClick={() => setAdding((a) => !a)}>{adding ? <X size={18} /> : <Plus size={18} />}</button>
      </div>

      <div className="stat-card wide card-in">
        <div className="stat-head">
          <div>
            <div className="stat-label">Trainingstage diese Woche</div>
            <div className="stat-num">{trainDays} / {trainTarget}</div>
          </div>
          <div className="stepper">
            <span className="stepper-label">Ruhetage/Woche</span>
            <div className="stepper-controls">
              <button className="stepper-btn" onClick={() => setRestDays(Math.max(0, (Number(restDays) || 0) - 1))} aria-label="Weniger Ruhetage"><Minus size={13} /></button>
              <span className="stepper-num">{Number(restDays) || 0}</span>
              <button className="stepper-btn" onClick={() => setRestDays(Math.min(6, (Number(restDays) || 0) + 1))} aria-label="Mehr Ruhetage"><Plus size={13} /></button>
            </div>
          </div>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${trainPct}%` }} /></div>
      </div>

      {adding && (
        <div className="form-card card-in">
          {queueLabel && <div className="queue-banner">{queueLabel} · noch {queue.length} Übung{queue.length !== 1 ? "en" : ""}</div>}
          <div className="autocomplete-wrap">
            <input
              className="input" placeholder="Übung, z.B. Bankdrücken" value={name}
              onFocus={() => setShowSuggest(true)}
              onChange={(e) => { setName(e.target.value); setShowSuggest(true); }}
            />
            {showSuggest && suggestions.length > 0 && (
              <div className="suggest-list">
                {suggestions.map((s) => (
                  <button key={s.name} className="suggest-item" onClick={() => { setName(s.name); setShowSuggest(false); }}>
                    <span>{s.emoji}</span> {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {sets.map((s, i) => (
            <div key={i} className="set-row">
              <input className="input-small" placeholder="Wdh." inputMode="numeric" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} />
              <span className="set-x">×</span>
              <input className="input-small" placeholder="kg" inputMode="decimal" value={s.weight} onChange={(e) => updateSet(i, "weight", e.target.value)} />
              {sets.length > 1 && <button className="icon-btn-ghost" onClick={() => removeSet(i)}><Trash2 size={14} /></button>}
            </div>
          ))}
          <button className="link-btn" onClick={addSetRow}>+ Satz hinzufügen</button>
          <details className="hist-day">
            <summary className="hist-day-head"><span className="row-sub">Details: RPE, Dauer, Notiz</span></summary>
            <div className="set-row">
              <input className="input" type="number" min="1" max="10" placeholder="RPE 1–10" value={rpe} onChange={(e) => setRpe(e.target.value)} />
              <input className="input" type="number" min="0" placeholder="Dauer (Min)" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </div>
            <input className="input" placeholder="Notiz (z.B. Griff, Fokus …)" value={note} onChange={(e) => setNote(e.target.value)} />
          </details>
          <button className="primary-btn" onClick={save}><Check size={16} /> {queue.length > 1 ? "Speichern & weiter" : "Workout speichern"}</button>
        </div>
      )}

      <div className="section-title">Trainingspläne</div>
      <div className="template-row">
        {PLAN_TEMPLATES.map((tpl) => (
          <button key={tpl.name} className="template-chip" onClick={() => addTemplate(tpl)}>
            <span>{tpl.emoji}</span> {tpl.name} <Plus size={12} />
          </button>
        ))}
      </div>

      {planCreating && (
        <div className="form-card card-in">
          <input className="input" placeholder="Name des Plans" value={planName} onChange={(e) => setPlanName(e.target.value)} />
          <div className="day-picker">
            {PLAN_EMOJIS.map((em) => (
              <button key={em} className={"day-chip" + (planEmoji === em ? " active" : "")} onClick={() => setPlanEmoji(em)}>{em}</button>
            ))}
          </div>
          <div className="day-picker">
            {EXERCISES.map((e) => (
              <button key={e.name} className={"day-chip" + (planExercises.includes(e.name) ? " active" : "")} onClick={() => toggleExerciseInPlan(e.name)}>
                {e.emoji} {e.name}
              </button>
            ))}
          </div>
          <button className="primary-btn" onClick={savePlan} disabled={!planName.trim() || !planExercises.length}><Check size={16} /> Plan speichern</button>
        </div>
      )}
      <button className="link-btn" style={{ marginBottom: 10 }} onClick={() => setPlanCreating((a) => !a)}>
        {planCreating ? "Abbrechen" : "+ Eigenen Plan erstellen"}
      </button>

      {plans.length === 0 && <EmptyHint text="Noch keine Pläne. Nimm eine Vorlage oben oder erstell deinen eigenen." />}
      {(plans || []).map((p) => (
        <div key={p.id} className="row-card plan-card card-in">
          <div style={{ flex: 1 }}>
            <div className="row-title">{p.emoji || "🔥"} {p.name || "Plan"}</div>
            <div className="row-sub">{(p.exercises || []).map((e) => exerciseEmoji(e) + " " + e).join(" · ")}</div>
            <div className="proposal-actions">
              <button className="accept-btn" onClick={() => startPlan(p)}><Dumbbell size={13} /> Loggen</button>
              <button className="link-btn" onClick={() => sharePlan(p)}><Share2 size={12} style={{ verticalAlign: "-2px" }} /> Mit Partner teilen</button>
              <button className="icon-btn-ghost" onClick={() => removePlan(p.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        </div>
      ))}

      {friendsShared.length > 0 && (
        <>
          <div className="section-title">Geteilte Pläne von Freunden</div>
          {friendsShared.map((sp) => (
            <div key={sp.id} className="row-card card-in">
              <div style={{ flex: 1 }}>
                <div className="row-title">{sp.emoji || "🔥"} {sp.name || "Plan"}</div>
                <div className="row-sub">von {sp.author || "?"} · {(sp.exercises || []).join(", ")}</div>
              </div>
              <button className="link-btn" onClick={() => adoptSharedPlan(sp)}><Copy size={12} style={{ verticalAlign: "-2px" }} /> Übernehmen</button>
            </div>
          ))}
        </>
      )}

      <div className="divider" />
      <div className="section-title">Verlauf</div>
      {(workouts || []).length === 0 && <EmptyHint text="Noch keine Workouts. Tipp auf + und leg los." />}
      {(() => {
        const list = [...(workouts || [])].filter((w) => w && w.ts != null).sort((a, b) => (b.ts || 0) - (a.ts || 0));
        const groups = {};
        list.forEach((w) => {
          const k = dateKey(w.ts);
          if (!groups[k]) groups[k] = [];
          groups[k].push(w);
        });
        const keys = Object.keys(groups).sort((a, b) => (groups[b][0].ts || 0) - (groups[a][0].ts || 0));
        const visKeys = keys.slice(0, histLimit);
        const rest = keys.length - visKeys.length;
        return (<>
        {visKeys.map((k, idx) => {
          const items = groups[k];
          const label = new Date(items[0].ts).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
          return (
            <details key={k} className="form-card card-in hist-day" open={idx < 3}>
              <summary className="hist-day-head">
                <span className="row-title">{label}</span>
                <span className="row-sub">{items.length} Workout{items.length !== 1 ? "s" : ""}</span>
              </summary>
              <div className="hist-day-body">
                {items.map((w) => {
                  const vol = Math.round(workoutVolume(w));
                  const best = bestSetLabel(w);
                  return (
                    <div key={w.id} className="row-card card-in">
                      <details style={{ flex: 1, minWidth: 0 }}>
                        <summary className="hist-day-head">
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <div className="row-title">{exerciseEmoji(w.name)} {w.name || "Workout"}</div>
                            <div className="row-sub">
                              {(w.sets || []).map((s) => `${s.reps || "-"}×${s.weight || "-"}kg`).join(", ") || "keine Sätze"}
                              {vol > 0 ? ` · Vol. ${vol} kg` : ""}
                            </div>
                          </span>
                        </summary>
                        <div className="hist-day-body">
                          {(w.sets || []).map((s, i) => (
                            <div key={i} className="row-sub">Satz {i + 1}: {s.reps || "–"} Wdh. × {s.weight || "–"} kg</div>
                          ))}
                          {w.rpe !== "" && w.rpe != null && <div className="row-sub">RPE {w.rpe}/10</div>}
                          {w.durationMin !== "" && w.durationMin != null && <div className="row-sub">Dauer {w.durationMin} Min</div>}
                          {w.note ? <div className="row-sub">📝 {w.note}</div> : null}
                          {vol > 0 && <div className="row-sub">Volumen {vol} kg{best ? ` · Bester Satz ${best}` : ""}</div>}
                        </div>
                      </details>
                      <button className="icon-btn-ghost" onClick={() => remove(w.id)} aria-label={(w.name || "Workout") + " löschen"}><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
        {rest > 0 && (
          <button className="link-btn" style={{ marginTop: 8 }} onClick={() => setHistLimit((l) => l + 30)}>
            Mehr laden ({rest} Tage)
          </button>
        )}
        </>);
      })()}
    </div>
  );
}

// ---------- Food ----------
const GOAL_LABELS = { abnehmen: "Abnehmen", halten: "Halten", zunehmen: "Zunehmen" };
const GENDER_LABELS = { weiblich: "Weiblich", maennlich: "Männlich", divers: "Divers" };
const ACTIVITY_LEVELS = [
  { id: "ruhig", label: "Ruhig", desc: "Büro, kein Sport", factor: 1.2 },
  { id: "normal", label: "Leicht", desc: "1–2× Sport/Woche", factor: 1.375 },
  { id: "aktiv", label: "Moderat", desc: "3–5× Sport/Woche", factor: 1.55 },
  { id: "sehr aktiv", label: "Aktiv", desc: "6–7× intensiv", factor: 1.725 },
  { id: "profi", label: "Profi", desc: "täglich hart + Job", factor: 1.9 },
];

// Nährwerte pro 100 g (Getränke pro 100 ml). unit: native Einheit, density: g pro ml (nur bei ml ≠ 1).
const FOOD_DB = [
  { name: "Weidemilch 3,5%", emoji: "🥛", kcal: 64, protein: 3.3, carbs: 4.8, fat: 3.5, portion: 250, unit: "ml", density: 1.03 },
  { name: "Weidemilch 1,5%", emoji: "🥛", kcal: 47, protein: 3.4, carbs: 4.9, fat: 1.5, portion: 250, unit: "ml", density: 1.03 },
  { name: "H-Milch 3,5%", emoji: "🥛", kcal: 64, protein: 3.3, carbs: 4.7, fat: 3.5, portion: 250, unit: "ml", density: 1.03 },
  { name: "Laktosefreie Milch", emoji: "🥛", kcal: 65, protein: 3.3, carbs: 4.9, fat: 3.5, portion: 250, unit: "ml", density: 1.03 },
  { name: "Hafermilch", emoji: "🌾", kcal: 44, protein: 0.8, carbs: 8.0, fat: 1.5, portion: 250, unit: "ml" },
  { name: "Mandelmilch", emoji: "🌰", kcal: 24, protein: 0.5, carbs: 3.0, fat: 1.1, portion: 250, unit: "ml" },
  { name: "Magerquark", emoji: "🍶", kcal: 68, protein: 12.0, carbs: 4.0, fat: 0.3, portion: 200, unit: "g" },
  { name: "Speisequark 20%", emoji: "🍶", kcal: 109, protein: 11.0, carbs: 3.5, fat: 5.1, portion: 200, unit: "g" },
  { name: "Griechischer Joghurt", emoji: "🥛", kcal: 97, protein: 9.0, carbs: 4.0, fat: 5.0, portion: 150, unit: "g" },
  { name: "Naturjoghurt 3,5%", emoji: "🥛", kcal: 69, protein: 3.5, carbs: 4.5, fat: 3.5, portion: 150, unit: "g" },
  { name: "Skyr natur", emoji: "🍶", kcal: 63, protein: 11.0, carbs: 4.0, fat: 0.2, portion: 150, unit: "g" },
  { name: "Gouda", emoji: "🧀", kcal: 356, protein: 25.0, carbs: 0.1, fat: 29.0, portion: 30, unit: "g" },
  { name: "Emmentaler", emoji: "🧀", kcal: 384, protein: 29.0, carbs: 0.1, fat: 30.0, portion: 30, unit: "g" },
  { name: "Mozzarella", emoji: "🧀", kcal: 231, protein: 18.5, carbs: 1.0, fat: 17.0, portion: 125, unit: "g" },
  { name: "Frischkäse natur", emoji: "🧀", kcal: 134, protein: 7.5, carbs: 3.0, fat: 10.0, portion: 30, unit: "g" },
  { name: "Butter", emoji: "🧈", kcal: 741, protein: 0.7, carbs: 0.7, fat: 82.0, portion: 15, unit: "g" },
  { name: "Sahne", emoji: "🥛", kcal: 195, protein: 3.0, carbs: 3.4, fat: 19.0, portion: 50, unit: "ml" },
  { name: "Wasser", emoji: "💧", kcal: 0, protein: 0.0, carbs: 0.0, fat: 0.0, portion: 500, unit: "ml" },
  { name: "Apfelschorle", emoji: "🍎", kcal: 28, protein: 0.1, carbs: 6.8, fat: 0.0, portion: 300, unit: "ml" },
  { name: "Cola", emoji: "🥤", kcal: 42, protein: 0.0, carbs: 10.6, fat: 0.0, portion: 330, unit: "ml" },
  { name: "Orangensaft", emoji: "🍊", kcal: 45, protein: 0.7, carbs: 10.4, fat: 0.2, portion: 250, unit: "ml", density: 1.05 },
  { name: "Kaffee mit Milch", emoji: "☕", kcal: 20, protein: 1.2, carbs: 1.8, fat: 0.8, portion: 200, unit: "ml" },
  { name: "Bier Pils", emoji: "🍺", kcal: 43, protein: 0.5, carbs: 3.6, fat: 0.0, portion: 500, unit: "ml" },
  { name: "Vollkornbrot", emoji: "🍞", kcal: 221, protein: 8.0, carbs: 38.5, fat: 3.5, portion: 60, unit: "g" },
  { name: "Weißbrot", emoji: "🍞", kcal: 265, protein: 9.0, carbs: 49.0, fat: 3.2, portion: 50, unit: "g" },
  { name: "Roggenbrot", emoji: "🍞", kcal: 219, protein: 6.5, carbs: 42.0, fat: 1.5, portion: 60, unit: "g" },
  { name: "Weizenbrötchen", emoji: "🥖", kcal: 272, protein: 8.6, carbs: 52.5, fat: 2.6, portion: 70, unit: "g" },
  { name: "Croissant", emoji: "🥐", kcal: 406, protein: 8.0, carbs: 45.0, fat: 21.0, portion: 60, unit: "g" },
  { name: "Nudeln roh", emoji: "🍝", kcal: 350, protein: 12.0, carbs: 72.0, fat: 1.8, portion: 100, unit: "g" },
  { name: "Nudeln gekocht", emoji: "🍝", kcal: 135, protein: 5.1, carbs: 25.0, fat: 1.1, portion: 200, unit: "g" },
  { name: "Reis roh", emoji: "🍚", kcal: 352, protein: 7.0, carbs: 78.5, fat: 0.6, portion: 75, unit: "g" },
  { name: "Reis gekocht", emoji: "🍚", kcal: 130, protein: 2.7, carbs: 28.0, fat: 0.3, portion: 200, unit: "g" },
  { name: "Kartoffeln roh", emoji: "🥔", kcal: 77, protein: 2.0, carbs: 17.0, fat: 0.1, portion: 200, unit: "g" },
  { name: "Kartoffeln gekocht", emoji: "🥔", kcal: 86, protein: 2.0, carbs: 19.0, fat: 0.1, portion: 200, unit: "g" },
  { name: "Pommes", emoji: "🍟", kcal: 312, protein: 3.4, carbs: 38.0, fat: 15.2, portion: 150, unit: "g" },
  { name: "Hähnchenbrust", emoji: "🍗", kcal: 110, protein: 23.1, carbs: 0.0, fat: 1.2, portion: 150, unit: "g" },
  { name: "Rindersteak", emoji: "🥩", kcal: 139, protein: 21.5, carbs: 0.0, fat: 5.5, portion: 200, unit: "g" },
  { name: "Schweineschnitzel", emoji: "🐷", kcal: 145, protein: 21.0, carbs: 0.0, fat: 6.5, portion: 150, unit: "g" },
  { name: "Hackfleisch Rind", emoji: "🍔", kcal: 203, protein: 19.0, carbs: 0.0, fat: 14.0, portion: 125, unit: "g" },
  { name: "Bratwurst", emoji: "🌭", kcal: 300, protein: 13.0, carbs: 1.0, fat: 27.0, portion: 100, unit: "g" },
  { name: "Lachsfilet", emoji: "🐟", kcal: 208, protein: 20.0, carbs: 0.0, fat: 13.0, portion: 150, unit: "g" },
  { name: "Thunfisch in Wasser", emoji: "🐟", kcal: 108, protein: 25.5, carbs: 0.0, fat: 1.0, portion: 150, unit: "g" },
  { name: "Ei gekocht", emoji: "🥚", kcal: 155, protein: 13.0, carbs: 1.1, fat: 11.0, portion: 60, unit: "g" },
  { name: "Rührei", emoji: "🍳", kcal: 194, protein: 13.2, carbs: 1.5, fat: 15.0, portion: 120, unit: "g" },
  { name: "Spiegelei", emoji: "🍳", kcal: 196, protein: 13.6, carbs: 1.2, fat: 15.3, portion: 60, unit: "g" },
  { name: "Banane", emoji: "🍌", kcal: 95, protein: 1.1, carbs: 22.8, fat: 0.3, portion: 120, unit: "g" },
  { name: "Apfel", emoji: "🍎", kcal: 54, protein: 0.3, carbs: 14.0, fat: 0.2, portion: 150, unit: "g" },
  { name: "Erdbeeren", emoji: "🍓", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, portion: 200, unit: "g" },
  { name: "Heidelbeeren", emoji: "🫐", kcal: 42, protein: 0.7, carbs: 10.0, fat: 0.3, portion: 150, unit: "g" },
  { name: "Brokkoli", emoji: "🥦", kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4, portion: 200, unit: "g" },
  { name: "Karotten", emoji: "🥕", kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, portion: 150, unit: "g" },
  { name: "Tomaten", emoji: "🍅", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, portion: 200, unit: "g" },
  { name: "Gurke", emoji: "🥒", kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, portion: 200, unit: "g" },
  { name: "Paprika", emoji: "🫑", kcal: 31, protein: 1.3, carbs: 6.4, fat: 0.3, portion: 150, unit: "g" },
  { name: "Avocado", emoji: "🥑", kcal: 160, protein: 2.0, carbs: 8.5, fat: 14.7, portion: 100, unit: "g" },
  { name: "Zwiebeln", emoji: "🧅", kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, portion: 80, unit: "g" },
  { name: "Mandeln", emoji: "🌰", kcal: 579, protein: 21.2, carbs: 21.6, fat: 49.9, portion: 25, unit: "g" },
  { name: "Erdnüsse", emoji: "🥜", kcal: 567, protein: 25.8, carbs: 16.1, fat: 49.2, portion: 30, unit: "g" },
  { name: "Walnüsse", emoji: "🌰", kcal: 654, protein: 15.2, carbs: 13.7, fat: 65.2, portion: 25, unit: "g" },
  { name: "Haselnüsse", emoji: "🌰", kcal: 628, protein: 15.0, carbs: 16.7, fat: 60.8, portion: 25, unit: "g" },
  { name: "Olivenöl", emoji: "🫒", kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0, portion: 10, unit: "ml", density: 0.92 },
  { name: "Rapsöl", emoji: "🌻", kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0, portion: 10, unit: "ml", density: 0.92 },
  { name: "Vollmilchschokolade", emoji: "🍫", kcal: 535, protein: 7.3, carbs: 59.0, fat: 30.0, portion: 25, unit: "g" },
  { name: "Zartbitterschokolade", emoji: "🍫", kcal: 498, protein: 7.0, carbs: 46.0, fat: 33.0, portion: 25, unit: "g" },
  { name: "Honig", emoji: "🍯", kcal: 304, protein: 0.3, carbs: 82.0, fat: 0.0, portion: 20, unit: "ml", density: 1.4 },
  { name: "Vanilleeis", emoji: "🍨", kcal: 207, protein: 3.5, carbs: 24.0, fat: 11.0, portion: 100, unit: "g" },
  { name: "Gummibärchen", emoji: "🍬", kcal: 343, protein: 6.9, carbs: 77.0, fat: 0.1, portion: 50, unit: "g" },
  { name: "Proteinriegel Schoko", emoji: "🍫", kcal: 381, protein: 30.0, carbs: 32.0, fat: 12.0, portion: 60, unit: "g" },
  { name: "Whey Vanille", emoji: "🥤", kcal: 400, protein: 80.0, carbs: 7.5, fat: 6.0, portion: 30, unit: "g" },
  { name: "Haferflocken", emoji: "🌾", kcal: 372, protein: 13.5, carbs: 68.0, fat: 7.0, portion: 50, unit: "g" },
  { name: "Knuspermüsli Schoko", emoji: "🥣", kcal: 446, protein: 9.5, carbs: 64.0, fat: 16.5, portion: 60, unit: "g" },
  { name: "Cornflakes", emoji: "🌽", kcal: 371, protein: 7.5, carbs: 84.0, fat: 0.8, portion: 40, unit: "g" },
];
function calcMacros(food, amount, unit) {
  const u = unit || food.unit || "g";
  const raw = Math.max(0, Number(amount) || 0);
  const grams = u === "ml" ? raw * (Number(food.density) || 1) : raw;
  const f = grams / 100;
  const r1 = (v) => Math.round(v * 10) / 10;
  return { kcal: Math.round(food.kcal * f), protein: r1(food.protein * f), carbs: r1(food.carbs * f), fat: r1(food.fat * f) };
}
// Tagesziele für Makros (g): Protein/Fett je nach Ziel pro kg, Carbs als Rest (mit Rebalancing).
function macroTargets(nutrition) {
  const nu = nutrition || {};
  const targetKcal = Number(nu.dailyGoal) || 2000;
  const weight = Number(nu.weight) || 0;
  const goal = nu.goal || "halten";
  let protein, fat;
  if (weight > 0) {
    const perKg = goal === "abnehmen" ? 2.0 : 1.8;
    protein = Math.min(Math.round(weight * perKg), Math.round(weight * 2.5));
    fat = Math.round(weight * (goal === "abnehmen" ? 0.8 : 1.0));
  } else {
    protein = 120;
    fat = Math.round((targetKcal * 0.25) / 9);
  }
  fat = Math.max(fat, 40);
  let carbs = Math.round((targetKcal - protein * 4 - fat * 9) / 4);
  if (weight > 0 && carbs < 0) {
    const fatMin = Math.max(40, Math.round(weight * 0.6));
    if (fat > fatMin) fat -= Math.min(fat - fatMin, Math.ceil(-carbs * 4 / 9));
    carbs = Math.round((targetKcal - protein * 4 - fat * 9) / 4);
    if (carbs < 0) {
      const protMin = Math.round(weight * (goal === "abnehmen" ? 1.8 : 1.6));
      if (protein > protMin) protein -= Math.min(protein - protMin, Math.ceil(-carbs / 4));
      carbs = Math.max(0, Math.round((targetKcal - protein * 4 - fat * 9) / 4));
    }
  } else {
    carbs = Math.max(0, carbs);
  }
  return { protein, fat, carbs };
}
// Grundumsatz (Mifflin-St Jeor, bei gültigem KFA Katch-McArdle) × Aktivität + tempo-basiertes
// Defizit/Surplus -> empfohlenes Tagesziel. Gibt { value, warn, method, tdee, delta } oder null zurück.
function calcDailyGoal(nutrition, profile) {
  const nu = nutrition || {}, prof = profile || {};
  const h = Number(nu.height), w = Number(nu.weight);
  const age = Number(prof.age) || 30;
  const gender = prof.gender || "";
  if (!h || !w || h < 130 || h > 230 || w < 35 || w > 300 || age < 15 || age > 80) return null;
  const kfa = Number(nu.bodyFat);
  const kfaValid = Number.isFinite(kfa) && kfa > 0 && (
    gender === "maennlich" ? (kfa >= 4 && kfa <= 50)
    : gender === "weiblich" ? (kfa >= 10 && kfa <= 55)
    : (kfa >= 4 && kfa <= 55)
  );
  let bmr, method;
  if (kfaValid) {
    const lbm = w * (1 - kfa / 100);
    bmr = 370 + 21.6 * lbm;
    method = "Katch-McArdle";
  } else {
    const bonus = gender === "weiblich" ? -161 : gender === "maennlich" ? 5 : -78;
    bmr = 10 * w + 6.25 * h - 5 * age + bonus;
    method = "Mifflin-St Jeor";
  }
  const activity = ACTIVITY_LEVELS.find((a) => a.id === nu.activity) || ACTIVITY_LEVELS[1];
  const tdee = Math.round(bmr * activity.factor);
  const goal = nu.goal || "halten";
  const rate = Math.max(0, Number(nu.rate) || 0);
  let delta = 0, warn = "";
  if (goal === "abnehmen") {
    const r = Math.min(1, rate || 0.5);
    const computed = Math.round((r * 1100) / 50) * 50;
    const cap = Math.min(750, Math.max(200, Math.round(tdee * 0.25)));
    delta = -Math.max(150, Math.min(computed, cap));
    if (computed > cap) warn = "Defizit zum Muskelerhalt begrenzt.";
  } else if (goal === "zunehmen") {
    const r = Math.min(0.5, rate || 0.25);
    delta = Math.min(500, Math.max(200, Math.round((r * 1100) / 50) * 50));
  }
  const absFloor = gender === "weiblich" ? 1200 : 1500;
  const floor = Math.max(Math.round(bmr), absFloor);
  let value = Math.round((tdee + delta) / 50) * 50;
  if (value < floor) {
    value = Math.round(floor / 50) * 50;
    warn = (warn ? warn + " " : "") + "Ziel auf Grundumsatz-Minimum angehoben.";
  }
  return { value, warn, method, tdee, delta };
}

function NutritionProfile({ nutrition, setNutrition, profile }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nutrition);
  const [initialized, setInitialized] = useState(false);
  const [calcInfo, setCalcInfo] = useState("");
  // nutrition lädt asynchron: Draft übernehmen und Formular nur beim ersten Laden
  // automatisch öffnen, wenn noch keine Daten vorhanden sind.
  useEffect(() => {
    setDraft(nutrition);
    if (!initialized) {
      setEditing(!(nutrition.height || nutrition.weight));
      setInitialized(true);
    }
  }, [nutrition]);

  const commit = () => {
    const dailyGoal = Math.max(0, Math.min(20000, Number(draft.dailyGoal) || 0));
    setNutrition({ ...draft, dailyGoal });
    setEditing(false);
  };

  const autoGoal = () => {
    const g = calcDailyGoal(draft, profile || {});
    if (!g) {
      setCalcInfo("Für die Berechnung: Größe (130–230 cm) + Gewicht (35–300 kg) hier und Alter (15–80) im Profil (Tab Profil) ausfüllen.");
      return;
    }
    setDraft((d) => ({ ...d, dailyGoal: g.value }));
    setCalcInfo(`Empfohlen: ${g.value} kcal/Tag (${g.method}, Verbrauch ~${g.tdee} kcal${g.delta ? `, ${g.delta > 0 ? "+" : ""}${g.delta}` : ""}).${g.warn ? " Hinweis: " + g.warn : ""}`);
  };

  if (!editing) {
    const act = ACTIVITY_LEVELS.find((a) => a.id === nutrition.activity);
    return (
      <div className="name-pill">
        <span>{nutrition.height || "–"} cm · {nutrition.weight || "–"} kg{nutrition.bodyFat ? ` · KFA ${nutrition.bodyFat}%` : ""} · {act ? act.label : "Normal"} · Ziel: {GOAL_LABELS[nutrition.goal] || nutrition.goal} · {nutrition.dailyGoal} kcal/Tag</span>
        <button className="icon-btn-ghost" onClick={() => { setEditing(true); setCalcInfo(""); }}><Pencil size={13} /></button>
      </div>
    );
  }
  return (
    <div className="form-card card-in">
      <div className="set-row">
        <input className="input" type="number" min="100" max="250" placeholder="Größe (cm)" value={draft.height} onChange={(e) => setDraft({ ...draft, height: e.target.value })} />
        <input className="input" type="number" min="25" max="400" placeholder="Gewicht (kg)" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} />
      </div>
      <input className="input" type="number" min="3" max="60" placeholder="Körperfett % (optional, für Katch-McArdle)" value={draft.bodyFat || ""} onChange={(e) => setDraft({ ...draft, bodyFat: e.target.value })} />
      <div className="day-picker">
        {Object.entries(GOAL_LABELS).map(([id, label]) => (
          <button key={id} className={"day-chip" + (draft.goal === id ? " active" : "")} onClick={() => setDraft({ ...draft, goal: id })}>{label}</button>
        ))}
      </div>
      {draft.goal !== "halten" && (
        <>
          <div className="section-title" style={{ marginTop: 4 }}>Tempo (kg/Woche)</div>
          <div className="day-picker">
            {(draft.goal === "abnehmen" ? ["0.25", "0.5", "0.75", "1"] : ["0.15", "0.25", "0.4", "0.5"]).map((v) => {
              const fallback = draft.goal === "abnehmen" ? "0.5" : "0.25";
              return (
                <button key={v} className={"day-chip" + ((draft.rate || fallback) === v ? " active" : "")} onClick={() => setDraft({ ...draft, rate: v })}>{v.replace(".", ",")} kg</button>
              );
            })}
          </div>
        </>
      )}
      <div className="section-title" style={{ marginTop: 4 }}>Aktivität</div>
      <div className="day-picker">
        {ACTIVITY_LEVELS.map((a) => (
          <button key={a.id} className={"day-chip" + ((draft.activity || "normal") === a.id ? " active" : "")} onClick={() => setDraft({ ...draft, activity: a.id })}>{a.label} · {a.desc}</button>
        ))}
      </div>
      <div className="set-row">
        <input className="input" type="number" placeholder="Tagesziel (kcal)" value={draft.dailyGoal} onChange={(e) => setDraft({ ...draft, dailyGoal: Number(e.target.value) || 0 })} />
      </div>
      <button className="link-btn" onClick={autoGoal}>🧮 Tagesziel ausrechnen lassen</button>
      {calcInfo && <div className="row-sub">{calcInfo}</div>}
      <button className="primary-btn" onClick={commit}><Check size={16} /> Speichern</button>
    </div>
  );
}

// Wasser/Flüssigkeit: eigener Key fitness:water ([{id, ts, ml}]), Tagesziel 35 ml/kg oder 2000 ml.
function WaterCard({ water, setWater, nutrition }) {
  const [customMl, setCustomMl] = useState("");
  const wKg = parseNum((nutrition || {}).weight);
  const waterGoal = wKg > 0 ? Math.round(wKg * 35) : 2000;
  const todayKey = dateKey(Date.now());
  const todayList = (water || []).filter((x) => x && dateKey(x.ts) === todayKey);
  const todayMl = todayList.reduce((a, c) => a + (Number(c.ml) || 0), 0);
  const pct = waterGoal > 0 ? Math.min(100, Math.round((todayMl / waterGoal) * 100)) : 0;

  const addWater = (ml) => {
    const v = Math.round(Number(ml));
    if (!Number.isFinite(v) || v <= 0 || v > 2000) return;
    setWater((prev) => [{ id: uid(), ts: Date.now(), ml: v }, ...(Array.isArray(prev) ? prev : [])]);
    setCustomMl("");
  };
  const removeWater = (id) => setWater((prev) => (Array.isArray(prev) ? prev : []).filter((x) => x && x.id !== id));

  return (
    <div className="stat-card wide card-in" style={{ marginTop: 8 }}>
      <div className="stat-head">
        <div>
          <Droplet size={16} color="var(--accent2)" />
          <div className="stat-num">{todayMl} / {waterGoal} ml</div>
          <div className="stat-label">Wasser heute{wKg > 0 ? ` · Ziel 35 ml/kg` : ""}</div>
        </div>
        <div className="stat-num">{pct}%</div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="set-row" style={{ marginTop: 8 }}>
        <button className="day-chip" onClick={() => addWater(250)}>+250 ml</button>
        <button className="day-chip" onClick={() => addWater(500)}>+500 ml</button>
        <input className="input" type="number" min="50" max="2000" placeholder="ml" value={customMl} onChange={(e) => setCustomMl(e.target.value)} style={{ maxWidth: 90 }} />
        <button className="icon-btn" onClick={() => addWater(customMl)} aria-label="Wasser eintragen"><Check size={16} /></button>
      </div>
      {todayList.slice(0, 5).map((x) => (
        <div key={x.id} className="row-card card-in" style={{ marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <div className="row-sub">{new Date(x.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · {x.ml} ml</div>
          </div>
          <button className="icon-btn-ghost" onClick={() => removeWater(x.id)} aria-label="Eintrag löschen"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function FoodTab({ meals, setMeals, nutrition, setNutrition, profile, water, setWater }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [mealName, setMealName] = useState("");
  const [mealKcal, setMealKcal] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFat, setMealFat] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoKcal, setPhotoKcal] = useState("");
  const [calcQuery, setCalcQuery] = useState("");
  const [calcShowSuggest, setCalcShowSuggest] = useState(false);
  const [calcGrams, setCalcGrams] = useState("");
  const [calcUnit, setCalcUnit] = useState("g");
  const [entryMode, setEntryMode] = useState("rechner");
  const [offLoading, setOffLoading] = useState(false);
  const [offResults, setOffResults] = useState([]);
  const [offError, setOffError] = useState("");
  const [apiFoods, setApiFoods] = useState({});
  const fileInputRef = useRef(null);

  const calcFood = FOOD_DB.find((f) => f.name.toLowerCase() === calcQuery.trim().toLowerCase())
    || apiFoods[calcQuery.trim().toLowerCase()] || null;
  const calcSuggestions = calcQuery.trim()
    ? FOOD_DB.filter((f) => f.name.toLowerCase().includes(calcQuery.trim().toLowerCase())).slice(0, 5)
    : [];
  const amountNum = Math.max(0, Number(calcGrams) || 0);
  const calcResult = calcFood && amountNum > 0 ? calcMacros(calcFood, amountNum, calcUnit) : null;

  const saveCalcMeal = () => {
    if (!calcFood || !amountNum || amountNum <= 0 || amountNum > 5000 || !calcResult) {
      setError("Bitte Lebensmittel wählen und Menge (1–5000) eingeben.");
      return;
    }
    setMeals((m) => [{
      id: uid(), ts: Date.now(), name: `${calcFood.name} (${amountNum} ${calcUnit})`,
      kcal: calcResult.kcal, protein: calcResult.protein, carbs: calcResult.carbs, fat: calcResult.fat,
    }, ...m]);
    setCalcQuery(""); setCalcGrams(""); setError("");
  };

  const offCtrlRef = useRef(null);
  const offReqRef = useRef(0);
  // Gratis-Online-Suche über Open Food Facts (kein API-Key nötig), Offline-DB als Fallback.
  // Mit Abort + ReqId gegen Race bei schnellem Tippen.
  const searchOnline = async () => {
    const q = calcQuery.trim();
    if (q.length < 3) { setOffError("Mindestens 3 Zeichen eingeben."); return; }
    try { offCtrlRef.current?.abort(); } catch {}
    const ctrl = new AbortController();
    offCtrlRef.current = ctrl;
    const myReq = ++offReqRef.current;
    setOffLoading(true); setOffError(""); setOffResults([]);
    try {
      const url = "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(q)
        + "&search_simple=1&action=process&json=1&page_size=8";
      const res = await fetch(url, { signal: ctrl.signal });
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
      if (myReq !== offReqRef.current) return;
      if (!items.length) setOffError("Online nichts gefunden – nutze die Offline-Datenbank.");
      setOffResults(items);
    } catch (e) {
      if (e && e.name === "AbortError") return;
      if (myReq !== offReqRef.current) return;
      setOffError("Keine Verbindung – Offline-Datenbank wird verwendet.");
    } finally {
      if (myReq === offReqRef.current) setOffLoading(false);
    }
  };

  const pickOffResult = (f) => {
    if (!f) return;
    setApiFoods((m) => ({ ...m, [f.name.toLowerCase()]: f }));
    setCalcQuery(f.name); setCalcGrams(String(f.portion || 100)); setCalcUnit("g"); setCalcShowSuggest(false);
    setOffResults([]); setOffError("");
  };

  // Automatischer Online-Fallback: findet die Offline-DB nichts, sucht Open Food Facts von selbst.
  useEffect(() => {
    if (entryMode !== "rechner") return;
    const q = calcQuery.trim();
    if (q.length < 3 || calcFood) { setOffResults([]); setOffError(""); return; }
    const t = setTimeout(() => { searchOnline(); }, 700);
    return () => clearTimeout(t);
  }, [calcQuery, entryMode]);

  const resetFileInput = (e) => { try { if (e?.target) e.target.value = ""; } catch {} };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setAnalyzing(true);
    try {
      if (file.type && !file.type.startsWith("image/")) throw new Error("Keine Bilddatei");
      if (file.size > 8 * 1024 * 1024) throw new Error("Bild zu groß (max. 8 MB)");
      const base64 = await fileToBase64(file);
      setPreview("data:" + (file.type || "image/jpeg") + ";base64," + base64);
      // Offline-Schätzung als Startwert (kein Backend/Key im Client).
      // Grobe Heuristik über Dateigröße, Nutzer korrigiert vor dem Speichern.
      const guess = Math.max(50, Math.min(1200, Math.round(file.size / 1024 / 4)));
      setPhotoName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "Mahlzeit");
      setPhotoKcal(String(guess));
      setEntryMode("foto");
    } catch (err) {
      setError(err?.message === "Bild zu groß (max. 8 MB)" || err?.message === "Keine Bilddatei"
        ? err.message
        : "Foto konnte nicht gelesen werden. Trage die Mahlzeit manuell ein.");
      setPreview(null);
    } finally {
      setAnalyzing(false);
      resetFileInput(e);
    }
  };

  const savePhotoMeal = () => {
    const kcal = Math.round(Number(photoKcal));
    if (!photoName.trim() || !kcal || kcal <= 0 || kcal > 10000) {
      setError("Bitte Name und Kalorien (1–10000) prüfen.");
      return;
    }
    setMeals((m) => [{ id: uid(), ts: Date.now(), name: photoName.trim(), kcal }, ...m]);
    setPreview(null); setPhotoName(""); setPhotoKcal(""); setError("");
  };

  const addManualMeal = () => {
    const kcal = Math.round(Number(mealKcal));
    if (!mealName.trim() || !kcal || kcal <= 0 || kcal > 10000) {
      setError("Bitte Name und Kalorien (1–10000) prüfen.");
      return;
    }
    const opt = (v) => { const n = Math.round(Number(v) * 10) / 10; return n > 0 ? n : 0; };
    setMeals((m) => [{
      id: uid(), ts: Date.now(), name: mealName.trim(), kcal,
      protein: opt(mealProtein), carbs: opt(mealCarbs), fat: opt(mealFat),
    }, ...m]);
    setMealName(""); setMealKcal(""); setMealProtein(""); setMealCarbs(""); setMealFat("");
    setError("");
  };

  const removeMeal = (id) => {
    try { if (!window.confirm("Mahlzeit wirklich löschen?")) return; } catch {}
    setMeals((m) => m.filter((x) => x.id !== id));
  };

  const todayMeals = (meals || []).filter((m) => m && dateKey(m.ts) === dateKey(Date.now()));
  const todayKcal = todayMeals.reduce((acc, curr) => acc + (curr.kcal || 0), 0);
  const sumMacro = (key) => Math.round(todayMeals.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0) * 10) / 10;
  const todayProtein = sumMacro("protein"), todayCarbs = sumMacro("carbs"), todayFat = sumMacro("fat");
  const targetKcal = Number(nutrition.dailyGoal) || 2000;
  const targets = macroTargets(nutrition);
  const progressPct = targetKcal > 0 ? Math.min(100, Math.round((todayKcal / targetKcal) * 100)) : 0;
  const macroPct = (val, target) => target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0;

  return (
    <div className="pad">
      <div className="header-row">
        <div className="screen-title">Ernährung</div>
        <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>
          <Camera size={18} />
        </button>
        <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      </div>

      <NutritionProfile nutrition={nutrition} setNutrition={setNutrition} profile={profile} />

      <div className="stat-card wide card-in" style={{ marginTop: 12 }}>
        <div className="stat-head">
          <div>
            <Flame size={16} color="var(--accent)" />
            <div className="stat-num">{todayKcal} / {targetKcal} kcal</div>
            <div className="stat-label">Heute konsumiert</div>
          </div>
          <div className="stat-num">{progressPct}%</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="macro-rows">
          {[
            { label: "Protein", val: todayProtein, target: targets.protein, unit: "g" },
            { label: "Kohlenhydrate", val: todayCarbs, target: targets.carbs, unit: "g" },
            { label: "Fett", val: todayFat, target: targets.fat, unit: "g" },
          ].map((r) => (
            <div key={r.label} className="macro-row">
              <div className="macro-head"><span>{r.label}</span><span>{r.val} / {r.target} {r.unit}</span></div>
              <div className="progress-bar slim"><div className="progress-fill" style={{ width: `${macroPct(r.val, r.target)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <WaterCard water={water} setWater={setWater} nutrition={nutrition} />

      <div className="segmented" style={{ margin: "12px 0" }}>
        {[["rechner", "🧮 Rechner"], ["foto", "📷 Foto"], ["manuell", "✏️ Manuell"]].map(([id, label]) => (
          <button key={id} className={"segment" + (entryMode === id ? " active" : "")} onClick={() => setEntryMode(id)}>{label}</button>
        ))}
      </div>

      {entryMode === "rechner" && (
        <div className="form-card card-in">
          <div className="autocomplete-wrap">
            <input
              className="input" placeholder="Lebensmittel suchen, z.B. Hähnchenbrust" value={calcQuery}
              onFocus={() => setCalcShowSuggest(true)}
              onChange={(e) => { setCalcQuery(e.target.value); setCalcShowSuggest(true); }}
            />
            {calcShowSuggest && calcSuggestions.length > 0 && (
              <div className="suggest-list">
                {calcSuggestions.map((f) => (
                <button key={f.name} className="suggest-item" onClick={() => { setCalcQuery(f.name); setCalcGrams(String(f.portion)); setCalcUnit(f.unit || "g"); setCalcShowSuggest(false); }}>
                  <span>{f.emoji}</span> {f.name} <span className="row-sub">· {f.kcal} kcal/100 {f.unit || "g"}</span>
                </button>
                ))}
              </div>
            )}
          </div>
          <div className="set-row">
            <input className="input" type="number" min="1" max="5000" placeholder={"Menge (" + calcUnit + ")"} value={calcGrams} onChange={(e) => setCalcGrams(e.target.value)} />
            {["g", "ml"].map((u) => (
              <button key={u} className={"day-chip" + (calcUnit === u ? " active" : "")} onClick={() => setCalcUnit(u)}>{u}</button>
            ))}
          </div>
          {calcFood && (
            <div className="day-picker">
              {[calcFood.portion, 100, 200].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                <button key={v} className={"day-chip" + (amountNum === v ? " active" : "")} onClick={() => setCalcGrams(String(v))}>{v} {calcUnit}</button>
              ))}
            </div>
          )}
          {calcResult && (
            <div className="calc-result">
              {calcFood.emoji} {calcFood.name} ({amountNum} {calcUnit}): <b>{calcResult.kcal} kcal</b> · P {calcResult.protein} g · KH {calcResult.carbs} g · F {calcResult.fat} g
            </div>
          )}
          <div className="set-row">
            <button className="link-btn" onClick={searchOnline}>🌍 Online suchen (Open Food Facts)</button>
            {offLoading && <Loader2 className="spin" size={16} />}
          </div>
          {offError && <div className="error-banner">{offError}</div>}
          {offResults.length > 0 && (
            <div className="off-list">
              {offResults.map((f) => (
                <button key={f.name + (f.brand || "")} className="suggest-item off-item" onClick={() => pickOffResult(f)}>
                  <span>{f.emoji}</span>
                  <span style={{ flex: 1 }}>{f.name}{f.brand ? <span className="row-sub"> · {f.brand}</span> : null}</span>
                  <span className="row-sub">{f.kcal} kcal/100 g</span>
                </button>
              ))}
            </div>
          )}
          <button className="primary-btn" onClick={saveCalcMeal} disabled={!calcResult}><Check size={16} /> Eintragen</button>
        </div>
      )}

      {entryMode === "foto" && (
        <>
          {!preview && !analyzing && (
            <button className="primary-btn" onClick={() => fileInputRef.current?.click()}><Camera size={16} /> Foto wählen</button>
          )}
          {analyzing && (
            <div className="form-card card-in loader-wrap">
              <Loader2 className="spin" size={24} />
              <span>Lese Foto …</span>
            </div>
          )}
          {preview && (
            <div className="form-card card-in" style={{ marginTop: 12 }}>
              <img src={preview} alt="Mahlzeitenfoto" className="meal-preview" loading="lazy" decoding="async" />
              <div className="row-sub">Prüfe die Schätzung und speichere erst dann.</div>
              <input className="input" placeholder="Mahlzeit (z.B. Haferflocken)" value={photoName} onChange={(e) => setPhotoName(e.target.value)} />
              <input className="input" type="number" min="1" max="10000" placeholder="Kalorien (kcal)" value={photoKcal} onChange={(e) => setPhotoKcal(e.target.value)} />
              <div className="set-row">
                <button className="primary-btn" onClick={savePhotoMeal}><Check size={16} /> Speichern</button>
                <button className="icon-btn-ghost" onClick={() => { setPreview(null); setPhotoName(""); setPhotoKcal(""); }}><X size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <div className="error-banner">{error}</div>}

      {entryMode === "manuell" && (
        <div className="form-card card-in">
          <input className="input" placeholder="Mahlzeit (z.B. Haferflocken)" value={mealName} onChange={(e) => setMealName(e.target.value)} />
          <input className="input" type="number" min="1" max="10000" placeholder="Kalorien (kcal)" value={mealKcal} onChange={(e) => setMealKcal(e.target.value)} />
          <div className="row-sub">Makros optional — oder im Rechner-Modus automatisch ausrechnen lassen.</div>
          <div className="set-row">
            <input className="input" type="number" min="0" placeholder="Protein (g)" value={mealProtein} onChange={(e) => setMealProtein(e.target.value)} />
            <input className="input" type="number" min="0" placeholder="KH (g)" value={mealCarbs} onChange={(e) => setMealCarbs(e.target.value)} />
            <input className="input" type="number" min="0" placeholder="Fett (g)" value={mealFat} onChange={(e) => setMealFat(e.target.value)} />
          </div>
          <div className="set-row">
            <button className="primary-btn" onClick={addManualMeal}><Check size={16} /> Speichern</button>
          </div>
        </div>
      )}

      <div className="section-title">Einträge</div>
      {(meals || []).length === 0 && <EmptyHint text="Noch keine Mahlzeiten erfasst." />}
      {(meals || []).map((m) => (
        <div key={m.id} className="row-card card-in">
          <div style={{ flex: 1 }}>
            <div className="row-title">🥗 {m.name}</div>
            <div className="row-sub">
              {new Date(m.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · {m.kcal} kcal
              {(Number(m.protein) || Number(m.carbs) || Number(m.fat)) ? ` · P ${m.protein || 0} g · KH ${m.carbs || 0} g · F ${m.fat || 0} g` : ""}
            </div>
          </div>
          <button className="icon-btn-ghost" onClick={() => removeMeal(m.id)}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ---------- Ziele ----------
// Gym-Check-in: Foto wird nur kurz geprüft (echt? Studio?) und danach VERWORFEN, nie gespeichert.
// Es verlässt das Gerät nicht, wird nie in localStorage gelegt, nur {id, ts} wird gespeichert.
function CheckinCard({ checkins, setCheckins }) {
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [checkStudio, setCheckStudio] = useState(false);
  const [checkReal, setCheckReal] = useState(false);
  const safe = Array.isArray(checkins) ? checkins : [];
  const streak = computePhotoStreak(safe);
  const doneToday = hasTodayCheckin(safe);

  const discardPending = () => {
    setPendingPhoto(null);
    setCheckStudio(false);
    setCheckReal(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (hasTodayCheckin(Array.isArray(checkins) ? checkins : [])) return;
    setError("");
    setSaving(true);
    try {
      if (file.type && !file.type.startsWith("image/")) throw new Error("Keine Bilddatei");
      if ((file.size || 0) < 20000) throw new Error("Datei zu klein – nimm ein echtes Foto.");
      if (file.size > 15 * 1024 * 1024) throw new Error("Bild zu groß (max. 15 MB)");
      // Grobe Offline-Plausibilisierung: Auflösung + Seitenverhältnis (kein Backend nötig).
      // Kein echter Gym-Erkennungs-KI – deshalb zusätzlich ehrliche Selbst-Bestätigung unten.
      if (typeof createImageBitmap === "function") {
        let bmp = null;
        try {
          bmp = await createImageBitmap(file);
          const w = bmp.width || 0, h = bmp.height || 0;
          if (w < 400 || h < 400) throw new Error("Zu klein/unscharf – nimm ein Live-Foto im Studio.");
          const ratio = w / Math.max(1, h);
          if (ratio > 3 || ratio < 0.33) throw new Error("Screenshot-verdächtig – nimm ein Live-Foto im Studio.");
        } finally {
          try { if (bmp && typeof bmp.close === "function") bmp.close(); } catch {}
        }
      }
      const photo = await fileToPhotoDataUrl(file, 900, 0.72);
      setPendingPhoto(photo);
      setCheckStudio(false);
      setCheckReal(false);
    } catch (err) {
      setError((err && err.message) || "Foto konnte nicht geprüft werden.");
      discardPending();
    } finally {
      setSaving(false);
      try { if (e?.target) e.target.value = ""; } catch {}
    }
  };

  const confirmCheckin = () => {
    if (!pendingPhoto) return;
    if (!checkStudio || !checkReal) { setError("Bitte beide Punkte ehrlich bestätigen."); return; }
    if (hasTodayCheckin(Array.isArray(checkins) ? checkins : [])) { discardPending(); return; }
    // WICHTIG: nur {id, ts} speichern – das Foto (pendingPhoto) wird hier verworfen, nie persistiert.
    const cleanPrev = (Array.isArray(checkins) ? checkins : []).map((c) => ({ id: c.id, ts: c.ts }));
    setCheckins([{ id: uid(), ts: Date.now() }, ...cleanPrev]);
    discardPending();
    setError("");
  };

  const remove = (id) => {
    try { if (!window.confirm("Check-in wirklich löschen? Streak kann sinken.")) return; } catch {}
    setCheckins(safe.filter((c) => c && c.id !== id));
  };

  return (
    <div className="form-card card-in">
      <div className="checkin-head">
        <Flame size={18} color="var(--accent)" />
        <span className="checkin-streak">🔥 {streak} Tag{streak !== 1 ? "e" : ""} Streak</span>
      </div>
      <div className="row-sub">Foto wird nur kurz geprüft und <b>nicht gespeichert</b> — ehrlich bleiben! Das Foto verlässt dein Gerät nicht und wird sofort verworfen.</div>
      {error && <div className="error-banner">{error}</div>}
      <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {!pendingPhoto ? (
        <button className="primary-btn" disabled={doneToday || saving} onClick={() => fileRef.current?.click()}>
          {doneToday ? (<><Check size={16} /> Heute eingecheckt ✓</>) : (<><Camera size={16} /> {saving ? "Prüfe Foto …" : "Gym-Foto prüfen & einchecken"}</>)}
        </button>
      ) : (
        <>
          <img src={pendingPhoto} alt="Gym-Foto zur Prüfung" className="meal-preview" loading="lazy" decoding="async" />
          <div className="row-sub" style={{ fontWeight: 700, marginTop: 4 }}>Bitte ehrlich bestätigen:</div>
          <button className={"check-line" + (checkStudio ? " active" : "")} onClick={() => setCheckStudio((v) => !v)}>
            <span className="check-box">{checkStudio ? "✓" : ""}</span> Im Studio aufgenommen (heute)
          </button>
          <button className={"check-line" + (checkReal ? " active" : "")} onClick={() => setCheckReal((v) => !v)}>
            <span className="check-box">{checkReal ? "✓" : ""}</span> Geräte/Fläche erkennbar, kein Screenshot
          </button>
          <div className="row-sub">Nur {`{Datum, Zeit}`} wird als Nachweis gespeichert – das Bild wird verworfen.</div>
          <div className="set-row">
            <button className="primary-btn" onClick={confirmCheckin} disabled={!checkStudio || !checkReal}><Check size={16} /> Ja, einchecken</button>
            <button className="icon-btn-ghost" onClick={discardPending}><X size={16} /></button>
          </div>
        </>
      )}
      <div className="section-title">Nachweise</div>
      {safe.length === 0 && <div className="empty-hint">Noch keine Check-ins. Dein erstes Gym-Foto startet die Streak.</div>}
      {safe.slice(0, 7).map((c) => (
        <div key={c.id} className="row-card card-in">
          <div style={{ flex: 1 }}>
            <div className="row-title">📷 Gym-Check-in</div>
            <div className="row-sub">
              {c.ts != null && !isNaN(new Date(c.ts))
                ? new Date(c.ts).toLocaleDateString("de-DE") + " · " + new Date(c.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr"
                : "–"}
            </div>
          </div>
          <button className="icon-btn-ghost" onClick={() => remove(c.id)} aria-label="Check-in löschen"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// Skill-Baum: pro Ast ein einklappbarer Mini-Node-Graph (Referenz-Design).
// skills = { [skillId]: { done, ts, photo } }. Freischalten nur per Foto.
function SkillTreeSection({ skills, setSkills }) {
  const safe = skills && typeof skills === "object" ? skills : {};
  const fileRef = useRef(null);
  const [pendingSkillId, setPendingSkillId] = useState(null);
  const [error, setError] = useState("");
  const [openCat, setOpenCat] = useState("zug");

  const onPress = (id) => {
    if (safe[id]?.done) {
      setSkills((prev) => {
        const next = { ...(prev || {}) };
        delete next[id];
        return next;
      });
      return;
    }
    setPendingSkillId(id);
    setError("");
    if (fileRef.current) fileRef.current.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    const targetId = pendingSkillId;
    if (!file || !targetId) {
      try { e.target.value = ""; } catch {}
      return;
    }
    try {
      // Nur Thumb 320px q0.6 für Skills (Quota-Schutz) statt 900px.
      const photo = await fileToPhotoDataUrl(file, 320, 0.6);
      setSkills((prev) => ({ ...(prev || {}), [targetId]: { done: true, ts: Date.now(), photo } }));
      setError("");
    } catch {
      setError("Foto konnte nicht verarbeitet werden. Bitte erneut versuchen.");
    } finally {
      setPendingSkillId(null);
      try { e.target.value = ""; } catch {}
    }
  };

  const isDone = (id) => !!(safe[id] && safe[id].done);
  const totalDone = SKILL_TREE.reduce((a, cat) => a + cat.skills.filter((s) => isDone(s.id)).length, 0);
  const totalAll = SKILL_TREE.reduce((a, cat) => a + cat.skills.length, 0);
  const pctAll = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;

  const renderMiniTree = (cat) => {
    const ZIG = [0, 30, -28, 24, -20];
    const H = 56 + (cat.skills.length - 1) * 104 + 84;
    const firstOpen = cat.skills.find((s) => !isDone(s.id));
    const P = (idx) => ({ x: 180 + (ZIG[idx] || 0), y: 56 + idx * 104 });
    return (
      <div className="tree-canvas" style={{ height: H }}>
        <svg className="tree-edges" width="100%" height={H} viewBox={"0 0 360 " + H} preserveAspectRatio="none">
          {cat.skills.map((s, idx) => {
            if (idx + 1 >= cat.skills.length) return null;
            const A = P(idx), B = P(idx + 1);
            const gold = isDone(cat.skills[idx + 1].id);
            const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
            return (
              <path
                key={s.id + ">" + cat.skills[idx + 1].id}
                d={`M ${A.x} ${A.y + 24} Q ${mx} ${my} ${B.x} ${B.y - 24}`}
                stroke={gold ? "#E5A83B" : "rgba(255,255,255,0.18)"}
                strokeWidth={gold ? 2.5 : 1.5}
                fill="none"
                strokeDasharray={gold ? "" : "5 5"}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        {cat.skills.map((s, idx) => {
          const p = P(idx);
          const done = isDone(s.id);
          const entry = safe[s.id];
          return (
            <div key={s.id}>
              <button
                className={"tree-node" + (done ? " done" : "") + (firstOpen && firstOpen.id === s.id ? " next" : "")}
                style={{ left: `calc(${(p.x / 360) * 100}% - 24px)`, top: p.y - 24 }}
                onClick={() => onPress(s.id)}
                aria-label={s.name + (done ? " (geschafft, erneut tippen = entfernen)" : " (per Foto freischalten)")}
              >
                {done ? <Check size={20} /> : null}
                {done && entry && entry.photo && <img src={entry.photo} alt="" className="tree-thumb" loading="lazy" decoding="async" />}
              </button>
              <div className="tree-label" style={{ left: `calc(${(p.x / 360) * 100}% - 60px)`, top: p.y + 28, width: 120 }}>
                <div className="tree-name">{s.emoji} {s.name}</div>
                <div className="tree-tier">{s.tier}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="section-title"><Trophy size={15} style={{ verticalAlign: "-2px" }} /> Skill-Baum ({totalDone}/{totalAll})</div>
      <div className="tree-wrap card-in">
        <div className="tree-summary">
          <span className="row-sub">{pctAll}% freigeschaltet · nur mit Foto ehrlich</span>
        </div>
        <div className="progress-bar slim" style={{ marginBottom: 6 }}><div className="progress-fill" style={{ width: pctAll + "%" }} /></div>
        {totalDone === 0 && <div className="empty-hint">Tippe einen Kreis an und lade ein Foto als Nachweis hoch.</div>}
        {error && <div className="error-banner">{error}</div>}
      </div>
      {SKILL_TREE.map((cat) => {
        const done = cat.skills.filter((s) => isDone(s.id)).length;
        const pct = cat.skills.length ? Math.round((done / cat.skills.length) * 100) : 0;
        const open = openCat === cat.id;
        return (
          <div key={cat.id} className="form-card card-in">
            <div
              className="skill-cat-head" onClick={() => setOpenCat(open ? null : cat.id)}
              role="button" tabIndex={0} aria-expanded={open}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenCat(open ? null : cat.id); } }}
            >
              <span className="row-title">{cat.emoji} {cat.title}</span>
              <span className="row-sub">{done}/{cat.skills.length} · {pct}% {open ? "▾" : "▸"}</span>
            </div>
            {open && renderMiniTree(cat)}
          </div>
        );
      })}
      <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

function ZieleTab({ checkins, setCheckins, skills, setSkills }) {
  return (
    <div className="pad">
      <div className="header-row">
        <div className="screen-title">Ziele</div>
      </div>
      <CheckinCard checkins={checkins} setCheckins={setCheckins} />
      <SkillTreeSection skills={skills} setSkills={setSkills} />
    </div>
  );
}

// ---------- ReminderTab (eigener Screen, via Menü/Tabbar erreichbar) ----------
function ReminderTab({ reminders, setReminders, proposals, persistProposals, profile }) {
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("18:00");
  const [selectedDays, setSelectedDays] = useState(["Mo", "Mi", "Fr"]);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [propTitle, setPropTitle] = useState("");
  const [propDay, setPropDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [propTime, setPropTime] = useState("18:00");

  const safeReminders = Array.isArray(reminders) ? reminders : [];
  const safeProposals = Array.isArray(proposals) ? proposals : [];

  const toggleDay = (d) => {
    setSelectedDays((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);
  };

  const addReminder = () => {
    if (!label.trim()) { setFormError("Bitte einen Titel eingeben."); return; }
    if (!time || !time.includes(":")) { setFormError("Bitte eine Uhrzeit wählen."); return; }
    if (!selectedDays.length) { setFormError("Bitte mindestens einen Tag wählen."); return; }
    setFormError("");
    setReminders([...safeReminders, { id: uid(), label: label.trim(), time, days: selectedDays, active: true }]);
    setLabel(""); setAdding(false);
  };

  const removeReminder = (id) => {
    try { if (!window.confirm("Erinnerung wirklich löschen?")) return; } catch {}
    setReminders(safeReminders.filter((r) => r && r.id !== id));
  };
  const toggleActive = (id) => setReminders(safeReminders.map((r) => r && r.id === id ? { ...r, active: !r.active } : r));

  const addProposal = () => {
    if (!propTitle.trim() || !propDay || !propTime.includes(":")) { setFormError("Bitte Titel, Tag und Uhrzeit für den Vorschlag ausfüllen."); return; }
    setFormError("");
    const author = ((profile || {}).name || "").trim() || "Du";
    persistProposals((prev) => [
      { id: uid(), title: propTitle.trim(), day: propDay, time: propTime, status: "offen", author },
      ...(Array.isArray(prev) ? prev : safeProposals),
    ]);
    setPropTitle("");
  };
  const setProposalStatus = (id, status) =>
    persistProposals((prev) => (Array.isArray(prev) ? prev : safeProposals).map((p) => p && p.id === id ? { ...p, status } : p));
  const removeProposal = (id) => {
    try { if (!window.confirm("Vorschlag wirklich löschen?")) return; } catch {}
    persistProposals((prev) => (Array.isArray(prev) ? prev : safeProposals).filter((p) => p && p.id !== id));
  };

  return (
    <div className="pad">
      <div className="header-row">
        <div className="screen-title">Erinnerungen</div>
        <button className="icon-btn" onClick={() => setAdding(!adding)} aria-label={adding ? "Abbrechen" : "Erinnerung hinzufügen"}>{adding ? <X size={18} /> : <Plus size={18} />}</button>
      </div>

      {adding && (
        <div className="form-card card-in">
          <input className="input" placeholder="Titel (z.B. Gym-Time)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <div className="day-picker">
            {DAYS.map((d) => (
              <button key={d} className={"day-chip" + (selectedDays.includes(d) ? " active" : "")} onClick={() => toggleDay(d)}>{d}</button>
            ))}
          </div>
          {formError && <div className="error-banner">{formError}</div>}
          <button className="primary-btn" onClick={addReminder}><Check size={16} /> Erinnerung speichern</button>
        </div>
      )}

      <div className="section-title">Deine Erinnerungen</div>
      {safeReminders.length === 0 && <EmptyHint text="Keine Erinnerungen gestellt." />}
      {safeReminders.map((r) => (
        <div key={r.id} className="row-card card-in">
          <div style={{ flex: 1 }}>
            <div className="row-title">{r.label || "Erinnerung"} · {r.time || "--:--"} Uhr</div>
            <div className="row-sub">{(r.days || []).join(", ") || "keine Tage"}</div>
          </div>
          <button className={"toggle-btn" + (r.active ? " active" : "")} onClick={() => toggleActive(r.id)}>
            {r.active ? "An" : "Aus"}
          </button>
          <button className="icon-btn-ghost" onClick={() => removeReminder(r.id)} aria-label={(r.label || "Erinnerung") + " löschen"}><Trash2 size={14} /></button>
        </div>
      ))}

      <div className="section-title">Gemeinsame Trainings vorschlagen</div>
      <div className="row-sub" style={{ marginBottom: 8 }}>Nur lokal auf diesem Gerät – kein echtes Teilen ohne Konto/Server.</div>
      <div className="form-card card-in section-card">
        <input className="input" placeholder="Titel (z.B. Push Day zusammen)" value={propTitle} onChange={(e) => setPropTitle(e.target.value)} />
        <div className="set-row">
          <input className="input" type="date" value={propDay} onChange={(e) => setPropDay(e.target.value)} />
          <input className="input" type="time" value={propTime} onChange={(e) => setPropTime(e.target.value)} />
        </div>
        <button className="primary-btn" onClick={addProposal}><Users size={16} /> Vorschlag teilen</button>
      </div>
      {safeProposals.length === 0 && <EmptyHint text="Noch keine Vorschläge." />}
      {safeProposals.map((p) => (
        <div key={p.id} className="row-card card-in">
          <div style={{ flex: 1 }}>
            <div className="row-title"><Users size={13} style={{ verticalAlign: "-2px" }} /> {p.title || "Gemeinsames Training"}</div>
            <div className="row-sub">{p.day || "?"} · {p.time || "--:--"} Uhr · von {p.author || "?"} · {p.status || "offen"}</div>
            {p.status === "offen" && (
              <div className="proposal-actions">
                <button className="accept-btn" onClick={() => setProposalStatus(p.id, "bestätigt")}><Check size={13} /> Zusagen</button>
                <button className="link-btn" onClick={() => setProposalStatus(p.id, "abgelehnt")}>Absagen</button>
              </div>
            )}
          </div>
          <button className="icon-btn-ghost" onClick={() => removeProposal(p.id)} aria-label={(p.title || "Vorschlag") + " löschen"}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ---------- Profil ----------
// Einzige Stelle für persönliche Daten (Name/Alter/Geschlecht) – bewusst getrennt von den anderen Tabs.
// Dort wird profile nur lesend für Sharing/Berechnung genutzt, nie bearbeitet.
function ProfilTab({ profile, setProfile, checkins, workouts, skills, nutrition }) {
  const p = profile || {};
  const set = (patch) => setProfile({ ...p, ...patch });
  const skillDone = SKILL_TREE.reduce((a, cat) => a + cat.skills.filter((s) => skills && skills[s.id]?.done).length, 0);
  const skillAll = SKILL_TREE.reduce((a, cat) => a + cat.skills.length, 0);
  return (
    <div className="pad">
      <div className="header-row">
        <div className="screen-title">Profil</div>
      </div>
      <div className="row-sub" style={{ marginBottom: 8 }}>Hier – und nur hier – liegen deine persönlichen Daten. Die anderen Tabs nutzen sie nur.</div>
      <div className="form-card card-in">
        <div className="section-title" style={{ marginTop: 0 }}>Persönliche Daten</div>
        <input
          className="input" placeholder="Dein Name (für Partner-Sharing)" value={p.name || ""}
          onChange={(e) => set({ name: e.target.value })}
        />
        <div className="set-row">
          <input
            className="input" type="number" min="10" max="120" placeholder="Alter (Jahre)" value={p.age || ""}
            onChange={(e) => set({ age: e.target.value })}
          />
        </div>
        <div className="row-sub">Geschlecht (für Kalorienberechnung)</div>
        <div className="day-picker">
          {Object.entries(GENDER_LABELS).map(([id, label]) => (
            <button
              key={id}
              className={"day-chip" + (p.gender === id ? " active" : "")}
              onClick={() => set({ gender: p.gender === id ? "" : id })}
            >{label}</button>
          ))}
        </div>
        <div className="row-sub">Alter + Geschlecht fließen in die Tagesziel-Berechnung ein (Tab Ernährung).</div>
      </div>
      <div className="stat-card wide card-in">
        <div className="section-title" style={{ marginTop: 0 }}>Überblick</div>
        <div className="row-sub">🔥 Streak: {computePhotoStreak(checkins)} Tage</div>
        <div className="row-sub">🏋️ Workouts gesamt: {(workouts || []).length}</div>
        <div className="row-sub">🏆 Skills: {skillDone}/{skillAll}</div>
        <div className="row-sub">🎯 Tagesziel: {Number((nutrition || {}).dailyGoal) || 2000} kcal</div>
      </div>
    </div>
  );
}

// ---------- Styles ----------
const css = `
* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
body { background: var(--bg); color: var(--text); overflow-x: hidden; }
.app { min-height: 100vh; background: var(--bg); color: var(--text); display: flex; flex-direction: column; max-width: 480px; margin: 0 auto; position: relative; padding-bottom: 80px; }
.statusbar { height: env(safe-area-inset-top, 0px); }
.blob { position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; will-change: transform; }
.blob-a { width: 280px; height: 280px; background: var(--blob-a); top: -50px; right: -50px; animation: drift-a 18s ease-in-out infinite alternate; }
.blob-b { width: 300px; height: 300px; background: var(--blob-b); bottom: 8%; left: -70px; animation: drift-b 22s ease-in-out infinite alternate; }
.blob-c { width: 220px; height: 220px; background: var(--blob-c); top: 42%; right: -80px; animation: drift-a 26s ease-in-out infinite alternate-reverse; }
.bg-glow { position: fixed; inset: 0; background: var(--bg-glow); pointer-events: none; z-index: 0; }
@keyframes drift-a { from { transform: translate(0, 0) scale(1); } to { transform: translate(-46px, 38px) scale(1.15); } }
@keyframes drift-b { from { transform: translate(0, 0) scale(1.1); } to { transform: translate(52px, -34px) scale(0.95); } }

.topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; z-index: 10; position: relative; }
.brand { font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; color: var(--accent); }
.theme-toggle { background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding: 8px; border-radius: 12px; cursor: pointer; }

.screen { flex: 1; padding-bottom: 72px; z-index: 1; }
.pad { padding: 0 12px; }

.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.screen-title { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }

.hero-card { background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding: 14px 15px; border-radius: 18px; position: relative; overflow: hidden; margin-bottom: 10px; }
.hero-label { font-size: 0.8rem; color: var(--text-muted); }
.hero-big { font-size: 2.2rem; font-weight: 900; margin: 6px 0; }
.hero-dash { width: 46px; height: 5px; border-radius: 3px; background: var(--accent); margin: 16px 0; }
.hero-sub { font-size: 0.9rem; color: var(--text-muted); }
.hero-cta { display: inline-block; margin-top: 12px; background: var(--accent); border: none; color: var(--accent-contrast); padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; }

.stat-card { background: var(--bg-elevated); border: 1px solid var(--border); padding: 11px 12px; border-radius: 16px; margin-bottom: 8px; }
.stat-card.wide { width: 100%; }
.stat-row { display: flex; gap: 8px; }
.stat-row .stat-card.half { flex: 1; min-width: 0; }
.dashed-box { border: 1.5px dashed var(--border-strong); border-radius: 16px; padding: 22px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
.card-in { animation: cardIn 0.3s ease both; }
@keyframes cardIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.stat-head { display: flex; justify-content: space-between; align-items: flex-start; }
.stat-num { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; margin-top: 2px; }
.stat-label { font-size: 0.75rem; color: var(--text-muted); }

.segmented { display: flex; align-items: center; gap: 2px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 999px; padding: 3px; }
.segment { border: none; background: transparent; padding: 4px 8px; font-size: 0.7rem; color: var(--text-muted); border-radius: 8px; cursor: pointer; }
.segment.active { background: var(--text); color: var(--bg); font-weight: 700; }
.segmented .segment { flex: 1; text-align: center; }

.section-title { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); margin: 12px 0 6px 0; }
.row-card { background: var(--bg-elevated); border: 1px solid var(--border); padding: 10px 12px; border-radius: 14px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.row-title { font-weight: 700; font-size: 0.88rem; letter-spacing: -0.01em; line-height: 1.3; }
.row-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

.form-card { background: var(--bg-elevated); border: 1px solid var(--border); padding: 12px; border-radius: 16px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
.input, .input-small { background: var(--bg-input); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 10px; font-size: 0.85rem; outline: none; width: 100%; }
.input-small { width: 70px; text-align: center; }
.set-row { display: flex; align-items: center; gap: 8px; }
.set-x { color: var(--text-faint); }

.primary-btn { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; border: none; padding: 10px 12px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: var(--shadow); }
.primary-btn:disabled { opacity: 0.45; cursor: not-allowed; }
input[type="date"], input[type="time"] { color-scheme: light dark; }
.queue-banner { background: var(--bg-input); border: 1px dashed var(--border-strong); padding: 8px 10px; border-radius: 10px; font-size: 0.78rem; color: var(--text-muted); }
.autocomplete-wrap { position: relative; }
.suggest-list { position: absolute; top: 100%; left: 0; right: 0; z-index: 20; background: var(--bg); border: 1px solid var(--border-strong); border-radius: 12px; overflow: hidden; margin-top: 4px; box-shadow: var(--shadow); }
.suggest-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; background: transparent; border: none; color: var(--text); padding: 10px 12px; font-size: 0.85rem; cursor: pointer; }
.suggest-item:hover { background: var(--bg-input); }
.proposal-actions { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
.accept-btn { background: var(--accent); color: #fff; border: none; padding: 6px 12px; border-radius: 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
.divider { height: 1px; background: var(--border); margin: 14px 0 4px 0; }
.error-banner { background: rgba(255,92,92,0.12); border: 1px solid rgba(255,92,92,0.45); color: #ff8a8a; padding: 10px 12px; border-radius: 12px; font-size: 0.82rem; }
.name-pill { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--bg-elevated); border: 1px solid var(--border); padding: 10px 12px; border-radius: 14px; font-size: 0.82rem; color: var(--text-muted); }
.meal-preview { width: 100%; max-height: 220px; object-fit: cover; border-radius: 14px; border: 1px solid var(--border); }
.link-btn { background: transparent; border: none; color: var(--accent); font-weight: 600; font-size: 0.85rem; cursor: pointer; text-align: left; }
.icon-btn { background: var(--accent); color: #fff; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.icon-btn-ghost { background: transparent; border: none; color: var(--text-muted); padding: 6px; cursor: pointer; }

.day-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.day-chip { background: var(--bg-input); border: 1px solid var(--border); color: var(--text-muted); padding: 5px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; cursor: pointer; }
.day-chip.active { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; border-color: transparent; }

.template-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; }
.template-chip { white-space: nowrap; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 12px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; cursor: pointer; }

.tabbar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: var(--tabbar-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid var(--border); box-shadow: var(--shadow); display: flex; z-index: 100; padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px)); }
.tab-btn { flex: 1; border: none; background: transparent; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 0.62rem; font-weight: 600; cursor: pointer; padding: 6px 0; border-radius: 12px; margin: 0 2px; min-height: 50px; }
.tab-btn.active { color: var(--accent); font-weight: 700; background: var(--bg-input); border: 1px solid var(--border); }

.progress-bar { height: 6px; background: var(--bg-input); border-radius: 999px; overflow: hidden; margin-top: 8px; }
.progress-bar.slim { height: 4px; margin-top: 4px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); border-radius: inherit; transition: width 0.3s ease; }
.macro-rows { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.macro-row { font-size: 0.78rem; }
.macro-head { display: flex; justify-content: space-between; color: var(--text-muted); font-weight: 600; }
.calc-result { background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; font-size: 0.85rem; }
.off-list { display: flex; flex-direction: column; gap: 6px; }
.off-list .suggest-item { border: 1px solid var(--border); border-radius: 12px; background: var(--bg-input); }
.hist-day { background: var(--bg-elevated); border: 1px solid var(--border); }
.hist-day-head { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--text); }
.hist-day-head::-webkit-details-marker { display: none; }
.hist-day-head::after { content: "▾"; color: var(--text-muted); }
details:not([open]) > .hist-day-head::after { content: "▸"; color: var(--text-muted); }
.hist-day-body { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.stepper { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.stepper-controls { display: flex; align-items: center; gap: 8px; background: var(--bg-input); border: 1px solid var(--border); padding: 3px 8px; border-radius: 999px; }
.stepper-btn { border: none; background: transparent; color: var(--text); cursor: pointer; display: flex; padding: 2px; }
.stepper-num { font-weight: 800; font-size: 0.85rem; min-width: 18px; text-align: center; }
.stepper-label { font-size: 0.68rem; color: var(--text-faint); }
.tree-wrap { background: #14161F; border: 1px solid var(--border); border-radius: 20px; padding: 14px 6px 10px 6px; margin-bottom: 12px; overflow: hidden; }
.tree-summary { padding: 0 10px; margin-bottom: 8px; }
.tree-canvas { position: relative; width: 100%; }
.tree-edges { position: absolute; left: 0; top: 0; }
.tree-branch-tag { position: absolute; transform: translateX(-50%); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.12em; color: var(--text-faint); background: #14161F; padding: 2px 10px; border-radius: 8px; z-index: 3; }
.tree-node { position: absolute; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #1C1F2A; border: 2px solid #3A3F4D; color: var(--text-muted); padding: 0; z-index: 2; }
.tree-node.done { background: rgba(229,168,59,0.16); border-color: #E5A83B; color: #E5A83B; box-shadow: 0 0 14px rgba(229,168,59,0.35); }
.tree-node.next { border-color: rgba(229,168,59,0.7); animation: treePulse 2s ease-in-out infinite; }
@keyframes treePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(229,168,59,0.35); } 50% { box-shadow: 0 0 0 7px rgba(229,168,59,0); } }
.tree-thumb { position: absolute; right: -7px; bottom: -7px; width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 2px solid #E5A83B; }
.tree-label { position: absolute; width: 104px; text-align: center; z-index: 2; pointer-events: none; }
.tree-name { font-size: 0.68rem; font-weight: 700; color: #E8EAF0; line-height: 1.2; }
.tree-tier { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.08em; color: #8A8FA0; margin-top: 1px; }
.skill-cat-head { cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-radius: 10px; }
.skill-cat-head:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.checkin-head { display: flex; align-items: center; gap: 8px; }
.checkin-streak { font-weight: 800; font-size: 1.1rem; color: var(--text); }
.checkin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.checkin-item { background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; padding: 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.checkin-thumb { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); }
.checkin-item .row-sub { color: var(--text-muted); }
.empty-hint { text-align: center; color: var(--text-faint); font-size: 0.85rem; padding: 20px 0; }
.due-banner { background: var(--accent); color: #fff; padding: 12px 16px; border-radius: 16px; margin: 0 16px 12px 16px; display: flex; align-items: center; gap: 12px; }
.due-title { font-weight: 700; font-size: 0.9rem; }
.due-sub { font-size: 0.75rem; opacity: 0.9; }
.toggle-btn { background: var(--bg-input); border: 1px solid var(--border); color: var(--text); padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; }
.toggle-btn.active { background: var(--accent); color: #fff; }
.loader-wrap { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 20px; font-size: 0.85rem; color: var(--text-muted); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.home-cover { display: flex; flex-direction: column; gap: 10px; }
.clean-cover { padding: 18px 16px 16px 16px; }
.streak-pill { display: inline-block; margin-top: 12px; background: var(--bg-input); border: 1px solid var(--border); padding: 6px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 700; color: var(--text); }
.cover-card { background: var(--bg-elevated); border: 1px solid var(--border); padding: 12px 14px; border-radius: 16px; cursor: pointer; }
.cover-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; }
.quick-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.quick-btn { background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding: 12px 6px; border-radius: 14px; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
.quick-btn.primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; border-color: transparent; }
.check-line { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: var(--bg-input); border: 1px solid var(--border); color: var(--text); padding: 10px 12px; border-radius: 12px; font-size: 0.83rem; cursor: pointer; min-height: 44px; }
.check-line.active { border-color: var(--accent); }
.check-box { width: 20px; height: 20px; border-radius: 7px; border: 1px solid var(--border-strong); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800; background: var(--bg); flex-shrink: 0; }
.check-line.active .check-box { background: var(--accent); color: #fff; border-color: transparent; }
/* Modernes Design-System: Tokens, Übersicht, Dark/Light, A11y, Low-End */
:root { --r-s: 14px; --r-m: 16px; --r-l: 20px; --tap: 44px; }
.section-card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--r-m); padding: 16px; margin-bottom: 12px; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin: 12px 0 6px 0; }
.section-head .section-title { margin: 0; }
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 40; }
.drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 264px; max-width: 80vw; z-index: 41; display: flex; flex-direction: column; gap: 4px; padding: 14px; background: var(--bg-elevated); color: var(--text); border-right: 1px solid var(--border); box-shadow: var(--shadow); transform: translateX(-105%); transition: transform 0.25s ease; overflow-y: auto; }
.drawer.open { transform: none; }
.drawer-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.drawer-item { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 12px; border: 1px solid transparent; background: transparent; color: var(--text); font-size: 0.9rem; font-weight: 600; text-align: left; cursor: pointer; min-height: 44px; }
.drawer-item.active { background: var(--bg-input); border-color: var(--border-strong); color: var(--accent); }
.mini-btn { background: var(--accent); color: #fff; border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.list-row { display: flex; align-items: center; gap: 12px; min-height: var(--tap); }
.chip { display: inline-flex; align-items: center; min-height: 32px; padding: 4px 12px; border-radius: 999px; background: var(--bg-input); border: 1px solid var(--border); font-size: 0.75rem; font-weight: 700; }
.skeleton { height: 14px; border-radius: var(--r-s); background: linear-gradient(90deg, var(--bg-input) 25%, var(--border-strong) 50%, var(--bg-input) 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.empty-state { text-align: center; padding: 24px 16px; color: var(--text-muted); font-size: 0.85rem; }
.macro-ring { width: 112px; height: 112px; transform: rotate(-90deg); flex-shrink: 0; }
.macro-ring .trk { fill: none; stroke: var(--border-strong); stroke-width: 10; }
.macro-ring .val { fill: none; stroke-width: 10; stroke-linecap: round; stroke: var(--accent); }
.error-banner { color: var(--danger); }
.meal-preview, .checkin-grid img, .tree-thumb { background: var(--bg-input); }
.meal-preview { width: 100%; max-height: 220px; object-fit: cover; border-radius: 14px; }
img { max-width: 100%; }
:is(button, a, input, [tabindex], summary):focus-visible { outline: 2px solid var(--accent2); outline-offset: 2px; border-radius: 8px; }
.day-chip, .segment, .template-chip, .tab-btn, .toggle-btn, .quick-btn { min-height: 32px; }
.day-chip[aria-pressed="true"], .segment[aria-pressed="true"] { outline: 2px solid var(--accent2); outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
.no-fx .blob, .no-fx .bg-glow { display: none !important; }
.no-fx * { box-shadow: none !important; backdrop-filter: none !important; }
.tabbar { min-height: 56px; }
.tab-btn { min-height: 48px; }
.topbar { position: sticky; top: 0; z-index: 10; background: var(--bg); border-bottom: 1px solid var(--border); }
`;