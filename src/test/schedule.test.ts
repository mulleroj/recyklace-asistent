import { describe, expect, it } from 'vitest';
import { getDaysUntil, getNextCollection, toLocalDateKey, validateSchedule } from '../../wasteSchedule';

describe('waste schedule', () => {
  it('validates canonical schedule data', () => {
    expect(validateSchedule()).toEqual([]);
  });

  it('uses local calendar date instead of UTC date', () => {
    expect(toLocalDateKey(new Date(2026, 2, 29, 0, 30))).toBe('2026-03-29');
  });

  it('calculates days across DST using local midnights', () => {
    expect(getDaysUntil('2026-03-30', new Date(2026, 2, 29, 23, 30))).toBe(1);
  });

  it('finds the next collection', () => {
    expect(getNextCollection(new Date(2026, 6, 28))?.date).toBe('2026-07-29');
  });
});
