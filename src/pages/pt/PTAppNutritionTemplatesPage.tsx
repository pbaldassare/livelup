import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { useAuth } from '@/hooks/useAuth';
import {
  deletePtPlanTemplate,
  listPtPlanTemplates,
  nutritionPtTemplateKeys,
} from '@/lib/api/nutrition';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function PTAppNutritionTemplatesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: nutritionPtTemplateKeys.list(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: () => listPtPlanTemplates(user!.id),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePtPlanTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionPtTemplateKeys.list(user!.id) });
      toast.success('Modello eliminato');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PTAppPageShell
      title="Modelli piano"
      description="Template riutilizzabili per assegnare piani più velocemente"
      showBack
      backTo="/pt/app/nutrition"
    >
      {isLoading ? (
        <p className="text-sm text-center py-8 text-app-muted-foreground">Caricamento…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-app-muted-foreground rounded-xl border border-dashed border-app-border p-6 text-center">
          Nessun modello salvato. Dalla scheda di un atleta usa &quot;Salva come modello&quot;.
        </p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{t.name}</p>
                <p className="text-xs text-app-muted-foreground">
                  {t.daily_kcal} kcal · P {t.protein_g}g · C {t.carbs_g}g · G {t.fat_g}g
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() => deleteMutation.mutate(t.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-app-muted-foreground mt-6">
        Applica un modello aprendo la scheda nutrizione di un atleta e scegliendolo dal menu modelli.
      </p>
    </PTAppPageShell>
  );
}

export default PTAppNutritionTemplatesPage;
