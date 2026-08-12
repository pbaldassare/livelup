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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Flame, Snowflake } from 'lucide-react';

type Props = {
  templateId: string;
  includeWarmup: boolean;
  includeCooldown: boolean;
  warmupTemplateId: string | null;
  cooldownTemplateId: string | null;
  warmupExerciseId?: string | null;
  cooldownExerciseId?: string | null;
};

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

  const { data: exercises = [] } = useQuery({
    queryKey: ['pt-routine-exercises', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // RLS: pubblici ∪ privati del PT
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const warmups = routines.filter((r: any) => r.template_role === 'warmup');
  const cooldowns = routines.filter((r: any) => r.template_role === 'cooldown');

  const saveMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from('workout_templates')
        .update(patch as any)
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-template-detail', templateId] });
      toast.success('Collegamento aggiornato');
    },
    onError: (e: any) => {
      const msg = e?.message || 'Errore salvataggio';
      if (/include_warmup|warmup_template|warmup_exercise|template_role|42703|PGRST204/i.test(msg)) {
        toast.error('Applica la migration warmup-cooldown su Lovable Cloud');
        return;
      }
      toast.error(msg);
    },
  });

  const warmupSource: 'template' | 'exercise' = warmupExerciseId ? 'exercise' : 'template';
  const cooldownSource: 'template' | 'exercise' = cooldownExerciseId ? 'exercise' : 'template';

  const renderSection = (
    phase: 'warmup' | 'cooldown',
  ) => {
    const isWarmup = phase === 'warmup';
    const include = isWarmup ? includeWarmup : includeCooldown;
    const source = isWarmup ? warmupSource : cooldownSource;
    const tplId = isWarmup ? warmupTemplateId : cooldownTemplateId;
    const exId = isWarmup ? warmupExerciseId : cooldownExerciseId;
    const templatesList = isWarmup ? warmups : cooldowns;
    const includeKey = isWarmup ? 'include_warmup' : 'include_cooldown';
    const tplKey = isWarmup ? 'warmup_template_id' : 'cooldown_template_id';
    const exKey = isWarmup ? 'warmup_exercise_id' : 'cooldown_exercise_id';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs flex items-center gap-1.5">
            {isWarmup ? (
              <Flame className="h-3.5 w-3.5 text-orange-500" />
            ) : (
              <Snowflake className="h-3.5 w-3.5 text-sky-500" />
            )}
            {isWarmup ? 'Includi riscaldamento' : 'Includi stretching'}
          </Label>
          <Switch
            checked={include}
            disabled={saveMutation.isPending}
            onCheckedChange={(v) =>
              saveMutation.mutate({
                [includeKey]: v,
                [tplKey]: v ? tplId : null,
                [exKey]: v ? exId : null,
              })
            }
          />
        </div>

        {include && (
          <>
            <Tabs
              value={source}
              onValueChange={(v) =>
                saveMutation.mutate({
                  [includeKey]: true,
                  [tplKey]: v === 'template' ? tplId : null,
                  [exKey]: v === 'exercise' ? exId : null,
                })
              }
            >
              <TabsList className="h-8">
                <TabsTrigger value="template" className="text-[11px] px-2">
                  Template
                </TabsTrigger>
                <TabsTrigger value="exercise" className="text-[11px] px-2">
                  Singolo esercizio
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {source === 'template' ? (
              <Select
                value={tplId ?? undefined}
                onValueChange={(v) =>
                  saveMutation.mutate({
                    [includeKey]: true,
                    [exKey]: null,
                    [tplKey]: v,
                  })
                }
              >
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue placeholder="Seleziona template…" />
                </SelectTrigger>
                <SelectContent>
                  {templatesList.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Nessun template — crealo nel tab Riscald./Stretching.
                    </div>
                  ) : (
                    templatesList.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={exId ?? undefined}
                onValueChange={(v) =>
                  saveMutation.mutate({
                    [includeKey]: true,
                    [tplKey]: null,
                    [exKey]: v,
                  })
                }
              >
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue placeholder="Seleziona esercizio…" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {exercises.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Nessun esercizio disponibile.
                    </div>
                  ) : (
                    exercises.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">Riscaldamento e stretching</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Opzionali e saltabili dall&apos;atleta. Non contano nel riepilogo sessione. Puoi collegare un
        template oppure un singolo esercizio.
      </p>

      {renderSection('warmup')}
      {renderSection('cooldown')}
    </div>
  );
}
