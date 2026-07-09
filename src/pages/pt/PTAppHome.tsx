import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePTAppStats } from '@/hooks/usePTAppStats';
import { usePTHomeData, type PTHomeAthlete, type PTHomeAlert } from '@/hooks/usePTHomeData';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import { AppHeader } from '@/components/app/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar as CalendarIcon,
  Dumbbell,
  FileText,
  UserPlus,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Wallet,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// PT APP HOME - Dashboard Coach orientata all'AZIONE
// Gerarchia: Azioni → Atleti → Alert → Analytics
// Tutti i link restano in /pt/app/*
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
          <p className="text-xs text-app-muted-foreground uppercase tracking-wide">Ciao Coach</p>
          <p className="text-sm font-semibold text-app-foreground truncate max-w-[140px]">
            {profile?.first_name || ''}
          </p>
        </div>
      </AppHeader>

      <main className="px-4 space-y-8 pt-2">
        <section aria-labelledby="quick-actions-title">
          <div className="flex items-center justify-between mb-3">
            <h2 id="quick-actions-title" className="text-xs font-bold text-app-muted-foreground uppercase tracking-widest">
              Azioni rapide
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard
              icon={CalendarIcon}
              label="Crea programma"
              hint="Pianifica più settimane"
              onClick={() => navigate(routes.workoutsTab('programs'))}
            />
            <ActionCard
              icon={Dumbbell}
              label="Crea scheda"
              hint="Nuovo allenamento"
              onClick={() => navigate(routes.templates)}
            />
            <ActionCard
              icon={FileText}
              label="Crea protocollo"
              hint="Linee guida atleta"
              onClick={() => navigate(routes.workoutsTab('protocols'))}
            />
            <ActionCard
              icon={UserPlus}
              label="Invita atleta"
              hint="Genera link invito"
              accent
              onClick={() => navigate(routes.athletesInvite)}
            />
          </div>
        </section>

        <section aria-labelledby="athletes-title">
          <div className="flex items-center justify-between mb-3">
            <h2 id="athletes-title" className="text-xs font-bold text-app-muted-foreground uppercase tracking-widest">
              Atleti
            </h2>
            <button
              onClick={() => navigate(routes.athletes)}
              className="text-xs font-semibold text-app-accent flex items-center gap-1"
            >
              Vedi tutti <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-app-muted rounded-xl" />
              ))}
            </div>
          ) : athletes.length === 0 ? (
            <EmptyBlock
              title="Nessun atleta connesso"
              description="Invita il tuo primo atleta per iniziare"
              actionLabel="Invita atleta"
              onAction={() => navigate(routes.athletesInvite)}
            />
          ) : (
            <div className="space-y-2">
              {athletes.slice(0, 5).map((a) => (
                <AthleteRow
                  key={a.id}
                  athlete={a}
                  onClick={() => navigate(routes.athlete(a.user_id))}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="alerts-title">
          <div className="flex items-center justify-between mb-3">
            <h2 id="alerts-title" className="text-xs font-bold text-app-muted-foreground uppercase tracking-widest">
              Avvisi
            </h2>
          </div>

          {isLoading ? (
            <Skeleton className="h-20 w-full bg-app-muted rounded-xl" />
          ) : alerts.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Tutto sotto controllo</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-300/70">Nessun avviso al momento</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onClick={() => alert.action_url && navigate(alert.action_url)}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="analytics-title" className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 id="analytics-title" className="text-xs font-bold text-app-muted-foreground uppercase tracking-widest">
              Analytics
            </h2>
            <button
              onClick={() => navigate(routes.workouts)}
              className="text-xs font-semibold text-app-accent flex items-center gap-1"
            >
              Schede <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniMetric
              icon={Wallet}
              label="Fatturato mese"
              value={`€${(analytics?.monthly_revenue ?? 0).toLocaleString('it-IT')}`}
            />
            <MiniMetric
              icon={Clock}
              label="In attesa"
              value={`€${(analytics?.pending_payments ?? 0).toLocaleString('it-IT')}`}
            />
            <MiniMetric
              icon={Activity}
              label="Completam."
              value={`${analytics?.workout_completion_pct ?? 0}%`}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

interface ActionCardProps {
  icon: React.ElementType;
  label: string;
  hint?: string;
  accent?: boolean;
  onClick?: () => void;
}

function ActionCard({ icon: Icon, label, hint, accent, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-start gap-3 p-4 rounded-2xl border text-left transition-all active:scale-[0.98] min-h-[112px] ${
        accent
          ? 'bg-app-accent text-app-accent-foreground border-app-accent shadow-lg shadow-app-accent/20'
          : 'bg-app-card border-app-border hover:bg-app-muted/60'
      }`}
    >
      <div
        className={`h-10 w-10 rounded-xl flex items-center justify-center ${
          accent ? 'bg-black/10' : 'bg-app-muted'
        }`}
      >
        <Icon className={`h-5 w-5 ${accent ? 'text-app-accent-foreground' : 'text-app-accent'}`} />
      </div>
      <div>
        <p className={`text-sm font-semibold leading-tight ${accent ? '' : 'text-app-foreground'}`}>
          {label}
        </p>
        {hint && (
          <p className={`text-[11px] mt-0.5 ${accent ? 'opacity-70' : 'text-app-muted-foreground'}`}>
            {hint}
          </p>
        )}
      </div>
    </button>
  );
}

function AthleteRow({ athlete, onClick }: { athlete: PTHomeAthlete; onClick?: () => void }) {
  const fullName =
    [athlete.first_name, athlete.last_name].filter(Boolean).join(' ') || athlete.email || 'Atleta';
  const initials = `${athlete.first_name?.[0] || ''}${athlete.last_name?.[0] || ''}`.toUpperCase() || 'A';

  const lastSeen = athlete.last_activity_at
    ? formatDistanceToNow(new Date(athlete.last_activity_at), { addSuffix: true, locale: it })
    : 'mai';

  const statusConfig = {
    active: { label: 'Attivo', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
    in_session: { label: 'In sessione', className: 'bg-app-accent/20 text-app-accent border-app-accent/30' },
    inactive: { label: 'Inattivo', className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20' },
  }[athlete.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-app-card border border-app-border hover:bg-app-muted/50 transition-colors text-left active:scale-[0.99]"
    >
      <Avatar className="h-11 w-11 flex-shrink-0">
        <AvatarImage src={athlete.avatar_url || undefined} />
        <AvatarFallback className="bg-app-muted text-app-accent text-sm font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-app-foreground truncate">{fullName}</p>
          {athlete.missed_workouts > 0 && (
            <span className="text-[10px] font-bold text-red-500 bg-red-500/15 px-1.5 py-0.5 rounded">
              -{athlete.missed_workouts}
            </span>
          )}
        </div>
        <p className="text-xs text-app-muted-foreground truncate">Ultimo accesso: {lastSeen}</p>
      </div>

      <span
        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border ${statusConfig.className}`}
      >
        {statusConfig.label}
      </span>
      <ChevronRight className="h-4 w-4 text-app-muted-foreground flex-shrink-0" />
    </button>
  );
}

function AlertRow({ alert, onClick }: { alert: PTHomeAlert; onClick?: () => void }) {
  const severityConfig = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300',
    critical: 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300',
  }[alert.severity];

  const iconColor = {
    info: 'text-blue-500',
    warning: 'text-amber-500',
    critical: 'text-red-500',
  }[alert.severity];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left active:scale-[0.99] transition-transform ${severityConfig}`}
    >
      <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{alert.title}</p>
        <p className="text-xs opacity-80">{alert.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 opacity-60 flex-shrink-0" />
    </button>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-app-card border border-app-border">
      <Icon className="h-4 w-4 text-app-muted-foreground mb-2" />
      <p className="text-base font-bold text-app-foreground truncate">{value}</p>
      <p className="text-[10px] text-app-muted-foreground truncate">{label}</p>
    </div>
  );
}

function EmptyBlock({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 p-6 rounded-xl bg-app-card border border-dashed border-app-border">
      <TrendingUp className="h-8 w-8 text-app-muted-foreground" />
      <div>
        <p className="text-sm font-semibold text-app-foreground">{title}</p>
        <p className="text-xs text-app-muted-foreground">{description}</p>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold text-app-accent flex items-center gap-1"
        >
          {actionLabel} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default PTAppHome;
