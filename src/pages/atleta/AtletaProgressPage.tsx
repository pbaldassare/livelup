import { useState } from 'react';
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
  Plus,
  Zap,
  BarChart3,
  Calendar as CalendarIcon,
  Dumbbell
} from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { ActivityCalendar } from '@/components/app/ActivityCalendar';
import { ExerciseHistory } from '@/components/app/ExerciseHistory';
import { ProfileStats } from '@/components/app/ProfileStats';

// =====================================================
// ATLETA PROGRESS PAGE - Design reference: Ladder_iOS_161/163/167
// =====================================================

export function AtletaProgressPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('calendar');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  
  // Form state for new entry
  const [newEntry, setNewEntry] = useState({
    weight_kg: '',
    mood_level: 3,
    energy_level: 3,
    notes: '',
  });

  // Fetch progress data
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['atleta-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('progress_tracking')
        .select('*')
        .eq('atleta_user_id', user.id)
        .order('tracked_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch workouts for calendar
  const { data: workouts } = useQuery({
    queryKey: ['atleta-workouts-calendar', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workouts')
        .select('*, workout_exercises(*, exercises(*))')
        .eq('atleta_user_id', user.id)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Add entry mutation
  const addEntryMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      const { error } = await supabase
        .from('progress_tracking')
        .insert({
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
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Calculate stats
  const latestEntry = progressData?.[0];
  const last7Days = progressData?.filter(p => {
    const date = new Date(p.tracked_date);
    return date >= subDays(new Date(), 7);
  }) || [];

  const completedWorkouts = workouts?.filter(w => w.status === 'completato').length || 0;
  const totalMinutes = completedWorkouts * 35;
  const avgMood = last7Days.length > 0
    ? (last7Days.reduce((sum, p) => sum + (p.mood_level || 0), 0) / last7Days.length).toFixed(1)
    : '--';
  const avgEnergy = last7Days.length > 0
    ? (last7Days.reduce((sum, p) => sum + (p.energy_level || 0), 0) / last7Days.length).toFixed(1)
    : '--';

  // Format workout days for calendar
  const workoutDays = workouts?.map(w => ({
    date: new Date(w.scheduled_date || w.created_at),
    hasWorkout: true,
    isCompleted: w.status === 'completato',
  })) || [];

  // Get workouts for selected date
  const workoutsForDate = workouts?.filter(w => {
    const workoutDate = new Date(w.scheduled_date || w.created_at);
    return isSameDay(workoutDate, selectedDate);
  }).map(w => ({
    id: w.id,
    title: w.title,
    duration: '35 mins',
    category: 'Full Body Strength',
    isFeatured: true,
  })) || [];

  // Stats for header
  const headerStats = [
    { value: completedWorkouts, label: 'Workouts', color: 'blue' as const, progress: 70 },
    { value: totalMinutes, label: 'Minutes', color: 'blue' as const, progress: 55 },
    { value: avgMood, label: 'Mood Avg', color: 'orange' as const, progress: parseFloat(avgMood as string) * 20 || 0 },
    { value: avgEnergy, label: 'Energy Avg', color: 'pink' as const, progress: parseFloat(avgEnergy as string) * 20 || 0 },
  ];

  // Mock exercise history data
  const exerciseHistoryData = {
    exerciseName: 'Chest Press',
    equipmentFilters: ['Dumbbells', 'Barbell', 'Machine'],
    stats: {
      totalVolume: '0 lb',
      totalReps: 36,
      avgWeight: '0 lb',
      maxWeight: '--',
    },
    history: [
      { date: '7/1', equipment: 'Dumbbells', time: '45 s', effort: '80%', reps: 12, weight: '--', oneRM: '--' },
      { date: '7/1', equipment: 'Dumbbells', time: '45 s', effort: '80%', reps: 12, weight: '--', oneRM: '--' },
      { date: '7/1', equipment: 'Dumbbells', time: '45 s', effort: '80%', reps: 12, weight: '--', oneRM: '--' },
    ],
  };

  if (selectedExercise) {
    return (
      <ExerciseHistory
        {...exerciseHistoryData}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-app-background pb-20">
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
              {/* Weight */}
              <div className="space-y-2">
                <Label className="text-app-foreground">Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Es: 75.5"
                  value={newEntry.weight_kg}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, weight_kg: e.target.value }))}
                  className="bg-app-muted border-app-border text-app-foreground"
                />
              </div>

              {/* Mood */}
              <div className="space-y-3">
                <Label className="text-app-foreground">Come ti senti oggi? ({newEntry.mood_level}/5)</Label>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">😔</span>
                  <Slider
                    value={[newEntry.mood_level]}
                    onValueChange={([value]) => setNewEntry(prev => ({ ...prev, mood_level: value }))}
                    min={1}
                    max={5}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-2xl">😁</span>
                </div>
              </div>

              {/* Energy */}
              <div className="space-y-3">
                <Label className="text-app-foreground">Livello energia ({newEntry.energy_level}/5)</Label>
                <div className="flex items-center gap-4">
                  <Zap className="h-5 w-5 text-app-muted-foreground" />
                  <Slider
                    value={[newEntry.energy_level]}
                    onValueChange={([value]) => setNewEntry(prev => ({ ...prev, energy_level: value }))}
                    min={1}
                    max={5}
                    step={1}
                    className="flex-1"
                  />
                  <Zap className="h-5 w-5 text-app-accent" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-app-foreground">Note (opzionale)</Label>
                <Input
                  placeholder="Come è andata oggi?"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-app-muted border-app-border text-app-foreground"
                />
              </div>

              <Button 
                className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90" 
                onClick={() => addEntryMutation.mutate()}
                disabled={addEntryMutation.isPending}
              >
                {addEntryMutation.isPending ? 'Salvataggio...' : 'Salva check-in'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats row */}
      <ProfileStats stats={headerStats} className="border-b border-app-border" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-transparent border-b border-app-border rounded-none p-0 h-auto">
          <TabsTrigger 
            value="calendar" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3"
          >
            <CalendarIcon className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="stats" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3"
          >
            <BarChart3 className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="exercises" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3"
          >
            <Dumbbell className="h-5 w-5" />
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

        <TabsContent value="stats" className="mt-0 p-4">
          <h2 className="text-xl font-bold text-app-foreground mb-4">Statistiche</h2>
          
          {/* Weight tracking */}
          <div className="bg-app-muted rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-app-foreground mb-3">Andamento peso</h3>
            {progressData && progressData.filter(p => p.weight_kg).length > 0 ? (
              <div className="h-32 flex items-end gap-1">
                {progressData
                  .filter(p => p.weight_kg)
                  .slice(0, 14)
                  .reverse()
                  .map((entry, i) => {
                    const weights = progressData.filter(p => p.weight_kg).map(p => p.weight_kg!);
                    const min = Math.min(...weights) - 2;
                    const max = Math.max(...weights) + 2;
                    const height = ((entry.weight_kg! - min) / (max - min)) * 100;
                    
                    return (
                      <div 
                        key={entry.id}
                        className="flex-1 bg-app-accent/30 rounded-t transition-all hover:bg-app-accent/50"
                        style={{ height: `${Math.max(height, 10)}%` }}
                        title={`${entry.weight_kg} kg - ${format(new Date(entry.tracked_date), 'd MMM', { locale: it })}`}
                      />
                    );
                  })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-app-muted-foreground text-sm">
                Nessun dato peso registrato
              </div>
            )}
          </div>

          {/* Recent check-ins */}
          <h3 className="font-semibold text-app-foreground mb-3">Check-in recenti</h3>
          <div className="space-y-2">
            {progressData?.slice(0, 5).map((entry) => (
              <div key={entry.id} className="bg-app-muted rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-app-foreground">
                    {format(new Date(entry.tracked_date), 'd MMMM yyyy', { locale: it })}
                  </span>
                </div>
                <div className="flex gap-6 text-sm">
                  {entry.weight_kg && (
                    <div>
                      <p className="text-app-muted-foreground">Peso</p>
                      <p className="font-medium text-app-foreground">{entry.weight_kg} kg</p>
                    </div>
                  )}
                  {entry.mood_level && (
                    <div>
                      <p className="text-app-muted-foreground">Umore</p>
                      <p className="font-medium text-app-foreground">{entry.mood_level}/5</p>
                    </div>
                  )}
                  {entry.energy_level && (
                    <div>
                      <p className="text-app-muted-foreground">Energia</p>
                      <p className="font-medium text-app-foreground">{entry.energy_level}/5</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {(!progressData || progressData.length === 0) && (
              <div className="text-center py-8 text-app-muted-foreground">
                Nessun check-in registrato
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="exercises" className="mt-0 p-4">
          <h2 className="text-xl font-bold text-app-foreground mb-4">Esercizi</h2>
          
          {/* Exercise list with history access */}
          <div className="space-y-2">
            {['Chest Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Lat Pulldown'].map((exercise) => (
              <button
                key={exercise}
                onClick={() => setSelectedExercise(exercise)}
                className="w-full flex items-center justify-between p-4 bg-app-muted rounded-xl hover:bg-app-muted/80 transition-colors"
              >
                <span className="font-medium text-app-foreground">{exercise}</span>
                <span className="text-app-muted-foreground">→</span>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AtletaProgressPage;
