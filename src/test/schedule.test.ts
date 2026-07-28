import { describe, expect, it } from 'vitest';
import { getDaysUntil, getNextCollection, hasScheduleEntriesForYear, toLocalDateKey, validateSchedule } from '../../wasteSchedule';

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

  it('rejects impossible dates', () => {
    expect(validateSchedule([{ date: '2027-02-30', types: ['smesny'] }])).toContain('Impossible date: 2027-02-30');
  });

  it('rejects duplicate dates', () => {
    expect(validateSchedule([
      { date: '2026-01-01', types: ['smesny'] },
      { date: '2026-01-01', types: ['plast'] },
    ])).toContain('Duplicate date: 2026-01-01');
  });

  it('rejects unknown and empty types', () => {
    expect(validateSchedule([{ date: '2026-01-01', types: [] }])).toContain('Missing waste type for 2026-01-01');
    expect(validateSchedule([{ date: '2026-01-01', types: ['kovy'] }])).toContain('Unknown waste type kovy for 2026-01-01');
  });

  it('rejects unsorted entries', () => {
    expect(validateSchedule([
      { date: '2026-01-02', types: ['smesny'] },
      { date: '2026-01-01', types: ['plast'] },
    ])).toContain('Schedule is not sorted at 2026-01-01');
  });

  it('reports year availability', () => {
    expect(hasScheduleEntriesForYear(2026)).toBe(true);
    expect(hasScheduleEntriesForYear(2027)).toBe(false);
  });
});
