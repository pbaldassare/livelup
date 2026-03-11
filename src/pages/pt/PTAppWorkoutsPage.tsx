import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AssignWorkoutDialog } from '@/components/pt/AssignWorkoutDialog';
import { 
  Dumbbell, Search, Calendar, ChevronRight,
  CheckCircle2, Clock, FileText, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  attivo: { label: 'Attivo', color: 'text-primary', icon: Clock },
  completato: { label: 'Completato', color: 'text-green-600', icon: CheckCircle2 },
  saltato: { label: 'Saltato', color: 'text-muted-foreground', icon: Clock },
};

export function PTAppWorkoutsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['pt-workouts-app', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, status, scheduled_date, atleta_user_id, completed_at')
        .eq('pt_user_id', user.id)
        .order('scheduled_date', { ascending: false })
        .limit(50);
      if (error) throw error;

      const workoutsWithProfiles = await Promise.all(
        (data || []).map(async (workout) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', workout.atleta_user_id)
            .single();
          return { ...workout, profiles: profile };
        })
      );
      return workoutsWithProfiles;
    },
    enabled: !!user?.id,
  });

  const { data: templates } = useQuery({
    queryKey: ['pt-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, title, category, difficulty_level')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filteredWorkouts = workouts?.filter(w => {
    if (!searchQuery) return true;
    const name = `${w.profiles?.first_name || ''} ${w.profiles?.last_name || ''}`.toLowerCase();
    return w.title.toLowerCase().includes(searchQuery.toLowerCase()) || name.includes(searchQuery.toLowerCase());
  });

  const activeWorkouts = filteredWorkouts?.filter(w => w.status === 'attivo') || [];
  const completedWorkouts = filteredWorkouts?.filter(w => w.status === 'completato') || [];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Schede allenamento</h1>
          <Button size="sm" onClick={() => setShowAssignDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Assegna
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca scheda o atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick access to templates */}
        {templates && templates.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">I miei template</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/pt/workouts">
                  Gestisci
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {templates.slice(0, 5).map((template) => (
                <Card key={template.id} className="flex-shrink-0 w-40">
                  <CardContent className="p-3">
                    <FileText className="h-5 w-5 text-primary mb-2" />
                    <p className="font-medium text-sm truncate">{template.title}</p>
                    <Badge variant="outline" className="text-xs mt-1 capitalize">
                      {template.difficulty_level}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active workouts */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schede attive ({activeWorkouts.length})
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : activeWorkouts.length > 0 ? (
            <div className="space-y-3">
              {activeWorkouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nessuna scheda attiva</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Completed workouts */}
        {completedWorkouts.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completate recenti
            </h2>
            <div className="space-y-3">
              {completedWorkouts.slice(0, 5).map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          </div>
        )}

        {/* Secondary link */}
        <p className="text-xs text-center text-muted-foreground">
          Per gestire template avanzati usa la{' '}
          <Link to="/pt/workouts" className="underline text-primary">dashboard web</Link>
        </p>
      </div>

      {/* Assign Workout Dialog */}
      <AssignWorkoutDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['pt-workouts-app'] });
        }}
      />
    </div>
  );
}

function WorkoutCard({ workout }: { workout: any }) {
  const statusConfig = STATUS_CONFIG[workout.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.attivo;
  const StatusIcon = statusConfig.icon;
  const name = `${workout.profiles?.first_name || ''} ${workout.profiles?.last_name || ''}`.trim();

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={workout.profiles?.avatar_url || undefined} />
            <AvatarFallback>{workout.profiles?.first_name?.[0] || 'A'}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{workout.title}</h3>
                <p className="text-sm text-muted-foreground">{name}</p>
              </div>
              <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            
            {workout.scheduled_date && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(workout.scheduled_date), 'd MMM yyyy', { locale: it })}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PTAppWorkoutsPage;
