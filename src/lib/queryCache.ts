/**
 * Module-level in-memory cache with TTL.
 * Lives for the duration of the browser session (cleared on page reload).
 * Prevents redundant Supabase fetches when navigating between pages.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export const queryCache = {
  get<T>(key: string): T | null {
    const entry = store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      store.delete(key)
      return null
    }
    return entry.data as T
  },

  set<T>(key: string, data: T, ttlMs: number): void {
    store.set(key, { data, expiresAt: Date.now() + ttlMs })
  },

  invalidate(keyPrefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(keyPrefix)) store.delete(key)
    }
  },

  clear(): void {
    store.clear()
  },
}

export const TTL = {
  /** Reference data that rarely changes: accounts, work_units, funding_sources */
  REFERENCE: 5 * 60 * 1000,   // 5 minutes
  /** Transaction ledger data — short TTL to stay reasonably fresh */
  TRANSACTIONS: 30 * 1000,     // 30 seconds
}
