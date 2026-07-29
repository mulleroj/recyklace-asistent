import { SCHEDULE_TYPE_CODES, type ScheduleEntry, type ScheduleTypeCode } from '../../wasteSchedule';
import type { EditorRow } from './scheduleImport';

export interface ScheduleFile {
  schedule: ScheduleEntry[];
}

/**
 * Builds the complete wasteSchedule.json content: keeps every existing
 * entry outside the edited year, replaces the edited year with the new
 * rows, sorts chronologically and deduplicates types.
 */
export function buildScheduleFile(
  existing: ScheduleEntry[],
  year: number,
  rows: EditorRow[]
): ScheduleFile {
  const yearPrefix = `${year}-`;
  const kept = existing.filter((entry) => !entry.date.startsWith(yearPrefix));

  const typeOrder = (type: string) => SCHEDULE_TYPE_CODES.indexOf(type as ScheduleTypeCode);
  const added: ScheduleEntry[] = rows
    .filter((row) => row.date.startsWith(yearPrefix) && row.types.length > 0)
    .map((row) => ({
      date: row.date,
      types: [...new Set(row.types)].sort((a, b) => typeOrder(a) - typeOrder(b)),
    }));

  const schedule = [...kept, ...added].sort((a, b) => a.date.localeCompare(b.date));
  return { schedule };
}

export function scheduleFileToJson(file: ScheduleFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Triggers a browser download of wasteSchedule.json (UTF-8, no server involved). */
export function downloadScheduleFile(file: ScheduleFile): void {
  const blob = new Blob([scheduleFileToJson(file)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wasteSchedule.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
