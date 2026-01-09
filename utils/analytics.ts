/**
 * Analytics & Monitoring System
 * Tracks cache hits, AI usage, suggestions, and more
 */

const ANALYTICS_KEY = 'recyklacni_asistent_analytics';

export enum AnalyticsEvent {
    // Search events
    SEARCH_LOCAL_HIT = 'search_local_hit',
    SEARCH_CACHE_HIT = 'search_cache_hit',
    SEARCH_AI_CALL = 'search_ai_call',
    SEARCH_SUGGESTION_SHOWN = 'search_suggestion_shown',
    SEARCH_SUGGESTION_ACCEPTED = 'search_suggestion_accepted',
    SEARCH_SUGGESTION_REJECTED = 'search_suggestion_rejected',

    // Image events
    IMAGE_CAPTURED = 'image_captured',
    IMAGE_COMPRESSED = 'image_compressed',
    IMAGE_CACHE_HIT = 'image_cache_hit',

    // User actions
    USER_ADDED_ITEM = 'user_added_item',
    USER_FEEDBACK_POSITIVE = 'user_feedback_positive',
    USER_FEEDBACK_NEGATIVE = 'user_feedback_negative',

    // Errors
    ERROR_OFFLINE = 'error_offline',
    ERROR_NO_API_KEY = 'error_no_api_key',
    ERROR_AI_FAILED = 'error_ai_failed',
}

interface AnalyticsEventData {
    event: AnalyticsEvent;
    timestamp: number;
    metadata?: Record<string, any>;
}

interface AnalyticsStats {
    totalSearches: number;
    localHits: number;
    cacheHits: number;
    aiCalls: number;
    suggestionsShown: number;
    suggestionsAccepted: number;
    suggestionsRejected: number;
    imagesCaptured: number;
    imagesCompressed: number;
    imageCacheHits: number;
    userAddedItems: number;
    feedbackPositive: number;
    feedbackNegative: number;
    errors: {
        offline: number;
        noApiKey: number;
        aiFailed: number;
    };

    // Calculated metrics
    cacheHitRate: number;
    suggestionAcceptanceRate: number;
    aiUsageRate: number;
    imageCacheHitRate: number;
    compressionSavings?: {
        totalOriginalSize: number;
        totalCompressedSize: number;
        averageReduction: number;
    };
}

class AnalyticsManager {
    private events: AnalyticsEventData[] = [];
    private sessionStartTime: number;

    constructor() {
        this.sessionStartTime = Date.now();
        this.loadEvents();
        this.cleanOldEvents();
    }

    /**
     * Load events from localStorage
     */
    private loadEvents(): void {
        try {
            const saved = localStorage.getItem(ANALYTICS_KEY);
            if (saved) {
                this.events = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load analytics:', e);
            this.events = [];
        }
    }

    /**
     * Save events to localStorage
     */
    private saveEvents(): void {
        try {
            localStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.events));
        } catch (e) {
            console.error('Failed to save analytics:', e);
        }
    }

    /**
     * Clean events older than 30 days
     */
    private cleanOldEvents(): void {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const initialLength = this.events.length;

        this.events = this.events.filter(e => e.timestamp > thirtyDaysAgo);

        if (this.events.length !== initialLength) {
            this.saveEvents();
            console.log(`Cleaned ${initialLength - this.events.length} old analytics events`);
        }
    }

    /**
     * Track an analytics event
     */
    track(event: AnalyticsEvent, metadata?: Record<string, any>): void {
        this.events.push({
            event,
            timestamp: Date.now(),
            metadata,
        });

        this.saveEvents();

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Analytics:', event, metadata);
        }
    }

    /**
     * Get statistics for a time period
     */
    getStats(fromDate?: number): AnalyticsStats {
        const from = fromDate || this.sessionStartTime;
        const relevantEvents = this.events.filter(e => e.timestamp >= from);

        const count = (eventType: AnalyticsEvent) =>
            relevantEvents.filter(e => e.event === eventType).length;

        const totalSearches = count(AnalyticsEvent.SEARCH_LOCAL_HIT) +
            count(AnalyticsEvent.SEARCH_CACHE_HIT) +
            count(AnalyticsEvent.SEARCH_AI_CALL);

        const localHits = count(AnalyticsEvent.SEARCH_LOCAL_HIT);
        const cacheHits = count(AnalyticsEvent.SEARCH_CACHE_HIT);
        const aiCalls = count(AnalyticsEvent.SEARCH_AI_CALL);
        const suggestionsShown = count(AnalyticsEvent.SEARCH_SUGGESTION_SHOWN);
        const suggestionsAccepted = count(AnalyticsEvent.SEARCH_SUGGESTION_ACCEPTED);
        const suggestionsRejected = count(AnalyticsEvent.SEARCH_SUGGESTION_REJECTED);
        const imagesCaptured = count(AnalyticsEvent.IMAGE_CAPTURED);
        const imagesCompressed = count(AnalyticsEvent.IMAGE_COMPRESSED);
        const imageCacheHits = count(AnalyticsEvent.IMAGE_CACHE_HIT);

        // Calculate compression savings
        const compressionEvents = relevantEvents.filter(
            e => e.event === AnalyticsEvent.IMAGE_COMPRESSED && e.metadata
        );

        let compressionSavings;
        if (compressionEvents.length > 0) {
            const totalOriginalSize = compressionEvents.reduce(
                (sum, e) => sum + (e.metadata?.originalSize || 0), 0
            );
            const totalCompressedSize = compressionEvents.reduce(
                (sum, e) => sum + (e.metadata?.compressedSize || 0), 0
            );
            const averageReduction = totalOriginalSize > 0
                ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
                : 0;

            compressionSavings = {
                totalOriginalSize,
                totalCompressedSize,
                averageReduction: Math.round(averageReduction * 10) / 10,
            };
        }

        return {
            totalSearches,
            localHits,
            cacheHits,
            aiCalls,
            suggestionsShown,
            suggestionsAccepted,
            suggestionsRejected,
            imagesCaptured,
            imagesCompressed,
            imageCacheHits,
            userAddedItems: count(AnalyticsEvent.USER_ADDED_ITEM),
            feedbackPositive: count(AnalyticsEvent.USER_FEEDBACK_POSITIVE),
            feedbackNegative: count(AnalyticsEvent.USER_FEEDBACK_NEGATIVE),
            errors: {
                offline: count(AnalyticsEvent.ERROR_OFFLINE),
                noApiKey: count(AnalyticsEvent.ERROR_NO_API_KEY),
                aiFailed: count(AnalyticsEvent.ERROR_AI_FAILED),
            },

            // Calculated metrics
            cacheHitRate: totalSearches > 0
                ? Math.round((cacheHits / totalSearches) * 1000) / 10
                : 0,
            suggestionAcceptanceRate: suggestionsShown > 0
                ? Math.round((suggestionsAccepted / suggestionsShown) * 1000) / 10
                : 0,
            aiUsageRate: totalSearches > 0
                ? Math.round((aiCalls / totalSearches) * 1000) / 10
                : 0,
            imageCacheHitRate: imagesCaptured > 0
                ? Math.round((imageCacheHits / imagesCaptured) * 1000) / 10
                : 0,
            compressionSavings,
        };
    }

    /**
     * Get popular search queries
     */
    getPopularQueries(limit: number = 10): Array<{ query: string; count: number }> {
        const queries = new Map<string, number>();

        // Count all search events with query metadata
        this.events.forEach(event => {
            if (event.metadata?.query) {
                const query = event.metadata.query.toLowerCase();
                queries.set(query, (queries.get(query) || 0) + 1);
            }
        });

        // Convert to array and sort
        return Array.from(queries.entries())
            .map(([query, count]) => ({ query, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Print stats to console
     */
    printStats(fromDate?: number): void {
        const stats = this.getStats(fromDate);

        console.log('📊 Analytics Report');
        console.log('===================');
        console.log(`Total Searches: ${stats.totalSearches}`);
        console.log(`  - Local DB Hits: ${stats.localHits}`);
        console.log(`  - Cache Hits: ${stats.cacheHits} (${stats.cacheHitRate}%)`);
        console.log(`  - AI Calls: ${stats.aiCalls} (${stats.aiUsageRate}%)`);
        console.log('');
        console.log(`Suggestions: ${stats.suggestionsShown} shown`);
        console.log(`  - Accepted: ${stats.suggestionsAccepted} (${stats.suggestionAcceptanceRate}%)`);
        console.log(`  - Rejected: ${stats.suggestionsRejected}`);
        console.log('');
        console.log(`Images: ${stats.imagesCaptured} captured`);
        console.log(`  - Compressed: ${stats.imagesCompressed}`);
        console.log(`  - Cache Hits: ${stats.imageCacheHits} (${stats.imageCacheHitRate}%)`);

        if (stats.compressionSavings) {
            console.log(`  - Avg Compression: ${stats.compressionSavings.averageReduction}%`);
        }
        console.log('');
        console.log(`User Feedback:`);
        console.log(`  - Positive: ${stats.feedbackPositive}`);
        console.log(`  - Negative: ${stats.feedbackNegative}`);
        console.log('');
        console.log(`Errors: ${stats.errors.offline + stats.errors.noApiKey + stats.errors.aiFailed}`);
    }

    /**
     * Clear all analytics data
     */
    clear(): void {
        this.events = [];
        this.saveEvents();
    }

    /**
     * Export analytics data as JSON
     */
    exportData(): string {
        return JSON.stringify({
            events: this.events,
            stats: this.getStats(),
            popularQueries: this.getPopularQueries(20),
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }
}

// Singleton instance
let analyticsInstance: AnalyticsManager | null = null;

/**
 * Get analytics instance
 */
export function getAnalytics(): AnalyticsManager {
    if (!analyticsInstance) {
        analyticsInstance = new AnalyticsManager();
    }
    return analyticsInstance;
}

// Convenience function for global access in console
if (typeof window !== 'undefined') {
    (window as any).__analytics = {
        stats: () => getAnalytics().printStats(),
        export: () => getAnalytics().exportData(),
        popular: () => console.table(getAnalytics().getPopularQueries(10)),
    };
}
