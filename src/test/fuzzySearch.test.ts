import { describe, expect, it } from 'vitest';
import { findLocalMatch, findSuggestions } from '../../utils/fuzzySearch';

const db = [
  { name: 'PET lahev', category: 'plast' },
  { name: 'Papir', category: 'papir' },
  { name: 'Papírová krabice', category: 'papir' },
  { name: 'Plastovy kelimek', category: 'plast' },
  { name: 'Sklenice', category: 'sklo' },
];

describe('fuzzy search', () => {
  it('finds exact matches', () => {
    expect(findLocalMatch('PET lahev', db)?.name).toBe('PET lahev');
  });

  it('handles typos', () => {
    expect(findLocalMatch('sklenic', db)?.name).toBe('Sklenice');
  });

  it('ignores Czech diacritics', () => {
    expect(findLocalMatch('papirova krabice', db)?.name).toBe('Papírová krabice');
  });

  it('returns multiple similar deterministic suggestions', () => {
    expect(findSuggestions('papir', db, 3).map((item) => item.name)).toEqual(['Papir', 'Papírová krabice']);
  });

  it('uses stable secondary ordering for equal scores', () => {
    const result = findSuggestions('aa', [{ name: 'Aab' }, { name: 'Aaa' }], 2);
    expect(result.map((item) => item.name)).toEqual(['Aaa', 'Aab']);
  });
});
