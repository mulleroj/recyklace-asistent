import { describe, expect, it } from 'vitest';
import { WasteCategory } from '../../types';
import { dedupeUserItems, normalizeQuery, parseHistory, parseUserDatabase } from '../utils/storage';

describe('storage validation', () => {
  it('normalizes empty and spaced queries', () => {
    expect(normalizeQuery('  PET    lahev  ')).toBe('PET lahev');
  });

  it('drops corrupted history', () => {
    expect(parseHistory('not-json')).toEqual([]);
    expect(parseHistory(JSON.stringify([{ query: 'x', timestamp: 1, result: { name: 'x', category: WasteCategory.PLAST } }]))).toHaveLength(1);
  });

  it('validates and deduplicates user database items', () => {
    const parsed = parseUserDatabase(JSON.stringify([
      { name: ' PET lahev ', category: WasteCategory.PLAST, note: ' ok ' },
      { name: 'pet   lahev', category: WasteCategory.PAPIR, note: 'dup' },
      { name: '', category: WasteCategory.PLAST },
    ]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('PET lahev');
  });

  it('deduplicates without diacritics and case', () => {
    const now = Date.now();
    expect(dedupeUserItems([
      { id: '1', name: 'Sklenice', category: WasteCategory.SKLO, note: '', createdAt: now },
      { id: '2', name: 'skleníce', category: WasteCategory.SKLO, note: '', createdAt: now },
    ])).toHaveLength(1);
  });
});
