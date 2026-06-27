import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Clock, MapPin, User } from 'lucide-react';
import type { CalendarEventRow, AthleteLite, EventParticipantCounts } from './types';
import { HOUR_END, HOUR_HEIGHT, HOUR_START } from './types';

interface CalendarDayViewProps {
  date: Date;
  events: CalendarEventRow[];
  athletesById: Record<string, AthleteLite>;
  participantCountsByEventId?: Record<string, EventParticipantCounts>;
  mode: 'eventi' | 'appuntamenti';
  onEventClick: (e: CalendarEventRow) => void;
  onParticipantsClick?: (e: CalendarEventRow) => void;
  onSlotClick: (start: Date) => void;
}

const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

function topPx(d: Date) {
  const h = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, (h - HOUR_START) * HOUR_HEIGHT);
}
function heightPx(start: Date, end: Date | null) {
  if (!end) return HOUR_HEIGHT;
  const ms = end.getTime() - start.getTime();
  return Math.max(28, (ms / 3_600_000) * HOUR_HEIGHT);
}

export function CalendarDayView({ date, events, athletesById, participantCountsByEventId, mode, onEventClick, onParticipantsClick, onSlotClick }: CalendarDayViewProps) {
  const dayEvents = events.filter((e) => isSameDay(parseISO(e.start_datetime), date));
  const colorBase =
    mode === 'appuntamenti'
      ? 'bg-info/15 border-info/40 text-info-foreground hover:bg-info/25'
      : 'bg-role-pt/15 border-role-pt/40 text-foreground hover:bg-role-pt/25';

  return (
    <div className="grid grid-cols-[64px_1fr]">
      {/* gutter ore */}
      <div className="border-r">
        {HOURS.map((h) => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[11px] text-muted-foreground pr-2 text-right pt-1">
            {String(h).padStart(2, '0')}:00
          </div>
        ))}
      </div>
      {/* colonna giorno */}
      <div className="relative">
        {HOURS.map((h) => (
          <div
            key={h}
            style={{ height: HOUR_HEIGHT }}
            className="border-b border-dashed border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => {
              const d = startOfDay(date);
              d.setHours(h, 0, 0, 0);
              onSlotClick(d);
            }}
          />
        ))}
        {dayEvents.map((ev) => {
          const start = parseISO(ev.start_datetime);
          const end = ev.end_datetime ? parseISO(ev.end_datetime) : null;
          const athlete = ev.atleta_user_id ? athletesById[ev.atleta_user_id] : null;
          return (
            <button
              key={ev.id}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(ev);
              }}
              className={`absolute left-2 right-2 rounded-lg border px-3 py-2 text-left shadow-sm transition-all ${colorBase}`}
              style={{ top: topPx(start) + 2, height: heightPx(start, end) - 4 }}
            >
              <div className="text-xs font-semibold truncate">{ev.title}</div>
              <div className="mt-1 flex items-center gap-1 text-[11px] opacity-80">
                <Clock className="h-3 w-3 shrink-0" />
                {format(start, 'HH:mm')}{end && `–${format(end, 'HH:mm')}`}
              </div>
              {athlete && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] opacity-80 truncate">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{athlete.full_name}</span>
                </div>
              )}
              {mode === 'eventi' && participantCountsByEventId?.[ev.id] != null && (
                <button
                  type="button"
                  className="mt-0.5 text-[11px] opacity-90 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onParticipantsClick?.(ev);
                  }}
                >
                  👥 {participantCountsByEventId[ev.id].registered} iscritti
                </button>
              )}
              {ev.location && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] opacity-80 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{ev.location}</span>
                </div>
              )}
            </button>
          );
        })}
        {dayEvents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">
              Nessun {mode === 'appuntamenti' ? 'appuntamento' : 'evento'} il {format(date, 'd MMMM', { locale: it })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
