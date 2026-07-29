const ANALYTICS_KEY = 'recyklacni_asistent_analytics';

export enum AnalyticsEvent {
    SEARCH_LOCAL_HIT = 'search_local_hit',
    SEARCH_NOT_FOUND = 'search_not_found',
    SEARCH_SUGGESTION_SHOWN = 'search_suggestion_shown',
    SEARCH_SUGGESTION_ACCEPTED = 'search_suggestion_accepted',
    SEARCH_SUGGESTION_REJECTED = 'search_suggestion_rejected',
    USER_ADDED_ITEM = 'user_added_item',
    USER_FEEDBACK_POSITIVE = 'user_feedback_positive',
    USER_FEEDBACK_NEGATIVE = 'user_feedback_negative',
}

interface AnalyticsEventData {
    event: AnalyticsEvent;
    timestamp: number;
    metadata?: Record<string, any>;
}

interface AnalyticsStats {
    totalSearches: number;
    localHits: number;
    notFound: number;
    suggestionsShown: number;
    suggestionsAccepted: number;
    suggestionsRejected: number;
    userAddedItems: number;
    feedbackPositive: number;
    feedbackNegative: number;
    suggestionAcceptanceRate: number;
}

class AnalyticsManager {
    private events: AnalyticsEventData[] = [];
    private sessionStartTime: number;

    constructor() {
        this.sessionStartTime = Date.now();
        this.loadEvents();
        this.cleanOldEvents();
    }

    private loadEvents(): void {
        try {
            const saved = localStorage.getItem(ANALYTICS_KEY);
            if (saved) this.events = JSON.parse(saved);
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.events = [];
        }
    }

    private saveEvents(): void {
        try {
            localStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.events));
        } catch (error) {
            console.error('Failed to save analytics:', error);
        }
    }

    private cleanOldEvents(): void {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const initialLength = this.events.length;

        this.events = this.events.filter((event) => event.timestamp > thirtyDaysAgo);

        if (this.events.length !== initialLength) {
            this.saveEvents();
            console.log(`Cleaned ${initialLength - this.events.length} old analytics events`);
        }
    }

    track(event: AnalyticsEvent, metadata?: Record<string, any>): void {
        this.events.push({
            event,
            timestamp: Date.now(),
            metadata,
        });
        this.saveEvents();
    }

    getStats(fromDate?: number): AnalyticsStats {
        const from = fromDate || this.sessionStartTime;
        const relevantEvents = this.events.filter((event) => event.timestamp >= from);
        const count = (eventType: AnalyticsEvent) =>
            relevantEvents.filter((event) => event.event === eventType).length;

        const localHits = count(AnalyticsEvent.SEARCH_LOCAL_HIT);
        const notFound = count(AnalyticsEvent.SEARCH_NOT_FOUND);
        const suggestionsShown = count(AnalyticsEvent.SEARCH_SUGGESTION_SHOWN);
        const suggestionsAccepted = count(AnalyticsEvent.SEARCH_SUGGESTION_ACCEPTED);
        const suggestionsRejected = count(AnalyticsEvent.SEARCH_SUGGESTION_REJECTED);

        return {
            totalSearches: localHits + notFound,
            localHits,
            notFound,
            suggestionsShown,
            suggestionsAccepted,
            suggestionsRejected,
            userAddedItems: count(AnalyticsEvent.USER_ADDED_ITEM),
            feedbackPositive: count(AnalyticsEvent.USER_FEEDBACK_POSITIVE),
            feedbackNegative: count(AnalyticsEvent.USER_FEEDBACK_NEGATIVE),
            suggestionAcceptanceRate: suggestionsShown > 0
                ? Math.round((suggestionsAccepted / suggestionsShown) * 1000) / 10
                : 0,
        };
    }

    getPopularQueries(limit: number = 10): Array<{ query: string; count: number }> {
        const queries = new Map<string, number>();

        this.events.forEach((event) => {
            if (typeof event.metadata?.query === 'string') {
                const query = event.metadata.query.toLowerCase();
                queries.set(query, (queries.get(query) || 0) + 1);
            }
        });

        return Array.from(queries.entries())
            .map(([query, count]) => ({ query, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    printStats(fromDate?: number): void {
        const stats = this.getStats(fromDate);
        console.log('Analytics Report');
        console.log('================');
        console.log(`Total Searches: ${stats.totalSearches}`);
        console.log(`Local Hits: ${stats.localHits}`);
        console.log(`Not Found: ${stats.notFound}`);
        console.log(`Suggestions Accepted: ${stats.suggestionsAccepted}/${stats.suggestionsShown}`);
    }

    clear(): void {
        this.events = [];
        this.saveEvents();
    }

    exportData(): string {
        return JSON.stringify({
            events: this.events,
            stats: this.getStats(),
            popularQueries: this.getPopularQueries(20),
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }
}

let analyticsInstance: AnalyticsManager | null = null;

export function getAnalytics(): AnalyticsManager {
    if (!analyticsInstance) {
        analyticsInstance = new AnalyticsManager();
    }
    return analyticsInstance;
}

if (typeof window !== 'undefined') {
    (window as any).__analytics = {
        stats: () => getAnalytics().printStats(),
        export: () => getAnalytics().exportData(),
        popular: () => console.table(getAnalytics().getPopularQueries(10)),
    };
}
