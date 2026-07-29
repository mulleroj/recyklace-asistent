import { describe, expect, it } from 'vitest';
import { getDaysUntil, getNextCollection, hasScheduleEntriesForYear, toLocalDateKey, validateSchedule, WASTE_SCHEDULE } from '../../wasteSchedule';

describe('waste schedule', () => {
  it('validates canonical schedule data', () => {
    expect(validateSchedule()).toEqual([]);
  });

  it('preserves the 2026 collection type baseline', () => {
    expect(WASTE_SCHEDULE.map(entry => [entry.date, entry.types.join(',')])).toEqual([
      ['2026-01-07', 'smesny'],
      ['2026-01-14', 'plast'],
      ['2026-01-21', 'smesny'],
      ['2026-01-28', 'papir'],
      ['2026-02-04', 'smesny'],
      ['2026-02-11', 'plast'],
      ['2026-02-18', 'smesny'],
      ['2026-02-25', 'papir'],
      ['2026-03-04', 'smesny'],
      ['2026-03-11', 'plast'],
      ['2026-03-18', 'smesny'],
      ['2026-03-25', 'papir'],
      ['2026-04-01', 'smesny'],
      ['2026-04-08', 'plast'],
      ['2026-04-15', 'smesny'],
      ['2026-04-22', 'papir'],
      ['2026-04-29', 'smesny'],
      ['2026-05-06', 'plast'],
      ['2026-05-13', 'smesny'],
      ['2026-05-20', 'papir'],
      ['2026-05-27', 'smesny'],
      ['2026-06-03', 'plast'],
      ['2026-06-10', 'smesny'],
      ['2026-06-17', 'papir'],
      ['2026-06-24', 'smesny'],
      ['2026-07-01', 'plast'],
      ['2026-07-08', 'smesny'],
      ['2026-07-15', 'papir'],
      ['2026-07-22', 'smesny'],
      ['2026-07-29', 'plast'],
      ['2026-08-05', 'smesny'],
      ['2026-08-12', 'papir'],
      ['2026-08-19', 'smesny'],
      ['2026-08-26', 'plast'],
      ['2026-09-02', 'smesny'],
      ['2026-09-09', 'papir'],
      ['2026-09-16', 'smesny'],
      ['2026-09-23', 'plast'],
      ['2026-09-30', 'smesny'],
      ['2026-10-07', 'papir'],
      ['2026-10-14', 'smesny'],
      ['2026-10-21', 'plast'],
      ['2026-10-28', 'smesny'],
      ['2026-11-04', 'papir'],
      ['2026-11-11', 'smesny'],
      ['2026-11-18', 'plast'],
      ['2026-11-25', 'smesny'],
      ['2026-12-02', 'papir'],
      ['2026-12-09', 'smesny'],
      ['2026-12-16', 'plast'],
      ['2026-12-23', 'smesny'],
      ['2026-12-30', 'papir'],
    ]);
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
