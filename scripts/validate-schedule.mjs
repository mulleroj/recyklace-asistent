import fs from 'node:fs';

const raw = fs.readFileSync(new URL('../wasteSchedule.json', import.meta.url), 'utf8');
const data = JSON.parse(raw);
const schedule = data.schedule;
const errors = [];
const seen = new Set();
let previous = '';

if (!Array.isArray(schedule)) {
  errors.push('schedule must be an array');
} else {
  for (const entry of schedule) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')) errors.push(`Invalid date: ${entry.date}`);
    if (seen.has(entry.date)) errors.push(`Duplicate date: ${entry.date}`);
    seen.add(entry.date);
    if (previous && entry.date < previous) errors.push(`Not sorted at: ${entry.date}`);
    previous = entry.date;
    if (!Array.isArray(entry.types) || entry.types.length === 0) errors.push(`Missing types: ${entry.date}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Schedule OK: ${schedule.length} entries`);
