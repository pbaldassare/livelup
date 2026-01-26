import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Dumbbell, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// ACTIVITY HISTORY - Lista workout completati
// =====================================================

interface Workout {
  id: string;
  title: string;
  completed_at: string | null;
  status: string;
  description: string | null;
}

export function ActivityHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['completed-workouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, completed_at, status, description')
        .eq('atleta_user_id', user.id)
        .eq('status', 'completato')
        .order('completed_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []) as Workout[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-app-card rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-app-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-app-muted rounded w-3/4" />
                <div className="h-3 bg-app-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-app-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Dumbbell className="h-8 w-8 text-app-muted-foreground" />
        </div>
        <p className="text-app-muted-foreground">Nessun workout completato</p>
        <p className="text-sm text-app-muted-foreground mt-1">
          Completa il tuo primo allenamento per vederlo qui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <button
          key={workout.id}
          onClick={() => navigate(`/app/workout/${workout.id}`)}
          className="w-full bg-app-card rounded-xl p-4 flex items-center gap-3 hover:bg-app-card/80 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-app-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-app-accent" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-app-foreground truncate">
              {workout.title}
            </h4>
            <div className="flex items-center gap-2 text-sm text-app-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {workout.completed_at
                  ? formatDistanceToNow(new Date(workout.completed_at), { 
                      addSuffix: true, 
                      locale: it 
                    })
                  : 'Completato'}
              </span>
            </div>
          </div>
          
          <ChevronRight className="h-5 w-5 text-app-muted-foreground flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

export default ActivityHistory;
