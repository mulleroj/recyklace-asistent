import { describe, expect, it } from 'vitest';
import { WasteCategory } from '../../types';
import { clearLegacyAiKeys, dedupeUserItems, normalizeQuery, parseHistory, parseUserDatabase, validateUserWasteInput } from '../utils/storage';

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
    expect(parsed[0].source).toBe('manual');
  });

  it('deduplicates without diacritics and case', () => {
    const now = Date.now();
    expect(dedupeUserItems([
      { id: '1', name: 'Sklenice', category: WasteCategory.SKLO, note: '', createdAt: now },
      { id: '2', name: 'skleníce', category: WasteCategory.SKLO, note: '', createdAt: now },
    ])).toHaveLength(1);
  });

  it('strips HTML from user input', () => {
    const result = validateUserWasteInput({
      name: '<b>Krabice</b>',
      category: WasteCategory.PAPIR,
      note: '<script>alert(1)</script>suchy papir',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.name).toBe('Krabice');
      expect(result.item.note).toBe('alert(1)suchy papir');
    }
  });

  it('removes legacy AI localStorage keys without preserving cache data', () => {
    localStorage.setItem('recyklacni_asistent_api_key', 'secret');
    localStorage.setItem('recyklacni_asistent_api_key_gemini', 'secret');
    localStorage.setItem('recyklacni_asistent_api_key_openai', 'secret');
    localStorage.setItem('recyklacni_asistent_ai_provider', 'gemini');
    localStorage.setItem('recyklacni_asistent_ai_cache', 'cached');
    clearLegacyAiKeys();
    expect(localStorage.getItem('recyklacni_asistent_api_key')).toBeNull();
    expect(localStorage.getItem('recyklacni_asistent_api_key_gemini')).toBeNull();
    expect(localStorage.getItem('recyklacni_asistent_api_key_openai')).toBeNull();
    expect(localStorage.getItem('recyklacni_asistent_ai_provider')).toBeNull();
    expect(localStorage.getItem('recyklacni_asistent_ai_cache')).toBeNull();
  });
});
