/**
 * FitTrack Phase 3 – Backup (Export/Import) + Quota.
 *
 * Referenz: FitX/_migration/code-samples/src/lib/storage/backup.ts
 * Ziel:     fittrack/src/lib/storage/backup.ts
 *
 * Format: JSON { app, version, exportedAt, tables: {...}, photos: [...] }
 * Fotos werden als DataURL exportiert (Blob → DataURL) und beim Import
 * zurück nach Blob konvertiert (fetch(dataUrl).blob()).
 */
import { db, skillRowsToMap, skillsMapToRows } from "./db";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface BackupFile {
  app: "fittrack";
  version: 3;
  exportedAt: number;
  tables: {
    workouts: unknown[];
    meals: unknown[];
    plans: unknown[];
    sharedPlans: unknown[];
    reminders: unknown[];
    proposals: unknown[];
    checkins: unknown[];
    skills: unknown[];
    nutrition: unknown[];
    profile: unknown[];
    foodsCache: unknown[];
    meta: unknown[];
  };
  /** Fotos separat (groß!) – id + dataUrl + Meta. */
  photos: Array<{ id: string; dataUrl: string; createdAt: number }>;
}

export interface ImportResult {
  imported: Record<string, number>;
  skippedPhotos: number;
  wipedFirst: boolean;
}

export interface QuotaStatus {
  usageBytes: number | null;
  quotaBytes: number | null;
  percent: number | null;
  persisted: boolean | null;
  persistentRequested: boolean;
}

// ---------------------------------------------------------------------------
// Blob ↔ DataURL
// ---------------------------------------------------------------------------

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Blob→DataURL fehlgeschlagen"));
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlobImport(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Import-Foto ungültig");
  return res.blob();
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportBackup(): Promise<BackupFile> {
  const [workouts, meals, plans, sharedPlans, reminders, proposals, checkins, skillRows, nutrition, profile, foodsCache, meta, photos] =
    await db.transaction(
      "r",
      [db.workouts, db.meals, db.plans, db.sharedPlans, db.reminders, db.proposals, db.checkins, db.skills, db.nutrition, db.profile, db.foodsCache, db.meta, db.photos],
      async () => {
        return Promise.all([
          db.workouts.toArray(),
          db.meals.toArray(),
          db.plans.toArray(),
          db.sharedPlans.toArray(),
          db.reminders.toArray(),
          db.proposals.toArray(),
          db.checkins.toArray(),
          db.skills.toArray(),
          db.nutrition.toArray(),
          db.profile.toArray(),
          db.foodsCache.toArray(),
          db.meta.toArray(),
          db.photos.toArray(),
        ]);
      },
    );

  // Fotos → DataURL (kann bei 50 Fotos dauern – bewusst sequentiell, speicherschonend)
  const photoOut: BackupFile["photos"] = [];
  for (const p of photos) {
    try {
      const dataUrl = await blobToDataUrl(p.full);
      photoOut.push({ id: p.id, dataUrl, createdAt: p.createdAt });
    } catch {
      // defektes Foto überspringen statt Export abbrechen
    }
  }

  return {
    app: "fittrack",
    version: 3,
    exportedAt: Date.now(),
    tables: {
      workouts,
      meals,
      plans,
      sharedPlans,
      reminders,
      proposals,
      checkins,
      skills: skillRowsToMap(skillRows as never) as unknown as unknown[],
      // Hinweis: skills als Map exportieren wäre schöner; aus Kompatibilität
      // exportieren wir Rows direkt und akzeptieren beim Import beide Formen:
      // (wird unten in importBackup normalisiert)
      nutrition,
      profile,
      foodsCache,
      meta: (meta as Array<{ key: string }>).filter((m) => m.key !== "legacyMigratedAt"),
    } as unknown as BackupFile["tables"],
    photos: photoOut,
  };
}

/** Export als Datei-Download (Backup-Button im UI). */
export function downloadBackupFile(backup: BackupFile, filename?: string): void {
  const name = filename ?? `fittrack-backup-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------------------------------------------------------------------------
// Import (mit optionalem Wipe – für Test "Export → Wipe → Import")
// ---------------------------------------------------------------------------

const ALL_TABLES = [
  "workouts",
  "meals",
  "plans",
  "sharedPlans",
  "reminders",
  "proposals",
  "checkins",
  "skills",
  "nutrition",
  "profile",
  "foodsCache",
  "photos",
] as const;

export async function wipeAll(): Promise<void> {
  await db.transaction("rw", [db.workouts, db.meals, db.plans, db.sharedPlans, db.reminders, db.proposals, db.checkins, db.skills, db.nutrition, db.profile, db.foodsCache, db.photos], async () => {
    await Promise.all([
      db.workouts.clear(),
      db.meals.clear(),
      db.plans.clear(),
      db.sharedPlans.clear(),
      db.reminders.clear(),
      db.proposals.clear(),
      db.checkins.clear(),
      db.skills.clear(),
      db.nutrition.clear(),
      db.profile.clear(),
      db.foodsCache.clear(),
      db.photos.clear(),
    ]);
  });
}

function normalizeSkillRows(input: unknown): Array<{ id: string; done: boolean; ts: number; photoId?: string }> {
  if (!input) return [];
  // Form A: bereits Rows
  if (Array.isArray(input) && input.every((x) => x && typeof x === "object" && "id" in (x as object))) {
    return input as never;
  }
  // Form B: Map { skillId: {...} }
  if (typeof input === "object" && !Array.isArray(input)) {
    return skillsMapToRows(input as never);
  }
  // Form C: Array mit Map drin (falls exportBackup-Map-Form) – defensiv
  return [];
}

export async function importBackup(
  backup: BackupFile,
  opts?: { wipeFirst?: boolean },
): Promise<ImportResult> {
  if (!backup || backup.app !== "fittrack" || !backup.tables) {
    throw new Error("Kein gültiges FitTrack-Backup");
  }
  const wipeFirst = !!opts?.wipeFirst;
  if (wipeFirst) await wipeAll();

  const t = backup.tables;
  let skippedPhotos = 0;

  // Fotos zuerst konvertieren (DataURL → Blob)
  const photoRows: Array<{ id: string; full: Blob; createdAt: number }> = [];
  for (const p of backup.photos ?? []) {
    try {
      if (!p?.id || typeof p.dataUrl !== "string" || !p.dataUrl.startsWith("data:")) {
        skippedPhotos++;
        continue;
      }
      const full = await dataUrlToBlobImport(p.dataUrl);
      photoRows.push({ id: p.id, full, createdAt: Number(p.createdAt) || Date.now() });
    } catch {
      skippedPhotos++;
    }
  }

  const skillRows = normalizeSkillRows((t as Record<string, unknown>).skills);

  await db.transaction(
    "rw",
    [db.workouts, db.meals, db.plans, db.sharedPlans, db.reminders, db.proposals, db.checkins, db.skills, db.nutrition, db.profile, db.foodsCache, db.photos, db.meta],
    async () => {
      if (Array.isArray(t.workouts) && t.workouts.length) await db.workouts.bulkPut(t.workouts as never);
      if (Array.isArray(t.meals) && t.meals.length) await db.meals.bulkPut(t.meals as never);
      if (Array.isArray(t.plans) && t.plans.length) await db.plans.bulkPut(t.plans as never);
      if (Array.isArray(t.sharedPlans) && t.sharedPlans.length) await db.sharedPlans.bulkPut(t.sharedPlans as never);
      if (Array.isArray(t.reminders) && t.reminders.length) await db.reminders.bulkPut(t.reminders as never);
      if (Array.isArray(t.proposals) && t.proposals.length) await db.proposals.bulkPut(t.proposals as never);
      if (Array.isArray(t.checkins) && t.checkins.length) await db.checkins.bulkPut(t.checkins as never);
      if (skillRows.length) await db.skills.bulkPut(skillRows as never);
      if (Array.isArray(t.nutrition) && t.nutrition.length) await db.nutrition.bulkPut(t.nutrition as never);
      if (Array.isArray(t.profile) && t.profile.length) await db.profile.bulkPut(t.profile as never);
      if (Array.isArray(t.foodsCache) && t.foodsCache.length) await db.foodsCache.bulkPut(t.foodsCache as never);
      if (photoRows.length) await db.photos.bulkPut(photoRows as never);
      await db.meta.put({ key: "lastImportAt", value: Date.now() });
    },
  );

  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    imported: {
      workouts: len(t.workouts),
      meals: len(t.meals),
      plans: len(t.plans),
      sharedPlans: len(t.sharedPlans),
      reminders: len(t.reminders),
      proposals: len(t.proposals),
      checkins: len(t.checkins),
      skills: skillRows.length,
      nutrition: len(t.nutrition),
      profile: len(t.profile),
      foodsCache: len(t.foodsCache),
      photos: photoRows.length,
    },
    skippedPhotos,
    wipedFirst,
  };
}

// ---------------------------------------------------------------------------
// Quota (Warnung vor "Speichern fehlgeschlagen" wie in fitX.js saveJSON)
// ---------------------------------------------------------------------------

export async function quotaStatus(): Promise<QuotaStatus> {
  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  let persisted: boolean | null = null;
  let persistentRequested = false;

  try {
    if (navigator?.storage?.estimate) {
      const est = await navigator.storage.estimate();
      usageBytes = typeof est.usage === "number" ? est.usage : null;
      quotaBytes = typeof est.quota === "number" ? est.quota : null;
    }
  } catch {
    /* unsupported */
  }

  try {
    if (navigator?.storage?.persisted) {
      persisted = await navigator.storage.persisted();
    }
    if (!persisted && navigator?.storage?.persist) {
      persisted = await navigator.storage.persist();
      persistentRequested = true;
    }
  } catch {
    /* ignore */
  }

  const percent =
    usageBytes != null && quotaBytes ? Math.round((usageBytes / quotaBytes) * 1000) / 10 : null;

  return { usageBytes, quotaBytes, percent, persisted, persistentRequested };
}

/** true, wenn kritisch voll (>85 % oder <50 MB frei bei bekannter Quota). */
export function isQuotaCritical(q: QuotaStatus): boolean {
  if (q.percent != null && q.percent > 85) return true;
  if (q.usageBytes != null && q.quotaBytes != null && q.quotaBytes - q.usageBytes < 50 * 1024 * 1024) {
    return true;
  }
  return false;
}
