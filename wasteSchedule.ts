// Waste collection schedule data extracted from calendar
export interface ScheduleEntry {
  date: string; // YYYY-MM-DD format
  types: string[]; // 'plast', 'papir', 'sklo', 'bio', 'smesny'
}

export const WASTE_SCHEDULE: ScheduleEntry[] = [
  {
    "date": "2026-01-07",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-01-14",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-01-21",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-01-28",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-02-04",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-02-11",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-02-18",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-02-25",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-03-04",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-03-11",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-03-18",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-03-25",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-04-01",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-04-08",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-04-15",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-04-22",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-04-29",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-05-06",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-05-13",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-05-20",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-05-27",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-06-03",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-06-10",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-06-17",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-06-24",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-07-01",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-07-08",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-07-15",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-07-22",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-07-29",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-08-05",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-08-12",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-08-19",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-08-26",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-09-02",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-09-09",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-09-16",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-09-23",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-09-30",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-10-07",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-10-14",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-10-21",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-10-28",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-11-04",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-11-11",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-11-18",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-11-25",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-12-02",
    "types": [
      "papir"
    ]
  },
  {
    "date": "2026-12-09",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-12-16",
    "types": [
      "plast"
    ]
  },
  {
    "date": "2026-12-23",
    "types": [
      "smesny"
    ]
  },
  {
    "date": "2026-12-30",
    "types": [
      "papir"
    ]
  }
];

// Helper functions
export function getNextCollection(fromDate: Date = new Date()): ScheduleEntry | null {
  const dateStr = fromDate.toISOString().split('T')[0];
  return WASTE_SCHEDULE.find(entry => entry.date >= dateStr) || null;
}

export function getUpcomingCollections(count: number = 3, fromDate: Date = new Date()): ScheduleEntry[] {
  const dateStr = fromDate.toISOString().split('T')[0];
  return WASTE_SCHEDULE.filter(entry => entry.date >= dateStr).slice(0, count);
}

export function getDaysUntil(targetDate: string, fromDate: Date = new Date()): number {
  const target = new Date(targetDate);
  const from = new Date(fromDate.toISOString().split('T')[0]);
  const diffTime = target.getTime() - from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    plast: 'Plasty',
    papir: 'Papír',
    sklo: 'Sklo',
    bio: 'Bioodpad',
    smesny: 'Směsný odpad',
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
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
