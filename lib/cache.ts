/**
 * A tiny in-memory cache for results that are expensive to compute and fine to show a minute out of date (analytics,
 * search facets). It lives in one server process: with several servers each keeps its own copy, which is fine for a
 * short time-to-live. Swap the Map for Redis if you need one shared cache.
 */
const store = new Map<string, { value: unknown; expires: number }>();
const MAX_ENTRIES = 200;

export function memo<T>(key: string, ttlMs: number, compute: () => T, now: number = Date.now()): T {
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = compute();
  if (store.size >= MAX_ENTRIES) {
    // Drop the oldest entries so the cache can't grow without bound.
    for (const k of [...store.keys()].slice(0, 50)) store.delete(k);
  }
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

/** Forgets cached values whose key starts with the prefix (or everything, with no prefix). */
export function clearMemo(prefix = ""): void {
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k);
}
