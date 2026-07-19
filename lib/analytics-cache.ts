import type { AnalyticsData } from "@/types/analytics";

interface CacheEntry {
  data: AnalyticsData;
  completedCount: number;
  cachedAt: number;
}

const cache = new Map<number, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

export function getCachedAnalytics(courseId: number): CacheEntry | undefined {
  const entry = cache.get(courseId);
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt > CACHE_TTL) {
    cache.delete(courseId);
    return undefined;
  }
  return entry;
}

export function setCachedAnalytics(
  courseId: number,
  data: AnalyticsData,
  completedCount: number,
): void {
  cache.set(courseId, { data, completedCount, cachedAt: Date.now() });
}
