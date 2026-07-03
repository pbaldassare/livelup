import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { AtletaCalendarView } from '@/components/app/AtletaCalendarView';
import { AtletaWorkoutList } from '@/components/app/AtletaWorkoutList';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// ATLETA PROGRAMMA PAGE
// Calendario allenamenti + CTA verso Appuntamenti 1-on-1
// =====================================================

export function AtletaProgrammaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: nextAppointment } = useQuery({
    queryKey: ['atleta-next-appointment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('calendar_events')
        .select('id, title, start_datetime')
        .eq('atleta_user_id', user.id)
        .eq('category', 'appuntamento')
        .eq('is_cancelled', false)
        .gte('start_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="bg-app-background">
      {/* CTA Appuntamenti */}
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate('/app/appuntamenti')}
          className="w-full flex items-center gap-3 rounded-xl border border-app-border bg-app-card hover:border-app-accent/40 transition-colors p-3 text-left"
        >
          <div className="h-10 w-10 rounded-lg bg-app-accent/10 flex items-center justify-center shrink-0">
            <CalendarClock className="h-5 w-5 text-app-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-app-foreground">
              I miei appuntamenti
            </p>
            <p className="text-xs text-app-muted-foreground truncate">
              {nextAppointment
                ? `Prossimo: ${nextAppointment.title} · ${new Date(
                    nextAppointment.start_datetime,
                  ).toLocaleString('it-IT', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Sessioni 1-on-1 con il tuo PT'}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-app-muted-foreground" />
        </button>
      </div>
      <AtletaCalendarView />

      {/* Lista allenamenti Programma / Completati (come pagina Allenamenti) */}
      <div className="px-4 pt-2 pb-4">
        <AtletaWorkoutList />
      </div>
    </div>
  );
}

export default AtletaProgrammaPage;
