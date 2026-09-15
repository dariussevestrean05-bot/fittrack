// FitTrack Phase 4 – lib/offClient.ts
// Fix für fitX.js OFF-Suche (Z. 1015-1048).
//
// Original-Probleme (P1-8):
//  - kein Debounce -> jeder Tastenschlag = 1 Request
//  - kein AbortController -> Race Conditions (alte Antwort überschreibt neue)
//  - kein Timeout -> hängt bei schlechtem Netz ewig
//  - kein Cache -> gleiche Query wird immer neu geladen
//  - kein fields-Param -> volle fette JSON-Payloads
//  - kein User-Agent -> OFF bittet explizit darum
//
// Diese Datei: searchOnline mit Debounce 350ms, AbortController, Timeout 8000,
// 5min Cache Map max 50, fields-Param, User-Agent.

export interface OffFood {
  name: string;
  brand: string;
  emoji: string;
  kcal: number; // kcal / 100g
  protein: number;
  carbs: number;
  fat: number;
  portion: number;
}

const SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const DEBOUNCE_MS = 350;
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 50;
// Schlankes Feldset statt Voll-Dump:
const FIELDS =
  "code,product_name,product_name_de,brands,nutriments.energy-kcal_100g,nutriments.energy_100g,nutriments.proteins_100g,nutriments.carbohydrates_100g,nutriments.fat_100g";

const UA = "FitTrack/1.0 (Android; +https://fittrack.app)";

type CacheEntry = { at: number; items: OffFood[] };
const cache = new Map<string, CacheEntry>();

function cacheKey(q: string): string {
  return q.trim().toLowerCase();
}

function getCached(q: string): OffFood[] | null {
  const k = cacheKey(q);
  const e = cache.get(k);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL_MS) {
    cache.delete(k);
    return null;
  }
  // LRU-Touch
  cache.delete(k);
  cache.set(k, e);
  return e.items;
}

function setCached(q: string, items: OffFood[]): void {
  const k = cacheKey(q);
  if (cache.has(k)) cache.delete(k);
  cache.set(k, { at: Date.now(), items });
  // max 50: älteste (erste) raus
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value as string;
    cache.delete(oldest);
  }
}

export function clearOffCache(): void {
  cache.clear();
}

function r1(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

function parseProducts(data: any): OffFood[] {
  const r1local = r1;
  const items: OffFood[] = (((data && data.products) as any[]) || []).map((p: any) => {
    const n = (p && p.nutriments) || {};
    const rawKcal = n["energy-kcal_100g"];
    const kcalPer100 = Number.isFinite(Number(rawKcal))
      ? Number(rawKcal)
      : Number.isFinite(Number(n.energy_100g))
        ? Number(n.energy_100g) / 4.184
        : NaN;
    if (!Number.isFinite(kcalPer100)) return null;
    return {
      name: p.product_name || p.product_name_de || "Unbekannt",
      brand: p.brands || "",
      emoji: "🌍",
      kcal: Math.round(kcalPer100),
      protein: r1local(n.proteins_100g),
      carbs: r1local(n.carbohydrates_100g),
      fat: r1local(n.fat_100g),
      portion: 100,
    } as OffFood;
  }).filter((f: OffFood | null): f is OffFood => !!f && f.name !== "Unbekannt");
  return items;
}

/**
 * searchOnline – mit AbortController + Timeout 8000 + Cache.
 * Wirft bei Abort einen DOMException("AbortError"), bei Timeout ebenfalls AbortError.
 * Aufrufer (Hook) unterscheidet Abort (still) vs. echte Fehler (Fehlermeldung).
 */
export async function searchOnline(
  query: string,
  opts: { signal?: AbortSignal; pageSize?: number } = {}
): Promise<OffFood[]> {
  const q = (query || "").trim();
  if (q.length < 3) throw new Error("Mindestens 3 Zeichen eingeben.");

  const hit = getCached(q);
  if (hit) return hit;

  const pageSize = Math.min(20, Math.max(1, opts.pageSize ?? 8));
  const url =
    `${SEARCH_URL}?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=${pageSize}` +
    `&fields=${encodeURIComponent(FIELDS)}`;

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort(opts.signal?.reason);
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  const timer = setTimeout(() => ctrl.abort(new DOMException("Timeout", "AbortError")), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Suche fehlgeschlagen");
    const data = await res.json();
    const items = parseProducts(data);
    setCached(q, items);
    return items;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

// ---------- Debounce-Helfer (350ms) ----------

/**
 * createDebouncedSearch – gibt { trigger(query), cancel, dispose } zurück.
 * trigger() debounced den Aufruf um 350ms, bricht den Vorgänger-Request per
 * AbortController ab und liefert nur das neueste Ergebnis an onResult.
 * Schnell-Tipp-Test: 10 Tasten in <350ms -> genau 1 fetch.
 */
export function createDebouncedSearch(callbacks: {
  onResult: (items: OffFood[], query: string) => void;
  onError: (message: string, query: string, aborted: boolean) => void;
  onLoading?: (loading: boolean) => void;
  debounceMs?: number;
}) {
  const debounceMs = callbacks.debounceMs ?? DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let currentCtrl: AbortController | null = null;
  let disposed = false;
  let seq = 0;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    currentCtrl?.abort(new DOMException("Superseded", "AbortError"));
    currentCtrl = null;
  };

  const trigger = (query: string) => {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    // Vorgänger sofort abbrechen – verhindert Race
    currentCtrl?.abort(new DOMException("Superseded", "AbortError"));
    currentCtrl = null;
    const q = (query || "").trim();
    if (q.length < 3) {
      callbacks.onLoading?.(false);
      return;
    }
    // Cache-Hit sofort (ohne Debounce) ausliefern
    const hit = getCached(q);
    if (hit) {
      callbacks.onLoading?.(false);
      callbacks.onResult(hit, q);
      return;
    }
    callbacks.onLoading?.(true);
    const mySeq = ++seq;
    timer = setTimeout(async () => {
      timer = null;
      if (disposed) return;
      const ctrl = new AbortController();
      currentCtrl = ctrl;
      try {
        const items = await searchOnline(q, { signal: ctrl.signal });
        if (disposed || mySeq !== seq) return; // veraltet
        callbacks.onResult(items, q);
      } catch (e: any) {
        if (disposed || mySeq !== seq) return;
        const aborted = e?.name === "AbortError";
        if (aborted) return; // still – neuer Request läuft bereits
        callbacks.onError("Keine Verbindung – Offline-Datenbank wird verwendet.", q, false);
      } finally {
        if (currentCtrl === ctrl) currentCtrl = null;
        if (mySeq === seq) callbacks.onLoading?.(false);
      }
    }, debounceMs);
  };

  const dispose = () => {
    disposed = true;
    cancel();
  };

  return { trigger, cancel, dispose };
}
