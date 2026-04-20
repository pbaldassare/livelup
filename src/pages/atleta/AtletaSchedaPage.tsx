import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  FileText,
  Calendar,
  Dumbbell,
  Lock,
  StickyNote,
  Timer,
  Repeat,
  Hash,
} from 'lucide-react';

// =====================================================
// ATLETA SCHEDA PAGE
// Vista descrittiva (PDF-like) della scheda assegnata dal Coach
// =====================================================

interface SchedaExercise {
  id: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps_min: number | null;
  prescribed_reps_max: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercises: {
    name: string;
    category: string | null;
  } | null;
}

interface SchedaWorkout {
  id: string;
  title: string;
  description: string | null;
  notes_pt: string | null;
  scheduled_date: string | null;
  status: string;
  workout_exercises: SchedaExercise[];
}

export function AtletaSchedaPage() {
  const { user } = useAuth();
  const { ptName, canAccessWorkouts, isLoading: statusLoading } = useAtletaStatus();

  const { data: scheda, isLoading } = useQuery({
    queryKey: ['atleta-scheda', user?.id],
    queryFn: async (): Promise<SchedaWorkout | null> => {
      if (!user?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const selectClause = `
          id,
          title,
          description,
          notes_pt,
          scheduled_date,
          status,
          workout_exercises (
            id,
            order_index,
            prescribed_sets,
            prescribed_reps_min,
            prescribed_reps_max,
            rest_seconds,
            notes,
            exercises:exercise_id ( name, category )
          )
        `;

      // 1. Priorità: workout attivo programmato per OGGI
      const { data: todayData } = await supabase
        .from('workouts')
        .select(selectClause)
        .eq('atleta_user_id', user.id)
        .eq('status', 'attivo')
        .gte('scheduled_date', today.toISOString())
        .lt('scheduled_date', tomorrow.toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      // 2. Fallback: ultimo attivo (prossimo o più recente)
      let chosen = todayData;
      if (!chosen) {
        const { data: nextData, error } = await supabase
          .from('workouts')
          .select(selectClause)
          .eq('atleta_user_id', user.id)
          .eq('status', 'attivo')
          .order('scheduled_date', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        chosen = nextData;
      }

      if (!chosen) return null;
      return {
        ...chosen,
        workout_exercises: (chosen.workout_exercises || []).sort(
          (a, b) => a.order_index - b.order_index,
        ),
      } as SchedaWorkout;
    },
    enabled: !!user?.id && canAccessWorkouts,
  });

  // Locked
  if (!statusLoading && !canAccessWorkouts) {
    return (
      <div className="p-4 space-y-6 bg-app-background min-h-screen">
        <h1 className="text-2xl font-bold text-app-foreground pt-2">Scheda</h1>
        <Card className="border-dashed bg-app-card border-app-border">
          <CardContent className="p-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
            <h3 className="font-semibold text-app-foreground mb-2">
              Nessun Coach collegato
            </h3>
            <p className="text-sm text-app-muted-foreground mb-4">
              Collegati a un Coach per ricevere la tua scheda di allenamento.
            </p>
            <Button
              className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              asChild
            >
              <Link to="/app/discover">Trova un Coach</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-4 bg-app-background min-h-screen">
      {/* Header */}
      <div className="p-4 space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-app-accent" />
          <h1 className="text-2xl font-bold text-app-foreground">Scheda</h1>
        </div>
        {ptName && (
          <p className="text-sm text-app-muted-foreground">
            Programmata da {ptName}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="px-4">
          <ListSkeleton count={4} type="workout" />
        </div>
      ) : !scheda ? (
        <div className="px-4">
          <Card className="border-dashed bg-app-card border-app-border">
            <CardContent className="p-8 text-center">
              <FileText className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
              <h3 className="font-semibold text-app-foreground mb-1">
                Nessuna scheda disponibile
              </h3>
              <p className="text-sm text-app-muted-foreground">
                Il tuo Coach non ti ha ancora inviato una scheda.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Scheda header card */}
          <Card className="bg-app-card border-app-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-app-foreground">
                  {scheda.title}
                </h2>
                <Badge className="bg-app-accent/20 text-app-accent border-0">
                  {scheda.workout_exercises.length} esercizi
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scheda.scheduled_date && (
                <div className="flex items-center gap-2 text-sm text-app-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(scheda.scheduled_date), "EEEE d MMMM yyyy", {
                    locale: it,
                  })}
                </div>
              )}
              {scheda.description && (
                <p className="text-sm text-app-foreground/80">
                  {scheda.description}
                </p>
              )}
              {scheda.notes_pt && (
                <div className="flex gap-2 p-3 rounded-lg bg-app-muted/50 border border-app-border">
                  <StickyNote className="h-4 w-4 text-app-accent flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-app-foreground/90">
                    {scheda.notes_pt}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exercises list (PDF-like) */}
          <div className="space-y-2">
            {scheda.workout_exercises.map((ex, idx) => (
              <Card key={ex.id} className="bg-app-card border-app-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-app-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-app-accent">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-app-foreground">
                        {ex.exercises?.name || 'Esercizio'}
                      </h3>
                      {ex.exercises?.category && (
                        <p className="text-xs text-app-muted-foreground capitalize">
                          {ex.exercises.category}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pl-11">
                    <Stat
                      icon={Hash}
                      label="Serie"
                      value={String(ex.prescribed_sets)}
                    />
                    <Stat
                      icon={Repeat}
                      label="Reps"
                      value={formatReps(ex.prescribed_reps_min, ex.prescribed_reps_max)}
                    />
                    <Stat
                      icon={Timer}
                      label="Recupero"
                      value={ex.rest_seconds ? `${ex.rest_seconds}s` : '—'}
                    />
                  </div>

                  {ex.notes && (
                    <div className="pl-11">
                      <div className="flex gap-2 p-2 rounded bg-app-muted/30 border border-app-border/50">
                        <StickyNote className="h-3 w-3 text-app-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-app-muted-foreground">
                          {ex.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA per andare in esecuzione */}
          <Button
            className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
            asChild
          >
            <Link to="/app/esercizi">
              <Dumbbell className="h-4 w-4 mr-2" />
              Vai agli esercizi del giorno
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-2 rounded bg-app-muted/30 border border-app-border/50">
      <div className="flex items-center gap-1 text-app-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-sm font-semibold text-app-foreground">{value}</span>
    </div>
  );
}

function formatReps(min: number | null, max: number | null): string {
  if (min && max && min !== max) return `${min}–${max}`;
  if (min) return String(min);
  if (max) return String(max);
  return '—';
}

export default AtletaSchedaPage;
