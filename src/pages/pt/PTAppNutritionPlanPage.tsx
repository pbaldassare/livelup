import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { useAuth } from '@/hooks/useAuth';
import {
  activateNutritionPlan,
  createNutritionPlan,
  getActiveNutritionPlan,
  listMacroTemplates,
  listNutritionPlansForAtleta,
  nutritionPlanKeys,
  updateNutritionPlan,
} from '@/lib/api/nutrition';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function PTAppNutritionPlanPage() {
  const { atletaUserId = '' } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [macroTemplateId, setMacroTemplateId] = useState<string>('');
  const [title, setTitle] = useState('Piano nutrizionale');
  const [notes, setNotes] = useState('');
  const [dailyKcal, setDailyKcal] = useState('2000');
  const [proteinG, setProteinG] = useState('140');
  const [carbsG, setCarbsG] = useState('200');
  const [fatG, setFatG] = useState('65');

  const { data: athleteName } = useQuery({
    queryKey: ['profile-name', atletaUserId],
    enabled: !!atletaUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', atletaUserId)
        .maybeSingle();
      return `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.trim() || 'Atleta';
    },
  });

  const { data: macroTemplates = [] } = useQuery({
    queryKey: ['nutrition-macro-templates'],
    queryFn: listMacroTemplates,
  });

  const { data: activePlan, isLoading: loadingActive } = useQuery({
    queryKey: nutritionPlanKeys.activeForAtleta(atletaUserId),
    enabled: !!atletaUserId,
    queryFn: () => getActiveNutritionPlan(atletaUserId),
  });

  const { data: history = [] } = useQuery({
    queryKey: nutritionPlanKeys.forAtleta(atletaUserId),
    enabled: !!atletaUserId,
    queryFn: () => listNutritionPlansForAtleta(atletaUserId),
  });

  const applyTemplate = (id: string) => {
    setMacroTemplateId(id);
    const t = macroTemplates.find((m) => m.id === id);
    if (!t) return;
    setDailyKcal(String(t.daily_kcal));
    setProteinG(String(t.protein_g));
    setCarbsG(String(t.carbs_g));
    setFatG(String(t.fat_g));
    setTitle(t.name);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: nutritionPlanKeys.activeForAtleta(atletaUserId) });
    queryClient.invalidateQueries({ queryKey: nutritionPlanKeys.forAtleta(atletaUserId) });
    queryClient.invalidateQueries({ queryKey: ['pt-nutrition-athletes', user?.id] });
  };

  const createMutation = useMutation({
    mutationFn: async (activate: boolean) => {
      if (!user?.id) throw new Error('Sessione non valida');
      const kcal = Number(dailyKcal);
      const p = Number(proteinG);
      const c = Number(carbsG);
      const f = Number(fatG);
      if (!kcal || kcal < 800) throw new Error('Inserisci calorie giornaliere valide');
      return createNutritionPlan({
        atletaUserId,
        ptUserId: user.id,
        macroTemplateId: macroTemplateId || null,
        title,
        notes: notes.trim() || null,
        dailyKcal: kcal,
        proteinG: p,
        carbsG: c,
        fatG: f,
        activate,
      });
    },
    onSuccess: (_plan, activate) => {
      toast.success(activate ? 'Piano creato e attivato' : 'Piano salvato');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: (planId: string) => activateNutritionPlan(planId),
    onSuccess: () => {
      toast.success('Piano attivato');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveActiveMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan || activePlan.pt_user_id !== user?.id) {
        throw new Error('Puoi modificare solo il piano che hai creato tu');
      }
      return updateNutritionPlan(activePlan.id, {
        title: title.trim() || 'Piano nutrizionale',
        notes: notes.trim() || null,
        daily_kcal: Number(dailyKcal),
        protein_g: Number(proteinG),
        carbs_g: Number(carbsG),
        fat_g: Number(fatG),
      });
    },
    onSuccess: () => {
      toast.success('Piano aggiornato');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const conflictWarning = useMemo(() => {
    if (!activePlan || activePlan.pt_user_id === user?.id) return null;
    return 'Questo atleta ha già un piano attivo assegnato da un altro Professionista. Attivando un nuovo piano lo sostituirai.';
  }, [activePlan, user?.id]);

  const canEditActive = activePlan?.pt_user_id === user?.id;

  return (
    <PTAppPageShell
      title={athleteName ?? 'Piano nutrizionale'}
      description="Target giornalieri e note per l'atleta"
      showBack
      backTo="/pt/app/nutrition"
    >
      {loadingActive ? (
        <p className="text-sm text-center py-8 text-app-muted-foreground">Caricamento…</p>
      ) : (
        <div className="space-y-6 pb-8">
          {activePlan && (
            <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-app-foreground">Piano attivo</p>
                {activePlan.pt_user_id === user?.id ? (
                  <Badge className="bg-pt-primary/20 text-pt-primary border-0">Tuo</Badge>
                ) : (
                  <Badge variant="outline">Altro PT</Badge>
                )}
              </div>
              <p className="text-sm text-app-muted-foreground">
                {activePlan.title} · {activePlan.daily_kcal} kcal (P {activePlan.protein_g}g · C{' '}
                {activePlan.carbs_g}g · G {activePlan.fat_g}g)
              </p>
            </div>
          )}

          {conflictWarning && (
            <p className="text-sm text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              {conflictWarning}
            </p>
          )}

          <div className="space-y-4 rounded-2xl border border-app-border bg-app-card p-4">
            <div className="space-y-2">
              <Label>Modello di partenza</Label>
              <Select
                value={macroTemplateId || 'none'}
                onValueChange={(v) => (v === 'none' ? setMacroTemplateId('') : applyTemplate(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Scegli un modello" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Personalizzato</SelectItem>
                  {macroTemplates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Titolo</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>kcal / giorno</Label>
                <Input type="number" value={dailyKcal} onChange={(e) => setDailyKcal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Proteine (g)</Label>
                <Input type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Carboidrati (g)</Label>
                <Input type="number" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Grassi (g)</Label>
                <Input type="number" value={fatG} onChange={(e) => setFatG(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note per l&apos;atleta</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {canEditActive ? (
                <Button
                  className="flex-1 bg-pt-primary text-pt-primary-foreground"
                  disabled={saveActiveMutation.isPending}
                  onClick={() => saveActiveMutation.mutate()}
                >
                  {saveActiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Aggiorna piano attivo
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={createMutation.isPending}
                    onClick={() => createMutation.mutate(false)}
                  >
                    Salva bozza
                  </Button>
                  <Button
                    className="flex-1 bg-pt-primary text-pt-primary-foreground"
                    disabled={createMutation.isPending}
                    onClick={() => createMutation.mutate(true)}
                  >
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crea e attiva
                  </Button>
                </>
              )}
            </div>
          </div>

          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-app-foreground">Storico piani</p>
              <ul className="space-y-2">
                {history.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {p.title}{' '}
                      <span className="text-app-muted-foreground">
                        · {p.daily_kcal} kcal{p.is_active ? ' · attivo' : ''}
                      </span>
                    </span>
                    {!p.is_active && p.pt_user_id === user?.id && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={activateMutation.isPending}
                        onClick={() => activateMutation.mutate(p.id)}
                      >
                        Attiva
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </PTAppPageShell>
  );
}

export default PTAppNutritionPlanPage;
