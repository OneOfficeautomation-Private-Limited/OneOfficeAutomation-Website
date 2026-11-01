/** Event times: a date, a time typed by the team (“10:00”, “3:30 pm”) and a time zone. Shared by the site and the server. */
export const TZ_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'India (IST)' }, { value: 'Asia/Qatar', label: 'Qatar (AST)' }, { value: 'Asia/Dubai', label: 'UAE (GST)' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia (AST)' }, { value: 'Asia/Singapore', label: 'Singapore (SGT)' }, { value: 'Europe/London', label: 'UK (London)' },
  { value: 'Europe/Berlin', label: 'Central Europe (Berlin)' }, { value: 'America/New_York', label: 'US Eastern (New York)' }, { value: 'UTC', label: 'UTC' },
];
export const tzLabel = (tz: string) => TZ_OPTIONS.find((o) => o.value === tz)?.label ?? tz;

/** Minutes between the time zone's clock and UTC at a moment. */
function offsetMinutes(ms: number, tz: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms) / 60000;
}

/** The moment an event starts, or null if the date (or time zone) can't be read. */
export function eventStart(date: string, time: string, tz: string): Date | null {
  const d = (date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!d) return null;
  const t = (time || '').match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i);
  let hh = t ? +t[1] : 0; const mm = t && t[2] ? +t[2] : 0;
  if (t?.[3]) { const pm = t[3].toLowerCase() === 'pm'; if (pm && hh < 12) hh += 12; if (!pm && hh === 12) hh = 0; }
  try {
    const guess = Date.UTC(+d[1], +d[2] - 1, +d[3], hh, mm);
    const first = guess - offsetMinutes(guess, tz || 'UTC') * 60000;
    return new Date(guess - offsetMinutes(first, tz || 'UTC') * 60000);
  } catch { return null; }
}

/** ISO 8601 with the event's own offset, e.g. 2099-01-15T10:00:00+05:30 (for search engines). */
export function isoWithOffset(start: Date, tz: string): string {
  const off = offsetMinutes(start.getTime(), tz || 'UTC');
  const local = new Date(start.getTime() + off * 60000).toISOString().slice(0, 19);
  const sign = off < 0 ? '-' : '+'; const a = Math.abs(off);
  return `${local}${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
