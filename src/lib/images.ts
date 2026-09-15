// FitTrack Phase 6 – Bild / Thumb-Pipeline
// Pfad-Ziel: ../fittrack/src/lib/images.ts
// Vorlage: FitX/src/lib/images.ts
//
// Stand FitX (fitX.js): fileToPhotoDataUrl(file, maxDim=900, quality=0.72)
//   -> createImageBitmap -> Canvas -> JPEG-dataURL -> localStorage / Capacitor Storage.
// Problem: volle 900px-Bilder in Listen (Check-ins, Mahlzeiten-Fotos) = Speicher + Jank.
// Lösung: zweistufig – Thumb (320px) für Listen, Full (900px) nur Detail.
//
// Regeln:
//   1. <img> IMMER mit loading="lazy" decoding="async"
//      Beispiel: <img src={thumb} loading="lazy" decoding="async" alt="..." />
//   2. Thumbs als JPEG q=0.6, max 320px. Full als JPEG q=0.72, max 900px.
//   3. Blur-Up Placeholder: 60px-Thumb als dataURL, CSS blur(12px), dann swap auf echten Thumb.
//   4. Low-End-Fix: bei navigator.hardwareConcurrency <= 4 -> KEIN Blur, KEIN Schatten,
//      direkt Thumb anzeigen (Klasse .no-fx auf <html>). Spart Compositing auf Mali/Adreno low.
//      Begründung: backdrop-filter + blur auf 1000-Listen-Items killt 60fps auf 4-Kern-Geräten.

export const THUMB_MAX_DIM = 320;
export const FULL_MAX_DIM = 900;
export const BLUR_PLACEHOLDER_DIM = 60;

/** true auf Low-End (<=4 logische Kerne) oder wenn explizit ?no-fx gesetzt. */
export function isLowEndDevice(): boolean {
  try {
    if (typeof window !== "undefined" && window.location?.search?.includes("no-fx"))
      return true;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number })
      .hardwareConcurrency;
    if (typeof cores === "number") return cores <= 4;
  } catch {
    /* ignore – Default: High-End annehmen */
  }
  return false;
}

/** .no-fx auf <html> setzen, wenn Low-End. Einmalig beim Boot aufrufen. */
export function applyFxFlag(): boolean {
  const low = isLowEndDevice();
  try {
    document.documentElement.classList.toggle("no-fx", low);
  } catch {
    /* SSR / kein DOM */
  }
  return low;
}

function drawScaled(
  src: ImageBitmap | HTMLImageElement,
  w: number,
  h: number,
  maxDim: number,
  quality: number
): string {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  canvas.getContext("2d")!.drawImage(src, 0, 0, cw, ch);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Datei -> JPEG-dataURL (wiederverwendet fileToPhotoDataUrl-Logik aus fitX.js). */
export async function fileToPhotoDataUrl(
  file: Blob,
  maxDim = FULL_MAX_DIM,
  quality = 0.72
): Promise<string> {
  let bmp: ImageBitmap | HTMLImageElement | null = null;
  let objUrl: string | null = null;
  try {
    if (typeof createImageBitmap === "function") {
      bmp = await createImageBitmap(file);
    } else {
      objUrl = URL.createObjectURL(file);
      bmp = await new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error("Foto konnte nicht gelesen werden"));
        img.src = objUrl!;
      });
    }
    const w =
      (bmp as ImageBitmap).width ?? (bmp as HTMLImageElement).naturalWidth;
    const h =
      (bmp as ImageBitmap).height ?? (bmp as HTMLImageElement).naturalHeight;
    if (!w || !h) throw new Error("Foto konnte nicht gelesen werden");
    return drawScaled(bmp, w, h, Math.max(1, maxDim), quality);
  } finally {
    try {
      if (bmp && typeof (bmp as ImageBitmap).close === "function")
        (bmp as ImageBitmap).close();
    } catch {
      /* ignore */
    }
    try {
      if (objUrl) URL.revokeObjectURL(objUrl);
    } catch {
      /* ignore */
    }
  }
}

/** Erzeugt Thumb + Full + 60px-Blur-Placeholder in einem Durchgang. */
export async function fileToThumbPipeline(file: Blob): Promise<{
  thumb: string;
  full: string;
  blur: string;
}> {
  const [thumb, full, blur] = await Promise.all([
    fileToPhotoDataUrl(file, THUMB_MAX_DIM, 0.6),
    fileToPhotoDataUrl(file, FULL_MAX_DIM, 0.72),
    fileToPhotoDataUrl(file, BLUR_PLACEHOLDER_DIM, 0.5),
  ]);
  return { thumb, full, blur };
}

// ---- Verwendung (React) ----
// <img
//   src={checkin.thumb ?? checkin.photo}
//   loading="lazy"
//   decoding="async"
//   alt="Gym-Check-in"
//   className={isLowEnd ? undefined : "blur-up"}
//   style={blurUrl && !loaded ? { backgroundImage: `url(${blurUrl})` } : undefined}
// />
//
// CSS:
// .blur-up { filter: blur(12px); transition: filter .25s; }
// .blur-up.loaded { filter: none; }
// html.no-fx .blur-up { filter: none; transition: none; }
// html.no-fx .blob, html.no-fx .bg-glow { display: none; } /* teure Deko auf Low-End aus */
