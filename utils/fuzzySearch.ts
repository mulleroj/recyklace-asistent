
import { ngramSimilarity, soundsLike, calculateSimilarity } from './enhancedMatching';
import { getAnalytics } from './analytics';
/**
 * Calculates the Levenshtein distance between two strings.
 * Lower distance means higher similarity.
 */
export function getLevenshteinDistance(s: string, t: string): number {
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const arr = [];
  for (let i = 0; i <= t.length; i++) {
    arr[i] = [i];
    for (let j = 1; j <= s.length; j++) {
      arr[i][j] =
        i === 0
          ? j
          : Math.min(
            arr[i - 1][j] + 1,
            arr[i][j - 1] + 1,
            arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
          );
    }
  }
  return arr[t.length][s.length];
}

/**
 * Simplified Czech word stemmer - removes common suffixes to find word roots.
 * This helps match different forms of the same word (e.g., "lahev", "lahve", "lahvi").
 * 
 * @param word - The word to stem (should be normalized first)
 * @returns The stemmed word (root)
 */
function czechStem(word: string): string {
  if (word.length <= 3) return word; // Don't stem very short words

  // Common Czech suffixes in order of priority (longest first)
  const suffixes = [
    'ích', 'ími', 'ách', 'ama', 'ami', 'ové', 'ata', 'ete', 'ete',
    'ím', 'ou', 'ům', 'em', 'es', 'ém', 'mi', 'ho', 'ého', 'ých',
    'a', 'e', 'i', 'í', 'ě', 'y', 'ý', 'é', 'ů', 'u', 'ú', 'o', 'ó'
  ];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      // Only return stem if it's at least 3 characters
      if (stem.length >= 3) {
        return stem;
      }
    }
  }

  return word;
}

/**
 * Extended dictionary of synonyms for common waste-related terms.
 * Maps variations to canonical forms used in the database.
 */
const SYNONYMS: Record<string, string[]> = {
  // Bottles and containers
  'lahev': ['flaska', 'lahve', 'flase', 'flasky', 'lahvi', 'lahvi', 'lahvich', 'lahvemi'],
  'flaska': ['lahev', 'lahve', 'lahvi', 'flasky', 'flasek', 'flaskach'],
  'pet': ['petka', 'petky', 'plastova lahev', 'plastova flaska', 'pet lahev', 'pet flaska'],
  'plastova lahev': ['pet', 'pet lahev', 'pet flaska', 'petka', 'plastova flaska'],
  'pet lahev': ['plastova lahev', 'pet', 'pet flaska', 'petka', 'plastova flaska'],

  // Cartons and boxes
  'karton': ['krabice', 'tetrapack', 'tetra pak', 'tetrapak', 'lepenka', 'napojovy karton'],
  'krabice': ['karton', 'box', 'krabicka', 'krabic', 'krabicek', 'lepenka'],
  'napojovy karton': ['karton od mleka', 'karton od dzusu', 'tetrapack', 'tetrapak'],
  'tetrapack': ['karton', 'napojovy karton', 'tetrapak', 'tetra pak'],

  // Paper
  'noviny': ['casopis', 'deniky', 'magazin', 'tisk', 'novin', 'novinach'],
  'casopis': ['noviny', 'magazin', 'casopisy', 'casopisu'],
  'papir': ['papirovy odpad', 'papiry', 'lepenka'],

  // Glass
  'sklenice': ['sklo', 'zavařovačka', 'zavarovacka', 'sklenicka', 'sklenic', 'sklenicek'],
  'sklo': ['sklenice', 'sklenenice', 'lahev', 'skleneny odpad'],

  // Metal
  'plechovka': ['konzerva', 'plechovky', 'konzervy', 'plech', 'plechovek'],
  'konzerva': ['plechovka', 'konzervy', 'plechovky', 'konzervou'],
  'kov': ['kovy', 'kovovy odpad', 'kovove obaly', 'plech'],

  // Electronics
  'baterie': ['baterk', 'clankek', 'akumulator', 'baterii', 'baterii'],
  'mobil': ['telefon', 'smartphone', 'mobily', 'telefony', 'mobilni telefon'],
  'telefon': ['mobil', 'smartphone', 'mobily', 'telefony', 'mobilni telefon'],
  'pocitac': ['notebook', 'laptop', 'pc', 'computer', 'pocitace'],
  'notebook': ['pocitac', 'laptop', 'pc', 'notebooky'],
  'lednicka': ['chladnicka', 'mrazak', 'mraznicka', 'lednicky'],
  'televize': ['televizor', 'tv', 'monitor', 'televizi', 'televizory'],
  'elektro': ['elektroodpad', 'elektrozarizeni', 'elektrospotrebice'],

  // Textiles
  'obleceni': ['saty', 'textil', 'hadry', 'satstvo', 'odevy', 'oblečení'],
  'textil': ['obleceni', 'hadry', 'satstvo', 'odevy', 'textilie'],
  'hadry': ['obleceni', 'textil', 'utěrky', 'hadru'],

  // Cups and containers
  'kelimek': ['kelímek', 'pohar', 'poharek', 'kelimky', 'kelímky'],
  'pohar': ['kelimek', 'poharek', 'pohary', 'poharu'],

  // Plastic types
  'plast': ['plastovy odpad', 'plasty', 'plastove obaly', 'plastika'],
  'igelit': ['igelitovy sacek', 'igelitova taska', 'mikroten', 'sacek'],
  'folie': ['plastova folie', 'igelit', 'obalova folie'],

  // Bio waste
  'bio': ['bioodpad', 'biologicky odpad', 'organicky odpad', 'kompost'],
  'bioodpad': ['bio', 'organicky odpad', 'biologicky odpad', 'kompost'],

  // Common items
  'sacek': ['sacky', 'taška', 'igelit', 'igelitovy sacek'],
  'taska': ['tasky', 'sacek', 'igelitova taska'],
};

/**
 * Normalizes a string for comparison (lowercase, trimmed, remove accents/diacritics for better matching).
 */
const normalize = (str: string) =>
  str.toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Odstranění diakritiky pro robustnější hledání

/**
 * Expands the query with synonyms and stemmed variations for better matching.
 * Returns an array of query variations with relevance scores.
 */
function expandWithSynonymsAndStems(query: string): Array<{ query: string; score: number }> {
  const normalized = normalize(query);
  const variations = new Map<string, number>();

  // Original query has highest priority
  variations.set(normalized, 0);

  // Add stemmed version of query
  const words = normalized.split(/\s+/);
  const stemmedWords = words.map(w => czechStem(w));
  const stemmedQuery = stemmedWords.join(' ');
  if (stemmedQuery !== normalized) {
    variations.set(stemmedQuery, 0.1); // Slight penalty for stemmed
  }

  // Check each word in the query for synonyms
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const stemmedWord = stemmedWords[i];

    // Direct synonyms
    const synonymList = SYNONYMS[word] || [];
    for (const synonym of synonymList) {
      const newQuery = [...words];
      newQuery[i] = synonym;
      variations.set(newQuery.join(' '), 0.2);

      // Also try stemmed version of synonym
      const stemmedSynonym = czechStem(synonym);
      newQuery[i] = stemmedSynonym;
      variations.set(newQuery.join(' '), 0.3);
    }

    // Check if stemmed word matches any synonym
    for (const [canonical, synonyms] of Object.entries(SYNONYMS)) {
      const stemmedCanonical = czechStem(canonical);
      if (stemmedWord === stemmedCanonical || synonyms.some(s => czechStem(s) === stemmedWord)) {
        const newQuery = [...words];
        newQuery[i] = canonical;
        variations.set(newQuery.join(' '), 0.25);
      }
    }

    // Check for multi-word phrases
    if (i < words.length - 1) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      const synonymList = SYNONYMS[phrase] || [];
      for (const synonym of synonymList) {
        const newQuery = [...words];
        newQuery.splice(i, 2, synonym);
        variations.set(newQuery.join(' '), 0.15);
      }
    }
  }

  const result = Array.from(variations.entries()).map(([q, score]) => ({ query: q, score }));

  // Debug logging
  if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
    console.log(`🔍 Query variations for "${query}":`, result.map(v => v.query));
  }

  return result;
}

/**
 * Get popularity score for an item based on analytics
 */
function getPopularityScore(itemName: string): number {
  try {
    const analytics = getAnalytics();
    const popular = analytics.getPopularQueries(50);

    const normalized = normalize(itemName);
    const match = popular.find(p => normalize(p.query) === normalized);

    if (match) {
      // Higher count = lower score (better ranking)
      // Map count to score: 0.0 to -0.5 (negative = boost in ranking)
      return -Math.min(match.count / 10, 0.5);
    }
  } catch (e) {
    // Analytics not available or error
  }
  return 0;
}

/**
 * Searches for a match in the local database using multiple strategies:
 * 1. Exact match (highest priority)
 * 2. Starts with (high priority)
 * 3. Phonetic match (good for typos)
 * 4. N-gram similarity (partial matching)
 * 5. Contains (medium priority)
 * 6. Stemmed match (medium-low priority)
 * 7. Fuzzy match (Levenshtein distance, lowest priority)
 * 
 * Now includes popularity boosting based on analytics
 */
export function findLocalMatch<T extends { name: string }>(
  query: string,
  database: T[],
  fuzzyThreshold: number = 3
): T | null {
  const queryVariations = expandWithSynonymsAndStems(query);

  let bestMatch: T | null = null;
  let bestScore = Infinity;

  for (const { query: q, score: baseScore } of queryVariations) {
    if (!q || q.length < 2) continue; // Ignorujeme příliš krátké dotazy

    // Get stemmed version of query for comparison
    const qWords = q.split(/\s+/);
    const qStemmed = qWords.map(w => czechStem(w)).join(' ');

    for (const item of database) {
      const itemName = normalize(item.name);
      const itemWords = itemName.split(/\s+/);
      const itemStemmed = itemWords.map(w => czechStem(w)).join(' ');

      let currentScore = Infinity;

      // Get popularity boost
      const popularityBoost = getPopularityScore(item.name);

      // Debug logging
      if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
        console.log(`🔍 Testing: "${q}" vs "${itemName}"`);
      }

      // 1. Přesná shoda (nejlepší)
      if (itemName === q) {
        currentScore = 0 + baseScore + popularityBoost;
        if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
          console.log(`  ✅ Rule 1: Exact match - score: ${currentScore}`);
        }
      }
      // 2. Přesná shoda po stemmingu
      else if (itemStemmed === qStemmed) {
        currentScore = 0.05 + baseScore + popularityBoost;
        if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
          console.log(`  ✅ Rule 2: Stemmed exact match - score: ${currentScore}`);
        }
      }
      // 3. Začíná na... (velmi silný signál)
      else if (itemName.startsWith(q)) {
        if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
          console.log(`  🔍 Rule 3: Prefix match candidate`);
        }
        // Pro víceslovné dotazy vyžadujeme přísnější match
        const queryWords = q.trim().split(/\s+/);
        const itemWords = itemName.trim().split(/\s+/);

        // Pokud má dotaz více než 1 slovo, musí být shoda alespoň 90% nebo úplné poslední slovo
        if (queryWords.length > 1) {
          const lastQueryWord = queryWords[queryWords.length - 1];
          const matchRatio = q.length / itemName.length;

          // Kontrola: buď má poslední slovo položky stejný základ jako dotaz,
          // nebo shoda je alespoň 90% délky dotazu
          const lastItemWord = itemWords.length > queryWords.length - 1 ? itemWords[queryWords.length - 1] : '';
          const lastWordMatches = lastItemWord.startsWith(lastQueryWord) || lastQueryWord.startsWith(lastItemWord);

          if (matchRatio >= 0.9 || lastWordMatches) {
            currentScore = 0.1 + (itemName.length - q.length) / 100 + baseScore + popularityBoost;
            if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
              console.log(`  ✅ Rule 3: ACCEPTED - ratio=${(matchRatio * 100).toFixed(1)}%, lastWordMatches=${lastWordMatches}`);
            }
          } else {
            if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
              console.log(`  ❌ Rule 3: REJECTED - ratio=${(matchRatio * 100).toFixed(1)}%, lastWordMatches=${lastWordMatches}`);
            }
          }
        } else {
          // Pro jednoslovné dotazy ponechat původní chování
          currentScore = 0.1 + (itemName.length - q.length) / 100 + baseScore + popularityBoost;
          if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
            console.log(`  ✅ Rule 3: Single-word prefix - score=${currentScore}`);
          }
        }
      }
      // 4. Phonetic match (dobrý pro překlepy)
      // DISABLED for multi-word queries and short words to prevent false positives
      else if (q.trim().split(/\s+/).length === 1 && q.length >= 6 && soundsLike(q, itemName)) {
        currentScore = 0.2 + baseScore + popularityBoost;
        if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
          console.log(`  ✅ Rule 4: Phonetic match - score=${currentScore}`);
        }
      }
      // 5. N-gram similarity (částečná shoda)
      else {
        const ngramScore = ngramSimilarity(q, itemName);

        // Adaptive threshold based on query complexity
        // Pro víceslovné dotazy vyžadujeme vyšší podobnost
        const queryWordCount = q.trim().split(/\s+/).length;
        let ngramThreshold = 0.4; // Default pro jednoslovné dotazy

        if (queryWordCount >= 3) {
          ngramThreshold = 0.8; // Velmi přísné pro 3+ slova
        } else if (queryWordCount === 2) {
          ngramThreshold = 0.7; // Přísné pro 2 slova
        }

        if (ngramScore > ngramThreshold) {
          currentScore = 0.3 + (1 - ngramScore) / 2 + baseScore + popularityBoost;
          if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
            console.log(`  ✅ Rule 5: N-gram match - score=${ngramScore.toFixed(3)}, threshold=${ngramThreshold}`);
          }
        } else if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY && ngramScore > 0.3) {
          console.log(`  ❌ Rule 5: N-gram REJECTED - score=${ngramScore.toFixed(3)} < threshold=${ngramThreshold}`);
        }
        // 6. Začíná na... (po stemmingu)
        else if (itemStemmed.startsWith(qStemmed)) {
          // Podobná kontrola jako u normálního prefix matche
          const queryWords = qStemmed.trim().split(/\s+/);
          const itemWords = itemStemmed.trim().split(/\s+/);

          if (queryWords.length > 1) {
            const lastQueryWord = queryWords[queryWords.length - 1];
            const matchRatio = qStemmed.length / itemStemmed.length;
            const lastItemWord = itemWords.length > queryWords.length - 1 ? itemWords[queryWords.length - 1] : '';
            const lastWordMatches = lastItemWord.startsWith(lastQueryWord) || lastQueryWord.startsWith(lastItemWord);

            if (matchRatio >= 0.9 || lastWordMatches) {
              currentScore = 0.4 + (itemStemmed.length - qStemmed.length) / 100 + baseScore + popularityBoost;
            }
          } else {
            currentScore = 0.4 + (itemStemmed.length - qStemmed.length) / 100 + baseScore + popularityBoost;
          }
        }
        // 7. Obsahuje podřetězec
        else if (itemName.includes(q)) {
          currentScore = 0.5 + (itemName.length - q.length) / 100 + baseScore + popularityBoost;
        }
        // 8. Obsahuje podřetězec (po stemmingu)
        else if (itemStemmed.includes(qStemmed)) {
          currentScore = 0.6 + (itemStemmed.length - qStemmed.length) / 100 + baseScore + popularityBoost;
        }
        // 9. Dotaz obsahuje název položky
        else if (q.includes(itemName)) {
          currentScore = 0.7 + (q.length - itemName.length) / 100 + baseScore + popularityBoost;
        }
        // 10. Dotaz obsahuje název položky (po stemmingu)
        else if (qStemmed.includes(itemStemmed)) {
          currentScore = 0.8 + (qStemmed.length - itemStemmed.length) / 100 + baseScore + popularityBoost;
        }
        // 11. Fuzzy shoda (Levenshtein)
        else {
          const distance = getLevenshteinDistance(q, itemName);

          // Adaptive threshold based on word length
          // Shorter words require more precise matches
          const adaptiveThreshold = Math.min(
            fuzzyThreshold,
            Math.floor(Math.min(q.length, itemName.length) / 3)
          );

          // Also require minimum similarity ratio
          const maxLength = Math.max(q.length, itemName.length);
          const similarityRatio = 1 - (distance / maxLength);

          if (distance <= adaptiveThreshold && similarityRatio >= 0.5) {
            currentScore = 1.0 + distance / 10 + baseScore + popularityBoost;
          } else {
            // Try fuzzy match on stemmed versions
            const stemmedDistance = getLevenshteinDistance(qStemmed, itemStemmed);
            const stemmedMaxLength = Math.max(qStemmed.length, itemStemmed.length);
            const stemmedSimilarityRatio = 1 - (stemmedDistance / stemmedMaxLength);

            if (stemmedDistance <= adaptiveThreshold && stemmedSimilarityRatio >= 0.5) {
              currentScore = 1.1 + stemmedDistance / 10 + baseScore + popularityBoost;
            }
          }
        }
      }

      if (currentScore < bestScore) {
        bestScore = currentScore;
        bestMatch = item;
      }
    }
  }

  // Debug: Show best match
  if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY && bestMatch) {
    console.log(`✅✅✅ BEST MATCH FOUND: "${(bestMatch as any).name}" with score: ${bestScore.toFixed(3)}`);
  } else if (typeof window !== 'undefined' && (window as any).DEBUG_FUZZY) {
    console.log(`❌❌❌ NO MATCH FOUND (best score was ${bestScore.toFixed(3)}, threshold is 3)`);
  }

  // Pokud je nejlepší skóre příliš vysoké, považujeme to za "nenalezeno"
  return bestScore < 3 ? bestMatch : null;
}
