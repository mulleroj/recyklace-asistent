/**
 * Smart Prefetching System
 * Preloads popular queries into cache for instant results
 */

import { getAnalytics } from './analytics';
import { getAICache } from './aiCache';

interface PrefetchItem {
    query: string;
    count: number;
}

/**
 * Get list of queries to prefetch based on popularity
 */
export function getPrefetchList(maxItems: number = 20): PrefetchItem[] {
    try {
        const analytics = getAnalytics();
        const popular = analytics.getPopularQueries(maxItems);

        // Filter out items that are already in cache
        const aiCache = getAICache();
        const filtered: PrefetchItem[] = [];

        for (const item of popular) {
            // Check if already cached
            const cached = aiCache.findByQuery(item.query);
            if (!cached) {
                filtered.push(item);
            }
        }

        return filtered;
    } catch (e) {
        console.error('Failed to get prefetch list:', e);
        return [];
    }
}

/**
 * Prefetch popular queries in the background
 * This "warms up" the cache for instant responses
 */
export async function prefetchPopularQueries(
    searchFunction: (query: string) => Promise<void>,
    maxItems: number = 20,
    delayMs: number = 2000
): Promise<void> {
    const prefetchList = getPrefetchList(maxItems);

    if (prefetchList.length === 0) {
        console.log('📦 No items to prefetch - cache is warm!');
        return;
    }

    console.log(`🔥 Prefetching ${prefetchList.length} popular queries...`);

    // Wait before starting to not interfere with initial load
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Prefetch items one by one with small delays
    for (let i = 0; i < prefetchList.length; i++) {
        const item = prefetchList[i];

        try {
            console.log(`📥 Prefetching (${i + 1}/${prefetchList.length}): "${item.query}"`);
            await searchFunction(item.query);

            // Small delay between prefetches to not overload
            if (i < prefetchList.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.warn(`Failed to prefetch "${item.query}":`, error);
            // Continue with next item
        }
    }

    console.log('✅ Prefetching complete!');
}

/**
 * Check if prefetching would be beneficial
 */
export function shouldPrefetch(): boolean {
    try {
        const analytics = getAnalytics();
        const stats = analytics.getStats();

        // Only prefetch if:
        // 1. User has made at least 10 searches
        // 2. Cache hit rate is below 50%
        return stats.totalSearches >= 10 && stats.cacheHitRate < 50;
    } catch (e) {
        return false;
    }
}

/**
 * Get prefetch statistics
 */
export function getPrefetchStats(): {
    popularQueries: number;
    alreadyCached: number;
    toBePrefetched: number;
} {
    try {
        const analytics = getAnalytics();
        const aiCache = getAICache();
        const popular = analytics.getPopularQueries(50);

        let alreadyCached = 0;
        for (const item of popular) {
            const cached = aiCache.findByQuery(item.query);
            if (cached) {
                alreadyCached++;
            }
        }

        return {
            popularQueries: popular.length,
            alreadyCached,
            toBePrefetched: popular.length - alreadyCached,
        };
    } catch (e) {
        return {
            popularQueries: 0,
            alreadyCached: 0,
            toBePrefetched: 0,
        };
    }
}
