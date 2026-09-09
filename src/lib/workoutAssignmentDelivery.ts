export type AssignmentDelivery = 'schedule' | 'assign';

/** Con "Assegna subito" si attiva solo la prima sessione; le altre restano programmate. */
export function firstCreatedWorkoutToActivate(
  delivery: AssignmentDelivery,
  createdIds: string[],
): string | null {
  if (delivery !== 'assign' || createdIds.length === 0) return null;
  return createdIds[0];
}

export type AssignmentCalendarEventInsert = {
  creator_user_id: string;
  pt_user_id: string;
  atleta_user_id: string | null;
  title: string;
  event_type: 'allenamento';
  category: 'appuntamento';
  start_datetime: string;
  end_datetime: string;
  is_public: false;
  visibility: 'connected_only';
};

/** Evento calendario PT (10:00–11:00). Default: non creare nulla. */
export function buildAssignmentCalendarEvent(params: {
  addToCalendar?: boolean;
  ptUserId: string;
  atletaUserId: string | null;
  title: string;
  scheduledDate: Date;
}): AssignmentCalendarEventInsert | null {
  if (!params.addToCalendar) return null;

  const start = new Date(params.scheduledDate);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    creator_user_id: params.ptUserId,
    pt_user_id: params.ptUserId,
    atleta_user_id: params.atletaUserId,
    title: params.title,
    event_type: 'allenamento',
    category: 'appuntamento',
    start_datetime: start.toISOString(),
    end_datetime: end.toISOString(),
    is_public: false,
    visibility: 'connected_only',
  };
}
