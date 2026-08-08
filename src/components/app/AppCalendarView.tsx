import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// =====================================================
// APP CALENDAR VIEW
// Shared Day / Week / Month calendar (app-* tokens).
// Used by athlete Programma and PT App calendario.
// =====================================================

export type AppCalendarViewMode = 'day' | 'week' | 'month';

export type AppCalendarItem = {
  id: string;
  title: string;
  /** yyyy-MM-dd or ISO datetime */
  date: string;
  status?: string;
  meta?: ReactNode;
  onClick?: () => void;
};

export type AppCalendarVisibleRange = {
  from: Date;
  to: Date;
};

export type AppCalendarViewProps = {
  items: AppCalendarItem[];
  isLoading?: boolean;
  emptyLabel?: string;
  /** Header title (default: Programma). Hidden when hideTitle. */
  title?: string;
  hideTitle?: boolean;
  /** Extra content under the title row (e.g. athlete CTAs already elsewhere). */
  headerExtra?: ReactNode;
  footer?: ReactNode;
  onVisibleRangeChange?: (range: AppCalendarVisibleRange) => void;
  onSelectedDateChange?: (date: Date) => void;
  /** Custom day-list row; default uses title/status/meta. */
  renderItem?: (item: AppCalendarItem) => ReactNode;
};

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function itemDateKey(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  try {
    return ymd(parseISO(date));
  } catch {
    return date.slice(0, 10);
  }
}

export function rangeKey(from: Date, to: Date) {
  return `${ymd(from)}_${ymd(to)}`;
}

function statusMeta(status: string) {
  switch (status) {
    case 'completato':
      return {
        label: 'Completato',
        cls: 'bg-success/15 text-success border-success/30',
        Icon: CheckCircle2,
      };
    case 'in_corso':
      return {
        label: 'In corso',
        cls: 'bg-warning/15 text-warning border-warning/30',
        Icon: Clock,
      };
    default:
      return {
        label: 'Assegnato',
        cls: 'bg-app-muted/40 text-app-muted-foreground border-app-border',
        Icon: Circle,
      };
  }
}

export function AppCalendarView({
  items,
  isLoading = false,
  emptyLabel = 'Nessun elemento per questo giorno',
  title = 'Programma',
  hideTitle = false,
  headerExtra,
  footer,
  onVisibleRangeChange,
  onSelectedDateChange,
  renderItem,
}: AppCalendarViewProps) {
  const [view, setView] = useState<AppCalendarViewMode>('day');
  const [selected, setSelected] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const range = useMemo<AppCalendarVisibleRange>(() => {
    if (view === 'day') {
      const dayEnd = new Date(selected);
      dayEnd.setHours(23, 59, 59, 999);
      return { from: selected, to: dayEnd };
    }
    if (view === 'week') {
      return {
        from: startOfWeek(selected, { weekStartsOn: 1 }),
        to: endOfWeek(selected, { weekStartsOn: 1 }),
      };
    }
    const monthStart = startOfMonth(selected);
    const monthEnd = endOfMonth(selected);
    return {
      from: startOfWeek(monthStart, { weekStartsOn: 1 }),
      to: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    };
  }, [view, selected]);

  useEffect(() => {
    onVisibleRangeChange?.(range);
  }, [range, onVisibleRangeChange]);

  useEffect(() => {
    onSelectedDateChange?.(selected);
  }, [selected, onSelectedDateChange]);

  const byDate = useMemo(() => {
    const m = new Map<string, AppCalendarItem[]>();
    for (const item of items) {
      const k = itemDateKey(item.date);
      const arr = m.get(k) ?? [];
      arr.push(item);
      m.set(k, arr);
    }
    return m;
  }, [items]);

  const setSelectedDay = (d: Date) => {
    const next = new Date(d);
    next.setHours(0, 0, 0, 0);
    setSelected(next);
  };

  const goPrev = () => {
    if (view === 'day') setSelected((d) => addDays(d, -1));
    else if (view === 'week') setSelected((d) => addWeeks(d, -1));
    else setSelected((d) => addMonths(d, -1));
  };
  const goNext = () => {
    if (view === 'day') setSelected((d) => addDays(d, 1));
    else if (view === 'week') setSelected((d) => addWeeks(d, 1));
    else setSelected((d) => addMonths(d, 1));
  };
  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelected(d);
  };

  const headerLabel = useMemo(() => {
    if (view === 'day') {
      return format(selected, 'EEEE d MMMM yyyy', { locale: it });
    }
    if (view === 'week') {
      const ws = startOfWeek(selected, { weekStartsOn: 1 });
      const we = endOfWeek(selected, { weekStartsOn: 1 });
      const sameMonth = ws.getMonth() === we.getMonth();
      return sameMonth
        ? `${format(ws, 'd', { locale: it })} – ${format(we, 'd MMMM yyyy', { locale: it })}`
        : `${format(ws, 'd MMM', { locale: it })} – ${format(we, 'd MMM yyyy', { locale: it })}`;
    }
    return format(selected, 'MMMM yyyy', { locale: it });
  }, [view, selected]);

  return (
    <div className="bg-app-background text-app-foreground pb-2">
      <div className="px-4 pt-4 pb-3 space-y-3">
        {!hideTitle && (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-app-accent" />
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
        )}

        {headerExtra}

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-app-muted/30 p-1 border border-app-border">
          {(
            [
              { id: 'day', label: 'Giorno' },
              { id: 'week', label: 'Settimana' },
              { id: 'month', label: 'Mese' },
            ] as { id: AppCalendarViewMode; label: string }[]
          ).map((opt) => {
            const active = view === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setView(opt.id)}
                className={cn(
                  'h-9 rounded-lg text-sm font-semibold transition-colors',
                  active
                    ? 'bg-app-accent text-app-accent-foreground shadow-sm'
                    : 'text-app-muted-foreground hover:text-app-foreground',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Precedente"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg bg-app-muted/30 border border-app-border text-app-foreground hover:border-app-accent/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold capitalize">{headerLabel}</p>
          </div>
          <button
            type="button"
            onClick={goNext}
            aria-label="Successivo"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg bg-app-muted/30 border border-app-border text-app-foreground hover:border-app-accent/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={goToday}
            className="h-8 text-xs border-app-border bg-app-card text-app-foreground hover:bg-app-muted/40 hover:text-app-foreground"
          >
            Oggi
          </Button>
        </div>
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${view}-${ymd(selected)}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {view === 'day' && (
              <DayView
                items={byDate.get(ymd(selected)) ?? []}
                isLoading={isLoading}
                emptyLabel={emptyLabel}
                renderItem={renderItem}
              />
            )}
            {view === 'week' && (
              <WeekView
                anchor={selected}
                byDate={byDate}
                onPickDay={(d) => {
                  setSelectedDay(d);
                  setView('day');
                }}
              />
            )}
            {view === 'month' && (
              <MonthView
                anchor={selected}
                byDate={byDate}
                onPickDay={(d) => {
                  setSelectedDay(d);
                  setView('day');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {footer ? <div className="px-4 pt-4">{footer}</div> : null}
    </div>
  );
}

function DayView({
  items,
  isLoading,
  emptyLabel,
  renderItem,
}: {
  items: AppCalendarItem[];
  isLoading: boolean;
  emptyLabel: string;
  renderItem?: (item: AppCalendarItem) => ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-app-muted/20 border border-app-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed bg-app-card border-app-border">
        <CardContent className="p-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
          <p className="text-sm text-app-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) =>
        renderItem ? (
          <div key={item.id}>{renderItem(item)}</div>
        ) : (
          <DefaultDayItem key={item.id} item={item} />
        ),
      )}
    </div>
  );
}

function DefaultDayItem({ item }: { item: AppCalendarItem }) {
  const meta = item.status ? statusMeta(item.status) : null;
  return (
    <Card
      onClick={item.onClick}
      className={cn(
        'bg-app-card border-app-border transition-colors',
        item.onClick && 'cursor-pointer hover:border-app-accent/40',
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-app-muted-foreground capitalize">
              {format(parseISO(itemDateKey(item.date)), 'EEEE d MMM', { locale: it })}
            </p>
            <h3 className="text-base font-semibold text-app-foreground truncate">
              {item.title}
            </h3>
          </div>
          {meta && (
            <Badge
              variant="outline"
              className={cn('text-[10px] gap-1 font-medium', meta.cls)}
            >
              <meta.Icon className="h-3 w-3" />
              {meta.label}
            </Badge>
          )}
        </div>
        {item.meta}
      </CardContent>
    </Card>
  );
}

function WeekView({
  anchor,
  byDate,
  onPickDay,
}: {
  anchor: Date;
  byDate: Map<string, AppCalendarItem[]>;
  onPickDay: (d: Date) => void;
}) {
  const ws = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({
    start: ws,
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const dayItems = byDate.get(ymd(d)) ?? [];
        const today = isToday(d);
        const isAnchor = isSameDay(d, anchor);
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onPickDay(d)}
            className={cn(
              'flex flex-col items-center rounded-xl border p-2 min-h-[88px] text-center transition-colors',
              'bg-app-card border-app-border hover:border-app-accent/40',
              isAnchor && 'border-app-accent ring-1 ring-app-accent/40',
              today && !isAnchor && 'border-app-accent/40',
            )}
          >
            <span className="text-[10px] uppercase tracking-wide text-app-muted-foreground">
              {format(d, 'EEE', { locale: it })}
            </span>
            <span
              className={cn(
                'mt-1 text-lg font-bold',
                today ? 'text-app-accent' : 'text-app-foreground',
              )}
            >
              {format(d, 'd')}
            </span>
            <div className="mt-1 flex flex-col items-center gap-1">
              {dayItems.length === 0 ? (
                <span className="block h-1.5 w-1.5 rounded-full bg-app-muted/40" />
              ) : (
                <>
                  <span
                    className="block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: '#D4FF00' }}
                  />
                  {dayItems.length > 1 && (
                    <span className="text-[10px] font-semibold text-app-accent">
                      {dayItems.length}
                    </span>
                  )}
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({
  anchor,
  byDate,
  onPickDay,
}: {
  anchor: Date;
  byDate: Map<string, AppCalendarItem[]>;
  onPickDay: (d: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((l) => (
          <div
            key={l}
            className="text-[10px] uppercase tracking-wide text-app-muted-foreground text-center py-1"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, anchor);
          const dayItems = byDate.get(ymd(d)) ?? [];
          const today = isToday(d);
          const isAnchor = isSameDay(d, anchor);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPickDay(d)}
              className={cn(
                'aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 text-sm transition-colors',
                'bg-app-card border-app-border hover:border-app-accent/40',
                !inMonth && 'opacity-40',
                isAnchor && 'border-app-accent ring-1 ring-app-accent/40',
                today && !isAnchor && 'border-app-accent/40',
              )}
            >
              <span
                className={cn(
                  'font-semibold',
                  today ? 'text-app-accent' : 'text-app-foreground',
                )}
              >
                {format(d, 'd')}
              </span>
              {dayItems.length > 0 ? (
                <span
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: '#D4FF00' }}
                />
              ) : (
                <span className="block h-1.5 w-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AppCalendarView;
