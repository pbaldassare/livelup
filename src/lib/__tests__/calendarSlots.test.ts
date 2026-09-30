import { describe, expect, it } from 'vitest';
import {
  buildSlotRange,
  eventRangesOnDay,
  findSlotConflicts,
  parseTimeHHmm,
  suggestFreeTime,
  type CalendarSlotEvent,
} from '@/lib/calendarSlots';

const day = new Date(2026, 8, 30);

function at(h: number, m = 0, base: Date = day): string {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function ev(id: string, startH: number, endH: number, extra: Partial<CalendarSlotEvent> = {}): CalendarSlotEvent {
  return { id, title: id, start_datetime: at(startH), end_datetime: at(endH), ...extra };
}

describe('parseTimeHHmm', () => {
  it('accetta HH:mm validi e rifiuta il resto', () => {
    expect(parseTimeHHmm('07:30')).toEqual({ hours: 7, minutes: 30 });
    expect(parseTimeHHmm('24:00')).toBeNull();
    expect(parseTimeHHmm('')).toBeNull();
    expect(parseTimeHHmm('9')).toBeNull();
  });
});

describe('findSlotConflicts', () => {
  const events = [ev('Mattina', 9, 10), ev('Pranzo', 12, 13)];

  it('segnala la sovrapposizione parziale', () => {
    const slot = buildSlotRange(day, '09:30', 60)!;
    expect(findSlotConflicts(slot, events).map((c) => c.id)).toEqual(['Mattina']);
  });

  it('non considera conflitto un evento che finisce quando inizia lo slot', () => {
    const slot = buildSlotRange(day, '10:00', 60)!;
    expect(findSlotConflicts(slot, events)).toEqual([]);
  });

  it('ignora eventi annullati', () => {
    const slot = buildSlotRange(day, '09:00', 60)!;
    expect(findSlotConflicts(slot, [ev('X', 9, 10, { is_cancelled: true })])).toEqual([]);
  });

  it('un evento tutto il giorno blocca ogni orario', () => {
    const slot = buildSlotRange(day, '18:00', 60)!;
    expect(findSlotConflicts(slot, [ev('Gara', 0, 1, { is_all_day: true })])).toHaveLength(1);
  });

  it('proietta le ricorrenze settimanali sul giorno scelto', () => {
    const weekBefore = new Date(day.getTime() - 7 * 86_400_000);
    const weekly: CalendarSlotEvent = {
      id: 'Corso',
      title: 'Corso',
      start_datetime: at(18, 0, weekBefore),
      end_datetime: at(19, 0, weekBefore),
      is_recurring: true,
      recurrence_rule: 'FREQ=WEEKLY',
    };
    expect(eventRangesOnDay(weekly, day)).toHaveLength(1);
    expect(findSlotConflicts(buildSlotRange(day, '18:30', 30)!, [weekly])).toHaveLength(1);
    const nextDay = new Date(day.getTime() + 86_400_000);
    expect(eventRangesOnDay(weekly, nextDay)).toHaveLength(0);
  });
});

describe('suggestFreeTime', () => {
  it('propone il primo orario libero dopo quello scelto', () => {
    const events = [ev('A', 10, 11), ev('B', 11, 12)];
    expect(suggestFreeTime(day, events, 60, '10:00')).toBe('12:00');
  });

  it('torna a inizio giornata se dopo è tutto pieno', () => {
    const events = [ev('Pieno', 9, 23)];
    expect(suggestFreeTime(day, events, 60, '10:00')).toBe('06:00');
  });

  it('null se la giornata è piena', () => {
    expect(suggestFreeTime(day, [ev('Tutto', 0, 1, { is_all_day: true })], 60, '10:00')).toBeNull();
  });
});
