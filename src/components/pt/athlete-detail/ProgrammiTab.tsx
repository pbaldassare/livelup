import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { WorkoutHistoryList } from '@/components/shared/WorkoutHistoryList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { isWorkoutStartable } from '@/components/pt/PTAthleteWorkoutRunner';
import {
  duplicateWorkoutAssignment,
  duplicateWorkoutToAthletes,
  activateWorkoutAssignment,
  transferWorkoutToAthletes,
  unassignWorkoutAssignment,
  canUnassignWorkout,
} from '@/lib/api/workouts';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CalendarPlus,
  CalendarIcon,
  Clock,
  Copy,
  Dumbbell,
  Eye,
  History,
  Loader2,
  Pencil,
  Play,
  Search,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// =====================================================
// Programmi tab — in corso, programmate, storico
// =====================================================

interface Props {
  atletaUserId: string;
  ptUserId: string;
  onStartWorkout: (workoutId: string) => void;
  onAssignWorkout: (templateId?: string) => void;
}

type WorkoutRow = {
  id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  due_date: string | null;
  created_at: string;
  template_id: string | null;
  athlete_reordered_at?: string | null;
};

type WorkoutDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_date: string | null;
  due_date: string | null;
  template_id: string | null;
  athlete_reordered_at?: string | null;
  workout_exercises: Array<{
    id: string;
    order_index: number;
    prescribed_sets: number;
    prescribed_reps_min: number | null;
    prescribed_reps_max: number | null;
    exercises: { name: string } | null;
  }>;
};

const IN_PROGRESS_STATUSES = new Set(['in_corso', 'in_sospeso']);

const PROGRAMMED_STATUSES = new Set(['attivo', 'scaduto']);

function categorizeWorkouts(workouts: WorkoutRow[]) {
  const inCorso = workouts.filter((w) => IN_PROGRESS_STATUSES.has(w.status));
  const programmate = workouts.filter((w) => PROGRAMMED_STATUSES.has(w.status));
  return { inCorso, programmate };
}

function workoutDateLabel(workout: WorkoutRow): string {
  if (workout.scheduled_date) {
    return format(new Date(workout.scheduled_date), 'dd MMM yyyy', { locale: it });
  }
  if (workout.due_date) {
    return `Scadenza ${format(new Date(workout.due_date), 'dd MMM yyyy', { locale: it })}`;
  }
  return format(new Date(workout.created_at), 'dd MMM yyyy', { locale: it });
}

function repsLabel(min: number | null, max: number | null): string {
  if (min != null && max != null && max !== min) return `${min}–${max}`;
  return `${min ?? max ?? '–'}`;
}

function WorkoutActionsDialog({
  workout,
  open,
  onOpenChange,
  onView,
  onEdit,
  onDuplicate,
  onUnassign,
}: {
  workout: WorkoutRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onUnassign: () => void;
}) {
  if (!workout) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{workout.title}</DialogTitle>
          <DialogDescription>{workoutDateLabel(workout)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Button variant="outline" className="justify-start" onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            Visualizza
          </Button>
          <Button variant="outline" className="justify-start" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifica
          </Button>
          <Button variant="outline" className="justify-start" onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            {workout.status === 'completato' ? 'Rifai allenamento' : 'Duplica'}
          </Button>
          {canUnassignWorkout(workout.status) && (
            <Button
              variant="outline"
              className="justify-start text-destructive hover:text-destructive"
              onClick={onUnassign}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Togli assegnazione
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutDetailDialog({
  workoutId,
  open,
  onOpenChange,
}: {
  workoutId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: workout, isLoading } = useQuery({
    queryKey: ['pt-workout-detail', workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id, title, description, status, scheduled_date, due_date, template_id, athlete_reordered_at,
          workout_exercises (
            id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max,
            exercises ( name )
          )
        `)
        .eq('id', workoutId!)
        .single();
      if (error) throw error;
      return data as WorkoutDetail;
    },
    enabled: !!workoutId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workout?.title ?? 'Dettaglio scheda'}</DialogTitle>
          {workout && (
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <DashboardStatusBadge status={workout.status} size="sm" />
              {workout.scheduled_date && (
                <span>
                  {format(new Date(workout.scheduled_date), 'dd MMM yyyy', { locale: it })}
                </span>
              )}
              {workout.athlete_reordered_at && (
                <Badge variant="secondary" className="text-[10px]">
                  Ordine modificato dall&apos;atleta
                </Badge>
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : workout ? (
          <div className="space-y-4">
            {workout.description && (
              <p className="text-sm text-muted-foreground">{workout.description}</p>
            )}
            {workout.athlete_reordered_at && (
              <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
                L&apos;atleta ha personalizzato l&apos;ordine degli esercizi liberi il{' '}
                {format(new Date(workout.athlete_reordered_at), "dd MMM yyyy 'alle' HH:mm", {
                  locale: it,
                })}
                . L&apos;elenco sotto riflette l&apos;ordine attuale.
              </p>
            )}
            <div>
              <p className="text-sm font-medium mb-2">
                Esercizi ({workout.workout_exercises?.length ?? 0})
              </p>
              <div className="space-y-2">
                {[...(workout.workout_exercises ?? [])]
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((ex, idx) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between text-sm rounded-lg border px-3 py-2"
                    >
                      <span>
                        {idx + 1}. {ex.exercises?.name ?? 'Esercizio'}
                      </span>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {ex.prescribed_sets}×{repsLabel(ex.prescribed_reps_min, ex.prescribed_reps_max)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Scheda non trovata
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivateWorkoutDialog({
  workout,
  ptUserId,
  atletaUserId,
  open,
  onOpenChange,
}: {
  workout: WorkoutRow | null;
  ptUserId: string;
  atletaUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    if (!open || !workout) return;
    const base = workout.scheduled_date ? new Date(workout.scheduled_date) : new Date();
    base.setHours(0, 0, 0, 0);
    setScheduledDate(base);
  }, [open, workout?.id, workout?.scheduled_date]);

  const activateMutation = useMutation({
    mutationFn: () => {
      if (!workout) throw new Error('Scheda non selezionata');
      return activateWorkoutAssignment(workout.id, { ptUserId, scheduledDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts', atletaUserId, ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      queryClient.invalidateQueries({ queryKey: ['workout-history', atletaUserId] });
      toast.success('Scheda attivata — compare in In corso e nel calendario');
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Errore durante l\'attivazione'),
  });

  if (!workout) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Attiva scheda</DialogTitle>
          <DialogDescription>
            Imposta la data della sessione per <strong>{workout.title}</strong>.
            La scheda passerà in <strong>In corso</strong> e verrà aggiunta al calendario.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm font-medium">Data sessione</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(scheduledDate, 'dd MMMM yyyy', { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scheduledDate}
                onSelect={(d) => d && setScheduledDate(d)}
                locale={it}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
            {activateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Attivazione…
              </>
            ) : (
              'Conferma'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConnectedAthlete = {
  atleta_user_id: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
};

type DuplicateTarget = 'same' | 'other';

function DuplicateWorkoutDialog({
  workout,
  ptUserId,
  sourceAtletaUserId,
  open,
  onOpenChange,
}: {
  workout: WorkoutRow | null;
  ptUserId: string;
  sourceAtletaUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<DuplicateTarget>('same');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [athleteSearch, setAthleteSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setTarget('same');
      setSelectedIds([]);
      setAthleteSearch('');
    }
  }, [open]);

  const invalidateWorkouts = (athleteIds: string[]) => {
    queryClient.invalidateQueries({
      queryKey: ['pt-athlete-workouts', sourceAtletaUserId, ptUserId],
    });
    for (const id of athleteIds) {
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts', id, ptUserId] });
    }
  };

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!workout) throw new Error('Scheda non selezionata');

      if (target === 'same') {
        return duplicateWorkoutAssignment(workout.id);
      }

      const isProgrammed = PROGRAMMED_STATUSES.has(workout.status);
      if (isProgrammed) {
        return transferWorkoutToAthletes(workout.id, {
          ptUserId,
          sourceAtletaUserId,
          targetAtletaUserIds: selectedIds,
        });
      }

      return duplicateWorkoutToAthletes(workout.id, {
        ptUserId,
        sourceAtletaUserId,
        targetAtletaUserIds: selectedIds,
      });
    },
    onSuccess: (result) => {
      if (target === 'same') {
        invalidateWorkouts([sourceAtletaUserId]);
        toast.success('Scheda duplicata in Programmate');
      } else {
        const created = Array.isArray(result) ? result : [];
        invalidateWorkouts([sourceAtletaUserId, ...selectedIds]);
        const isProgrammed = workout && PROGRAMMED_STATUSES.has(workout.status);
        toast.success(
          created.length === 1
            ? isProgrammed
              ? 'Scheda assegnata a 1 atleta'
              : 'Scheda copiata per 1 atleta'
            : isProgrammed
              ? `Scheda assegnata a ${created.length} atleti`
              : `Scheda copiata per ${created.length} atleti`,
        );
      }
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Errore durante la duplicazione'),
  });

  const { data: athletes = [], isLoading: athletesLoading } = useQuery({
    queryKey: ['connected-athletes-duplicate', ptUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', ptUserId)
        .eq('status', 'active')
        .neq('atleta_user_id', sourceAtletaUserId);

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url')
            .eq('user_id', conn.atleta_user_id)
            .single();

          return {
            atleta_user_id: conn.atleta_user_id,
            profile: profile || {
              first_name: null,
              last_name: null,
              email: null,
              avatar_url: null,
            },
          } as ConnectedAthlete;
        }),
      );

      return enriched;
    },
    enabled: open && !!ptUserId,
  });

  const toggleAthlete = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const filteredAthletes = useMemo(() => {
    const q = athleteSearch.trim().toLowerCase();
    if (!q) return athletes;

    return athletes.filter((a) => {
      const name = getAthleteDisplayName(
        a.profile.first_name,
        a.profile.last_name,
        a.profile.email,
      ).toLowerCase();
      const email = (a.profile.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [athletes, athleteSearch]);

  if (!workout) return null;

  const hasOtherAthletes = athletes.length > 0;
  const isProgrammed = PROGRAMMED_STATUSES.has(workout.status);
  const canConfirm =
    target === 'same' || (target === 'other' && selectedIds.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Duplica scheda — Scegli dove duplicare {workout.title}
          </DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={target}
          onValueChange={(v) => setTarget(v as DuplicateTarget)}
          className="space-y-3 py-2"
        >
          <label
            htmlFor="duplicate-same"
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              target === 'same' && 'border-app-accent/40 bg-app-accent/5',
            )}
          >
            <RadioGroupItem value="same" id="duplicate-same" className="mt-0.5" />
            <div className="min-w-0">
              <span className="block text-sm font-medium">Stesso atleta</span>
              <span className="block text-xs text-muted-foreground">
                Copia in Programmate per questo atleta
              </span>
            </div>
          </label>

          {hasOtherAthletes && (
            <div
              className={cn(
                'rounded-lg border transition-colors',
                target === 'other' && 'border-app-accent/40 bg-app-accent/5',
              )}
            >
              <label
                htmlFor="duplicate-other"
                className="flex items-start gap-3 p-3 cursor-pointer"
              >
                <RadioGroupItem value="other" id="duplicate-other" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Atleta diverso</span>
                  <span className="block text-xs text-muted-foreground">
                    {isProgrammed
                      ? 'Assegna copie ad altri atleti collegati (l\'originale verrà annullata)'
                      : 'Copia la scheda ad altri atleti collegati (l\'originale resta invariata)'}
                  </span>
                </div>
              </label>

              {target === 'other' && (
                <div className="px-3 pb-3 space-y-2 border-t pt-3 mx-3 mb-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={athleteSearch}
                      onChange={(e) => setAthleteSearch(e.target.value)}
                      placeholder="Cerca atleta..."
                      className="pl-8 h-9"
                    />
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                  {athletesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredAthletes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nessun atleta trovato
                    </p>
                  ) : (
                    filteredAthletes.map((a) => {
                      const name = getAthleteDisplayName(
                        a.profile.first_name,
                        a.profile.last_name,
                        a.profile.email,
                      );
                      const checked = selectedIds.includes(a.atleta_user_id);
                      return (
                        <label
                          key={a.atleta_user_id}
                          className={cn(
                            'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                            checked && 'border-app-accent/40 bg-app-accent/5',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAthlete(a.atleta_user_id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={a.profile.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {getAthleteInitials(
                                a.profile.first_name,
                                a.profile.last_name,
                                a.profile.email,
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate">{name}</span>
                        </label>
                      );
                    })
                  )}
                  </div>
                </div>
              )}
            </div>
          )}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={() => duplicateMutation.mutate()}
            disabled={!canConfirm || duplicateMutation.isPending}
          >
            {duplicateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Duplicazione…
              </>
            ) : (
              'Duplica'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutListItem({
  workout,
  variant,
  onOpenActions,
  onStartWorkout,
  onActivateWorkout,
}: {
  workout: WorkoutRow;
  variant: 'in-corso' | 'programmate';
  onOpenActions: (workout: WorkoutRow) => void;
  onStartWorkout: (workoutId: string) => void;
  onActivateWorkout: (workout: WorkoutRow) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenActions(workout)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenActions(workout);
        }
      }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border cursor-pointer',
        'hover:bg-app-accent/5 hover:border-app-accent/30 transition-colors',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-app-accent/10 shrink-0">
          <Dumbbell className="h-4 w-4 text-app-accent" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{workout.title}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            {workoutDateLabel(workout)}
          </p>
          {workout.athlete_reordered_at && (
            <Badge variant="outline" className="mt-1 text-[10px] h-5">
              Ordine modificato dall&apos;atleta
            </Badge>
          )}
        </div>
      </div>
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {variant === 'in-corso' && isWorkoutStartable(workout.status) && (
          <Button size="sm" variant="default" onClick={() => onStartWorkout(workout.id)}>
            <Play className="h-3.5 w-3.5 mr-1" />
            Avvia
          </Button>
        )}
        {variant === 'programmate' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onActivateWorkout(workout)}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Attiva
          </Button>
        )}
      </div>
    </div>
  );
}

function WorkoutAccordionSection({
  value,
  title,
  subtitle,
  icon: Icon,
  count,
  workouts,
  emptyMessage,
  variant,
  onOpenActions,
  onStartWorkout,
  onActivateWorkout,
  children,
}: {
  value: string;
  title: string;
  subtitle: string;
  icon: typeof Dumbbell;
  count?: number;
  workouts?: WorkoutRow[];
  emptyMessage?: string;
  variant?: 'in-corso' | 'programmate';
  onOpenActions?: (workout: WorkoutRow) => void;
  onStartWorkout?: (workoutId: string) => void;
  onActivateWorkout?: (workout: WorkoutRow) => void;
  children?: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border rounded-lg px-4 bg-card">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 rounded-lg bg-app-accent/10 shrink-0">
            <Icon className="h-4 w-4 text-app-accent" />
          </div>
          <div>
            <p className="font-semibold">
              {title}
              {count != null && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({count})
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground font-normal">{subtitle}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {children ?? (
          workouts!.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
          ) : (
            <div className="space-y-3 pb-2">
              {workouts!.map((workout) => (
                <WorkoutListItem
                  key={workout.id}
                  workout={workout}
                  variant={variant!}
                  onOpenActions={onOpenActions!}
                  onStartWorkout={onStartWorkout!}
                  onActivateWorkout={onActivateWorkout!}
                />
              ))}
            </div>
          )
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export function ProgrammiTab({
  atletaUserId,
  ptUserId,
  onStartWorkout,
  onAssignWorkout,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { routes } = usePTRoutes();
  const [actionsWorkout, setActionsWorkout] = useState<WorkoutRow | null>(null);
  const [viewWorkoutId, setViewWorkoutId] = useState<string | null>(null);
  const [activatingWorkout, setActivatingWorkout] = useState<WorkoutRow | null>(null);
  const [duplicateWorkout, setDuplicateWorkout] = useState<WorkoutRow | null>(null);
  const [unassignWorkout, setUnassignWorkout] = useState<WorkoutRow | null>(null);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['pt-athlete-workouts', atletaUserId, ptUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, status, scheduled_date, due_date, created_at, template_id, athlete_reordered_at')
        .eq('atleta_user_id', atletaUserId)
        .eq('pt_user_id', ptUserId)
        .in('status', ['attivo', 'scaduto', 'in_corso', 'in_sospeso'])
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WorkoutRow[];
    },
    enabled: !!atletaUserId && !!ptUserId,
  });

  const { inCorso, programmate } = categorizeWorkouts(workouts);
  const hasAnyAssigned = workouts.length > 0;

  const handleEdit = (workout: WorkoutRow) => {
    setActionsWorkout(null);
    navigate(routes.assignedWorkout(workout.id));
  };

  const unassignMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      await unassignWorkoutAssignment(workoutId, ptUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts', atletaUserId, ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      queryClient.invalidateQueries({ queryKey: ['workout-history', atletaUserId] });
      setUnassignWorkout(null);
      toast.success('Assegnazione tolta');
    },
    onError: (e: Error) => toast.error(e.message || 'Errore durante la rimozione'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Caricamento schede…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Sessioni in corso, schede programmate e storico completati
        </p>
        <Button size="sm" onClick={() => onAssignWorkout()}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          Assegna scheda
        </Button>
      </div>

      {!hasAnyAssigned && (
        <div className="text-center py-8 text-muted-foreground rounded-lg border border-dashed border-app-accent/20">
          <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30 text-app-accent" />
          <p>Nessuna scheda assegnata</p>
          <Button variant="link" className="mt-2 text-app-accent" onClick={() => onAssignWorkout()}>
            Assegna la prima scheda
          </Button>
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={['in-corso', 'programmate', 'storico']}
        className="space-y-3"
      >
        <WorkoutAccordionSection
          value="in-corso"
          title="In corso"
          subtitle="Allenamenti avviati o in pausa"
          icon={Play}
          count={inCorso.length}
          workouts={inCorso}
          emptyMessage="Nessun allenamento in corso"
          variant="in-corso"
          onOpenActions={setActionsWorkout}
          onStartWorkout={onStartWorkout}
          onActivateWorkout={setActivatingWorkout}
        />

        <WorkoutAccordionSection
          value="programmate"
          title="Programmate"
          subtitle="Schede attive con data futura o in attesa"
          icon={CalendarPlus}
          count={programmate.length}
          workouts={programmate}
          emptyMessage="Nessuna scheda programmata"
          variant="programmate"
          onOpenActions={setActionsWorkout}
          onStartWorkout={onStartWorkout}
          onActivateWorkout={setActivatingWorkout}
        />

        <WorkoutAccordionSection
          value="storico"
          title="Storico"
          subtitle="Allenamenti completati con dettaglio per serie"
          icon={History}
        >
          <WorkoutHistoryList atletaUserId={atletaUserId} ptUserId={ptUserId} variant="pt" />
        </WorkoutAccordionSection>
      </Accordion>

      <ActivateWorkoutDialog
        workout={activatingWorkout}
        ptUserId={ptUserId}
        atletaUserId={atletaUserId}
        open={!!activatingWorkout}
        onOpenChange={(open) => !open && setActivatingWorkout(null)}
      />

      <WorkoutActionsDialog
        workout={actionsWorkout}
        open={!!actionsWorkout}
        onOpenChange={(open) => !open && setActionsWorkout(null)}
        onView={() => {
          if (actionsWorkout) {
            setViewWorkoutId(actionsWorkout.id);
            setActionsWorkout(null);
          }
        }}
        onEdit={() => actionsWorkout && handleEdit(actionsWorkout)}
        onDuplicate={() => {
          if (actionsWorkout) {
            setDuplicateWorkout(actionsWorkout);
            setActionsWorkout(null);
          }
        }}
        onUnassign={() => {
          if (actionsWorkout) {
            setUnassignWorkout(actionsWorkout);
            setActionsWorkout(null);
          }
        }}
      />

      <AlertDialog open={!!unassignWorkout} onOpenChange={(o) => !o && setUnassignWorkout(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Togliere l&apos;assegnazione?</AlertDialogTitle>
            <AlertDialogDescription>
              {unassignWorkout
                ? `La scheda "${unassignWorkout.title}" sparirà da questo atleta. Lo storico degli allenamenti completati non viene toccato.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => unassignWorkout && unassignMutation.mutate(unassignWorkout.id)}
              disabled={unassignMutation.isPending}
            >
              Togli assegnazione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DuplicateWorkoutDialog
        workout={duplicateWorkout}
        ptUserId={ptUserId}
        sourceAtletaUserId={atletaUserId}
        open={!!duplicateWorkout}
        onOpenChange={(open) => !open && setDuplicateWorkout(null)}
      />

      <WorkoutDetailDialog
        workoutId={viewWorkoutId}
        open={!!viewWorkoutId}
        onOpenChange={(open) => !open && setViewWorkoutId(null)}
      />
    </div>
  );
}

export default ProgrammiTab;
