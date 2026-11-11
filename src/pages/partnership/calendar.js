// Booking calendar helpers for Explore Partnership step 3.
// Slots are defined in the team's time zone (Central Time) and displayed in the visitor's time zone.
// Availability here is a deterministic placeholder until the GoHighLevel calendar is connected
// (Figma flow map: "GHL calendar, Savvy branding · Time zone auto-detected").

export const TEAM_TZ = 'America/Chicago';
const SLOT_TIMES = [
  [9, 0],
  [10, 30],
  [13, 0],
  [15, 30],
];
const MIN_LEAD_MS = 18 * 36e5; // no slots sooner than 18 h from now

const US_ZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
];

/** Time-zone choices: the visitor's detected zone first (if it isn't a US zone above), then US zones. */
export function tzOptions() {
  let local = 'America/Chicago';
  try {
    local = Intl.DateTimeFormat().resolvedOptions().timeZone || local;
  } catch {
    /* default */
  }
  if (US_ZONES.some((z) => z.value === local)) return US_ZONES;
  let label = local.replace(/_/g, ' ');
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: local, timeZoneName: 'long' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value;
    if (name) label = `${name} (your time)`;
  } catch {
    /* keep id */
  }
  return [{ value: local, label }, ...US_ZONES];
}

/** Offset (ms) of `timeZone` from UTC at instant `t`. */
function tzOffset(t, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(t))
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second) - Math.floor(t / 1000) * 1000;
}

/** Wall-clock time in `timeZone` → UTC epoch ms. */
export function zonedToUtc(y, m, d, h, mi, timeZone) {
  let t = Date.UTC(y, m, d, h, mi);
  for (let i = 0; i < 2; i++) t = Date.UTC(y, m, d, h, mi) - tzOffset(t, timeZone);
  return t;
}

const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Two weeks of weekdays (Mon–Fri), page `offsetWeeks` (each page = 2 weeks), starting the week of tomorrow.
 * @returns {{ month: string, days: { key, date, long, slots: { iso }[] }[] }}
 */
export function buildSlots({ offsetWeeks = 0, now = new Date() } = {}) {
  // Today's date in the team's zone
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TEAM_TZ, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(now)
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, Number(x.value)]),
  );
  const base = new Date(Date.UTC(p.year, p.month - 1, p.day + 1)); // tomorrow (UTC date used as a calendar date)
  const dow = (base.getUTCDay() + 6) % 7; // Mon = 0
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - (dow > 4 ? dow - 7 : dow) + offsetWeeks * 14);

  const days = [];
  for (let w = 0; w < 2; w++) {
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + w * 7 + i);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const day = d.getUTCDate();
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const h = hash(key);
      const fullyBooked = h % 9 === 0;
      const slots = fullyBooked
        ? []
        : SLOT_TIMES.filter((_, k) => (h >> k) % 5 !== 0) // a few slots already taken
            .map(([hh, mm]) => zonedToUtc(y, m, day, hh, mm, TEAM_TZ))
            .filter((t) => t - now.getTime() >= MIN_LEAD_MS)
            .map((t) => ({ iso: new Date(t).toISOString() }));
      days.push({
        key,
        date: day,
        long: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(d),
        slots,
      });
    }
  }
  const fmtMonth = (d) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(d);
  const first = new Date(monday);
  const last = new Date(monday);
  last.setUTCDate(monday.getUTCDate() + 11);
  const month = fmtMonth(first) === fmtMonth(last) ? fmtMonth(first) : `${fmtMonth(first).split(' ')[0]} – ${fmtMonth(last)}`;
  return { month, days };
}

const abbr = (t, timeZone) => {
  try {
    const n = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(new Date(t)).find((x) => x.type === 'timeZoneName')?.value || '';
    return { CST: 'CT', CDT: 'CT', EST: 'ET', EDT: 'ET', MST: 'MT', MDT: 'MT', PST: 'PT', PDT: 'PT' }[n] || n;
  } catch {
    return '';
  }
};

/** "10:30 AM" or, with day, "Wed, Oct 15 · 10:30–11:30 AM CT". */
export function slotLabel(iso, timeZone = TEAM_TZ, { day = false, duration = 60 } = {}) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const tz = timeZone || TEAM_TZ;
  const time = (x, o = {}) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', ...o }).format(new Date(x));
  if (!day) return time(t);
  const d = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(t));
  const start = time(t).replace(/\s?(AM|PM)$/, '');
  const startMer = time(t).slice(-2);
  const end = time(t + duration * 6e4);
  return `${d} · ${end.slice(-2) === startMer ? start : time(t)}–${end} ${abbr(t, tz)}`.trim();
}

const icsDate = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function gcalUrl({ title, start, minutes, details }) {
  const t = Date.parse(start);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${icsDate(t)}/${icsDate(t + minutes * 6e4)}`, details });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function icsFile({ title, start, minutes, description }) {
  const t = Date.parse(start);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Savvy Marketing Partners//Explore Partnership//EN',
    'BEGIN:VEVENT',
    `UID:${icsDate(t)}-${Math.random().toString(36).slice(2)}@savvy`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(t)}`,
    `DTEND:${icsDate(t + minutes * 6e4)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
