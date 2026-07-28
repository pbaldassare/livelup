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

type Props = {
  templateId: string;
  includeWarmup: boolean;
  includeCooldown: boolean;
  warmupTemplateId: string | null;
  cooldownTemplateId: string | null;
};

export function TemplateRoutineLinks({
  templateId,
  includeWarmup,
  includeCooldown,
  warmupTemplateId,
  cooldownTemplateId,
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
      if (/include_warmup|warmup_template|template_role|42703|PGRST204/i.test(msg)) {
        toast.error('Applica la migration warmup-cooldown su Lovable Cloud');
        return;
      }
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">Riscaldamento e defaticamento</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Opzionali e saltabili dall&apos;atleta. Non contano nel riepilogo sessione.
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
              })
            }
          />
        </div>
        {includeWarmup && (
          <Select
            value={warmupTemplateId ?? undefined}
            onValueChange={(v) =>
              saveMutation.mutate({
                include_warmup: true,
                warmup_template_id: v,
              })
            }
          >
            <SelectTrigger className="h-9 bg-background text-xs">
              <SelectValue placeholder="Seleziona template…" />
            </SelectTrigger>
            <SelectContent>
              {warmups.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nessun template — crealo nel tab Riscald./Defatic.
                </div>
              ) : (
                warmups.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Snowflake className="h-3.5 w-3.5 text-sky-500" />
            Includi defaticamento
          </Label>
          <Switch
            checked={includeCooldown}
            disabled={saveMutation.isPending}
            onCheckedChange={(v) =>
              saveMutation.mutate({
                include_cooldown: v,
                cooldown_template_id: v ? cooldownTemplateId : null,
              })
            }
          />
        </div>
        {includeCooldown && (
          <Select
            value={cooldownTemplateId ?? undefined}
            onValueChange={(v) =>
              saveMutation.mutate({
                include_cooldown: true,
                cooldown_template_id: v,
              })
            }
          >
            <SelectTrigger className="h-9 bg-background text-xs">
              <SelectValue placeholder="Seleziona template…" />
            </SelectTrigger>
            <SelectContent>
              {cooldowns.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nessun template — crealo nel tab Riscald./Defatic.
                </div>
              ) : (
                cooldowns.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
