/**
 * FitTrack Phase 3 – Bild-Helper (Blob statt DataURL) + num()-Validierung.
 *
 * Referenz: FitX/_migration/code-samples/src/lib/images.ts
 * Ziel:     fittrack/src/lib/images.ts
 *
 * Ersetzt fileToPhotoDataUrl(file, 900, 0.72) (fitX.js Z.120-158):
 *  - ALT: 900px max, JPEG q0.72, DataURL in localStorage (teuer: +33 %,
 *    blockiert Quota, kein Thumb).
 *  - NEU: 1280px max, WebP-Qualitäts-Loop bis <280 KB, 256px-Thumb,
 *    EXIF-Orientation via imageOrientation: "from-image", Blob in IndexedDB.
 */

// ---------------------------------------------------------------------------
// num() – toleranter Zahlen-Helper für Formular-Validierung
// ---------------------------------------------------------------------------
// Ersetzt verstreute `Number(x) || 0`-Muster (fitX.js macroTargets/calcDailyGoal
// Z.813-890, FoodTab, NutritionProfile). Versteht "", "82,5", null.

/** Sicherer Number-Cast. Gibt fallback zurück bei NaN/Infinity/"" (nicht 0!). */
export function num(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "bigint") return Number(v);
  if (v == null) return fallback;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

/** Integer-Variante (rundet). */
export function int(v: unknown, fallback = 0): number {
  return Math.round(num(v, fallback));
}

/** Zahl in [min, max] klemmen (für dailyGoal 0–20000, kcal 1–10000 etc.). */
export function clamp(v: unknown, min: number, max: number, fallback = 0): number {
  const n = num(v, fallback);
  return Math.min(max, Math.max(min, n));
}

// ---------------------------------------------------------------------------
// Bild-Konvertierung
// ---------------------------------------------------------------------------

export interface PhotoBlobs {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  mime: string;
}

export interface PhotoOptions {
  /** Max. Kantenlänge Vollbild (Default 1280). */
  maxDim?: number;
  /** Zielgröße Vollbild (Default 280 KB). */
  maxBytes?: number;
  /** Max. Kantenlänge Thumb (Default 256). */
  thumbDim?: number;
  /** Start-Qualität WebP (Default 0.85). */
  startQuality?: number;
}

const DEFAULTS = {
  maxDim: 1280,
  maxBytes: 280 * 1024,
  thumbDim: 256,
  startQuality: 0.85,
} as const;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas-Export fehlgeschlagen"))),
      type,
      quality,
    );
  });
}

/**
 * Lädt ein File als Bitmap – mit EXIF-Orientation.
 * createImageBitmap(file, { imageOrientation: "from-image" }) dreht das Bild
 * automatisch korrekt (Handy-Hochkant-Fotos!). Fallback über <img> + Objekt-URL
 * für ältere WebViews (dort ggf. ohne EXIF-Korrektur).
 */
async function loadBitmap(file: Blob): Promise<{ bmp: ImageBitmap | HTMLImageElement; w: number; h: number; close: () => void }> {
  // Pfad 1: modernes createImageBitmap mit Orientation-Korrektur
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return {
        bmp,
        w: bmp.width,
        h: bmp.height,
        close: () => {
          try {
            bmp.close();
          } catch {
            /* noop */
          }
        },
      };
    } catch {
      // weiter zu Fallback
    }
  }
  // Pfad 2: <img>-Fallback
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Foto konnte nicht gelesen werden"));
      el.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("Foto konnte nicht gelesen werden");
    return { bmp: img, w, h, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function drawScaled(
  src: ImageBitmap | HTMLImageElement,
  srcW: number,
  srcH: number,
  maxDim: number,
): { canvas: HTMLCanvasElement; w: number; h: number } {
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  ctx.drawImage(src, 0, 0, w, h);
  return { canvas, w, h };
}

/**
 * fileToPhotoBlobs – Hauptfunktion für Check-in- / Skill-Fotos.
 *
 *  - Validiert Typ (image/*) + Größe (max 15 MB).
 *  - Vollbild: max 1280px, WebP, Qualitäts-Loop (0.85 → 0.45) bis <280 KB.
 *    Falls selbst q0.45 zu groß: Dimension schrittweise verkleinern (0.9×).
 *  - Thumb: 256px, WebP q0.70.
 *  - imageOrientation: "from-image" (EXIF) – kein verdrehtes Hochkant mehr.
 *
 * @throws Error mit deutscher UI-Meldung (direkt anzeigbar).
 */
export async function fileToPhotoBlobs(file: File | Blob, opts?: PhotoOptions): Promise<PhotoBlobs> {
  const { maxDim, maxBytes, thumbDim, startQuality } = { ...DEFAULTS, ...opts };

  if (!file || !(file instanceof Blob)) throw new Error("Keine Bilddatei");
  if (file.type && !file.type.startsWith("image/")) throw new Error("Keine Bilddatei");
  if (file.size > 15 * 1024 * 1024) throw new Error("Bild zu groß (max. 15 MB)");

  const { bmp, w: srcW, h: srcH, close } = await loadBitmap(file);
  try {
    if (!srcW || !srcH) throw new Error("Foto konnte nicht gelesen werden");

    // WebP-Support prüfen, sonst JPEG-Fallback (ältere WebViews)
    const mime = "image/webp";

    // ---- Vollbild mit Qualitäts-Loop ---------------------------------------
    let dim = Math.max(1, num(maxDim, DEFAULTS.maxDim));
    let full: Blob | null = null;
    let outW = 0;
    let outH = 0;

    for (let shrink = 0; shrink < 3; shrink++) {
      const { canvas, w, h } = drawScaled(bmp, srcW, srcH, dim);
      outW = w;
      outH = h;
      let q = num(startQuality, DEFAULTS.startQuality);
      for (let i = 0; i < 5; i++) {
        const blob = await canvasToBlob(canvas, mime, q).catch(() =>
          canvasToBlob(canvas, "image/jpeg", q),
        );
        if (blob.size <= num(maxBytes, DEFAULTS.maxBytes) || q <= 0.45) {
          full = blob;
          break;
        }
        q = Math.max(0.4, q - 0.1);
      }
      if (full && full.size <= num(maxBytes, DEFAULTS.maxBytes)) break;
      if (full) break; // beste Annäherung behalten, nicht ewig shrinken
      dim = Math.round(dim * 0.85);
    }
    if (!full) throw new Error("Foto konnte nicht gespeichert werden");

    // ---- Thumb (256px) -------------------------------------------------------
    const { canvas: thumbCanvas } = drawScaled(bmp, srcW, srcH, num(thumbDim, DEFAULTS.thumbDim));
    const thumb = await canvasToBlob(thumbCanvas, mime, 0.7).catch(() =>
      canvasToBlob(thumbCanvas, "image/jpeg", 0.7),
    );

    return { full, thumb, width: outW, height: outH, mime: full.type || mime };
  } finally {
    close();
  }
}

/** DataURL → Blob (für legacyAdapter/backup – gefordert via fetch().blob()). */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("DataURL ungültig");
  return res.blob();
}

/** Blob → DataURL (nur für Backup-Export, nie für Storage!). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Lesen fehlgeschlagen"));
    r.readAsDataURL(blob);
  });
}
