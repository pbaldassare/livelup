import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Flame, Snowflake } from 'lucide-react';

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
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: exerciseOptions = [] } = useQuery({
    queryKey: ['pt-routine-exercise-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as { id: string; name: string }[];
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .or(`is_public.eq.true,created_by.eq.${user.id}`)
        .order('name')
        .limit(800);
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
    enabled: !!user?.id,
  });

  const warmups = routines.filter((r: { template_role?: string }) => r.template_role === 'warmup');
  const cooldowns = routines.filter((r: { template_role?: string }) => r.template_role === 'cooldown');

  const warmupMode = useMemo(
    () => resolveMode(warmupTemplateId, warmupExerciseId),
    [warmupTemplateId, warmupExerciseId],
  );
  const cooldownMode = useMemo(
    () => resolveMode(cooldownTemplateId, cooldownExerciseId),
    [cooldownTemplateId, cooldownExerciseId],
  );

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
    kind: 'warmup' | 'cooldown';
    mode: SourceMode;
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
        <SelectTrigger className="h-9 bg-background text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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
          <SelectTrigger className="h-9 bg-background text-xs">
            <SelectValue placeholder="Seleziona template…" />
          </SelectTrigger>
          <SelectContent>
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
        <Select
          value={opts.exerciseIdValue ?? undefined}
          onValueChange={(v) =>
            saveMutation.mutate({
              [opts.includeFlag]: true,
              [opts.templateKey]: null,
              [opts.exerciseKey]: v,
            })
          }
        >
          <SelectTrigger className="h-9 bg-background text-xs">
            <SelectValue placeholder="Seleziona esercizio…" />
          </SelectTrigger>
          <SelectContent>
            {exerciseOptions.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Nessun esercizio in archivio.
              </div>
            ) : (
              exerciseOptions.map((ex) => (
                <SelectItem key={ex.id} value={ex.id}>
                  {ex.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
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
                warmup_template_id: v ? warmupTemplateId : null,
                warmup_exercise_id: v ? warmupExerciseId : null,
              })
            }
          />
        </div>
        {includeWarmup &&
          renderSourceControls({
            kind: 'warmup',
            mode: warmupMode,
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
                cooldown_template_id: v ? cooldownTemplateId : null,
                cooldown_exercise_id: v ? cooldownExerciseId : null,
              })
            }
          />
        </div>
        {includeCooldown &&
          renderSourceControls({
            kind: 'cooldown',
            mode: cooldownMode,
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
