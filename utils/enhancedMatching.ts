/**
 * Czech Phonetic Matching (Soundex-like algorithm for Czech language)
 * Converts Czech words to phonetic codes for better fuzzy matching
 */

/**
 * Generate phonetic code for Czech word
 * Similar sounds map to same codes
 */
export function czechPhonetic(word: string): string {
    if (!word || word.length === 0) return '';

    // Normalize: lowercase, remove diacritics
    let normalized = word
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // Czech phonetic rules
    const rules: Array<[RegExp, string]> = [
        // Similar consonants
        [/[bp]/g, '1'],
        [/[dt]/g, '2'],
        [/[kg]/g, '3'],
        [/[fv]/g, '4'],
        [/[sz]/g, '5'],
        [/[cč]/g, '6'],
        [/[šs]/g, '7'],
        [/[žz]/g, '8'],
        [/[lr]/g, '9'],
        [/[mn]/g, '0'],

        // Remove vowels (keep only first)
        [/[aeiouy]/g, 'A'],
    ];

    // Apply rules
    for (const [pattern, replacement] of rules) {
        normalized = normalized.replace(pattern, replacement);
    }

    // Keep first letter + consonants
    const firstLetter = normalized[0];
    let code = firstLetter;

    // Add unique consonants (skip duplicates)
    let prev = '';
    for (let i = 1; i < normalized.length && code.length < 6; i++) {
        const char = normalized[i];
        if (char !== prev && char !== 'A' && /[0-9]/.test(char)) {
            code += char;
            prev = char;
        }
    }

    // Pad to length 6
    return (code + '000000').substring(0, 6);
}

/**
 * Generate N-grams from a string
 * N-grams help match partial words and typos
 */
export function generateNGrams(text: string, n: number = 2): Set<string> {
    const normalized = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const ngrams = new Set<string>();

    // Add character n-grams
    for (let i = 0; i <= normalized.length - n; i++) {
        ngrams.add(normalized.substring(i, i + n));
    }

    // For n=2, also add 3-grams for better matching
    if (n === 2 && normalized.length >= 3) {
        for (let i = 0; i <= normalized.length - 3; i++) {
            ngrams.add(normalized.substring(i, i + 3));
        }
    }

    return ngrams;
}

/**
 * Calculate N-gram similarity between two strings
 * Returns value 0-1, where 1 is perfect match
 */
export function ngramSimilarity(str1: string, str2: string, n: number = 2): number {
    const ngrams1 = generateNGrams(str1, n);
    const ngrams2 = generateNGrams(str2, n);

    if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

    // Count intersection
    let intersection = 0;
    for (const ngram of ngrams1) {
        if (ngrams2.has(ngram)) {
            intersection++;
        }
    }

    // Jaccard similarity
    const union = ngrams1.size + ngrams2.size - intersection;
    return union > 0 ? intersection / union : 0;
}

/**
 * Check if two words sound similar (phonetic match)
 */
export function soundsLike(word1: string, word2: string): boolean {
    if (!word1 || !word2) return false;

    const code1 = czechPhonetic(word1);
    const code2 = czechPhonetic(word2);

    // Exact phonetic match
    if (code1 === code2) return true;

    // Allow 1 character difference for very similar sounds
    let diff = 0;
    for (let i = 0; i < Math.min(code1.length, code2.length); i++) {
        if (code1[i] !== code2[i]) diff++;
    }

    return diff <= 1;
}

/**
 * Calculate combined similarity score
 * Uses multiple strategies for robust matching
 */
export function calculateSimilarity(query: string, target: string): number {
    if (!query || !target) return 0;

    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const t = target.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let score = 0;

    // 1. Exact match (highest score)
    if (q === t) return 1.0;

    // 2. Starts with (very high score)
    if (t.startsWith(q)) return 0.9;

    // 3. Contains (high score)
    if (t.includes(q)) return 0.8;

    // 4. Phonetic match (good score)
    if (soundsLike(query, target)) {
        score = Math.max(score, 0.7);
    }

    // 5. N-gram similarity (partial match)
    const ngramScore = ngramSimilarity(query, target, 2);
    score = Math.max(score, ngramScore * 0.6);

    return score;
}
