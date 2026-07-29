import { ChatHistoryItem, WasteCategory, WasteItem } from '../../types';
import { normalizeForSearch } from '../../utils/fuzzySearch';

export const HISTORY_LIMIT = 50;
export const USER_DATABASE_LIMIT = 200;
export const LEGACY_AI_STORAGE_KEYS = [
  'recyklacni_asistent_api_key',
  'recyklacni_asistent_api_key_gemini',
  'recyklacni_asistent_api_key_openai',
  'recyklacni_asistent_ai_provider',
  'recyklacni_asistent_ai_cache',
];

export interface UserWasteItem {
  id: string;
  name: string;
  category: WasteCategory;
  note: string;
  source?: 'manual';
  createdAt: number;
}

export function normalizeQuery(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
}

export function clearLegacyAiKeys(storage: Storage = localStorage): void {
  for (const key of LEGACY_AI_STORAGE_KEYS) storage.removeItem(key);
}

function isWasteCategory(value: unknown): value is WasteCategory {
  return typeof value === 'string' && Object.values(WasteCategory).includes(value as WasteCategory);
}

function isWasteItem(value: unknown): value is WasteItem {
  const item = value as WasteItem;
  return !!item && typeof item === 'object' &&
    typeof item.name === 'string' &&
    isWasteCategory(item.category);
}

export function parseHistory(raw: string | null): ChatHistoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is ChatHistoryItem => {
        const candidate = entry as ChatHistoryItem;
        return !!candidate &&
          typeof candidate.query === 'string' &&
          Number.isFinite(candidate.timestamp) &&
          isWasteItem(candidate.result);
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function parseUserDatabase(raw: string | null): UserWasteItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return dedupeUserItems(parsed
      .filter((entry) => {
        const candidate = entry as Partial<UserWasteItem>;
        return typeof candidate.name === 'string' &&
          normalizeQuery(candidate.name).length > 0 &&
          isWasteCategory(candidate.category);
      })
      .map((entry) => {
        const candidate = entry as Partial<UserWasteItem>;
        const createdAt = Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now();
        return {
          id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `user-${createdAt}`,
          name: normalizeQuery(String(candidate.name)),
          category: candidate.category as WasteCategory,
          note: typeof candidate.note === 'string' ? normalizeQuery(candidate.note).slice(0, 400) : '',
          source: 'manual',
          createdAt,
        };
      }))
      .slice(0, USER_DATABASE_LIMIT);
  } catch {
    return [];
  }
}

export function dedupeUserItems(items: UserWasteItem[]): UserWasteItem[] {
  const seen = new Set<string>();
  const result: UserWasteItem[] = [];

  for (const item of items) {
    const key = normalizeForSearch(item.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function validateUserWasteInput(input: {
  name: string;
  category: WasteCategory;
  note?: string;
}): { ok: true; item: Omit<UserWasteItem, 'id' | 'createdAt'> } | { ok: false; error: string } {
  const name = normalizeQuery(input.name);
  const note = normalizeQuery(input.note || '').slice(0, 400);

  if (name.length < 2) return { ok: false, error: 'Zadejte nazev odpadu.' };
  if (name.length > 80) return { ok: false, error: 'Nazev je prilis dlouhy.' };
  if (!isWasteCategory(input.category)) return { ok: false, error: 'Vyberte platnou kategorii.' };

  return { ok: true, item: { name, category: input.category, note, source: 'manual' } };
}
