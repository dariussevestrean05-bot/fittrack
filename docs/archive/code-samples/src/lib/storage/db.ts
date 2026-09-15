/**
 * FitTrack Phase 3 – Dexie Data-Layer (v1 → v3).
 *
 * Referenz: FitX/_migration/code-samples/src/lib/storage/db.ts
 * Ziel:     fittrack/src/lib/storage/db.ts
 *
 * Tabellen:
 *   workouts, meals, plans, sharedPlans, reminders, proposals,
 *   checkins, skills, meta, photos, foodsCache
 *
 * Versionsgeschichte:
 *   v1 – initiale Stores. checkins/skills enthalten ggf. noch legacy
 *        `photo`-DataURLs inline (aus v0/localStorage-Import).
 *   v2 – Index-Pflege + Migration: checkins.photo (DataURL) → photos-Blob
 *        + photoId. Nutzt fetch(dataUrl).blob() wie gefordert.
 *   v3 – Migration: skills[*].photo (DataURL) → photos-Blob + photoId,
 *        + foodsCache/meta Stores (falls v1-DB ohne sie existierte).
 */
import Dexie, { type Table } from "dexie";
import type {
  Workout,
  Meal,
  Plan,
  SharedPlan,
  Reminder,
  Proposal,
  Checkin,
  SkillsMap,
  Meta,
  PhotoRecord,
  FoodCacheEntry,
  Nutrition,
  Profile,
} from "./types";

// Dexie speichert Skills als Zeile { id: skillId, done, ts, photoId? }.
// SkillsMap (Record) ist das UI-Format; Adapter konvertiert.
export interface SkillRow {
  id: string;
  done: boolean;
  ts: number;
  photoId?: string;
}

export interface NutritionRow {
  id: string; // immer "default" (Single-Row)
  value: Nutrition;
  updatedAt: number;
}

export interface ProfileRow {
  id: string; // immer "default"
  value: Profile;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// DataURL → Blob (gefordert: via fetch(dataUrl).blob())
// ---------------------------------------------------------------------------

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  // fetch() versteht data:-URLs in allen modernen Browsern (inkl. WebView).
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error(`DataURL-Convert fehlgeschlagen (${res.status})`);
  const blob = await res.blob();
  if (!blob || blob.size === 0) throw new Error("Leerer Blob nach DataURL-Convert");
  return blob;
}

export function isDataUrlPhoto(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.length > 32 &&
    v.startsWith("data:image")
  );
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// DB-Klasse
// ---------------------------------------------------------------------------

export class FitTrackDB extends Dexie {
  workouts!: Table<Workout, string>;
  meals!: Table<Meal, string>;
  plans!: Table<Plan, string>;
  sharedPlans!: Table<SharedPlan, string>;
  reminders!: Table<Reminder, string>;
  proposals!: Table<Proposal, string>;
  checkins!: Table<Checkin, string>;
  skills!: Table<SkillRow, string>;
  meta!: Table<Meta, string>;
  photos!: Table<PhotoRecord, string>;
  foodsCache!: Table<FoodCacheEntry, string>;
  nutrition!: Table<NutritionRow, string>;
  profile!: Table<ProfileRow, string>;

  constructor(name = "fittrack") {
    super(name);

    // ---- v1: Basisschema -------------------------------------------------
    this.version(1).stores({
      workouts: "id, ts",
      meals: "id, ts",
      plans: "id",
      sharedPlans: "id, updatedAt",
      reminders: "id",
      proposals: "id, day",
      // checkins enthalten in v1 ggf. noch legacy `photo`-Feld (nicht indexiert)
      checkins: "id, ts",
      skills: "id",
      meta: "key",
      photos: "id, createdAt",
      foodsCache: "name, updatedAt",
      nutrition: "id",
      profile: "id",
    });

    // ---- v2: checkins.photo-DataURL → photos-Blob + photoId ---------------
    this.version(2)
      .stores({
        workouts: "id, ts",
        meals: "id, ts",
        plans: "id",
        sharedPlans: "id, updatedAt",
        reminders: "id",
        proposals: "id, day",
        checkins: "id, ts",
        skills: "id",
        meta: "key",
        photos: "id, createdAt",
        foodsCache: "name, updatedAt",
        nutrition: "id",
        profile: "id",
      })
      .upgrade(async (tx) => {
        const checkins = tx.table("checkins");
        const photos = tx.table("photos");
        const rows: Array<Record<string, unknown>> = await checkins.toArray();
        for (const row of rows) {
          const photo = (row as { photo?: unknown }).photo;
          if (!isDataUrlPhoto(photo)) continue;
          if ((row as { photoId?: unknown }).photoId) continue;
          try {
            const blob = await dataUrlToBlob(photo);
            const photoId = uid();
            await photos.put({
              id: photoId,
              full: blob,
              createdAt: Number((row as { ts?: unknown }).ts) || Date.now(),
            });
            const { photo: _drop, ...rest } = row as Record<string, unknown>;
            await checkins.put({ ...rest, photoId } as never);
          } catch (err) {
            // Einzelne defekte Fotos dürfen die Migration nie abbrechen.
            console.warn("[db v2] checkin-Foto übersprungen:", (row as { id?: unknown }).id, err);
          }
        }
      });

    // ---- v3: skills[*].photo-DataURL → photos-Blob + photoId --------------
    this.version(3)
      .stores({
        workouts: "id, ts",
        meals: "id, ts",
        plans: "id",
        sharedPlans: "id, updatedAt, deleted",
        reminders: "id",
        proposals: "id, day",
        checkins: "id, ts",
        skills: "id",
        meta: "key",
        photos: "id, createdAt",
        foodsCache: "name, updatedAt",
        nutrition: "id",
        profile: "id",
      })
      .upgrade(async (tx) => {
        const skills = tx.table("skills");
        const photos = tx.table("photos");
        // Zwei mögliche Alt-Formen:
        //  a) skills als einzelne Rows { id, done, ts, photo: DataURL }
        //  b) skills als Single-Doc { id: "map", value: { skillId: {...} } }
        const rows: Array<Record<string, unknown>> = await skills.toArray();
        for (const row of rows) {
          // Form (b): Map-Dokument
          const maybeMap = (row as { value?: unknown }).value;
          if (maybeMap && typeof maybeMap === "object") {
            let dirty = false;
            const map = maybeMap as Record<string, Record<string, unknown>>;
            for (const [skillId, entry] of Object.entries(map)) {
              if (!entry || typeof entry !== "object") continue;
              if (!isDataUrlPhoto(entry.photo) || entry.photoId) continue;
              try {
                const blob = await dataUrlToBlob(entry.photo as string);
                const photoId = uid();
                await photos.put({
                  id: photoId,
                  full: blob,
                  createdAt: Number(entry.ts) || Date.now(),
                });
                const { photo: _d, ...rest } = entry;
                map[skillId] = { ...rest, photoId };
                dirty = true;
              } catch (err) {
                console.warn("[db v3] skill-Foto übersprungen:", skillId, err);
              }
            }
            if (dirty) await skills.put(row as never);
            continue;
          }
          // Form (a): Row mit photo
          const photo = (row as { photo?: unknown }).photo;
          if (!isDataUrlPhoto(photo)) continue;
          if ((row as { photoId?: unknown }).photoId) continue;
          try {
            const blob = await dataUrlToBlob(photo);
            const photoId = uid();
            await photos.put({
              id: photoId,
              full: blob,
              createdAt: Number((row as { ts?: unknown }).ts) || Date.now(),
            });
            const { photo: _drop, ...rest } = row as Record<string, unknown>;
            await skills.put({ ...rest, photoId } as never);
          } catch (err) {
            console.warn("[db v3] skill-Foto übersprungen:", (row as { id?: unknown }).id, err);
          }
        }
      });
  }
}

// Singleton für die App (eine IDB pro Origin).
export const db = new FitTrackDB();

/** Kleiner Helfer: meta-Key lesen/schreiben. */
export async function metaGet(key: string): Promise<unknown> {
  const row = await db.meta.get(key);
  return row?.value;
}

export async function metaSet(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

/** SkillsMap (UI) ↔ SkillRow[] (Dexie) Konverter. */
export function skillsMapToRows(map: SkillsMap): SkillRow[] {
  return Object.entries(map).map(([id, e]) => ({
    id,
    done: e.done,
    ts: e.ts,
    ...(e.photoId ? { photoId: e.photoId } : {}),
  }));
}

export function skillRowsToMap(rows: SkillRow[]): SkillsMap {
  const out: SkillsMap = {};
  for (const r of rows) {
    if (!r || !r.id) continue;
    out[r.id] = {
      done: !!r.done,
      ts: Number(r.ts) || Date.now(),
      ...(r.photoId ? { photoId: r.photoId } : {}),
    };
  }
  return out;
}
