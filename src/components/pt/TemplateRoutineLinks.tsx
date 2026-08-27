import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, ChevronDown, Flame, Loader2, Search, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

type SourceMode = 'template' | 'exercise';

type Props = {
  templateId: string;
  includeWarmup: boolean;
  includeCooldown: boolean;
  warmupTemplateId: string | null;
  cooldownTemplateId: string | null;
  warmupExerciseId?: string | null;
  cooldownExerciseId?: string | null;
};

function resolveMode(templateId: string | null, exerciseId: string | null | undefined): SourceMode {
  if (exerciseId) return 'exercise';
  if (templateId) return 'template';
  return 'template';
}

function ExercisePickerButton({
  selectedId,
  selectedName,
  disabled,
  onPick,
}: {
  selectedId: string | null;
  selectedName?: string;
  disabled?: boolean;
  onPick: (id: string, name: string) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['pt-routine-exercise-options', user?.id, search],
    queryFn: async () => {
      if (!user?.id) return [] as { id: string; name: string }[];
      let q = supabase
        .from('exercises')
        .select('id, name')
        .or(`is_public.eq.true,created_by.eq.${user.id}`)
        .order('name')
        .limit(120);
      const term = search.trim();
      if (term) q = q.ilike('name', `%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
    enabled: open && !!user?.id,
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="h-11 w-full justify-between bg-background text-xs font-normal"
        onClick={() => setOpen(true)}
      >
        <span className="truncate text-left">
          {selectedName || (selectedId ? 'Esercizio collegato' : 'Seleziona esercizio…')}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
      >
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] p-4 max-h-[min(90vh,560px)] flex flex-col gap-3">
          <DialogHeader>
            <DialogTitle>Scegli un esercizio</DialogTitle>
            <DialogDescription>
              Cerca per nome. Vale su desktop e sul telefono.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca esercizio…"
              className="pl-9 h-11"
              autoFocus
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain -mx-1 px-1 space-y-1 max-h-[50vh]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : options.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nessun esercizio trovato.</p>
            ) : (
              options.map((ex) => {
                const active = ex.id === selectedId;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    className={cn(
                      'flex w-full min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm',
                      active ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                    )}
                    onClick={() => {
                      onPick(ex.id, ex.name);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <span className="truncate">{ex.name}</span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TemplateRoutineLinks({
  templateId,
  includeWarmup,
  includeCooldown,
  warmupTemplateId,
  cooldownTemplateId,
  warmupExerciseId = null,
  cooldownExerciseId = null,
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [warmupMode, setWarmupMode] = useState<SourceMode>(() =>
    resolveMode(warmupTemplateId, warmupExerciseId),
  );
  const [cooldownMode, setCooldownMode] = useState<SourceMode>(() =>
    resolveMode(cooldownTemplateId, cooldownExerciseId),
  );

  useEffect(() => {
    if (warmupExerciseId) setWarmupMode('exercise');
    else if (warmupTemplateId) setWarmupMode('template');
  }, [warmupExerciseId, warmupTemplateId]);

  useEffect(() => {
    if (cooldownExerciseId) setCooldownMode('exercise');
    else if (cooldownTemplateId) setCooldownMode('template');
  }, [cooldownExerciseId, cooldownTemplateId]);

  const { data: routines = [] } = useQuery({
    queryKey: ['pt-routine-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, title, template_role')
        .eq('pt_user_id', user.id)
        .in('template_role', ['warmup', 'cooldown'])
        .order('title');
      if (error) {
        if (/template_role|42703|PGRST204/i.test(error.message)) return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  const selectedExerciseIds = [warmupExerciseId, cooldownExerciseId].filter(Boolean) as string[];
  const { data: selectedExercises = [] } = useQuery({
    queryKey: ['pt-routine-selected-exercises', selectedExerciseIds.join(',')],
    queryFn: async () => {
      if (selectedExerciseIds.length === 0) return [] as { id: string; name: string }[];
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', selectedExerciseIds);
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
    enabled: selectedExerciseIds.length > 0,
  });

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    selectedExercises.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [selectedExercises]);

  const warmups = routines.filter((r: { template_role?: string }) => r.template_role === 'warmup');
  const cooldowns = routines.filter((r: { template_role?: string }) => r.template_role === 'cooldown');

  const saveMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from('workout_templates')
        .update(patch as Record<string, unknown>)
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-template-detail', templateId] });
      toast.success('Collegamento aggiornato');
    },
    onError: (e: Error) => {
      const msg = e?.message || 'Errore salvataggio';
      if (/include_warmup|warmup_template|warmup_exercise|template_role|42703|PGRST204/i.test(msg)) {
        toast.error('Applica la migration warmup/stretching (anche singolo esercizio) su Lovable Cloud');
        return;
      }
      toast.error(msg);
    },
  });

  const renderSourceControls = (opts: {
    mode: SourceMode;
    setMode: (m: SourceMode) => void;
    templateIdValue: string | null;
    exerciseIdValue: string | null;
    templates: { id: string; title: string }[];
    includeFlag: 'include_warmup' | 'include_cooldown';
    templateKey: 'warmup_template_id' | 'cooldown_template_id';
    exerciseKey: 'warmup_exercise_id' | 'cooldown_exercise_id';
  }) => (
    <div className="space-y-2 pl-0.5">
      <Select
        value={opts.mode}
        onValueChange={(v) => {
          const next = v as SourceMode;
          opts.setMode(next);
          if (next === 'template') {
            saveMutation.mutate({
              [opts.includeFlag]: true,
              [opts.templateKey]: opts.templateIdValue,
              [opts.exerciseKey]: null,
            });
          } else {
            saveMutation.mutate({
              [opts.includeFlag]: true,
              [opts.templateKey]: null,
              [opts.exerciseKey]: opts.exerciseIdValue,
            });
          }
        }}
      >
        <SelectTrigger className="h-11 bg-background text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[50vh]">
          <SelectItem value="template">Da template</SelectItem>
          <SelectItem value="exercise">Singolo esercizio</SelectItem>
        </SelectContent>
      </Select>

      {opts.mode === 'template' ? (
        <Select
          value={opts.templateIdValue ?? undefined}
          onValueChange={(v) =>
            saveMutation.mutate({
              [opts.includeFlag]: true,
              [opts.templateKey]: v,
              [opts.exerciseKey]: null,
            })
          }
        >
          <SelectTrigger className="h-11 bg-background text-xs">
            <SelectValue placeholder="Seleziona template…" />
          </SelectTrigger>
          <SelectContent className="max-h-[50vh]">
            {opts.templates.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Nessun template — crealo nel tab Riscald./Stretching.
              </div>
            ) : (
              opts.templates.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      ) : (
        <ExercisePickerButton
          selectedId={opts.exerciseIdValue}
          selectedName={opts.exerciseIdValue ? nameById.get(opts.exerciseIdValue) : undefined}
          disabled={saveMutation.isPending}
          onPick={(id) =>
            saveMutation.mutate({
              [opts.includeFlag]: true,
              [opts.templateKey]: null,
              [opts.exerciseKey]: id,
            })
          }
        />
      )}
    </div>
  );

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">Riscaldamento e stretching</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Opzionali e saltabili dall&apos;atleta. Puoi collegare un template oppure un singolo
        esercizio. Non contano nel riepilogo sessione.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Includi riscaldamento
          </Label>
          <Switch
            checked={includeWarmup}
            disabled={saveMutation.isPending}
            onCheckedChange={(v) =>
              saveMutation.mutate({
                include_warmup: v,
                warmup_template_id: v && warmupMode === 'template' ? warmupTemplateId : null,
                warmup_exercise_id: v && warmupMode === 'exercise' ? warmupExerciseId : null,
              })
            }
          />
        </div>
        {includeWarmup &&
          renderSourceControls({
            mode: warmupMode,
            setMode: setWarmupMode,
            templateIdValue: warmupTemplateId,
            exerciseIdValue: warmupExerciseId,
            templates: warmups,
            includeFlag: 'include_warmup',
            templateKey: 'warmup_template_id',
            exerciseKey: 'warmup_exercise_id',
          })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Snowflake className="h-3.5 w-3.5 text-sky-500" />
            Includi stretching
          </Label>
          <Switch
            checked={includeCooldown}
            disabled={saveMutation.isPending}
            onCheckedChange={(v) =>
              saveMutation.mutate({
                include_cooldown: v,
                cooldown_template_id: v && cooldownMode === 'template' ? cooldownTemplateId : null,
                cooldown_exercise_id: v && cooldownMode === 'exercise' ? cooldownExerciseId : null,
              })
            }
          />
        </div>
        {includeCooldown &&
          renderSourceControls({
            mode: cooldownMode,
            setMode: setCooldownMode,
            templateIdValue: cooldownTemplateId,
            exerciseIdValue: cooldownExerciseId,
            templates: cooldowns,
            includeFlag: 'include_cooldown',
            templateKey: 'cooldown_template_id',
            exerciseKey: 'cooldown_exercise_id',
          })}
      </div>
    </div>
  );
}
