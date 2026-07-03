// Shared types per i nuovi calendari PT (Eventi / Appuntamenti).

export type CalendarMode = 'eventi' | 'appuntamenti';
export type CalendarView = 'day' | 'week' | 'month';
export type EventsPanel = 'calendar' | 'list';

export interface CalendarEventRow {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_type_id: string | null;
  category: 'evento' | 'appuntamento';
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_public: boolean;
  creator_user_id: string;
  pt_user_id: string | null;
  atleta_user_id: string | null;
  is_cancelled: boolean;
  visibility: string;
  is_closed_number: boolean;
  max_participants: number | null;
  cover_image_url: string | null;
}

export interface AthleteLite {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface EventParticipantCounts {
  registered: number;
  waitlist: number;
}

export const HOUR_START = 6;
export const HOUR_END = 23;
export const HOUR_HEIGHT = 56; // px per ora
