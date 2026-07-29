import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CalendarModal from '../components/schedule/CalendarModal';
import ScheduleEditorModal from '../components/schedule/ScheduleEditorModal';
import {
  createRowId,
  getRowErrors,
  getWarnings,
  parseDateText,
  parsePastedTable,
  type EditorRow,
} from '../utils/scheduleImport';
import { buildScheduleFile, scheduleFileToJson } from '../utils/scheduleExport';
import type { ScheduleEntry } from '../../wasteSchedule';

const row = (date: string, types: EditorRow['types']): EditorRow => ({
  id: createRowId(),
  date,
  rawDate: date,
  types,
  unknownTypes: [],
});

describe('schedule import parser', () => {
  it('parses Excel TSV with a header and Czech dates', () => {
    const { rows } = parsePastedTable('Datum\tDruh odpadu\n06.01.2027\tSměsný\n13.01.2027\tPlast');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: '2027-01-06', types: ['smesny'] });
    expect(rows[1]).toMatchObject({ date: '2027-01-13', types: ['plast'] });
  });

  it('parses ISO dates, spaced Czech dates and slash dates as day/month', () => {
    expect(parseDateText('2027-01-06')).toBe('2027-01-06');
    expect(parseDateText('6. 1. 2027')).toBe('2027-01-06');
    expect(parseDateText('6/1/2027')).toBe('2027-01-06');
    // 1/6/2027 must be 1 June (day/month), never the US 6 January
    expect(parseDateText('1/6/2027')).toBe('2027-06-01');
  });

  it('parses tables without a header', () => {
    const { rows } = parsePastedTable('06.01.2027;Papír');
    expect(rows).toHaveLength(1);
    expect(rows[0].types).toEqual(['papir']);
  });

  it('maps type names with and without diacritics', () => {
    const { rows } = parsePastedTable('06.01.2027\tPapír\n13.01.2027\tpapir\n20.01.2027\tSMĚSNÝ ODPAD');
    expect(rows.map((r) => r.types[0])).toEqual(['papir', 'papir', 'smesny']);
  });

  it('supports multiple types in one day via + and comma', () => {
    const { rows } = parsePastedTable('06.01.2027\tPlast + papír\n13.01.2027\tSklo, bio');
    expect(rows[0].types).toEqual(['plast', 'papir']);
    expect(rows[1].types).toEqual(['sklo', 'bio']);
  });

  it('merges multiple lines with the same date', () => {
    const { rows } = parsePastedTable('06.01.2027\tPlast\n06.01.2027\tPapír');
    expect(rows).toHaveLength(1);
    expect(rows[0].types).toEqual(['plast', 'papir']);
  });

  it('keeps unknown types visible instead of dropping the row', () => {
    const { rows } = parsePastedTable('06.01.2027\tžlutá nádoba');
    expect(rows).toHaveLength(1);
    expect(rows[0].unknownTypes).toEqual(['žlutá nádoba']);
    const errors = getRowErrors(rows, 2027);
    expect(errors[0].message).toContain('neznámý druh odpadu „žlutá nádoba“');
  });

  it('flags impossible dates', () => {
    const { rows } = parsePastedTable('30.02.2027\tPlast');
    expect(rows[0].date).toBe('');
    const errors = getRowErrors(rows, 2027);
    expect(errors[0].message).toContain('30.02.2027 neexistuje');
  });

  it('flags dates from a different year', () => {
    const errors = getRowErrors([row('2026-05-05', ['plast'])], 2027);
    expect(errors[0].message).toContain('nepatří do roku 2027');
  });

  it('returns no rows for empty input', () => {
    expect(parsePastedTable('').rows).toHaveLength(0);
    expect(parsePastedTable('\n  \n').rows).toHaveLength(0);
  });

  it('warns about empty months and short years without blocking', () => {
    const warnings = getWarnings([row('2027-06-02', ['plast'])], 2027, 52);
    expect(warnings.some((w) => w.includes('měsíce'))).toBe(true);
    expect(warnings.some((w) => w.includes('výrazně méně'))).toBe(true);
    expect(warnings.some((w) => w.includes('lednu'))).toBe(true);
    expect(warnings.some((w) => w.includes('prosinci'))).toBe(true);
  });
});

describe('schedule export', () => {
  const existing: ScheduleEntry[] = [
    { date: '2025-12-31', types: ['sklo'] },
    { date: '2026-01-07', types: ['smesny'] },
    { date: '2026-12-30', types: ['plast'] },
  ];

  it('keeps other years and appends the new year sorted', () => {
    const file = buildScheduleFile(existing, 2027, [
      row('2027-01-13', ['plast']),
      row('2027-01-06', ['smesny']),
    ]);
    expect(file.schedule.map((e) => e.date)).toEqual([
      '2025-12-31',
      '2026-01-07',
      '2026-12-30',
      '2027-01-06',
      '2027-01-13',
    ]);
  });

  it('replaces only the chosen existing year', () => {
    const file = buildScheduleFile(existing, 2026, [row('2026-02-04', ['bio'])]);
    expect(file.schedule).toEqual([
      { date: '2025-12-31', types: ['sklo'] },
      { date: '2026-02-04', types: ['bio'] },
    ]);
  });

  it('deduplicates types and uses the exact root shape', () => {
    const file = buildScheduleFile([], 2027, [row('2027-01-06', ['plast', 'plast', 'papir'])]);
    expect(file).toEqual({ schedule: [{ date: '2027-01-06', types: ['plast', 'papir'] }] });
    expect(JSON.parse(scheduleFileToJson(file))).toEqual({
      schedule: [{ date: '2027-01-06', types: ['plast', 'papir'] }],
    });
  });

  it('serializes an empty schedule with the exact root object', () => {
    expect(JSON.parse(scheduleFileToJson(buildScheduleFile([], 2027, [])))).toEqual({ schedule: [] });
  });
});

describe('schedule editor UI', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const openEditorFromCalendar = () => {
    render(<CalendarModal isOpen onClose={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Připravit kalendář pro další rok' });
    trigger.focus();
    fireEvent.click(trigger);
    return trigger;
  };

  it('opens from the calendar with 2027 preselected', () => {
    openEditorFromCalendar();
    expect(screen.getByRole('dialog', { name: /správa svozového kalendáře/i })).toBeTruthy();
    expect((screen.getByLabelText('Rok kalendáře') as HTMLInputElement).value).toBe('2027');
    expect(screen.getByText(/aktuálně zveřejněný kalendář obsahuje rok 2026/i)).toBeTruthy();
  });

  it('closes on Escape and returns focus to the calendar trigger', async () => {
    const trigger = openEditorFromCalendar();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /správa svozového kalendáře/i })).toBeNull();
    // Calendar itself must stay open
    expect(screen.getByRole('dialog', { name: /kalendář svozů/i })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('walks the whole flow: paste, fix, add, preview, download', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<ScheduleEditorModal isOpen onClose={vi.fn()} />);

    // Step 1 → 2
    fireEvent.click(screen.getByRole('button', { name: 'Pokračovat na vložení dat' }));

    // Paste a table containing one invalid date
    fireEvent.change(screen.getByLabelText('Tabulka svozů z Excelu'), {
      target: { value: 'Datum\tDruh odpadu\n06.01.2027\tSměsný\n30.02.2027\tPlast' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zpracovat tabulku' }));
    expect(screen.getAllByLabelText(/datum svozu/i)).toHaveLength(2);

    // Validation blocks with a readable Czech error
    fireEvent.click(screen.getByRole('button', { name: 'Pokračovat na kontrolu' }));
    expect(screen.getAllByText(/30\.02\.2027 neexistuje/i).length).toBeGreaterThan(0);

    // Fix the broken row
    fireEvent.change(screen.getByLabelText('Datum svozu, řádek 2'), { target: { value: '2027-02-03' } });

    // Add one collection manually
    fireEvent.click(screen.getByRole('button', { name: 'Přidat svoz' }));
    const rowItems = screen.getAllByLabelText(/datum svozu/i);
    fireEvent.change(rowItems[rowItems.length - 1], { target: { value: '2027-12-29' } });
    const lastRow = rowItems[rowItems.length - 1].closest('li')!;
    fireEvent.click(within(lastRow).getByLabelText('Papír'));

    // Preview
    fireEvent.click(screen.getByRole('button', { name: 'Pokračovat na kontrolu' }));
    expect(screen.getByText(/počet svozových dnů:/i).parentElement!.textContent).toContain('3');
    expect(screen.getAllByText('6. ledna 2027').length).toBeGreaterThan(0);
    expect(screen.getAllByText('29. prosince 2027').length).toBeGreaterThan(0);

    // Warnings require explicit confirmation before continuing
    const continueButton = screen.getByRole('button', { name: 'Pokračovat ke stažení' }) as HTMLButtonElement;
    expect(continueButton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/upozornění jsem zkontroloval/i));
    fireEvent.click(continueButton);

    // Download
    fireEvent.click(screen.getByRole('button', { name: 'Stáhnout soubor pro zveřejnění' }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    return blob.text().then((text) => {
      const parsed = JSON.parse(text) as { schedule: ScheduleEntry[] };
      const years = new Set(parsed.schedule.map((e) => e.date.slice(0, 4)));
      expect(years.has('2026')).toBe(true);
      expect(years.has('2027')).toBe(true);
      expect(parsed.schedule.filter((e) => e.date.startsWith('2027-'))).toHaveLength(3);
      expect(screen.getByText('Soubor byl připraven, ale zatím není veřejný.')).toBeTruthy();
      expect(screen.getByText('Stažením souboru se veřejná aplikace automaticky nezmění.')).toBeTruthy();
    });
  });

  it('never renders a token or API key input', () => {
    render(<ScheduleEditorModal isOpen onClose={vi.fn()} />);
    expect(screen.queryByLabelText(/token|api/i)).toBeNull();
    expect(screen.queryByText(/token|api klíč/i)).toBeNull();
  });
});
