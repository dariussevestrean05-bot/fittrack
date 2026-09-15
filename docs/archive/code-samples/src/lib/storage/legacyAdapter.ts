/**
 * FitTrack Phase 3 – Legacy-Adapter: localStorage (fitness:*) → Dexie.
 *
 * Referenz: FitX/_migration/code-samples/src/lib/storage/legacyAdapter.ts
 * Ziel:     fittrack/src/lib/storage/legacyAdapter.ts
 *
 * Regeln:
 *  - Liest ALLE fitness:*-Keys (K aus fitX.js Z.9-21), zod-validiert.
 *  - DataURL → Blob (via fetch(dataUrl).blob()), Ablage in photos-Tabelle,
 *    Referenzen (photoId) in checkins/skills.
 *  - bulkPut innerhalb EINER Dexie-Transaktion (readwrite).
 *  - meta-Flag `legacyMigratedAt` (idempotent – zweiter Lauf = No-Op ohne force).
 *  - Legacy wird nach fitness:backup:* KOPIERT, NIEMALS gelöscht.
 */
import { db, dataUrlToBlob, isDataUrlPhoto, skillsMapToRows } from "./db";
import {
  WorkoutSchema,
  MealSchema,
  ReminderSchema,
  ProposalSchema,
  PlanSchema,
  SharedPlanSchema,
  NutritionSchema,
  ProfileSchema,
  CheckinSchema,
  SkillEntrySchema,
  type Workout,
  type Meal,
  type Reminder,
  type Proposal,
  type Plan,
  type SharedPlan,
  type Checkin,
  type SkillsMap,
} from "./types";

// ---------------------------------------------------------------------------
// Legacy-Key-Map (fitX.js Z.9-21)
// ---------------------------------------------------------------------------

export const LEGACY_KEYS = {
  reminders: "fitness:reminders",
  workouts: "fitness:workouts",
  meals: "fitness:meals",
  theme: "fitness:theme",
  profile: "fitness:profile",
  proposals: "fitness:proposals",
  plans: "fitness:plans",
  sharedPlans: "fitness:sharedPlans",
  nutrition: "fitness:nutritionProfile",
  checkins: "fitness:checkins",
  skills: "fitness:skills",
} as const;

type LegacyKey = (typeof LEGACY_KEYS)[keyof typeof LEGACY_KEYS];

const BACKUP_PREFIX = "fitness:backup:";

// ---------------------------------------------------------------------------
// Storage lesen (window.storage-Capacitor-Shim ODER localStorage)
// ---------------------------------------------------------------------------

type LegacyStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
};

function detectStore(): LegacyStore {
  const w = globalThis as unknown as {
    storage?: { get(key: string, shared?: boolean): Promise<{ value: string } | null>; set(key: string, v: string, shared?: boolean): Promise<void> };
  };
  const sharedKey = (k: string) => k === LEGACY_KEYS.proposals || k === LEGACY_KEYS.sharedPlans;
  return {
    async get(key: string): Promise<string | null> {
      try {
        if (w.storage?.get) {
          const r = await w.storage.get(key, sharedKey(key));
          if (r && typeof r.value === "string") return r.value;
        }
      } catch {
        /* fallback unten */
      }
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    async set(key: string, value: string): Promise<void> {
      try {
        if (w.storage?.set) await w.storage.set(key, value, sharedKey(key));
      } catch {
        /* ignore */
      }
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* ignore (privater Modus/Quota) */
      }
    },
  };
}

async function readLegacyJson(key: string, store: LegacyStore): Promise<unknown> {
  const raw = await store.get(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Ergebnis-Typ
// ---------------------------------------------------------------------------

export interface MigrationReport {
  migrated: boolean;
  skippedAlreadyMigrated: boolean;
  counts: Record<string, number>;
  skippedInvalid: Record<string, number>;
  photoCount: number;
  backupKeys: string[];
  migratedAt: number;
  errors: string[];
}

const emptySkipped = (): Record<string, number> => ({
  workouts: 0,
  meals: 0,
  reminders: 0,
  proposals: 0,
  plans: 0,
  sharedPlans: 0,
  checkins: 0,
  skills: 0,
  nutrition: 0,
  profile: 0,
});

// ---------------------------------------------------------------------------
// Einzel-Validatoren (tolerant: gültige übernehmen, Rest zählen)
// ---------------------------------------------------------------------------

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function validateList<T>(
  items: unknown[],
  parse: (x: unknown) => { ok: boolean; value?: T },
): { valid: T[]; skipped: number } {
  const valid: T[] = [];
  let skipped = 0;
  for (const it of items) {
    const r = parse(it);
    if (r.ok && r.value !== undefined) valid.push(r.value);
    else skipped++;
  }
  return { valid, skipped };
}

const tryParse = <T>(schema: { safeParse(v: unknown): { success: boolean; data?: T } }, v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? { ok: true as const, value: r.data as T } : { ok: false as const };
};

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

export async function migrateFromLocalStorage(opts?: {
  force?: boolean;
  deviceAuthorId?: string;
}): Promise<MigrationReport> {
  const store = detectStore();
  const errors: string[] = [];
  const skippedInvalid = emptySkipped();

  // Idempotenz: ohne force kein Zweitlauf.
  const already = await db.meta.get("legacyMigratedAt").catch(() => undefined);
  if (already && !opts?.force) {
    return {
      migrated: false,
      skippedAlreadyMigrated: true,
      counts: {},
      skippedInvalid,
      photoCount: 0,
      backupKeys: [],
      migratedAt: Number((already as { value?: unknown }).value) || 0,
      errors: [],
    };
  }

  // ---- 1. Rohdaten lesen ---------------------------------------------------
  const [rawReminders, rawWorkouts, rawMeals, rawProposals, rawPlans, rawSharedPlans, rawCheckins, rawSkills, rawNutrition, rawProfile] =
    await Promise.all([
      readLegacyJson(LEGACY_KEYS.reminders, store),
      readLegacyJson(LEGACY_KEYS.workouts, store),
      readLegacyJson(LEGACY_KEYS.meals, store),
      readLegacyJson(LEGACY_KEYS.proposals, store),
      readLegacyJson(LEGACY_KEYS.plans, store),
      readLegacyJson(LEGACY_KEYS.sharedPlans, store),
      readLegacyJson(LEGACY_KEYS.checkins, store),
      readLegacyJson(LEGACY_KEYS.skills, store),
      readLegacyJson(LEGACY_KEYS.nutrition, store),
      readLegacyJson(LEGACY_KEYS.profile, store),
    ]);

  // ---- 2. Validieren --------------------------------------------------------
  const w = validateList<Workout>(asArray(rawWorkouts), (x) => tryParse(WorkoutSchema, x));
  skippedInvalid.workouts = w.skipped;

  const m = validateList<Meal>(asArray(rawMeals), (x) => tryParse(MealSchema, x));
  skippedInvalid.meals = m.skipped;

  const rem = validateList<Reminder>(asArray(rawReminders), (x) => tryParse(ReminderSchema, x));
  skippedInvalid.reminders = rem.skipped;

  const prop = validateList<Proposal>(asArray(rawProposals), (x) => tryParse(ProposalSchema, x));
  skippedInvalid.proposals = prop.skipped;

  const pl = validateList<Plan>(asArray(rawPlans), (x) => tryParse(PlanSchema, x));
  skippedInvalid.plans = pl.skipped;

  // SharedPlan-Legacy kennt authorId/updatedAt/v/deleted noch nicht → anreichern.
  const deviceAuthorId = opts?.deviceAuthorId ?? "legacy-device";
  const splValid: SharedPlan[] = [];
  let splSkipped = 0;
  for (const x of asArray(rawSharedPlans)) {
    if (!x || typeof x !== "object") {
      splSkipped++;
      continue;
    }
    const enriched = {
      ...(x as Record<string, unknown>),
      authorId: (x as Record<string, unknown>).authorId ?? deviceAuthorId,
      updatedAt: Number((x as Record<string, unknown>).updatedAt) || Date.now(),
      v: Number((x as Record<string, unknown>).v) || 1,
      deleted: Boolean((x as Record<string, unknown>).deleted) || false,
    };
    const r = SharedPlanSchema.safeParse(enriched);
    if (r.success) splValid.push(r.data);
    else splSkipped++;
  }
  skippedInvalid.sharedPlans = splSkipped;

  // Nutrition/Profile (Single-Row, tolerant)
  let nutritionRow: { id: string; value: unknown; updatedAt: number } | null = null;
  if (rawNutrition && typeof rawNutrition === "object") {
    const r = NutritionSchema.safeParse(rawNutrition);
    if (r.success) {
      nutritionRow = { id: "default", value: r.data, updatedAt: Date.now() };
    } else {
      skippedInvalid.nutrition = 1;
    }
  }
  let profileRow: { id: string; value: unknown; updatedAt: number } | null = null;
  if (rawProfile && typeof rawProfile === "object") {
    const r = ProfileSchema.safeParse(rawProfile);
    if (r.success) {
      profileRow = { id: "default", value: r.data, updatedAt: Date.now() };
    } else {
      skippedInvalid.profile = 1;
    }
  }

  // ---- 3. Checkins: DataURL → Blob ------------------------------------------
  const checkinsValid: Checkin[] = [];
  let checkinSkipped = 0;
  let photoCount = 0;
  // Fotos erst sammeln, dann in Transaktion schreiben (kein fetch in Tx nötig,
  // aber Dexie erlaubt await in Tx – wir konvertieren VOR der Tx für Speed).
  const photoBlobs = new Map<string, Blob>(); // photoId → Blob
  const newCheckin = (id: string, ts: number, photoId: string): Checkin => ({ id, ts, photoId });

  for (const x of asArray(rawCheckins)) {
    if (!x || typeof x !== "object") {
      checkinSkipped++;
      continue;
    }
    const rec = x as Record<string, unknown>;
    const id = typeof rec.id === "string" && rec.id ? rec.id : null;
    const ts = Number(rec.ts);
    if (!id || !Number.isFinite(ts)) {
      checkinSkipped++;
      continue;
    }
    // Neu-Format (bereits migriert)?
    if (typeof rec.photoId === "string" && rec.photoId) {
      const r = CheckinSchema.safeParse({ id, ts, photoId: rec.photoId });
      if (r.success) checkinsValid.push(r.data);
      else checkinSkipped++;
      continue;
    }
    // Legacy-Format mit DataURL
    if (isDataUrlPhoto(rec.photo)) {
      try {
        const blob = await dataUrlToBlob(rec.photo);
        const photoId = `${id}-photo`;
        photoBlobs.set(photoId, blob);
        photoCount++;
        checkinsValid.push(newCheckin(id, ts, photoId));
      } catch (e) {
        errors.push(`checkin ${id}: Foto-Konvert fehlgeschlagen`);
        checkinSkipped++;
      }
      continue;
    }
    checkinSkipped++;
  }
  skippedInvalid.checkins = checkinSkipped;

  // ---- 4. Skills: Record → Rows, DataURL → Blob -------------------------------
  const skillsMap: SkillsMap = {};
  let skillSkipped = 0;
  if (rawSkills && typeof rawSkills === "object" && !Array.isArray(rawSkills)) {
    for (const [skillId, entry] of Object.entries(rawSkills as Record<string, unknown>)) {
      if (!entry || typeof entry !== "object") {
        skillSkipped++;
        continue;
      }
      const e = entry as Record<string, unknown>;
      const ts = Number(e.ts) || Date.now();
      const done = e.done !== false;
      if (isDataUrlPhoto(e.photo)) {
        try {
          const blob = await dataUrlToBlob(e.photo);
          const photoId = `${skillId}-photo`;
          photoBlobs.set(photoId, blob);
          photoCount++;
          const r = SkillEntrySchema.safeParse({ done, ts, photoId });
          if (r.success) skillsMap[skillId] = r.data;
          else skillSkipped++;
        } catch {
          errors.push(`skill ${skillId}: Foto-Konvert fehlgeschlagen`);
          skillSkipped++;
        }
      } else if (typeof e.photoId === "string" && e.photoId) {
        const r = SkillEntrySchema.safeParse({ done, ts, photoId: e.photoId });
        if (r.success) skillsMap[skillId] = r.data;
        else skillSkipped++;
      } else {
        const r = SkillEntrySchema.safeParse({ done, ts });
        if (r.success) skillsMap[skillId] = r.data;
        else skillSkipped++;
      }
    }
  }
  skippedInvalid.skills = skillSkipped;

  // ---- 5. Eine Transaktion: bulkPut alles --------------------------------------
  const migratedAt = Date.now();
  await db.transaction(
    "rw",
    [db.workouts, db.meals, db.reminders, db.proposals, db.plans, db.sharedPlans, db.checkins, db.skills, db.photos, db.nutrition, db.profile, db.meta],
    async () => {
      if (w.valid.length) await db.workouts.bulkPut(w.valid);
      if (m.valid.length) await db.meals.bulkPut(m.valid);
      if (rem.valid.length) await db.reminders.bulkPut(rem.valid);
      if (prop.valid.length) await db.proposals.bulkPut(prop.valid);
      if (pl.valid.length) await db.plans.bulkPut(pl.valid);
      if (splValid.length) await db.sharedPlans.bulkPut(splValid);
      if (checkinsValid.length) await db.checkins.bulkPut(checkinsValid);
      const skillRows = skillsMapToRows(skillsMap);
      if (skillRows.length) await db.skills.bulkPut(skillRows);
      if (photoBlobs.size) {
        await db.photos.bulkPut(
          [...photoBlobs.entries()].map(([id, full]) => ({
            id,
            full,
            createdAt: migratedAt,
          })),
        );
      }
      if (nutritionRow) await db.nutrition.put(nutritionRow as never);
      if (profileRow) await db.profile.put(profileRow as never);
      await db.meta.put({ key: "legacyMigratedAt", value: migratedAt });
      await db.meta.put({
        key: "legacyMigratedCounts",
        value: {
          workouts: w.valid.length,
          meals: m.valid.length,
          reminders: rem.valid.length,
          proposals: prop.valid.length,
          plans: pl.valid.length,
          sharedPlans: splValid.length,
          checkins: checkinsValid.length,
          skills: Object.keys(skillsMap).length,
          photos: photoBlobs.size,
        },
      });
    },
  );

  // ---- 6. Backup-Kopie (NIE löschen!) -------------------------------------------
  const backupKeys: string[] = [];
  const allKeys = Object.values(LEGACY_KEYS) as LegacyKey[];
  for (const k of allKeys) {
    try {
      const raw = await store.get(k);
      if (raw == null) continue;
      const backupKey = BACKUP_PREFIX + k;
      await store.set(backupKey, raw);
      backupKeys.push(backupKey);
    } catch (e) {
      errors.push(`backup ${k} fehlgeschlagen`);
    }
  }

  return {
    migrated: true,
    skippedAlreadyMigrated: false,
    counts: {
      workouts: w.valid.length,
      meals: m.valid.length,
      reminders: rem.valid.length,
      proposals: prop.valid.length,
      plans: pl.valid.length,
      sharedPlans: splValid.length,
      checkins: checkinsValid.length,
      skills: Object.keys(skillsMap).length,
      photos: photoBlobs.size,
    },
    skippedInvalid,
    photoCount,
    backupKeys,
    migratedAt,
    errors,
  };
}

/** Wurde bereits migriert? (für Boot-Guard in main.tsx) */
export async function hasMigrated(): Promise<boolean> {
  try {
    const row = await db.meta.get("legacyMigratedAt");
    return !!row;
  } catch {
    return false;
  }
}
