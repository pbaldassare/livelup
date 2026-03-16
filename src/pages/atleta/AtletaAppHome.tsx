import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton, WorkoutCardSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MobileNav } from '@/components/app/MobileNav';
import { AppHeader } from '@/components/app/AppHeader';
import { WeekCalendar } from '@/components/app/WeekCalendar';
import { WorkoutCard, CompactWorkoutCard } from '@/components/app/WorkoutCard';
import { CTABanner, AchievementBanner } from '@/components/app/CTABanner';
import { ReviewPromptCard } from '@/components/reviews/ReviewPromptCard';
import { WeeklyStatsSection } from '@/components/app/WeeklyStatsSection';
import { AIAssistantCard } from '@/components/app/AIAssistantCard';
import { TeammatesSection } from '@/components/app/TeammatesSection';
import { 
  Search, 
  Lock,
  CalendarDays,
} from 'lucide-react';

// Helper per formattazione data in italiano
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

// =====================================================
// ATLETA APP HOME - Dashboard Mobile/PWA
// Design: dark theme, lime accent, workout cards
// Solo per ruolo: atleta
// =====================================================

export function AtletaAppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    status, 
    connection, 
    ptName, 
    isLoading: statusLoading,
    isConnected,
    hasPendingRequest,
    canAccessWorkouts
  } = useAtletaStatus();

  // Fetch profile for name
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

  // Fetch today's workout (if connected)
  const { data: todayWorkout, isLoading: workoutLoading } = useQuery({
    queryKey: ['atleta-today-workout', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, description, status, scheduled_date')
        .eq('atleta_user_id', user.id)
        .eq('scheduled_date', today)
        .eq('status', 'attivo')
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && isConnected,
  });

  // Fetch upcoming workouts (next 5)
  const { data: upcomingWorkouts } = useQuery({
    queryKey: ['atleta-upcoming-workouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id, title, description, status, scheduled_date,
          workout_exercises(id)
        `)
        .eq('atleta_user_id', user.id)
        .eq('status', 'attivo')
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && isConnected,
  });

  // Fetch weekly stats using database function
  const { data: weeklyStats } = useQuery({
    queryKey: ['atleta-weekly-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .rpc('get_weekly_workout_stats', { _atleta_user_id: user.id });
      if (error) throw error;
      return data?.[0] || { completed_this_week: 0, current_streak: 0, total_completed: 0 };
    },
    enabled: !!user?.id,
  });

  // Fetch recent progress
  const { data: latestProgress } = useQuery({
    queryKey: ['atleta-latest-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('progress_tracking')
        .select('weight_kg, mood_level, energy_level, tracked_date')
        .eq('atleta_user_id', user.id)
        .order('tracked_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Mock week data
  const weekDays = [
    { day: 'L', date: 20, isCompleted: true, isToday: false, isFuture: false },
    { day: 'M', date: 21, isCompleted: true, isToday: false, isFuture: false },
    { day: 'M', date: 22, isCompleted: true, isToday: false, isFuture: false },
    { day: 'G', date: 23, isCompleted: false, isToday: true, isFuture: false },
    { day: 'V', date: 24, isCompleted: false, isToday: false, isFuture: true },
    { day: 'S', date: 25, isCompleted: false, isToday: false, isFuture: true },
    { day: 'D', date: 26, isCompleted: false, isToday: false, isFuture: true },
  ];

  const avatarInitials = profile 
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() 
    : 'U';

  return (
    <div className="min-h-screen bg-app-background text-app-foreground pb-20" data-tour="atleta-greeting">
      {/* Header with Avatar and Week Calendar */}
      <AppHeader
        avatarUrl={profile?.avatar_url || undefined}
        avatarInitials={avatarInitials}
        showNotifications
        notificationCount={2}
        onAvatarPress={() => navigate('/app/profile')}
        onNotificationPress={() => {}}
      >
        <div data-tour="atleta-week-calendar"><WeekCalendar days={weekDays} /></div>
      </AppHeader>

      <main className="px-4 space-y-4 pt-2">
        {statusLoading ? (
          <DashboardSkeleton />
        ) : !isConnected && !hasPendingRequest ? (
          // NON COLLEGATO
          <>
            <CTABanner
              title="Trova il tuo Personal Trainer"
              subtitle="Inizia il tuo percorso con un coach professionista"
              actionLabel="Cerca PT"
              icon={Search}
              onAction={() => navigate('/app/discover')}
            />

            <CompactWorkoutCard
              title="Welcome Workout"
              coach="Demo Coach"
              duration={33}
              category="Full Body Strength"
              rating={4.8}
              completions={35694}
              onPress={() => {}}
            />

            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-white/40 text-sm mb-4">
                <Lock className="h-4 w-4" />
                Collegati con un PT per sbloccare tutti gli allenamenti
              </div>
              <Button 
                className="bg-app-accent hover:bg-app-accent/90 text-black font-bold"
                onClick={() => navigate('/app/discover')}
              >
                Trova un Personal Trainer
              </Button>
            </div>
          </>
        ) : hasPendingRequest ? (
          // RICHIESTA PENDING
          <>
            <AchievementBanner
              title="Richiesta inviata!"
              subtitle="Attendi che il PT accetti la tua richiesta"
              actionLabel="Vedi profilo PT"
              onAction={() => connection && navigate(`/app/pt/${connection.pt_user_id}`)}
            />

            <div className="text-center py-8 text-white/50 text-sm">
              Riceverai una notifica quando la tua richiesta sarà accettata
            </div>
          </>
        ) : (
          // COLLEGATO
          <>
            {/* Review Prompt - shows if can review */}
            {connection && (
              <ReviewPromptCard
                ptUserId={connection.pt_user_id}
                ptName={ptName || 'il tuo PT'}
              />
            )}

            {/* Achievement Banner */}
            <AchievementBanner
              title="Check in con il tuo coach e fissa un obiettivo"
              actionLabel="Vai alla Chat"
              onAction={() => navigate('/app/chat')}
            />

            {/* Booking CTA */}
            <CTABanner
              title="Prenota una sessione"
              subtitle="Scegli data e orario con il tuo PT"
              actionLabel="Prenota"
              icon={CalendarDays}
              onAction={() => navigate('/app/booking')}
            />

            {/* PT Info */}
            {connection && (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{ptName || 'Il tuo PT'}</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-app-accent"
                  onClick={() => navigate(`/app/pt/${connection.pt_user_id}`)}
                >
                  Profilo PT
                </Button>
              </div>
            )}

            {/* Today's Workout */}
            <div data-tour="atleta-today-workout">
            {workoutLoading ? (
              <WorkoutCardSkeleton />
            ) : todayWorkout ? (
              <WorkoutCard
                title={todayWorkout.title}
                subtitle={todayWorkout.description || undefined}
                duration={35}
                dayLabel="Oggi"
                isFeatured
                completions={834}
                onPress={() => navigate(`/app/workout/${todayWorkout.id}`)}
                onPreview={() => {}}
              />
            ) : (
              <WorkoutCard
                title="Nessun allenamento"
                subtitle="Oggi è un giorno di riposo"
                dayLabel="Oggi"
                onPress={() => navigate('/app/workout')}
              />
            )}

            {/* Prossimi Allenamenti */}
            {upcomingWorkouts && upcomingWorkouts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-app-accent" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                    I tuoi prossimi allenamenti
                  </h3>
                </div>
                {upcomingWorkouts.slice(0, 3).map((workout) => (
                  <div 
                    key={workout.id}
                    onClick={() => navigate(`/app/workout/${workout.id}`)}
                    className="bg-gray-900/60 rounded-xl p-4 border border-white/10 
                               cursor-pointer hover:border-app-accent/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-app-accent font-medium">
                        {formatDate(workout.scheduled_date)}
                      </span>
                      <span className="text-xs text-white/40">
                        {workout.workout_exercises?.length || 0} esercizi
                      </span>
                    </div>
                    <h4 className="text-white font-semibold">{workout.title}</h4>
                    {workout.description && (
                      <p className="text-white/50 text-sm mt-1 line-clamp-1">
                        {workout.description}
                      </p>
                    )}
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full text-app-accent hover:text-app-accent hover:bg-app-accent/10"
                  onClick={() => navigate('/app/workout')}
                >
                  Vedi tutti gli allenamenti
                </Button>
              </div>
            )}

            {/* Weekly Stats */}
            {weeklyStats && (
              <WeeklyStatsSection
                completedThisWeek={weeklyStats.completed_this_week}
                currentStreak={weeklyStats.current_streak}
                totalCompleted={weeklyStats.total_completed}
              />
            )}

            {/* AI Assistant */}
            <AIAssistantCard />

            {/* Teammates Section */}
            <TeammatesSection />

            {/* Progress Stats */}
            {latestProgress && (
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Peso" value={`${latestProgress.weight_kg || '--'} kg`} />
                <StatBox label="Umore" value={latestProgress.mood_level || '--'} />
                <StatBox label="Energia" value={latestProgress.energy_level || '--'} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <MobileNav role="atleta" />
    </div>
  );
}

// Stat Box Component
function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-white/10">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

export default AtletaAppHome;
