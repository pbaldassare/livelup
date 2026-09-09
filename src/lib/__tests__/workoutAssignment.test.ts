import { describe, expect, it } from 'vitest';
import { canUnassignWorkout } from '@/lib/api/workouts';
import { buildAssignmentCalendarEvent } from '@/lib/workoutAssignmentDelivery';

describe('canUnassignWorkout', () => {
  it('allows programmed and in-progress assignments', () => {
    expect(canUnassignWorkout('attivo')).toBe(true);
    expect(canUnassignWorkout('scaduto')).toBe(true);
    expect(canUnassignWorkout('in_corso')).toBe(true);
    expect(canUnassignWorkout('in_sospeso')).toBe(true);
  });

  it('blocks completed history', () => {
    expect(canUnassignWorkout('completato')).toBe(false);
    expect(canUnassignWorkout('saltato')).toBe(false);
  });
});

describe('buildAssignmentCalendarEvent', () => {
  const base = {
    ptUserId: 'pt-1',
    atletaUserId: 'at-1',
    title: 'Full body',
    scheduledDate: new Date(2026, 8, 9),
  };

  it('non crea l’evento se il flag è spento o assente', () => {
    expect(buildAssignmentCalendarEvent({ ...base })).toBeNull();
    expect(buildAssignmentCalendarEvent({ ...base, addToCalendar: false })).toBeNull();
  });

  it('crea un appuntamento alle 10:00 se il flag è acceso', () => {
    const row = buildAssignmentCalendarEvent({ ...base, addToCalendar: true });
    expect(row).toMatchObject({
      creator_user_id: 'pt-1',
      pt_user_id: 'pt-1',
      atleta_user_id: 'at-1',
      title: 'Full body',
      event_type: 'allenamento',
      category: 'appuntamento',
      is_public: false,
      visibility: 'connected_only',
    });
    const start = new Date(row!.start_datetime);
    const end = new Date(row!.end_datetime);
    expect(start.getHours()).toBe(10);
    expect(end.getHours()).toBe(11);
  });
});
