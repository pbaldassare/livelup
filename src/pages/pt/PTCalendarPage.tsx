import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarShell } from '@/components/pt/calendar/CalendarShell';
import { CalendarDayView } from '@/components/pt/calendar/CalendarDayView';
import { CalendarWeekView } from '@/components/pt/calendar/CalendarWeekView';
import { CalendarMonthView } from '@/components/pt/calendar/CalendarMonthView';
import { NewAppointmentDialog } from '@/components/pt/calendar/NewAppointmentDialog';
import { EditEventDialog } from '@/components/pt/EditEventDialog';
import { CreatePublicEventDialog } from '@/components/pt/CreatePublicEventDialog';
import type { CalendarEventRow, CalendarView, AthleteLite } from '@/components/pt/calendar/types';
import {
  endOfMonth,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export interface PTCalendarPageProps {
  mode?: 'eventi' | 'appuntamenti';
}

export function PTCalendarPage({ mode = 'eventi' }: PTCalendarPageProps = {}) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [newSlot, setNewSlot] = useState<Date | null>(null);
  const [editing, setEditing] = useState<CalendarEventRow | null>(null);

  const isAppuntamenti = mode === 'appuntamenti';

  // Range query in base alla vista (un po' più largo per sicurezza)
  const range = useMemo(() => {
    if (view === 'day') {
      return { from: startOfDay(selectedDate), to: endOfDay(selectedDate) };
    }
    if (view === 'week') {
      return {
        from: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        to: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      };
    }
    return {
      from: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
      to: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 }),
    };
  }, [view, selectedDate]);

  const { data: events = [] } = useQuery({
    queryKey: ['pt-calendar', user?.id, mode, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('pt_user_id', user.id)
        .eq('category', isAppuntamenti ? 'appuntamento' : 'evento')
        .eq('is_cancelled', false)
        .gte('start_datetime', range.from.toISOString())
        .lte('start_datetime', range.to.toISOString())
        .order('start_datetime', { ascending: true });
      if (error) throw error;
      return (data || []) as CalendarEventRow[];
    },
    enabled: !!user?.id,
  });

  // Atleti collegati (solo per appuntamenti)
  const { data: athletes = [] } = useQuery({
    queryKey: ['pt-connected-athletes-lite', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: conns } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');
      const ids = (conns || []).map((c) => c.atleta_user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', ids);
      return (profs || []).map<AthleteLite>((p) => ({
        user_id: p.user_id,
        full_name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Atleta',
        avatar_url: p.avatar_url,
      }));
    },
    enabled: !!user?.id && isAppuntamenti,
  });

  const athletesById = useMemo(() => {
    const m: Record<string, AthleteLite> = {};
    for (const a of athletes) m[a.user_id] = a;
    return m;
  }, [athletes]);

  // Filtro ricerca client-side
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) => {
      if (ev.title?.toLowerCase().includes(q)) return true;
      if (ev.location?.toLowerCase().includes(q)) return true;
      const a = ev.atleta_user_id ? athletesById[ev.atleta_user_id] : null;
      if (a?.full_name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [events, search, athletesById]);

  const handleSlotClick = (start: Date) => {
    setNewSlot(start);
    setNewOpen(true);
  };
  const handleDayClick = (d: Date) => {
    setSelectedDate(d);
    setView('day');
  };

  return (
    <>
      <CalendarShell
        mode={mode}
        view={view}
        onViewChange={setView}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        search={search}
        onSearchChange={setSearch}
        onNew={() => {
          setNewSlot(null);
          setNewOpen(true);
        }}
        newLabel={isAppuntamenti ? 'Nuovo appuntamento' : 'Nuovo evento'}
      >
        {view === 'day' && (
          <CalendarDayView
            date={selectedDate}
            events={filteredEvents}
            athletesById={athletesById}
            mode={mode}
            onEventClick={(e) => setEditing(e)}
            onSlotClick={handleSlotClick}
          />
        )}
        {view === 'week' && (
          <CalendarWeekView
            date={selectedDate}
            events={filteredEvents}
            athletesById={athletesById}
            mode={mode}
            onEventClick={(e) => setEditing(e)}
            onSlotClick={handleSlotClick}
          />
        )}
        {view === 'month' && (
          <CalendarMonthView
            date={selectedDate}
            events={filteredEvents}
            athletesById={athletesById}
            mode={mode}
            onEventClick={(e) => setEditing(e)}
            onDayClick={handleDayClick}
          />
        )}
      </CalendarShell>

      {/* Dialog creazione */}
      {isAppuntamenti ? (
        <NewAppointmentDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          athletes={athletes}
          initialDate={newSlot}
        />
      ) : (
        <CreatePublicEventDialog
          open={newOpen}
          onOpenChange={setNewOpen}
        />
      )}

      {/* Dialog modifica */}
      {editing && (
        <EditEventDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          event={editing as any}
        />
      )}
    </>
  );
}

export default PTCalendarPage;
