import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Flame, Snowflake, Trash2 } from 'lucide-react';
import { RoutineExercisePicker } from '@/components/pt/RoutineExercisePicker';
import {
  canAddRoutineExercise,
  MAX_ROUTINE_EXERCISES,
  resolveRoutineExerciseIds,
  routineExerciseListPatch,
} from '@/lib/pt/routineExercises';

type SourceMode = 'template' | 'exercise';

type Props = {
  templateId: string;
  includeWarmup: boolean;
  includeCooldown: boolean;
  warmupTemplateId: string | null;
  cooldownTemplateId: string | null;
  warmupExerciseId?: string | null;
  cooldownExerciseId?: string | null;
  warmupExerciseIds?: string[] | null;
  cooldownExerciseIds?: string[] | null;
};

function resolveMode(
  templateId: string | null,
  exerciseIds: string[],
): SourceMode {
  if (exerciseIds.length > 0) return 'exercise';
  if (templateId) return 'template';
  return 'template';
}

export function TemplateRoutineLinks({
  templateId,
  includeWarmup,
  includeCooldown,
  warmupTemplateId,
  cooldownTemplateId,
  warmupExerciseId = null,
  cooldownExerciseId = null,
  warmupExerciseIds = null,
  cooldownExerciseIds = null,
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const warmupIds = resolveRoutineExerciseIds({
    exerciseIds: warmupExerciseIds,
    exerciseId: warmupExerciseId,
  });
  const cooldownIds = resolveRoutineExerciseIds({
    exerciseIds: cooldownExerciseIds,
    exerciseId: cooldownExerciseId,
  });
  const [warmupMode, setWarmupMode] = useState<SourceMode>(() =>
    resolveMode(warmupTemplateId, warmupIds),
  );
  const [cooldownMode, setCooldownMode] = useState<SourceMode>(() =>
    resolveMode(cooldownTemplateId, cooldownIds),
  );

  useEffect(() => {
    setWarmupMode(resolveMode(warmupTemplateId, warmupIds));
  }, [warmupTemplateId, warmupExerciseId, warmupExerciseIds]);

  useEffect(() => {
    setCooldownMode(resolveMode(cooldownTemplateId, cooldownIds));
  }, [cooldownTemplateId, cooldownExerciseId, cooldownExerciseIds]);

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

  const selectedExerciseIds = [...warmupIds, ...cooldownIds];
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
      const { error } = await (supabase.from('workout_templates') as any)
        .update(patch)
        .eq('id', templateId);
      if (error) {
        const msg = error.message || '';
        const missingList =
          /warmup_exercise_ids|cooldown_exercise_ids|42703|PGRST204/i.test(msg);
        if (missingList) {
          const fallback = { ...patch };
          delete fallback.warmup_exercise_ids;
          delete fallback.cooldown_exercise_ids;
          const retry = await (supabase.from('workout_templates') as any)
            .update(fallback)
            .eq('id', templateId);
          if (retry.error) throw retry.error;
          if (
            (Array.isArray(patch.warmup_exercise_ids) &&
              (patch.warmup_exercise_ids as string[]).length > 1) ||
            (Array.isArray(patch.cooldown_exercise_ids) &&
              (patch.cooldown_exercise_ids as string[]).length > 1)
          ) {
            throw new Error(
              'Applica la migration delle liste riscaldamento/stretching su Lovable Cloud',
            );
          }
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-template-detail', templateId] });
      toast.success('Collegamento aggiornato');
    },
    onError: (e: Error) => {
      const msg = e?.message || 'Errore salvataggio';
      if (/include_warmup|warmup_template|warmup_exercise|template_role|42703|PGRST204/i.test(msg)) {
        toast.error('Applica la migration warmup/stretching (anche lista esercizi) su Lovable Cloud');
        return;
      }
      toast.error(msg);
    },
  });

  const saveExerciseList = (kind: 'warmup' | 'cooldown', ids: string[]) => {
    saveMutation.mutate(routineExerciseListPatch(kind, ids));
  };

  const renderExerciseList = (opts: {
    kind: 'warmup' | 'cooldown';
    ids: string[];
  }) => (
    <div className="space-y-2">
      {opts.ids.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Nessun esercizio. Aggiungine uno o più.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {opts.ids.map((id, idx) => (
            <li
              key={`${id}-${idx}`}
              className="flex items-center gap-1.5 rounded-md border border-dashed bg-background p-1.5"
            >
              <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">
                {idx + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <RoutineExercisePicker
                  selectedId={id}
                  selectedName={nameById.get(id)}
                  disabled={saveMutation.isPending}
                  excludeIds={opts.ids.filter((other) => other !== id)}
                  onPick={(nextId) => {
                    if (!canAddRoutineExercise(opts.ids.filter((_, i) => i !== idx), nextId)) {
                      toast.error('Esercizio già in elenco');
                      return;
                    }
                    const next = opts.ids.map((cur, i) => (i === idx ? nextId : cur));
                    saveExerciseList(opts.kind, next);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                disabled={saveMutation.isPending}
                aria-label="Elimina esercizio"
                onClick={() =>
                  saveExerciseList(
                    opts.kind,
                    opts.ids.filter((_, i) => i !== idx),
                  )
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <RoutineExercisePicker
        variant="add"
        selectedId={null}
        disabled={saveMutation.isPending || opts.ids.length >= MAX_ROUTINE_EXERCISES}
        excludeIds={opts.ids}
        onPick={(id) => {
          if (!canAddRoutineExercise(opts.ids, id)) {
            toast.error(
              opts.ids.includes(id)
                ? 'Esercizio già in elenco'
                : `Massimo ${MAX_ROUTINE_EXERCISES} esercizi`,
            );
            return;
          }
          saveExerciseList(opts.kind, [...opts.ids, id]);
        }}
      />
    </div>
  );

  const renderSourceControls = (opts: {
    mode: SourceMode;
    setMode: (m: SourceMode) => void;
    kind: 'warmup' | 'cooldown';
    templateIdValue: string | null;
    exerciseIds: string[];
    templates: { id: string; title: string }[];
    includeFlag: 'include_warmup' | 'include_cooldown';
    templateKey: 'warmup_template_id' | 'cooldown_template_id';
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
              [opts.kind === 'warmup' ? 'warmup_exercise_id' : 'cooldown_exercise_id']: null,
              [opts.kind === 'warmup' ? 'warmup_exercise_ids' : 'cooldown_exercise_ids']: [],
            });
          } else {
            saveExerciseList(opts.kind, opts.exerciseIds);
          }
        }}
      >
        <SelectTrigger className="h-11 bg-background text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[50vh]">
          <SelectItem value="template">Da template</SelectItem>
          <SelectItem value="exercise">Elenco esercizi</SelectItem>
        </SelectContent>
      </Select>

      {opts.mode === 'template' ? (
        <Select
          value={opts.templateIdValue ?? undefined}
          onValueChange={(v) =>
            saveMutation.mutate({
              [opts.includeFlag]: true,
              [opts.templateKey]: v,
              [opts.kind === 'warmup' ? 'warmup_exercise_id' : 'cooldown_exercise_id']: null,
              [opts.kind === 'warmup' ? 'warmup_exercise_ids' : 'cooldown_exercise_ids']: [],
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
        renderExerciseList({ kind: opts.kind, ids: opts.exerciseIds })
      )}
    </div>
  );

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">Riscaldamento e stretching</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Opzionali e saltabili dall&apos;atleta. Puoi collegare un template oppure una lista di
        esercizi (aggiungi e rimuovi). Non contano nel riepilogo sessione.
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
              saveMutation.mutate(
                v && warmupMode === 'exercise'
                  ? routineExerciseListPatch('warmup', warmupIds)
                  : {
                      include_warmup: v,
                      warmup_template_id: v && warmupMode === 'template' ? warmupTemplateId : null,
                      warmup_exercise_id: null,
                      warmup_exercise_ids: [],
                    },
              )
            }
          />
        </div>
        {includeWarmup &&
          renderSourceControls({
            mode: warmupMode,
            setMode: setWarmupMode,
            kind: 'warmup',
            templateIdValue: warmupTemplateId,
            exerciseIds: warmupIds,
            templates: warmups,
            includeFlag: 'include_warmup',
            templateKey: 'warmup_template_id',
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
              saveMutation.mutate(
                v && cooldownMode === 'exercise'
                  ? routineExerciseListPatch('cooldown', cooldownIds)
                  : {
                      include_cooldown: v,
                      cooldown_template_id: v && cooldownMode === 'template' ? cooldownTemplateId : null,
                      cooldown_exercise_id: null,
                      cooldown_exercise_ids: [],
                    },
              )
            }
          />
        </div>
        {includeCooldown &&
          renderSourceControls({
            mode: cooldownMode,
            setMode: setCooldownMode,
            kind: 'cooldown',
            templateIdValue: cooldownTemplateId,
            exerciseIds: cooldownIds,
            templates: cooldowns,
            includeFlag: 'include_cooldown',
            templateKey: 'cooldown_template_id',
          })}
      </div>
    </div>
  );
}
