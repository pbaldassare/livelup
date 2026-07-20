import { supabase } from '@/integrations/supabase/client';

export type GoogleCalendarSyncAction = 'create' | 'update' | 'delete';

/**
 * Best-effort sync of a calendar_events row to Google Calendar.
 * Safe to call when the PT is not connected — the edge function returns
 * `{ synced: false, reason: 'not_connected' }` without throwing.
 */
export async function syncAppointmentToGoogleCalendar(
  calendarEventId: string,
  action: GoogleCalendarSyncAction,
): Promise<{ synced: boolean; reason?: string; error?: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
      body: { action, calendar_event_id: calendarEventId },
    });
    if (error) {
      console.warn('[gcal-sync]', error.message);
      return { synced: false, error: error.message };
    }
    return data as { synced: boolean; reason?: string; error?: string };
  } catch (e) {
    console.warn('[gcal-sync]', e);
    return null;
  }
}
