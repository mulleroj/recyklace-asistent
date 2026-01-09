import { WasteCategory } from '../types';
import { findLocalMatch } from './fuzzySearch';

interface CachedAIResponse {
    name: string;
    category: WasteCategory;
    note: string;
    timestamp: number;
    query?: string;
    imageHash?: string;
}

const AI_CACHE_KEY = 'recyklacni_asistent_ai_cache';
const CACHE_TTL_DAYS = 30;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Simple hash function for images
 * Takes first and last parts of base64 string for quick comparison
 */
function hashImage(imageData: string): string {
    const len = imageData.length;
    if (len < 100) return imageData;

    // Create hash from beginning, middle, and end of image data
    const start = imageData.substring(0, 50);
    const middle = imageData.substring(Math.floor(len / 2) - 25, Math.floor(len / 2) + 25);
    const end = imageData.substring(len - 50);

    return `${start}${middle}${end}`;
}

/**
 * Normalize query for caching (lowercase, trim, remove diacritics)
 */
function normalizeQuery(query: string): string {
    return query
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

/**
 * AI Cache Manager
 * Manages caching of AI responses with TTL and deduplication
 */
export class AICacheManager {
    private cache: CachedAIResponse[] = [];

    constructor() {
        this.loadCache();
        this.cleanExpiredEntries();
    }

    /**
     * Load cache from localStorage
     */
    private loadCache(): void {
        try {
            const saved = localStorage.getItem(AI_CACHE_KEY);
            if (saved) {
                this.cache = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load AI cache:', e);
            this.cache = [];
        }
    }

    /**
     * Save cache to localStorage
     */
    private saveCache(): void {
        try {
            localStorage.setItem(AI_CACHE_KEY, JSON.stringify(this.cache));
        } catch (e) {
            console.error('Failed to save AI cache:', e);
        }
    }

    /**
     * Clean expired entries (older than TTL)
     */
    private cleanExpiredEntries(): void {
        const now = Date.now();
        const initialLength = this.cache.length;

        this.cache = this.cache.filter(entry => {
            const age = now - entry.timestamp;
            return age < CACHE_TTL_MS;
        });

        if (this.cache.length !== initialLength) {
            this.saveCache();
            console.log(`Cleaned ${initialLength - this.cache.length} expired AI cache entries`);
        }
    }

    /**
     * Find cached response by text query
     * Uses fuzzy matching to find similar queries
     */
    findByQuery(query: string): CachedAIResponse | null {
        if (!query || query.length < 2) return null;

        const normalized = normalizeQuery(query);

        // First try exact match
        const exactMatch = this.cache.find(entry =>
            entry.query && normalizeQuery(entry.query) === normalized
        );

        if (exactMatch) {
            return this.isValid(exactMatch) ? exactMatch : null;
        }

        // Try fuzzy match on cached queries
        const match = findLocalMatch(query, this.cache.filter(e => e.query) as any);

        return match && this.isValid(match as CachedAIResponse) ? match as CachedAIResponse : null;
    }

    /**
     * Find cached response by image hash
     */
    findByImage(imageData: string): CachedAIResponse | null {
        const hash = hashImage(imageData);

        const match = this.cache.find(entry => entry.imageHash === hash);

        return match && this.isValid(match) ? match : null;
    }

    /**
     * Check if cache entry is still valid (not expired)
     */
    private isValid(entry: CachedAIResponse): boolean {
        const age = Date.now() - entry.timestamp;
        return age < CACHE_TTL_MS;
    }

    /**
     * Add new AI response to cache
     */
    add(params: {
        name: string;
        category: WasteCategory;
        note: string;
        query?: string;
        imageData?: string;
    }): void {
        const entry: CachedAIResponse = {
            name: params.name,
            category: params.category,
            note: params.note,
            timestamp: Date.now(),
            query: params.query,
            imageHash: params.imageData ? hashImage(params.imageData) : undefined,
        };

        // Check if similar entry already exists
        const existingIndex = this.cache.findIndex(cached => {
            const nameMatch = normalizeQuery(cached.name) === normalizeQuery(entry.name);
            const queryMatch = entry.query && cached.query &&
                normalizeQuery(cached.query) === normalizeQuery(entry.query);
            const imageMatch = entry.imageHash && cached.imageHash === entry.imageHash;

            return nameMatch || queryMatch || imageMatch;
        });

        if (existingIndex !== -1) {
            // Update existing entry with new timestamp
            this.cache[existingIndex] = entry;
        } else {
            // Add new entry at the beginning
            this.cache.unshift(entry);

            // Keep cache size reasonable (max 500 entries)
            if (this.cache.length > 500) {
                this.cache = this.cache.slice(0, 500);
            }
        }

        this.saveCache();
    }

    /**
     * Get cache statistics
     */
    getStats(): { total: number; expired: number; valid: number } {
        const now = Date.now();
        const valid = this.cache.filter(e => now - e.timestamp < CACHE_TTL_MS);

        return {
            total: this.cache.length,
            expired: this.cache.length - valid.length,
            valid: valid.length,
        };
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache = [];
        this.saveCache();
    }
}

// Singleton instance
let cacheInstance: AICacheManager | null = null;

/**
 * Get AI cache instance
 */
export function getAICache(): AICacheManager {
    if (!cacheInstance) {
        cacheInstance = new AICacheManager();
    }
    return cacheInstance;
}
