import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePTAppStats } from '@/hooks/usePTAppStats';
import {
  usePTHomeData,
  type PTHomeAthlete,
  type PTHomeAlert,
  type PTHomeAppointment,
} from '@/hooks/usePTHomeData';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import type { PTRouteSet } from '@/lib/pt/routes';
import { AppHeader } from '@/components/app/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AthletePtActiveToggle } from '@/components/pt/AthletePtActiveToggle';
import { InviteAtletaCTA } from '@/components/shared/InviteAtletaCTA';
import { PTBillingBanner } from '@/components/pt/PTBillingBanner';
import {
  CalendarClock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Users,
  Bell,
  Wallet,
  MessageSquare,
  User,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// PT APP HOME — Atleti → appuntamenti → guadagni → avvisi
// =====================================================

export function PTAppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { routes } = usePTRoutes(true);
  const { data: stats } = usePTAppStats();
  const { data: home, isLoading } = usePTHomeData();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const avatarInitials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : 'PT';

  const athletes = home?.athletes ?? [];
  const alerts = home?.alerts ?? [];
  const appointments = home?.appointments ?? [];
  const appointmentsScope = home?.appointments_scope ?? 'today';
  const analytics = home?.analytics;

  return (
    <div className="min-h-screen bg-app-background text-app-foreground pb-24">
      <AppHeader
        avatarUrl={profile?.avatar_url || undefined}
        avatarInitials={avatarInitials}
        showNotifications
        notificationCount={stats?.unreadMessages || 0}
        onAvatarPress={() => navigate('/pt/app/profile')}
        onNotificationPress={() => navigate(routes.chat())}
      >
        <div className="text-right">
          <p className="text-[10px] text-app-muted-foreground uppercase tracking-wider">Ciao Coach</p>
          <p className="text-sm font-semibold text-app-foreground truncate max-w-[140px]">
            {profile?.first_name || ''}
          </p>
        </div>
      </AppHeader>

      <main className="px-4 space-y-6 pt-3">
        <PTBillingBanner forceApp />
        {/* Atleti — lista compatta */}
        <section aria-labelledby="athletes-title">
          <div className="flex items-center justify-between mb-2.5">
            <h2
              id="athletes-title"
              className="text-[11px] font-semibold text-app-muted-foreground uppercase tracking-wide"
            >
              Atleti
            </h2>
            <div className="flex items-center gap-3">
              <InviteAtletaCTA refUserId={user?.id} variant="compact" />
              <button
                type="button"
                onClick={() => navigate(routes.athletes)}
                className="text-xs font-semibold text-app-accent flex items-center gap-0.5"
              >
                Vedi tutti <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full bg-app-muted rounded-xl" />
              ))}
            </div>
          ) : athletes.length === 0 ? (
            <InviteAtletaCTA
              refUserId={user?.id}
              title="Invita il tuo primo atleta"
            />
          ) : (
            <AthletesAccordion
              athletes={athletes.slice(0, 4)}
              routes={routes}
              ptUserId={user?.id}
              onNavigate={navigate}
            />
          )}
        </section>

        {/* Appuntamenti */}
        <section aria-labelledby="appointments-title">
          <AppointmentsPanel
            isLoading={isLoading}
            appointments={appointments}
            scope={appointmentsScope}
            onViewAll={() => navigate(routes.appointments)}
          />
        </section>

        {/* Guadagni */}
        <section aria-labelledby="earnings-title">
          <EarningsPanel
            isLoading={isLoading}
            monthlyRevenue={analytics?.monthly_revenue ?? 0}
            pendingPayments={analytics?.pending_payments ?? 0}
            onViewDetails={() => navigate(routes.payments)}
          />
        </section>

        {/* Avvisi */}
        <section aria-labelledby="alerts-title">
          <AlertsPanel
            isLoading={isLoading}
            alerts={alerts}
            onNavigate={(url) => navigate(url)}
          />
        </section>
      </main>
    </div>
  );
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function EarningsPanel({
  isLoading,
  monthlyRevenue,
  pendingPayments,
  onViewDetails,
}: {
  isLoading: boolean;
  monthlyRevenue: number;
  pendingPayments: number;
  onViewDetails: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h2
          id="earnings-title"
          className="text-[11px] font-semibold text-app-muted-foreground uppercase tracking-wide"
        >
          Guadagni
        </h2>
        <button
          type="button"
          onClick={onViewDetails}
          className="text-xs font-semibold text-app-accent flex items-center gap-0.5"
        >
          Vedi dettagli <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full bg-app-muted rounded-2xl" />
      ) : (
        <div className="rounded-2xl border border-app-border/80 bg-app-card overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-xl bg-app-accent/15 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-app-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-app-muted-foreground">Fatturato mese</p>
              <p className="text-lg font-bold text-app-foreground tabular-nums">
                {formatEur(monthlyRevenue)}
              </p>
            </div>
          </div>

          {pendingPayments > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-app-border/60 bg-amber-500/8">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Pagamenti in sospeso
              </p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                {formatEur(pendingPayments)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentsPanel({
  isLoading,
  appointments,
  scope,
  onViewAll,
}: {
  isLoading: boolean;
  appointments: PTHomeAppointment[];
  scope: 'today' | 'upcoming';
  onViewAll: () => void;
}) {
  const scopeLabel = scope === 'today' ? 'Oggi' : 'Prossimi appuntamenti';

  return (
    <div className="rounded-2xl border border-app-accent/25 bg-gradient-to-br from-app-card to-app-card/80 overflow-hidden shadow-sm shadow-app-accent/5">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-app-accent/15 flex items-center justify-center">
            <CalendarClock className="h-4 w-4 text-app-accent" />
          </div>
          <div>
            <h2 id="appointments-title" className="text-sm font-bold text-app-foreground">
              I miei appuntamenti
            </h2>
            <p className="text-[11px] text-app-muted-foreground">{scopeLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-app-accent flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-app-accent/10"
        >
          Calendario <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full bg-app-muted rounded-xl" />
            <Skeleton className="h-16 w-full bg-app-muted rounded-xl" />
          </>
        ) : appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-app-border/80 bg-app-background/40 px-4 py-6 text-center">
            <CalendarClock className="h-8 w-8 mx-auto mb-2 text-app-muted-foreground/40" />
            <p className="text-sm font-medium text-app-foreground">
              {scope === 'today' ? 'Nessun appuntamento oggi' : 'Nessun appuntamento in programma'}
            </p>
            <p className="text-xs text-app-muted-foreground mt-1">Giornata libera in agenda</p>
            <button
              type="button"
              onClick={onViewAll}
              className="mt-3 text-xs font-semibold text-app-accent"
            >
              Apri calendario
            </button>
          </div>
        ) : (
          appointments.map((appt, idx) => (
            <AppointmentRow key={appt.id} appointment={appt} highlight={idx === 0} />
          ))
        )}
      </div>
    </div>
  );
}

function AppointmentRow({
  appointment,
  highlight,
}: {
  appointment: PTHomeAppointment;
  highlight?: boolean;
}) {
  const start = new Date(appointment.start_datetime);
  const timeLabel = format(start, 'HH:mm', { locale: it });
  const dateLabel = isToday(start)
    ? 'Oggi'
    : format(start, 'EEE d MMM', { locale: it });

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border text-left',
        highlight
          ? 'bg-app-accent/10 border-app-accent/30'
          : 'bg-app-background/50 border-app-border/60',
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center min-w-[52px] py-1.5 px-2 rounded-lg',
          highlight ? 'bg-app-accent text-app-accent-foreground' : 'bg-app-muted',
        )}
      >
        <span className={cn('text-lg font-bold leading-none tabular-nums', !highlight && 'text-app-foreground')}>
          {timeLabel}
        </span>
        {!appointment.is_today && (
          <span className={cn('text-[9px] font-medium mt-0.5 capitalize', highlight ? 'opacity-80' : 'text-app-muted-foreground')}>
            {dateLabel}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{appointment.title}</p>
        {appointment.atleta_name && (
          <p className="text-xs text-app-muted-foreground flex items-center gap-1 mt-0.5">
            <Users className="h-3 w-3 shrink-0" />
            {appointment.atleta_name}
          </p>
        )}
        {appointment.location && (
          <p className="text-[11px] text-app-muted-foreground flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {appointment.location}
          </p>
        )}
      </div>
    </div>
  );
}

function AlertsPanel({
  isLoading,
  alerts,
  onNavigate,
}: {
  isLoading: boolean;
  alerts: PTHomeAlert[];
  onNavigate: (url: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <h2
            id="alerts-title"
            className="text-[11px] font-semibold text-app-muted-foreground uppercase tracking-wide"
          >
            Avvisi
          </h2>
          {!isLoading && alerts.length > 0 && (
            <Badge className="h-5 min-w-5 px-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
              {alerts.length}
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full bg-app-muted rounded-2xl" />
      ) : alerts.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Tutto sotto controllo
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
              Nessun avviso al momento
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onClick={() => alert.action_url && onNavigate(alert.action_url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AthletesAccordion({
  athletes,
  routes,
  ptUserId,
  onNavigate,
}: {
  athletes: PTHomeAthlete[];
  routes: PTRouteSet;
  ptUserId?: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <Accordion type="multiple" defaultValue={[]} className="space-y-2">
      {athletes.map((athlete) => (
        <AccordionItem
          key={athlete.user_id}
          value={athlete.user_id}
          className="border rounded-xl px-3 bg-app-card border-app-border/80"
        >
          <AccordionTrigger className="hover:no-underline py-3">
            <AthleteSummary athlete={athlete} />
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="space-y-2 pt-1">
              <Button
                variant="outline"
                className="w-full justify-start border-app-border/80 bg-app-background/50"
                onClick={() => onNavigate(routes.chat(athlete.user_id))}
              >
                <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                Chat
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-app-border/80 bg-app-background/50"
                onClick={() => onNavigate(routes.athlete(athlete.user_id))}
              >
                <User className="h-4 w-4 mr-2 shrink-0" />
                Scheda atleta
              </Button>
              {athlete.connection_id && (
                <AthletePtActiveToggle
                  connectionId={athlete.connection_id}
                  atletaUserId={athlete.user_id}
                  isPtActive={athlete.is_pt_active}
                  ptUserId={ptUserId}
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function AthleteSummary({ athlete }: { athlete: PTHomeAthlete }) {
  const fullName =
    [athlete.first_name, athlete.last_name].filter(Boolean).join(' ') || athlete.email || 'Atleta';
  const initials = `${athlete.first_name?.[0] || ''}${athlete.last_name?.[0] || ''}`.toUpperCase() || 'A';

  const lastSeen = athlete.last_activity_at
    ? formatDistanceToNow(new Date(athlete.last_activity_at), { addSuffix: true, locale: it })
    : 'mai';

  const statusConfig = {
    active: {
      label: 'Attivo',
      className: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    in_session: {
      label: 'In sessione',
      className: 'bg-app-accent/15 text-app-accent border-app-accent/25',
    },
    inactive: {
      label: 'Disattivo',
      className: 'bg-orange-500/12 text-orange-600 dark:text-orange-400 border-orange-500/20',
    },
  }[athlete.status];

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={athlete.avatar_url || undefined} />
        <AvatarFallback className="bg-app-muted text-app-accent text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-app-foreground truncate">{fullName}</p>
        <p className="text-[11px] text-app-muted-foreground truncate">
          Ultimo accesso {lastSeen}
          {athlete.is_pt_active && athlete.low_engagement ? ' · poco attivo' : ''}
        </p>
      </div>

      <span
        className={cn(
          'text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border shrink-0 mr-1',
          statusConfig.className,
        )}
      >
        {statusConfig.label}
      </span>
    </div>
  );
}

function AlertRow({ alert, onClick }: { alert: PTHomeAlert; onClick?: () => void }) {
  const styles = {
    info: {
      box: 'bg-blue-500/8 border-blue-500/25',
      icon: 'text-blue-500 bg-blue-500/15',
    },
    warning: {
      box: 'bg-amber-500/8 border-amber-500/25',
      icon: 'text-amber-500 bg-amber-500/15',
    },
    critical: {
      box: 'bg-red-500/8 border-red-500/25',
      icon: 'text-red-500 bg-red-500/15',
    },
  }[alert.severity];

  const Icon = alert.severity === 'info' ? Bell : AlertTriangle;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left active:scale-[0.99] transition-transform',
        styles.box,
      )}
    >
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', styles.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-app-foreground">{alert.title}</p>
        <p className="text-xs text-app-muted-foreground mt-0.5">{alert.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-app-muted-foreground shrink-0" />
    </button>
  );
}

export default PTAppHome;
