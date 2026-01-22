import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  Scale, 
  Ruler, 
  Camera, 
  Smile, 
  Zap,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA PROGRESS PAGE - Tracciamento progressi
// =====================================================

export function AtletaProgressPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  // Form state for new entry
  const [newEntry, setNewEntry] = useState({
    weight_kg: '',
    mood_level: 3,
    energy_level: 3,
    notes: '',
  });

  // Fetch progress data
  const { data: progressData, isLoading } = useQuery({
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
  const previousEntry = progressData?.[1];
  
  const weightDiff = latestEntry?.weight_kg && previousEntry?.weight_kg
    ? (latestEntry.weight_kg - previousEntry.weight_kg).toFixed(1)
    : null;

  const last7Days = progressData?.filter(p => {
    const date = new Date(p.tracked_date);
    return date >= subDays(new Date(), 7);
  }) || [];

  const avgMood = last7Days.length > 0
    ? (last7Days.reduce((sum, p) => sum + (p.mood_level || 0), 0) / last7Days.length).toFixed(1)
    : null;

  const avgEnergy = last7Days.length > 0
    ? (last7Days.reduce((sum, p) => sum + (p.energy_level || 0), 0) / last7Days.length).toFixed(1)
    : null;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">I miei progressi</h1>
          <p className="text-sm text-muted-foreground">Traccia il tuo percorso</p>
        </div>
        
        <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
          <SheetTrigger asChild>
            <Button size="icon">
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>Aggiungi check-in</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 py-4">
              {/* Weight */}
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Es: 75.5"
                  value={newEntry.weight_kg}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, weight_kg: e.target.value }))}
                />
              </div>

              {/* Mood */}
              <div className="space-y-3">
                <Label>Come ti senti oggi? ({newEntry.mood_level}/5)</Label>
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
                <Label>Livello energia ({newEntry.energy_level}/5)</Label>
                <div className="flex items-center gap-4">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  <Slider
                    value={[newEntry.energy_level]}
                    onValueChange={([value]) => setNewEntry(prev => ({ ...prev, energy_level: value }))}
                    min={1}
                    max={5}
                    step={1}
                    className="flex-1"
                  />
                  <Zap className="h-5 w-5 text-warning" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Note (opzionale)</Label>
                <Input
                  placeholder="Come è andata oggi?"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => addEntryMutation.mutate()}
                disabled={addEntryMutation.isPending}
              >
                {addEntryMutation.isPending ? 'Salvataggio...' : 'Salva check-in'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <Scale className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">
              {latestEntry?.weight_kg ? `${latestEntry.weight_kg}` : '--'}
            </p>
            <p className="text-xs text-muted-foreground">kg</p>
            {weightDiff && (
              <p className={cn(
                'text-xs flex items-center justify-center gap-0.5',
                parseFloat(weightDiff) > 0 ? 'text-destructive' : 'text-success'
              )}>
                {parseFloat(weightDiff) > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {Math.abs(parseFloat(weightDiff))}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <Smile className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{avgMood || '--'}</p>
            <p className="text-xs text-muted-foreground">Umore medio</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <Zap className="h-5 w-5 mx-auto text-warning mb-1" />
            <p className="text-lg font-bold">{avgEnergy || '--'}</p>
            <p className="text-xs text-muted-foreground">Energia media</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Riepilogo</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Storico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Weight chart placeholder */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Andamento peso
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : progressData && progressData.filter(p => p.weight_kg).length > 0 ? (
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
                          className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/40"
                          style={{ height: `${Math.max(height, 10)}%` }}
                          title={`${entry.weight_kg} kg - ${format(new Date(entry.tracked_date), 'd MMM', { locale: it })}`}
                        />
                      );
                    })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Nessun dato peso registrato
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photo progress placeholder */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Foto progressi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Prossimamente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : progressData && progressData.length > 0 ? (
            progressData.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(entry.tracked_date), 'd MMMM yyyy', { locale: it })}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {entry.weight_kg && (
                      <div>
                        <p className="text-muted-foreground">Peso</p>
                        <p className="font-medium">{entry.weight_kg} kg</p>
                      </div>
                    )}
                    {entry.mood_level && (
                      <div>
                        <p className="text-muted-foreground">Umore</p>
                        <p className="font-medium">{entry.mood_level}/5</p>
                      </div>
                    )}
                    {entry.energy_level && (
                      <div>
                        <p className="text-muted-foreground">Energia</p>
                        <p className="font-medium">{entry.energy_level}/5</p>
                      </div>
                    )}
                  </div>
                  
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{entry.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nessun check-in registrato
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowAddSheet(true)}
                >
                  Aggiungi il primo
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AtletaProgressPage;
