import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Search,
  Plus,
  Calendar as CalendarIcon,
  List,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { GoogleCalendarConnectButton } from '@/components/pt/GoogleCalendarConnectButton';
import type { CalendarMode, CalendarView, EventsPanel } from './types';

interface CalendarShellProps {
  mode: CalendarMode;
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onNew: () => void;
  newLabel: string;
  /** Solo mode eventi: Calendario vs Elenco */
  eventsPanel?: EventsPanel;
  onEventsPanelChange?: (p: EventsPanel) => void;
  /** Extra content below the calendar (e.g. disponibilità) */
  footer?: ReactNode;
  children: ReactNode;
}

export function CalendarShell({
  mode,
  view,
  onViewChange,
  selectedDate,
  onDateChange,
  search,
  onSearchChange,
  onNew,
  newLabel,
  eventsPanel = 'calendar',
  onEventsPanelChange,
  footer,
  children,
}: CalendarShellProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isAppuntamenti = mode === 'appuntamenti';
  const isListPanel = !isAppuntamenti && eventsPanel === 'list';

  // Persist view in localStorage per mode
  useEffect(() => {
    const k = `pt-cal-view-${mode}`;
    const stored = localStorage.getItem(k);
    if (stored && stored !== view && ['day', 'week', 'month'].includes(stored)) {
      onViewChange(stored as CalendarView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  useEffect(() => {
    localStorage.setItem(`pt-cal-view-${mode}`, view);
  }, [view, mode]);

  const prev = () => {
    if (view === 'day') onDateChange(subDays(selectedDate, 1));
    else if (view === 'week') onDateChange(subWeeks(selectedDate, 1));
    else onDateChange(subMonths(selectedDate, 1));
  };
  const next = () => {
    if (view === 'day') onDateChange(addDays(selectedDate, 1));
    else if (view === 'week') onDateChange(addWeeks(selectedDate, 1));
    else onDateChange(addMonths(selectedDate, 1));
  };

  const rangeLabel = (() => {
    if (view === 'day') return format(selectedDate, 'EEEE d MMMM yyyy', { locale: it });
    if (view === 'week') {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(ws, 'd MMM', { locale: it })} – ${format(we, 'd MMM yyyy', { locale: it })}`;
    }
    return format(selectedDate, 'MMMM yyyy', { locale: it });
  })();

  return (
    <div className="space-y-4 animate-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              isAppuntamenti ? 'bg-info/15 text-info' : 'bg-role-pt/15 text-role-pt'
            }`}
          >
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              {isAppuntamenti ? 'Calendario Appuntamenti' : 'Eventi'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAppuntamenti
                ? 'Sessioni 1‑a‑1 con i tuoi atleti'
                : 'Calendario, iscritti e gestione open day e attività pubbliche'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {isAppuntamenti && <GoogleCalendarConnectButton />}
          <Button onClick={onNew}>
            <Plus className="h-4 w-4 mr-2" />
            {newLabel}
          </Button>
        </div>
      </div>

      {/* Switch vista eventi o link ad appuntamenti */}
      {isAppuntamenti ? (
        <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          <Link
            to="/pt/events"
            className="px-3 py-1.5 text-sm rounded-md transition-colors text-muted-foreground hover:text-foreground"
          >
            Eventi
          </Link>
          <span className="px-3 py-1.5 text-sm rounded-md bg-background shadow-sm font-medium">
            Appuntamenti
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => onEventsPanelChange?.('calendar')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              eventsPanel === 'calendar'
                ? 'bg-background shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Calendario
          </button>
          <button
            type="button"
            onClick={() => onEventsPanelChange?.('list')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              eventsPanel === 'list'
                ? 'bg-background shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <List className="h-3.5 w-3.5" />
            Elenco
          </button>
        </div>
      )}

      {/* Toolbar calendario (solo vista calendario) */}
      {!isListPanel && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prev} aria-label="Precedente">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={next} aria-label="Successivo">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(new Date())}
              className="ml-1"
            >
              Oggi
            </Button>
          </div>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="capitalize">{rangeLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    onDateChange(d);
                    setPickerOpen(false);
                  }
                }}
                locale={it}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={isAppuntamenti ? 'Cerca atleta…' : 'Cerca evento…'}
                className="pl-7 h-9 w-44"
              />
            </div>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && onViewChange(v as CalendarView)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="day">Giorno</ToggleGroupItem>
              <ToggleGroupItem value="week">Settimana</ToggleGroupItem>
              <ToggleGroupItem value="month">Mese</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      )}

      {/* Vista corrente */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">{children}</div>

      {footer}
    </div>
  );
}
