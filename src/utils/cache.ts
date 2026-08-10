import { CacheEntry } from '../types/index.js'
import { getConfig } from './config.js'

const store = new Map<string, CacheEntry<unknown>>()

function makeKey(prefix: string, query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, '_')
  return `${prefix}:${normalized}`
}

export function getCached<T>(prefix: string, query: string): T | null {
  const key = makeKey(prefix, query)
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.ttl) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache<T>(
  prefix: string,
  query: string,
  data: T,
  ttl?: number,
): void {
  const key = makeKey(prefix, query)
  store.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl ?? getConfig().cacheTTL,
  })
}

export function clearCache(): void {
  store.clear()
}

export function cacheSize(): number {
  return store.size
}
