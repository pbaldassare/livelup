import { addDays, format, isSameDay, isToday, parseISO, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import type { CalendarEventRow, AthleteLite } from './types';
import { HOUR_END, HOUR_HEIGHT, HOUR_START } from './types';

interface CalendarWeekViewProps {
  date: Date;
  events: CalendarEventRow[];
  athletesById: Record<string, AthleteLite>;
  mode: 'eventi' | 'appuntamenti';
  onEventClick: (e: CalendarEventRow) => void;
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
  return Math.max(24, (ms / 3_600_000) * HOUR_HEIGHT);
}

export function CalendarWeekView({ date, events, athletesById, mode, onEventClick, onSlotClick }: CalendarWeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const colorBase =
    mode === 'appuntamenti'
      ? 'bg-info/15 border-info/40 hover:bg-info/25'
      : 'bg-role-pt/15 border-role-pt/40 hover:bg-role-pt/25';

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[860px]" style={{ gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))' }}>
        {/* header */}
        <div className="border-b border-r bg-muted/30" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={`border-b border-r px-2 py-2 text-center text-xs font-medium ${
              isToday(d) ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-muted-foreground'
            }`}
          >
            <div className="capitalize">{format(d, 'EEE', { locale: it })}</div>
            <div className={`text-base ${isToday(d) ? 'text-primary font-bold' : 'text-foreground'}`}>
              {format(d, 'd')}
            </div>
          </div>
        ))}

        {/* griglia ore */}
        <div className="border-r">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[11px] text-muted-foreground pr-2 text-right pt-1">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {days.map((d) => {
          const dayEvents = events.filter((e) => isSameDay(parseISO(e.start_datetime), d));
          return (
            <div key={d.toISOString()} className="relative border-r">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_HEIGHT }}
                  className="border-b border-dashed border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => {
                    const s = new Date(d);
                    s.setHours(h, 0, 0, 0);
                    onSlotClick(s);
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
                    className={`absolute left-1 right-1 rounded-md border px-1.5 py-1 text-left shadow-sm transition-all ${colorBase}`}
                    style={{ top: topPx(start) + 1, height: heightPx(start, end) - 2 }}
                  >
                    <div className="text-[11px] font-semibold truncate leading-tight">{ev.title}</div>
                    <div className="text-[10px] opacity-80 truncate">
                      {format(start, 'HH:mm')}{end && `–${format(end, 'HH:mm')}`}
                    </div>
                    {athlete && (
                      <div className="text-[10px] opacity-80 truncate">{athlete.full_name}</div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
