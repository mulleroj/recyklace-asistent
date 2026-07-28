import scheduleData from './wasteSchedule.json';

export interface ScheduleEntry {
  date: string;
  types: string[];
}

export const WASTE_SCHEDULE: ScheduleEntry[] = scheduleData.schedule;

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateKeyToLocalMidnight(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function validateSchedule(entries: ScheduleEntry[] = WASTE_SCHEDULE): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  let previous = '';

  for (const entry of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      errors.push(`Invalid date format: ${entry.date}`);
      continue;
    }
    if (seen.has(entry.date)) errors.push(`Duplicate date: ${entry.date}`);
    seen.add(entry.date);
    if (previous && entry.date < previous) errors.push(`Schedule is not sorted at ${entry.date}`);
    previous = entry.date;
    if (!Array.isArray(entry.types) || entry.types.length === 0) {
      errors.push(`Missing waste type for ${entry.date}`);
    }
  }

  return errors;
}

export function getNextCollection(fromDate: Date = new Date()): ScheduleEntry | null {
  const dateStr = toLocalDateKey(fromDate);
  return WASTE_SCHEDULE.find(entry => entry.date >= dateStr) || null;
}

export function getUpcomingCollections(count: number = 3, fromDate: Date = new Date()): ScheduleEntry[] {
  const dateStr = toLocalDateKey(fromDate);
  return WASTE_SCHEDULE.filter(entry => entry.date >= dateStr).slice(0, count);
}

export function getDaysUntil(targetDate: string, fromDate: Date = new Date()): number {
  const target = dateKeyToLocalMidnight(targetDate);
  const from = dateKeyToLocalMidnight(toLocalDateKey(fromDate));
  return Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    plast: 'Plasty',
    papir: 'Papir',
    sklo: 'Sklo',
    bio: 'Bioodpad',
    smesny: 'Smesny odpad',
  };
  return labels[type] || type;
}

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    plast: 'bg-yellow-400',
    papir: 'bg-blue-600',
    sklo: 'bg-green-600',
    bio: 'bg-amber-700',
    smesny: 'bg-zinc-700',
  };
  return colors[type] || 'bg-slate-400';
}

export function formatDate(dateStr: string): string {
  return dateKeyToLocalMidnight(dateStr).toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
