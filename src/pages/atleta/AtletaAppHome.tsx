import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DashboardSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { PtCoachingPausedCard } from '@/components/app/PtCoachingPausedCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/app/AppHeader';
import { CoachCard } from '@/components/app/CoachCard';
import { InviteAtletaCTA } from '@/components/shared/InviteAtletaCTA';
import { motion } from 'framer-motion';
import {
  Search,
  Lock,
  MessageCircle,
  Compass,
  Play,
  RotateCcw,
  Dumbbell,
  Calendar as CalendarIcon,
} from 'lucide-react';

// =====================================================
// ATLETA APP HOME - Action-first
// Focus totale sull'allenamento del giorno / in corso
// =====================================================

type WorkoutSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_date: string | null;
  pt_user_id: string | null;
  workout_exercises: { id: string; prescribed_sets: number }[];
};

export function AtletaAppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    connection,
    ptName,
    isLoading: statusLoading,
    isConnected,
    hasPendingRequest,
    canAccessWorkouts,
    isCoachingPaused,
  } = useAtletaStatus();

  // Profilo
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

  // Allenamento prioritario: in_corso > in_sospeso > attivo di oggi
  const { data: focusWorkout, isLoading: workoutLoading } = useQuery({
    queryKey: ['atleta-focus-workout', user?.id],
    queryFn: async (): Promise<{ workout: WorkoutSummary; mode: 'resume' | 'today' } | null> => {
      if (!user?.id) return null;
      const today = new Date().toISOString().split('T')[0];

      // 1) in_corso o in_sospeso → resume
      const { data: resumeData } = await supabase
        .from('workouts')
        .select(`
          id, title, description, status, scheduled_date, pt_user_id,
          workout_exercises(id, prescribed_sets)
        `)
        .eq('atleta_user_id', user.id)
        .in('status', ['in_corso', 'in_sospeso'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resumeData) {
        return { workout: resumeData as WorkoutSummary, mode: 'resume' };
      }

      // 2) attivo schedulato oggi → today
      const { data: todayData } = await supabase
        .from('workouts')
        .select(`
          id, title, description, status, scheduled_date, pt_user_id,
          workout_exercises(id, prescribed_sets)
        `)
        .eq('atleta_user_id', user.id)
        .eq('scheduled_date', today)
        .eq('status', 'attivo')
        .limit(1)
        .maybeSingle();

      if (todayData) {
        return { workout: todayData as WorkoutSummary, mode: 'today' };
      }

      return null;
    },
    enabled: !!user?.id && isConnected && canAccessWorkouts,
  });

  // Logs per calcolare progresso del workout in resume
  const { data: progressData } = useQuery({
    queryKey: ['atleta-focus-progress', focusWorkout?.workout.id],
    queryFn: async () => {
      const w = focusWorkout?.workout;
      if (!w) return { completed: 0, total: 0 };
      const exerciseIds = w.workout_exercises?.map((e) => e.id) || [];
      const totalSets = (w.workout_exercises || []).reduce(
        (acc, ex) => acc + (ex.prescribed_sets || 0),
        0,
      );
      if (exerciseIds.length === 0) return { completed: 0, total: 0 };
      const { data } = await supabase
        .from('workout_logs')
        .select('id')
        .in('workout_exercise_id', exerciseIds)
        .eq('is_completed', true);
      return { completed: data?.length || 0, total: totalSets };
    },
    enabled: !!focusWorkout?.workout.id && focusWorkout.mode === 'resume',
  });

  const avatarInitials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  const startWorkout = () => {
    if (focusWorkout) {
      navigate(`/app/workout/${focusWorkout.workout.id}`);
    }
  };

  return (
    <div
      className="min-h-screen bg-app-background text-app-foreground pb-24"
      data-tour="atleta-greeting"
    >
      <AppHeader
        avatarUrl={profile?.avatar_url || undefined}
        avatarInitials={avatarInitials}
        showNotifications
        notificationCount={0}
        onAvatarPress={() => navigate('/app/profile')}
        onNotificationPress={() => navigate('/app/notifications')}
      />

      <main className="px-4 pt-6 space-y-6">
        {statusLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Coach card sempre visibile (gestisce: active / invito / pending / nessuno) */}
            <CoachCard />

            {!isConnected && !hasPendingRequest ? (
              // ───────────────── NON COLLEGATO ─────────────────
              <NoConnectionState onDiscover={() => navigate('/app/discover')} />
            ) : hasPendingRequest ? null : isCoachingPaused ? (
              <PtCoachingPausedCard ptName={ptName} />
            ) : workoutLoading ? (
              <FocusSkeleton />
            ) : focusWorkout ? (
              // ───────── ALLENAMENTO IN CORSO / DI OGGI ─────────
              <FocusWorkoutHero
                title={focusWorkout.workout.title}
                description={focusWorkout.workout.description}
                coachName={ptName || 'Il tuo Coach'}
                mode={focusWorkout.mode}
                completedSets={progressData?.completed || 0}
                totalSets={progressData?.total || 0}
                onAction={startWorkout}
              />
            ) : (
              // ───────────────── NESSUN ALLENAMENTO ─────────────
              <NoWorkoutState
                onChat={() => navigate('/app/chat')}
                onDiscover={() => navigate('/app/discover')}
                hasCoach={!!connection}
              />
            )}

            {/* Invita un amico — link condivisibile per far scaricare l'app */}
            {!hasPendingRequest && (
              <InviteAtletaCTA
                refUserId={isConnected ? connection?.pt_user_id : undefined}
                title="Invita un amico"
                subtitle="Condividi il link e invita un amico"
                shareText="Allenati con me su Livelapp: scarica l'app e inizia il tuo percorso fitness!"
              />
            )}

            {/* Link secondari (solo se collegato) */}
            {isConnected && !hasPendingRequest && (
              <div className="pt-2">
                <button
                  onClick={() => navigate('/app/workout')}
                  className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-app-accent transition-colors py-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Vedi tutti i miei allenamenti
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// =====================================================
// HERO: workout in focus
// =====================================================
function FocusWorkoutHero({
  title,
  description,
  coachName,
  mode,
  completedSets,
  totalSets,
  onAction,
}: {
  title: string;
  description: string | null;
  coachName: string;
  mode: 'resume' | 'today';
  completedSets: number;
  totalSets: number;
  onAction: () => void;
}) {
  const isResume = mode === 'resume';
  const progressPct =
    totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-app-accent/15 via-gray-900 to-black p-6 shadow-2xl"
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-app-accent/20 blur-3xl" />

      <div className="relative space-y-6">
        {/* Badge stato */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              isResume
                ? 'bg-app-accent text-black'
                : 'bg-white/10 text-app-accent'
            }`}
          >
            {isResume ? (
              <>
                <RotateCcw className="h-3 w-3" />
                Da riprendere
              </>
            ) : (
              <>
                <Dumbbell className="h-3 w-3" />
                Allenamento di oggi
              </>
            )}
          </span>
        </div>

        {/* Titolo + coach */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold leading-tight text-white">
            {title}
          </h1>
          {description && !isResume && (
            <p className="text-sm text-white/60 line-clamp-2">{description}</p>
          )}
          <p className="text-sm text-white/50">
            con <span className="text-app-accent font-medium">{coachName}</span>
          </p>
        </div>

        {/* Progress se resume */}
        {isResume && totalSets > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>
                {completedSets} / {totalSets} serie completate
              </span>
              <span className="font-semibold text-app-accent">
                {progressPct}%
              </span>
            </div>
            <Progress
              value={progressPct}
              className="h-2 bg-white/10 [&>div]:bg-app-accent"
            />
          </div>
        )}

        {/* CTA principale - grande e centrale */}
        <Button
          onClick={onAction}
          className="w-full h-16 rounded-2xl bg-app-accent text-black hover:bg-app-accent/90 text-lg font-bold shadow-lg shadow-app-accent/30 transition-transform active:scale-[0.98]"
        >
          {isResume ? (
            <>
              <RotateCcw className="h-5 w-5" />
              Continua allenamento
            </>
          ) : (
            <>
              <Play className="h-5 w-5 fill-black" />
              Allenati
            </>
          )}
        </Button>
      </div>
    </motion.section>
  );
}

// =====================================================
// STATE: nessun allenamento oggi
// =====================================================
function NoWorkoutState({
  onChat,
  onDiscover,
  hasCoach,
}: {
  onChat: () => void;
  onDiscover: () => void;
  hasCoach: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 rounded-3xl border border-white/10 bg-gray-900/60 p-6 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-app-accent/10">
        <Dumbbell className="h-8 w-8 text-app-accent" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">
          Nessun allenamento assegnato oggi
        </h2>
        <p className="text-sm text-white/50">
          Goditi il riposo o organizza il prossimo step con il tuo coach.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {hasCoach && (
          <Button
            onClick={onChat}
            className="h-12 rounded-xl bg-app-accent text-black hover:bg-app-accent/90 font-semibold"
          >
            <MessageCircle className="h-4 w-4" />
            Contatta Coach
          </Button>
        )}
        <Button
          onClick={onDiscover}
          variant="outline"
          className={`h-12 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 font-semibold ${
            !hasCoach ? 'sm:col-span-2' : ''
          }`}
        >
          <Compass className="h-4 w-4" />
          Esplora PT
        </Button>
      </div>
    </motion.section>
  );
}

// =====================================================
// STATE: non collegato a nessun PT
// =====================================================
function NoConnectionState({ onDiscover }: { onDiscover: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 rounded-3xl border border-white/10 bg-gradient-to-br from-app-accent/10 via-gray-900 to-black p-6 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-app-accent/15">
        <Search className="h-8 w-8 text-app-accent" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white">
          Trova il tuo Personal Trainer
        </h2>
        <p className="text-sm text-white/50">
          Inizia il tuo percorso con un coach professionista per ricevere
          allenamenti personalizzati.
        </p>
      </div>
      <Button
        onClick={onDiscover}
        className="w-full h-14 rounded-2xl bg-app-accent text-black hover:bg-app-accent/90 text-base font-bold shadow-lg shadow-app-accent/30"
      >
        <Compass className="h-5 w-5" />
        Cerca un PT
      </Button>
      <div className="inline-flex items-center gap-2 text-xs text-white/40">
        <Lock className="h-3 w-3" />
        Allenamenti sbloccati al collegamento
      </div>
    </motion.section>
  );
}

// =====================================================
// STATE: richiesta in attesa
// =====================================================
function PendingRequestState({
  ptUserId,
  onViewPT,
}: {
  ptUserId?: string;
  onViewPT: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 rounded-3xl border border-white/10 bg-gray-900/60 p-6 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
        <RotateCcw className="h-8 w-8 text-yellow-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Richiesta inviata</h2>
        <p className="text-sm text-white/50">
          Riceverai una notifica quando il PT accetterà la tua richiesta.
        </p>
      </div>
      {ptUserId && (
        <Button
          onClick={onViewPT}
          variant="outline"
          className="h-12 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          Vedi profilo PT
        </Button>
      )}
    </motion.section>
  );
}

// =====================================================
// Skeleton hero
// =====================================================
function FocusSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-gray-900/60 p-6 space-y-5 animate-pulse">
      <div className="h-5 w-24 rounded-full bg-white/10" />
      <div className="space-y-2">
        <div className="h-8 w-3/4 rounded bg-white/10" />
        <div className="h-4 w-1/2 rounded bg-white/10" />
      </div>
      <div className="h-16 w-full rounded-2xl bg-white/10" />
    </div>
  );
}

export default AtletaAppHome;
