import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import type { CalendarEventRow, AthleteLite, EventParticipantCounts } from './types';

interface CalendarMonthViewProps {
  date: Date;
  events: CalendarEventRow[];
  athletesById: Record<string, AthleteLite>;
  participantCountsByEventId?: Record<string, EventParticipantCounts>;
  mode: 'eventi' | 'appuntamenti';
  onEventClick: (e: CalendarEventRow) => void;
  onDayClick: (d: Date) => void;
}

export function CalendarMonthView({ date, events, athletesById, participantCountsByEventId, mode, onEventClick, onDayClick }: CalendarMonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const chipColor =
    mode === 'appuntamenti'
      ? 'bg-info/20 text-info border-info/30'
      : 'bg-role-pt/20 text-role-pt border-role-pt/30';

  const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div>
      <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        {weekdays.map((w) => (
          <div key={w} className="px-2 py-2 text-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = isSameMonth(d, monthStart);
          const dayEvents = events.filter((e) => isSameDay(parseISO(e.start_datetime), d));
          const visible = dayEvents.slice(0, 3);
          const more = dayEvents.length - visible.length;
          return (
            <div
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              className={`min-h-[110px] border-b border-r p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${
                !inMonth ? 'bg-muted/20 text-muted-foreground/60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday(d) ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {format(d, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{dayEvents.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {visible.map((ev) => {
                  const start = parseISO(ev.start_datetime);
                  const athlete = ev.atleta_user_id ? athletesById[ev.atleta_user_id] : null;
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-[10px] ${chipColor}`}
                    >
                      <span className="font-semibold">{format(start, 'HH:mm')}</span>{' '}
                      <span>{athlete?.full_name ?? ev.title}</span>
                      {mode === 'eventi' && participantCountsByEventId?.[ev.id]?.registered != null && (
                        <span className="opacity-80"> · 👥{participantCountsByEventId[ev.id].registered}</span>
                      )}
                    </button>
                  );
                })}
                {more > 0 && (
                  <div className="px-1.5 text-[10px] text-muted-foreground">+{more} altri</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
