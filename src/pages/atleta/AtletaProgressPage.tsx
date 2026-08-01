import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Zap, BarChart3, Calendar as CalendarIcon, Dumbbell, Camera, History
} from 'lucide-react';
import { format, subDays, isSameDay, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import { ActivityCalendar } from '@/components/app/ActivityCalendar';
import { ProfileStats } from '@/components/app/ProfileStats';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { ProgressPhotos } from '@/components/app/ProgressPhotos';
import { WorkoutHistoryList } from '@/components/shared/WorkoutHistoryList';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { PtCoachingPausedCard } from '@/components/app/PtCoachingPausedCard';

// =====================================================
// ATLETA PROGRESS PAGE - With real recharts graphs
// =====================================================

export function AtletaProgressPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isCoachingPaused, ptName, canAccessWorkouts } = useAtletaStatus();
  const [activeTab, setActiveTab] = useState('calendar');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [newEntry, setNewEntry] = useState({
    weight_kg: '', mood_level: 3, energy_level: 3, notes: '',
  });

  // Fetch progress data
  const { data: progressData } = useQuery({
    queryKey: ['atleta-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('progress_tracking')
        .select('*')
        .eq('atleta_user_id', user.id)
        .order('tracked_date', { ascending: true })
        .limit(90);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch workouts for calendar + volume stats
  const { data: workouts } = useQuery({
    queryKey: ['atleta-workouts-calendar', user?.id, canAccessWorkouts],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workouts')
        .select('*, workout_exercises(*, exercises(name))')
        .eq('atleta_user_id', user.id)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch workout logs for volume tracking
  const { data: workoutLogs } = useQuery({
    queryKey: ['atleta-workout-logs', user?.id],
    queryFn: async () => {
      if (!user?.id || !workouts) return [];
      const exerciseIds = workouts.flatMap(w => 
        (w.workout_exercises || []).map((we: any) => we.id)
      );
      if (exerciseIds.length === 0) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*, workout_exercises(workout_id, exercises(name))')
        .in('workout_exercise_id', exerciseIds.slice(0, 500))
        .eq('is_completed', true)
        .order('logged_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!workouts,
  });

  // Add entry mutation
  const addEntryMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      const { error } = await supabase.from('progress_tracking').insert({
        atleta_user_id: user.id,
        tracked_date: new Date().toISOString().split('T')[0],
        weight_kg: newEntry.weight_kg ? parseFloat(newEntry.weight_kg) : null,
        mood_level: newEntry.mood_level,
        energy_level: newEntry.energy_level,
        notes: newEntry.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dati salvati!');
      setShowAddSheet(false);
      setNewEntry({ weight_kg: '', mood_level: 3, energy_level: 3, notes: '' });
      queryClient.invalidateQueries({ queryKey: ['atleta-progress'] });
    },
    onError: (error: any) => { toast.error(error.message); },
  });

  // Weight chart data
  const weightChartData = useMemo(() => {
    if (!progressData) return [];
    return progressData
      .filter(p => p.weight_kg)
      .map(p => ({
        date: format(new Date(p.tracked_date), 'd/M', { locale: it }),
        peso: p.weight_kg,
      }));
  }, [progressData]);

  // Weekly volume chart data
  const weeklyVolumeData = useMemo(() => {
    if (!workoutLogs || workoutLogs.length === 0) return [];
    const weeks = eachWeekOfInterval({
      start: subWeeks(new Date(), 7),
      end: new Date(),
    }, { weekStartsOn: 1 });

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekLogs = workoutLogs.filter(log => {
        const logDate = new Date(log.logged_at);
        return logDate >= weekStart && logDate <= weekEnd;
      });
      const volume = weekLogs.reduce((sum, log) => 
        sum + (log.reps_completed || 0) * (log.weight_used || 0), 0
      );
      const totalReps = weekLogs.reduce((sum, log) => sum + (log.reps_completed || 0), 0);
      return {
        week: format(weekStart, 'd/M', { locale: it }),
        volume: Math.round(volume),
        reps: totalReps,
      };
    });
  }, [workoutLogs]);

  // Exercise unique list from logs
  const exerciseList = useMemo(() => {
    if (!workoutLogs) return [];
    const exercises = new Map<string, { name: string; count: number }>();
    workoutLogs.forEach((log: any) => {
      const name = log.workout_exercises?.exercises?.name;
      if (name) {
        const existing = exercises.get(name);
        exercises.set(name, { name, count: (existing?.count || 0) + 1 });
      }
    });
    return Array.from(exercises.values()).sort((a, b) => b.count - a.count);
  }, [workoutLogs]);

  // Stats
  const completedWorkouts = workouts?.filter(w => w.status === 'completato').length || 0;
  const totalMinutes = completedWorkouts * 35;
  const last7Days = progressData?.filter(p => new Date(p.tracked_date) >= subDays(new Date(), 7)) || [];
  const avgMood = last7Days.length > 0
    ? (last7Days.reduce((sum, p) => sum + (p.mood_level || 0), 0) / last7Days.length).toFixed(1)
    : '--';
  const avgEnergy = last7Days.length > 0
    ? (last7Days.reduce((sum, p) => sum + (p.energy_level || 0), 0) / last7Days.length).toFixed(1)
    : '--';

  const workoutDays = workouts?.map(w => ({
    date: new Date(w.scheduled_date || w.created_at),
    hasWorkout: true,
    isCompleted: w.status === 'completato',
  })) || [];

  const workoutsForDate = workouts?.filter(w => {
    const workoutDate = new Date(w.scheduled_date || w.created_at);
    return isSameDay(workoutDate, selectedDate);
  }).map(w => ({
    id: w.id, title: w.title, duration: '35 mins', category: 'Allenamento', isFeatured: true,
  })) || [];

  const headerStats = [
    { value: completedWorkouts, label: 'Workouts', color: 'blue' as const, progress: 70 },
    { value: totalMinutes, label: 'Minutes', color: 'blue' as const, progress: 55 },
    { value: avgMood, label: 'Mood Avg', color: 'orange' as const, progress: parseFloat(avgMood as string) * 20 || 0 },
    { value: avgEnergy, label: 'Energy Avg', color: 'pink' as const, progress: parseFloat(avgEnergy as string) * 20 || 0 },
  ];

  return (
    <div className="min-h-screen bg-app-background pb-20" data-tour="progress-page">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-app-border">
        <div>
          <h1 className="text-2xl font-bold text-app-foreground">I miei progressi</h1>
          <p className="text-sm text-app-muted-foreground">Traccia il tuo percorso</p>
        </div>
        <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
          <SheetTrigger asChild>
            <Button size="icon" className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90">
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] bg-app-background border-app-border">
            <SheetHeader>
              <SheetTitle className="text-app-foreground">Aggiungi check-in</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-app-foreground">Peso (kg)</Label>
                <Input type="number" step="0.1" placeholder="Es: 75.5" value={newEntry.weight_kg}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, weight_kg: e.target.value }))}
                  className="bg-app-muted border-app-border text-app-foreground" />
              </div>
              <div className="space-y-3">
                <Label className="text-app-foreground">Come ti senti oggi? ({newEntry.mood_level}/5)</Label>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">😔</span>
                  <Slider value={[newEntry.mood_level]} onValueChange={([value]) => setNewEntry(prev => ({ ...prev, mood_level: value }))} min={1} max={5} step={1} className="flex-1" />
                  <span className="text-2xl">😁</span>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-app-foreground">Livello energia ({newEntry.energy_level}/5)</Label>
                <div className="flex items-center gap-4">
                  <Zap className="h-5 w-5 text-app-muted-foreground" />
                  <Slider value={[newEntry.energy_level]} onValueChange={([value]) => setNewEntry(prev => ({ ...prev, energy_level: value }))} min={1} max={5} step={1} className="flex-1" />
                  <Zap className="h-5 w-5 text-app-accent" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Note (opzionale)</Label>
                <Input placeholder="Come è andata oggi?" value={newEntry.notes}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-app-muted border-app-border text-app-foreground" />
              </div>
              <Button className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                onClick={() => addEntryMutation.mutate()} disabled={addEntryMutation.isPending}>
                {addEntryMutation.isPending ? 'Salvataggio...' : 'Salva check-in'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <ProfileStats stats={headerStats} className="border-b border-app-border" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-transparent border-b border-app-border rounded-none p-0 h-auto">
          <TabsTrigger value="calendar" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3">
            <CalendarIcon className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3">
            <BarChart3 className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3">
            <Dumbbell className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3">
            <Camera className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3">
            <History className="h-5 w-5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-0">
          <ActivityCalendar
            workoutDays={workoutDays}
            workoutsForDate={workoutsForDate}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onWorkoutClick={(id) => navigate(`/app/workout/${id}`)}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-0 p-4 space-y-6">
          <h2 className="text-xl font-bold text-app-foreground">Statistiche</h2>

          {/* Weight chart */}
          <div className="bg-app-muted rounded-xl p-4">
            <h3 className="font-semibold text-app-foreground mb-3">Andamento peso</h3>
            {weightChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weightChartData}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--app-accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--app-accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--app-muted-foreground))' }} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 11, fill: 'hsl(var(--app-muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--app-card))', border: '1px solid hsl(var(--app-border))', borderRadius: '8px', color: 'hsl(var(--app-foreground))' }}
                    labelStyle={{ color: 'hsl(var(--app-muted-foreground))' }}
                  />
                  <Area type="monotone" dataKey="peso" stroke="hsl(var(--app-accent))" fill="url(#weightGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-app-muted-foreground text-sm">
                Registra almeno 2 check-in peso per vedere il grafico
              </div>
            )}
          </div>

          {/* Weekly volume chart */}
          <div className="bg-app-muted rounded-xl p-4">
            <h3 className="font-semibold text-app-foreground mb-3">Volume settimanale (kg × reps)</h3>
            {weeklyVolumeData.some(d => d.volume > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--app-muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--app-muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--app-card))', border: '1px solid hsl(var(--app-border))', borderRadius: '8px', color: 'hsl(var(--app-foreground))' }}
                  />
                  <Bar dataKey="volume" fill="hsl(var(--app-accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-app-muted-foreground text-sm">
                Completa workout con peso per vedere il volume
              </div>
            )}
          </div>

          {/* Recent check-ins */}
          <div>
            <h3 className="font-semibold text-app-foreground mb-3">Check-in recenti</h3>
            <div className="space-y-2">
              {progressData?.slice(-5).reverse().map((entry) => (
                <div key={entry.id} className="bg-app-muted rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-app-foreground">
                      {format(new Date(entry.tracked_date), 'd MMMM yyyy', { locale: it })}
                    </span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    {entry.weight_kg && (
                      <div><p className="text-app-muted-foreground">Peso</p><p className="font-medium text-app-foreground">{entry.weight_kg} kg</p></div>
                    )}
                    {entry.mood_level && (
                      <div><p className="text-app-muted-foreground">Umore</p><p className="font-medium text-app-foreground">{entry.mood_level}/5</p></div>
                    )}
                    {entry.energy_level && (
                      <div><p className="text-app-muted-foreground">Energia</p><p className="font-medium text-app-foreground">{entry.energy_level}/5</p></div>
                    )}
                  </div>
                </div>
              ))}
              {(!progressData || progressData.length === 0) && (
                <div className="text-center py-8 text-app-muted-foreground">Nessun check-in registrato</div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exercises" className="mt-0 p-4">
          <h2 className="text-xl font-bold text-app-foreground mb-4">I tuoi esercizi</h2>
          <div className="space-y-2">
            {exerciseList.length > 0 ? (
              exerciseList.map((exercise) => (
                <div key={exercise.name} className="flex items-center justify-between p-4 bg-app-muted rounded-xl">
                  <div>
                    <span className="font-medium text-app-foreground">{exercise.name}</span>
                    <p className="text-xs text-app-muted-foreground">{exercise.count} set registrati</p>
                  </div>
                  <Dumbbell className="h-5 w-5 text-app-muted-foreground" />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-app-muted-foreground">
                Completa dei workout per vedere la cronologia esercizi
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="photos" className="mt-0">
          <ProgressPhotos />
        </TabsContent>

        <TabsContent value="history" className="mt-0 p-4">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-app-foreground">Storico allenamenti</h2>
            <p className="text-sm text-app-muted-foreground mt-0.5">
              Prescritto vs eseguito per ogni serie completata
            </p>
          </div>
          {isCoachingPaused ? (
            <PtCoachingPausedCard ptName={ptName} />
          ) : (
            user?.id && <WorkoutHistoryList atletaUserId={user.id} variant="atleta" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AtletaProgressPage;
