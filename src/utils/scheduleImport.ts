import { SCHEDULE_TYPE_CODES, type ScheduleTypeCode } from '../../wasteSchedule';

export const SCHEDULE_TYPE_LABELS: Record<ScheduleTypeCode, string> = {
  smesny: 'Směsný odpad',
  plast: 'Plasty',
  papir: 'Papír',
  sklo: 'Sklo',
  bio: 'Bioodpad',
};

export interface EditorRow {
  id: number;
  /** ISO yyyy-mm-dd, or '' when the pasted date could not be parsed */
  date: string;
  /** Original pasted date text, kept for error messages */
  rawDate: string;
  types: ScheduleTypeCode[];
  /** Unrecognized waste type texts from the pasted table */
  unknownTypes: string[];
}

export interface RowIssue {
  rowIndex: number;
  message: string;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

let nextRowId = 1;
export function createRowId(): number {
  return nextRowId++;
}

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeTypeText(text: string): string {
  return stripDiacritics(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

const TYPE_ALIASES: Record<string, ScheduleTypeCode> = {
  'smesny odpad': 'smesny',
  'smesny': 'smesny',
  'plasty': 'plast',
  'plast': 'plast',
  'papir': 'papir',
  'sklo': 'sklo',
  'bioodpad': 'bio',
  'bio': 'bio',
};

export function mapTypeText(text: string): ScheduleTypeCode | null {
  return TYPE_ALIASES[normalizeTypeText(text)] ?? null;
}

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Parses a single date text. Supported: "6. 1. 2027", "06.01.2027",
 * "6/1/2027" (day/month/year, never the US order) and "2027-01-06".
 * Returns ISO yyyy-mm-dd or null.
 */
export function parseDateText(text: string): string | null {
  const trimmed = text.trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    if (isRealDate(y, m, d)) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return null;
  }

  const czech = /^(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})$/.exec(trimmed);
  if (czech) {
    const day = Number(czech[1]);
    const month = Number(czech[2]);
    const year = Number(czech[3]);
    if (isRealDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

function splitLine(line: string): [string, string] | null {
  if (line.includes('\t')) {
    const [first, ...rest] = line.split('\t');
    return [first, rest.join(' ')];
  }
  if (line.includes(';')) {
    const [first, ...rest] = line.split(';');
    return [first, rest.join(';')];
  }
  const comma = line.indexOf(',');
  if (comma !== -1) {
    return [line.slice(0, comma), line.slice(comma + 1)];
  }
  return null;
}

function splitTypes(text: string): string[] {
  return text
    .split(/[+,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export interface ParseResult {
  rows: EditorRow[];
  /** Lines that could not be split into a date and type column */
  skippedLines: string[];
}

/**
 * Parses a table pasted from Excel (TSV/CSV, with or without a header)
 * into editable rows. Rows sharing a date are merged into one entry.
 */
export function parsePastedTable(text: string): ParseResult {
  const rows: EditorRow[] = [];
  const skippedLines: string[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const parts = splitLine(line);
    if (!parts) {
      skippedLines.push(line.trim());
      return;
    }
    const [dateText, typesText] = parts;

    const isHeader =
      index === 0 &&
      parseDateText(dateText) === null &&
      normalizeTypeText(dateText).includes('datum');
    if (isHeader) return;

    const date = parseDateText(dateText);
    const types: ScheduleTypeCode[] = [];
    const unknownTypes: string[] = [];
    for (const typeText of splitTypes(typesText)) {
      const mapped = mapTypeText(typeText);
      if (mapped === null) {
        unknownTypes.push(typeText);
      } else if (!types.includes(mapped)) {
        types.push(mapped);
      }
    }

    rows.push({
      id: createRowId(),
      date: date ?? '',
      rawDate: dateText.trim(),
      types,
      unknownTypes,
    });
  });

  return { rows: mergeRowsByDate(rows), skippedLines };
}

/** Merges rows with the same valid date into one row with the union of types. */
export function mergeRowsByDate(rows: EditorRow[]): EditorRow[] {
  const merged: EditorRow[] = [];
  const byDate = new Map<string, EditorRow>();

  for (const row of rows) {
    if (row.date && byDate.has(row.date)) {
      const target = byDate.get(row.date)!;
      for (const type of row.types) {
        if (!target.types.includes(type)) target.types.push(type);
      }
      target.unknownTypes.push(...row.unknownTypes);
      continue;
    }
    const copy: EditorRow = { ...row, types: [...row.types], unknownTypes: [...row.unknownTypes] };
    if (copy.date) byDate.set(copy.date, copy);
    merged.push(copy);
  }

  return sortRows(merged);
}

export function sortRows(rows: EditorRow[]): EditorRow[] {
  return [...rows].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

export function formatCzechDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Per-row blocking errors, in Czech, referencing 1-based row positions. */
export function getRowErrors(rows: EditorRow[], year: number): RowIssue[] {
  const issues: RowIssue[] = [];
  rows.forEach((row, index) => {
    const rowIndex = index + 1;
    if (!row.date) {
      issues.push({
        rowIndex,
        message: row.rawDate
          ? `Řádek ${rowIndex}: datum ${row.rawDate} neexistuje.`
          : `Řádek ${rowIndex}: chybí datum.`,
      });
    } else if (!row.date.startsWith(`${year}-`)) {
      issues.push({
        rowIndex,
        message: `Řádek ${rowIndex}: datum ${formatCzechDate(row.date)} nepatří do roku ${year}.`,
      });
    }
    for (const unknown of row.unknownTypes) {
      issues.push({
        rowIndex,
        message: `Řádek ${rowIndex}: neznámý druh odpadu „${unknown}“.`,
      });
    }
    if (row.types.length === 0 && row.unknownTypes.length === 0) {
      issues.push({
        rowIndex,
        message: `Řádek ${rowIndex}: vyberte alespoň jeden druh odpadu.`,
      });
    }
  });
  return issues;
}

/** Non-blocking warnings for the whole draft, in Czech. */
export function getWarnings(rows: EditorRow[], year: number, referenceCount: number): string[] {
  const warnings: string[] = [];
  const dates = rows.map((row) => row.date).filter(Boolean).sort();
  if (dates.length === 0) return warnings;

  const monthsWithCollection = new Set(dates.map((date) => Number(date.slice(5, 7))));
  const emptyMonths: number[] = [];
  for (let month = 1; month <= 12; month++) {
    if (!monthsWithCollection.has(month)) emptyMonths.push(month);
  }
  if (emptyMonths.length > 0) {
    warnings.push(`Některé měsíce nemají žádný svoz (${emptyMonths.map((m) => `${m}.`).join(', ')}).`);
  }

  for (let i = 1; i < dates.length; i++) {
    const previous = new Date(dates[i - 1]);
    const current = new Date(dates[i]);
    const gapDays = Math.round((current.getTime() - previous.getTime()) / 86400000);
    if (gapDays > 21) {
      warnings.push(
        `Mezi svozy ${formatCzechDate(dates[i - 1])} a ${formatCzechDate(dates[i])} je nezvykle dlouhá mezera (${gapDays} dní).`
      );
    }
  }

  if (referenceCount > 0 && dates.length < referenceCount * 0.6) {
    warnings.push(
      `Rok ${year} má výrazně méně svozů (${dates.length}) než předchozí zveřejněný rok (${referenceCount}).`
    );
  }

  if (dates[0] > `${year}-01-31`) {
    warnings.push('Kalendář nezačíná v lednu – zkontrolujte, zda nechybí začátek roku.');
  }
  if (dates[dates.length - 1] < `${year}-12-01`) {
    warnings.push('Kalendář nekončí v prosinci – zkontrolujte, zda nechybí konec roku.');
  }

  return warnings;
}

export { SCHEDULE_TYPE_CODES };
export type { ScheduleTypeCode };
