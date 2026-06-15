import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInHours, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  MapPin,
  User as UserIcon,
  X,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA APPUNTAMENTI PAGE
// Lista degli appuntamenti 1-on-1 con il PT (category='appuntamento')
// =====================================================

interface AppointmentRow {
  id: string;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  event_type: string | null;
  is_cancelled: boolean;
  pt_user_id: string;
  pt_name?: string;
}

export function AtletaAppuntamentiPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['atleta-appuntamenti', user?.id],
    queryFn: async (): Promise<AppointmentRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('calendar_events')
        .select(
          'id, title, description, start_datetime, end_datetime, location, event_type, is_cancelled, pt_user_id',
        )
        .eq('atleta_user_id', user.id)
        .eq('category', 'appuntamento')
        .order('start_datetime', { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as AppointmentRow[];
      const ptIds = Array.from(new Set(rows.map((r) => r.pt_user_id))).filter(
        Boolean,
      );
      if (ptIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', ptIds);
        const m = new Map(
          (profs ?? []).map((p: any) => [
            p.user_id,
            [p.first_name, p.last_name].filter(Boolean).join(' '),
          ]),
        );
        rows.forEach((r) => (r.pt_name = m.get(r.pt_user_id) ?? 'Il tuo PT'));
      }
      return rows;
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calendar_events')
        .update({ is_cancelled: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Appuntamento cancellato');
      qc.invalidateQueries({ queryKey: ['atleta-appuntamenti'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Errore'),
  });

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: AppointmentRow[] = [];
    const pst: AppointmentRow[] = [];
    appointments.forEach((a) => {
      const start = parseISO(a.start_datetime);
      if (isAfter(start, now) && !a.is_cancelled) up.push(a);
      else pst.push(a);
    });
    return { upcoming: up, past: pst.reverse() };
  }, [appointments]);

  return (
    <div className="min-h-screen bg-app-background text-app-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur border-b border-app-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-app-muted/30 border border-app-border"
            aria-label="Indietro"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-app-accent" />
              Appuntamenti
            </h1>
            <p className="text-xs text-app-muted-foreground">
              Sessioni 1-on-1 con il tuo Personal Trainer
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/app/booking')}
            className="h-9 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            Prenota
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Upcoming */}
        <section>
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wide mb-3">
            Prossimi ({upcoming.length})
          </h2>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-app-muted/20 border border-app-border animate-pulse"
                />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <Card className="border-dashed bg-app-card border-app-border">
              <CardContent className="p-8 text-center">
                <CalendarClock className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
                <p className="text-sm text-app-muted-foreground mb-4">
                  Nessun appuntamento in programma
                </p>
                <Button
                  onClick={() => navigate('/app/booking')}
                  className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Prenota una sessione
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcoming.map((a, i) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  index={i}
                  onCancel={() => cancelMutation.mutate(a.id)}
                  canceling={cancelMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past / cancelled */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wide mb-3">
              Storico
            </h2>
            <div className="space-y-2">
              {past.slice(0, 20).map((a, i) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  index={i}
                  past
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment,
  index,
  past,
  onCancel,
  canceling,
}: {
  appointment: AppointmentRow;
  index: number;
  past?: boolean;
  onCancel?: () => void;
  canceling?: boolean;
}) {
  const start = parseISO(appointment.start_datetime);
  const end = parseISO(appointment.end_datetime);
  const hoursUntil = differenceInHours(start, new Date());
  const canCancel = !past && !appointment.is_cancelled && hoursUntil >= 24;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className={cn(
          'bg-app-card border-app-border',
          appointment.is_cancelled && 'opacity-60',
        )}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-app-accent font-semibold capitalize">
                {format(start, 'EEEE d MMMM', { locale: it })}
              </p>
              <h3 className="text-base font-semibold text-app-foreground truncate">
                {appointment.title}
              </h3>
              {appointment.pt_name && (
                <p className="text-xs text-app-muted-foreground flex items-center gap-1 mt-0.5">
                  <UserIcon className="h-3 w-3" />
                  con {appointment.pt_name}
                </p>
              )}
            </div>
            {appointment.is_cancelled ? (
              <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                Cancellato
              </Badge>
            ) : past ? (
              <Badge variant="outline" className="text-[10px] gap-1 border-app-border text-app-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                Concluso
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 border-app-accent/40 text-app-accent"
              >
                <Clock className="h-3 w-3" />
                {format(start, 'HH:mm')}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-app-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
            </span>
            {appointment.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3.5 w-3.5" />
                {appointment.location}
              </span>
            )}
          </div>

          {appointment.description && (
            <p className="text-xs text-app-muted-foreground line-clamp-2">
              {appointment.description}
            </p>
          )}

          {canCancel && onCancel && (
            <div className="pt-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={canceling}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancella appuntamento
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancellare l'appuntamento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Il tuo PT verrà notificato. Le cancellazioni sono possibili
                      solo fino a 24h prima dell'orario.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={onCancel}>
                      Conferma
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          {!past &&
            !appointment.is_cancelled &&
            hoursUntil < 24 &&
            hoursUntil >= 0 && (
              <p className="text-[11px] text-app-muted-foreground italic">
                Cancellazione non disponibile (meno di 24h)
              </p>
            )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default AtletaAppuntamentiPage;
