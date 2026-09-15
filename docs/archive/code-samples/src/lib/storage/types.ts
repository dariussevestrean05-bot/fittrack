/**
 * FitTrack Phase 3 – Zod-Schemas / TS-Typen.
 *
 * Referenz-Ablage (fittrack existiert noch nicht):
 *   FitX/_migration/code-samples/src/lib/storage/types.ts
 * Ziel im echten Projekt:
 *   fittrack/src/lib/storage/types.ts
 *
 * Legacy-Quelle: FitX/fitX.js
 *  - K-Keys (Z.9-21): fitness:reminders/workouts/meals/theme/profile/proposals/
 *    plans/sharedPlans/nutritionProfile/checkins/skills
 *  - Workout-Form (Z.580): { id: uid(), name, ts, sets: [{reps, weight}] }
 *  - Meal-Formen (Z.1007ff/1091/1102): { id, ts, name, kcal, protein?, carbs?, fat? }
 *  - Checkin (Z.1297): { id, ts, photo: DataURL } -> NEU: photoId
 *  - Skills (Z.1336/1366): { [skillId]: { done, ts, photo: DataURL } } -> NEU: photoId
 *  - Reminder (Z.1514): { id, label, time "HH:MM", days: ["Mo"..], active }
 *  - Proposal (Z.1526): { id, title, day "YYYY-MM-DD", time, status, author }
 *  - Plan (Z.603): { id, name, emoji, exercises: string[] }
 *  - SharedPlan (Z.614): { id, originId?, name, emoji, exercises, author, ... }
 *  - Nutrition-Default (Z.257/270): { height, weight, bodyFat, rate, goal,
 *    activity, dailyGoal } (+ age/gender teils in profile, teils in nutrition)
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitive / Helpers
// ---------------------------------------------------------------------------

/** Legacy-uid(): Date.now().toString(36) + Math.random()… – akzeptiere jeden nicht-leeren String. */
export const IdSchema = z.string().min(1).max(64);
export const TsSchema = z.number().int().nonnegative().finite();

/** "18:00" – strikt HH:MM, 00:00–23:59. */
export const TimeHHMMSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Erwarte HH:MM (00:00–23:59)");

/** "2026-09-10" – Kalender-Tag, kein Timestamp. */
export const DayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Erwarte YYYY-MM-DD");

const NonEmptyTrimmed = (max: number) =>
  z.string().trim().min(1).max(max);

const OptionalNumString = z.union([z.string(), z.number()]).optional();

/** Toleranter Zahlen-Coerce für Legacy-Formulare ("" / "82,5" / Zahl). */
export const NumStringSchema = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === "number") return v;
    const t = v.trim().replace(",", ".");
    if (t === "") return NaN;
    return Number(t);
  });

// ---------------------------------------------------------------------------
// Workout
// ---------------------------------------------------------------------------

export const WorkoutSetSchema = z.object({
  // Legacy speichert reps/weight als Strings aus <input>. Neu: weiterhin
  // String ok, coerce aber defensiv.
  reps: z.union([z.string(), z.number()]).optional().default(""),
  weight: z.union([z.string(), z.number()]).optional().default(""),
});
export type WorkoutSet = z.infer<typeof WorkoutSetSchema>;

export const WorkoutSchema = z.object({
  id: IdSchema,
  name: NonEmptyTrimmed(120),
  ts: TsSchema,
  sets: z.array(WorkoutSetSchema).max(200).default([]),
});
export type Workout = z.infer<typeof WorkoutSchema>;

// ---------------------------------------------------------------------------
// Meal
// ---------------------------------------------------------------------------

export const MealSchema = z.object({
  id: IdSchema,
  ts: TsSchema,
  name: NonEmptyTrimmed(160),
  kcal: z.number().int().min(1).max(10_000),
  protein: z.number().min(0).max(1000).optional().default(0),
  carbs: z.number().min(0).max(1000).optional().default(0),
  fat: z.number().min(0).max(1000).optional().default(0),
});
export type Meal = z.infer<typeof MealSchema>;

// ---------------------------------------------------------------------------
// Checkin – NEU mit photoId statt photo-DataURL
// ---------------------------------------------------------------------------

export const CheckinSchema = z.object({
  id: IdSchema,
  ts: TsSchema,
  /** Verweis auf photos-Tabelle (Blob-Storage). Kein DataURL mehr. */
  photoId: IdSchema,
});
export type Checkin = z.infer<typeof CheckinSchema>;

/** Legacy-Form zum Migrieren (fitX.js Z.1297). Wird in legacyAdapter validiert. */
export const LegacyCheckinSchema = z.object({
  id: IdSchema,
  ts: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  photo: z.string().min(1),
});
export type LegacyCheckin = z.infer<typeof LegacyCheckinSchema>;

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const SkillEntrySchema = z.object({
  done: z.boolean(),
  ts: TsSchema,
  /** Optional: Nachweis-Foto als Blob-Referenz. */
  photoId: IdSchema.optional(),
});
export type SkillEntry = z.infer<typeof SkillEntrySchema>;

/** skills = { [skillId]: { done, ts, photoId? } } */
export const SkillsMapSchema = z.record(z.string().min(1).max(64), SkillEntrySchema);
export type SkillsMap = z.infer<typeof SkillsMapSchema>;

/** Legacy-Skill-Eintrag mit inline-DataURL (fitX.js Z.1366). */
export const LegacySkillEntrySchema = z.object({
  done: z.boolean().optional().default(true),
  ts: z.union([z.number(), z.string()]).optional().transform((v) => Number(v ?? Date.now())),
  photo: z.string().optional(),
});
export type LegacySkillEntry = z.infer<typeof LegacySkillEntrySchema>;

// ---------------------------------------------------------------------------
// Nutrition / Profile
// ---------------------------------------------------------------------------

export const GoalSchema = z.enum(["abnehmen", "halten", "zunehmen"]);
export type Goal = z.infer<typeof GoalSchema>;

export const ActivitySchema = z.enum(["ruhig", "normal", "aktiv", "sehr aktiv", "profi"]);
export type Activity = z.infer<typeof ActivitySchema>;

export const GenderSchema = z.enum(["maennlich", "weiblich", "divers", ""]);
export type Gender = z.infer<typeof GenderSchema>;

/**
 * Vereint nutrition (fitness:nutritionProfile) + relevante Profil-Felder.
 * Legacy speichert alles als String aus <input type="number"> – deshalb
 * hier bewusst tolerant (string | number | "") und Normalisierung via
 * num()-Helper in lib/images bzw. lib/dates (s. PHASE3_NOTES).
 * calcDailyGoal/macroTargets (fitX.js Z.813-890) lesen genau diese Felder.
 */
export const NutritionSchema = z.object({
  height: OptionalNumString,
  weight: OptionalNumString,
  bodyFat: OptionalNumString,
  rate: z.union([z.string(), z.number()]).optional().default("0.5"),
  goal: GoalSchema.optional().default("halten"),
  activity: ActivitySchema.optional().default("normal"),
  dailyGoal: z.union([z.string(), z.number()]).optional().default(2200),
  // aus profile (Tab Erinnerung) – für calcDailyGoal nötig, hier optional
  // mitgeführt damit Backup/Export vollständig ist:
  age: OptionalNumString,
  gender: z.union([GenderSchema, z.string()]).optional().default(""),
});
export type Nutrition = z.infer<typeof NutritionSchema>;

export const ProfileSchema = z.object({
  name: z.string().max(80).optional().default(""),
  age: OptionalNumString,
  gender: z.union([GenderSchema, z.string()]).optional().default(""),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ---------------------------------------------------------------------------
// Reminder
// ---------------------------------------------------------------------------

export const WeekdaySchema = z.enum(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]);
export type Weekday = z.infer<typeof WeekdaySchema>;

export const ReminderSchema = z.object({
  id: IdSchema,
  label: NonEmptyTrimmed(120),
  time: TimeHHMMSchema,
  days: z.array(WeekdaySchema).min(1).max(7),
  active: z.boolean().optional().default(true),
});
export type Reminder = z.infer<typeof ReminderSchema>;

// ---------------------------------------------------------------------------
// Proposal (gemeinsames Training)
// ---------------------------------------------------------------------------

export const ProposalStatusSchema = z.enum(["offen", "bestätigt", "abgelehnt"]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalSchema = z.object({
  id: IdSchema,
  title: NonEmptyTrimmed(140),
  day: DayKeySchema.or(
    z.string().regex(/^\d{4}-\d{2}-\d{2}/).transform((s) => s.slice(0, 10)),
  ),
  time: TimeHHMMSchema,
  status: ProposalStatusSchema.optional().default("offen"),
  author: z.string().trim().max(80).optional().default("Du"),
});
export type Proposal = z.infer<typeof ProposalSchema>;

// ---------------------------------------------------------------------------
// Plan / SharedPlan
// ---------------------------------------------------------------------------

export const PlanSchema = z.object({
  id: IdSchema,
  name: NonEmptyTrimmed(120),
  emoji: z.string().max(16).optional().default("🔥"),
  exercises: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
});
export type Plan = z.infer<typeof PlanSchema>;

/**
 * SharedPlan = Plan + Sync-Metadaten für Partner-Sharing.
 * Legacy (fitX.js Z.614/717) kennt nur { id, originId?, name, emoji,
 * exercises, author }. Neu Pflicht: authorId, updatedAt, v, deleted
 * (Tombstone für Sync/Delete-Propagation).
 */
export const SharedPlanSchema = PlanSchema.extend({
  originId: IdSchema.optional(),
  /** Anzeige-Name (legacy "author", z.B. "Du" / Profil-Name). */
  author: z.string().trim().max(80).optional().default("?"),
  /** Stabile Geräte-/User-ID für Konfliktlösung (last-writer-wins). */
  authorId: z.string().min(1).max(64),
  /** ms-Since-Epoch, Quelle für Sortierung + LWW-Merge. */
  updatedAt: z.number().int().nonnegative(),
  /** Schema-/Sync-Version, startet bei 1. */
  v: z.number().int().min(1).optional().default(1),
  /** Soft-Delete statt hartem Löschen (Sync!). */
  deleted: z.boolean().optional().default(false),
});
export type SharedPlan = z.infer<typeof SharedPlanSchema>;

// ---------------------------------------------------------------------------
// Photos / FoodsCache / Meta (Dexie-Tabellen, kein Legacy-Äquivalent)
// ---------------------------------------------------------------------------

export const PhotoRecordSchema = z.object({
  id: IdSchema,
  /** Vollbild-Blob (WebP, max 1280, <280 KB – s. lib/images). */
  full: z.instanceof(Blob),
  /** Thumbnail-Blob (256px). */
  thumb: z.instanceof(Blob).optional(),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  createdAt: z.number().int().nonnegative(),
});
export type PhotoRecord = z.infer<typeof PhotoRecordSchema>;

export const FoodCacheEntrySchema = z.object({
  /** Lowercase-Name als Key (apiFoods-Cache + OFF-Ergebnisse). */
  name: z.string().trim().min(1).max(160),
  emoji: z.string().max(16).optional().default("🌍"),
  kcal: z.number().min(0).max(5000),
  protein: z.number().min(0).max(1000).optional().default(0),
  carbs: z.number().min(0).max(1000).optional().default(0),
  fat: z.number().min(0).max(1000).optional().default(0),
  portion: z.number().min(0).max(5000).optional().default(100),
  brand: z.string().max(160).optional().default(""),
  updatedAt: z.number().int().nonnegative(),
});
export type FoodCacheEntry = z.infer<typeof FoodCacheEntrySchema>;

export const MetaSchema = z.object({
  key: z.string().min(1).max(128),
  value: z.unknown(),
});
export type Meta = z.infer<typeof MetaSchema>;

// ---------------------------------------------------------------------------
// Array-Wrapper für Legacy-Validierung (loadJSON liefert Arrays)
// ---------------------------------------------------------------------------

export const WorkoutArraySchema = z.array(z.unknown());
export const MealArraySchema = z.array(z.unknown());
export const ReminderArraySchema = z.array(z.unknown());
export const ProposalArraySchema = z.array(z.unknown());
export const PlanArraySchema = z.array(z.unknown());
export const SharedPlanArraySchema = z.array(z.unknown());
export const CheckinArraySchema = z.array(z.unknown());
