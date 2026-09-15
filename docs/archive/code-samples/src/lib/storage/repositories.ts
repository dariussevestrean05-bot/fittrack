/**
 * FitTrack Phase 3 – Repositories (CRUD + Foto-Blob-Handling).
 *
 * Referenz: FitX/_migration/code-samples/src/lib/storage/repositories.ts
 * Ziel:     fittrack/src/lib/storage/repositories.ts
 */
import { db } from "./db";
import type {
  Workout,
  Meal,
  Plan,
  SharedPlan,
  Reminder,
  Proposal,
  Checkin,
  SkillsMap,
  PhotoRecord,
} from "./types";
import { skillsMapToRows, skillRowsToMap } from "./db";
import { localDayKey } from "../dates";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export const workoutsRepo = {
  async list(limit = 500): Promise<Workout[]> {
    return db.workouts.orderBy("ts").reverse().limit(limit).toArray();
  },
  async listByDay(dayKey: string): Promise<Workout[]> {
    const all = await db.workouts.toArray();
    return all.filter((w) => localDayKey(w.ts) === dayKey).sort((a, b) => b.ts - a.ts);
  },
  async add(input: Omit<Workout, "id" | "ts"> & { ts?: number }): Promise<Workout> {
    const row: Workout = {
      id: uid(),
      ts: Date.now(),
      sets: [],
      ...input,
      name: input.name.trim(),
    } as Workout;
    await db.workouts.put(row);
    return row;
  },
  put: (row: Workout) => db.workouts.put(row),
  bulkPut: (rows: Workout[]) => db.workouts.bulkPut(rows),
  remove: (id: string) => db.workouts.delete(id),
  clear: () => db.workouts.clear(),
  count: () => db.workouts.count(),
};

// ---------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------

export const mealsRepo = {
  async list(limit = 1000): Promise<Meal[]> {
    return db.meals.orderBy("ts").reverse().limit(limit).toArray();
  },
  async listByDay(dayKey: string): Promise<Meal[]> {
    const all = await db.meals.toArray();
    return all.filter((m) => localDayKey(m.ts) === dayKey).sort((a, b) => b.ts - a.ts);
  },
  async add(input: Omit<Meal, "id" | "ts"> & { ts?: number }): Promise<Meal> {
    const row: Meal = {
      id: uid(),
      ts: Date.now(),
      protein: 0,
      carbs: 0,
      fat: 0,
      ...input,
      name: input.name.trim(),
      kcal: Math.round(input.kcal),
    } as Meal;
    await db.meals.put(row);
    return row;
  },
  put: (row: Meal) => db.meals.put(row),
  bulkPut: (rows: Meal[]) => db.meals.bulkPut(rows),
  remove: (id: string) => db.meals.delete(id),
  clear: () => db.meals.clear(),
  count: () => db.meals.count(),
};

// ---------------------------------------------------------------------------
// Checkins / Skills / Pläne / Reminder / Proposals (schlank)
// ---------------------------------------------------------------------------

export const checkinsRepo = {
  list: () => db.checkins.orderBy("ts").reverse().toArray(),
  put: (row: Checkin) => db.checkins.put(row),
  bulkPut: (rows: Checkin[]) => db.checkins.bulkPut(rows),
  remove: (id: string) => db.checkins.delete(id),
  clear: () => db.checkins.clear(),
};

export const skillsRepo = {
  async getMap(): Promise<SkillsMap> {
    const rows = await db.skills.toArray();
    return skillRowsToMap(rows);
  },
  async setMap(map: SkillsMap): Promise<void> {
    await db.skills.bulkPut(skillsMapToRows(map));
  },
  async setEntry(skillId: string, entry: { done: boolean; ts: number; photoId?: string }) {
    await db.skills.put({ id: skillId, ...entry });
  },
  async removeEntry(skillId: string) {
    await db.skills.delete(skillId);
  },
  clear: () => db.skills.clear(),
};

export const plansRepo = {
  list: () => db.plans.toArray(),
  put: (row: Plan) => db.plans.put(row),
  bulkPut: (rows: Plan[]) => db.plans.bulkPut(rows),
  remove: (id: string) => db.plans.delete(id),
  clear: () => db.plans.clear(),
};

export const sharedPlansRepo = {
  /** Blendet soft-gelöschte aus (deleted !== true). */
  async listActive(): Promise<SharedPlan[]> {
    const all = await db.sharedPlans.toArray();
    return all
      .filter((s) => !s.deleted)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },
  listAll: () => db.sharedPlans.toArray(),
  put: (row: SharedPlan) => db.sharedPlans.put(row),
  bulkPut: (rows: SharedPlan[]) => db.sharedPlans.bulkPut(rows),
  /** Soft-Delete für Sync-Verträglichkeit. */
  softDelete: (id: string) =>
    db.sharedPlans.update(id, { deleted: true, updatedAt: Date.now() }),
  hardDelete: (id: string) => db.sharedPlans.delete(id),
  clear: () => db.sharedPlans.clear(),
};

export const remindersRepo = {
  list: () => db.reminders.toArray(),
  put: (row: Reminder) => db.reminders.put(row),
  bulkPut: (rows: Reminder[]) => db.reminders.bulkPut(rows),
  remove: (id: string) => db.reminders.delete(id),
  clear: () => db.reminders.clear(),
};

export const proposalsRepo = {
  list: () => db.proposals.toArray(),
  put: (row: Proposal) => db.proposals.put(row),
  bulkPut: (rows: Proposal[]) => db.proposals.bulkPut(rows),
  remove: (id: string) => db.proposals.delete(id),
  clear: () => db.proposals.clear(),
};

// ---------------------------------------------------------------------------
// Photos – putFullAndThumb + ObjectURL-Cache + revoke
// ---------------------------------------------------------------------------

/** Cache erzeugter Object-URLs, damit <img src> stabil bleibt. */
const urlCache = new Map<string, string>();

export const photosRepo = {
  async putFullAndThumb(
    full: Blob,
    thumb?: Blob | null,
    opts?: { width?: number; height?: number },
  ): Promise<PhotoRecord> {
    const id = uid();
    const row: PhotoRecord = {
      id,
      full,
      ...(thumb ? { thumb } : {}),
      ...(opts?.width ? { width: opts.width } : {}),
      ...(opts?.height ? { height: opts.height } : {}),
      createdAt: Date.now(),
    };
    await db.photos.put(row);
    return row;
  },

  get: (id: string) => db.photos.get(id),

  async getBlob(id: string, kind: "full" | "thumb" = "full"): Promise<Blob | undefined> {
    const row = await db.photos.get(id);
    if (!row) return undefined;
    if (kind === "thumb") return row.thumb ?? row.full;
    return row.full;
  },

  /**
   * Object-URL für <img>. Wird gecacht – nach Gebrauch `revoke(id)` oder
   * `revokeAll()` aufrufen (z.B. beim Unmount / Galerie-Wechsel), sonst
   * wächst der Browser-Speicher (klassisches Leak bei 50+ Fotos).
   */
  async thumbUrl(id: string): Promise<string | undefined> {
    const hit = urlCache.get(`thumb:${id}`);
    if (hit) return hit;
    const blob = await this.getBlob(id, "thumb");
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    urlCache.set(`thumb:${id}`, url);
    return url;
  },

  async fullUrl(id: string): Promise<string | undefined> {
    const hit = urlCache.get(`full:${id}`);
    if (hit) return hit;
    const blob = await this.getBlob(id, "full");
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    urlCache.set(`full:${id}`, url);
    return url;
  },

  /** Einzelne URLs freigeben. */
  revoke(id: string): void {
    for (const k of [`thumb:${id}`, `full:${id}`]) {
      const url = urlCache.get(k);
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* noop */
        }
        urlCache.delete(k);
      }
    }
  },

  /** Alle gecachten URLs freigeben (z.B. beim Logout / Wipe / Test-Teardown). */
  revokeAll(): void {
    for (const url of urlCache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
    urlCache.clear();
  },

  remove: (id: string) => {
    photosRepo.revoke(id);
    return db.photos.delete(id);
  },

  clear: () => {
    photosRepo.revokeAll();
    return db.photos.clear();
  },

  count: () => db.photos.count(),
};

/** Freistehende Helper (für Komponenten ohne photosRepo-Import-Tiefe). */
export function revokePhotoUrls(id: string): void {
  photosRepo.revoke(id);
}

export function revokeAllPhotoUrls(): void {
  photosRepo.revokeAll();
}
