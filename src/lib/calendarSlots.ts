export const DEFAULT_ASSIGNMENT_TIME = '10:00';
export const DEFAULT_ASSIGNMENT_DURATION_MINUTES = 60;

const SLOT_STEP_MINUTES = 15;
const DAY_FIRST_MINUTE = 6 * 60;
const DAY_LAST_MINUTE = 23 * 60;

export type CalendarSlotEvent = {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string | null;
  is_all_day?: boolean | null;
  is_cancelled?: boolean | null;
  is_recurring?: boolean | null;
  recurrence_rule?: string | null;
};

export type TimeRange = { start: Date; end: Date };

export type SlotConflict = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

export function parseTimeHHmm(value: string | null | undefined): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

export function formatTimeHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function normalizeDurationMinutes(value: number | null | undefined): number {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_ASSIGNMENT_DURATION_MINUTES;
  return Math.min(Math.round(value), 8 * 60);
}

/** Intervallo locale [inizio, fine) per data + orario HH:mm. */
export function buildSlotRange(day: Date, time: string, durationMinutes: number): TimeRange | null {
  const parsed = parseTimeHHmm(time);
  if (!parsed) return null;
  const start = new Date(day);
  start.setHours(parsed.hours, parsed.minutes, 0, 0);
  const end = new Date(start.getTime() + normalizeDurationMinutes(durationMinutes) * 60_000);
  return { start, end };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const RRULE_WEEKDAYS: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function parseRRule(rule: string): Record<string, string> {
  return Object.fromEntries(
    rule
      .replace(/^RRULE:/i, '')
      .split(';')
      .map((part) => part.split('='))
      .filter((kv) => kv.length === 2)
      .map(([k, v]) => [k.toUpperCase(), v.toUpperCase()]),
  );
}

/** Solo FREQ=DAILY / FREQ=WEEKLY (con BYDAY, INTERVAL, UNTIL, COUNT approssimato); altrimenti nessuna ricorrenza. */
function recursOnDay(eventStart: Date, rule: string | null | undefined, day: Date): boolean {
  if (!rule) return false;
  const parts = parseRRule(rule);
  const dayStart = startOfDay(day);
  const firstDay = startOfDay(eventStart);
  if (dayStart < firstDay) return false;

  if (parts.UNTIL) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(parts.UNTIL);
    if (m) {
      const until = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (dayStart > until) return false;
    }
  }

  const interval = Math.max(1, Number(parts.INTERVAL) || 1);
  const daysBetween = Math.round((dayStart.getTime() - firstDay.getTime()) / 86_400_000);

  if (parts.FREQ === 'DAILY') {
    if (daysBetween % interval !== 0) return false;
    if (parts.COUNT && daysBetween / interval >= Number(parts.COUNT)) return false;
    return true;
  }

  if (parts.FREQ === 'WEEKLY') {
    const weekdays = parts.BYDAY
      ? parts.BYDAY.split(',').map((d) => RRULE_WEEKDAYS[d.slice(-2)]).filter((d) => d !== undefined)
      : [firstDay.getDay()];
    if (!weekdays.includes(dayStart.getDay())) return false;
    const weeksBetween = Math.floor(daysBetween / 7);
    if (weeksBetween % interval !== 0) return false;
    if (parts.COUNT && weeksBetween / interval >= Number(parts.COUNT)) return false;
    return true;
  }

  return false;
}

/** Occorrenze di un evento nel giorno indicato (proietta anche le ricorrenze). */
export function eventRangesOnDay(event: CalendarSlotEvent, day: Date): Array<TimeRange & { allDay: boolean }> {
  if (event.is_cancelled) return [];
  const origStart = new Date(event.start_datetime);
  if (Number.isNaN(origStart.getTime())) return [];
  const origEndRaw = event.end_datetime ? new Date(event.end_datetime) : null;
  const durationMs =
    origEndRaw && !Number.isNaN(origEndRaw.getTime()) && origEndRaw > origStart
      ? origEndRaw.getTime() - origStart.getTime()
      : DEFAULT_ASSIGNMENT_DURATION_MINUTES * 60_000;

  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  let start: Date;
  if (event.is_recurring && startOfDay(origStart).getTime() !== dayStart.getTime()) {
    if (!recursOnDay(origStart, event.recurrence_rule, day)) return [];
    start = new Date(dayStart);
    start.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
  } else {
    start = origStart;
  }

  if (event.is_all_day) {
    const allDayStart = startOfDay(start);
    const allDayEnd = new Date(Math.max(allDayStart.getTime() + 86_400_000, start.getTime() + durationMs));
    if (allDayEnd <= dayStart || allDayStart >= dayEnd) return [];
    return [{ start: allDayStart, end: allDayEnd, allDay: true }];
  }

  const end = new Date(start.getTime() + durationMs);
  if (end <= dayStart || start >= dayEnd) return [];
  return [{ start, end, allDay: false }];
}

function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function findSlotConflicts(slot: TimeRange, events: CalendarSlotEvent[]): SlotConflict[] {
  const conflicts: SlotConflict[] = [];
  for (const event of events) {
    for (const range of eventRangesOnDay(event, slot.start)) {
      if (overlaps(slot, range)) {
        conflicts.push({ id: event.id, title: event.title, start: range.start, end: range.end, allDay: range.allDay });
      }
    }
  }
  return conflicts.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Primo orario libero (passi da 15 min, 06:00–23:00) a partire da `fromTime`,
 * poi dall'inizio giornata. Null se la giornata è piena.
 */
export function suggestFreeTime(
  day: Date,
  events: CalendarSlotEvent[],
  durationMinutes: number,
  fromTime: string = DEFAULT_ASSIGNMENT_TIME,
): string | null {
  const duration = normalizeDurationMinutes(durationMinutes);
  const parsed = parseTimeHHmm(fromTime);
  const from = parsed ? parsed.hours * 60 + parsed.minutes : DAY_FIRST_MINUTE;
  const alignedFrom = Math.ceil(from / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;

  const candidates: number[] = [];
  for (let m = alignedFrom; m + duration <= DAY_LAST_MINUTE; m += SLOT_STEP_MINUTES) candidates.push(m);
  for (let m = DAY_FIRST_MINUTE; m < alignedFrom && m + duration <= DAY_LAST_MINUTE; m += SLOT_STEP_MINUTES) {
    candidates.push(m);
  }

  for (const minute of candidates) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    const slot = buildSlotRange(day, time, duration);
    if (slot && findSlotConflicts(slot, events).length === 0) return time;
  }
  return null;
}

export function describeConflict(conflict: SlotConflict): string {
  if (conflict.allDay) return `${conflict.title} (tutto il giorno)`;
  return `${conflict.title} (${formatTimeHHmm(conflict.start)}–${formatTimeHHmm(conflict.end)})`;
}
