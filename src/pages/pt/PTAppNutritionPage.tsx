import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { useAuth } from '@/hooks/useAuth';
import { getPTConnections } from '@/lib/api/connections';
import { listActivePlansForPtAthletes, nutritionPlanKeys } from '@/lib/api/nutrition';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Salad, BookOpen, LayoutTemplate, Apple } from 'lucide-react';

export function PTAppNutritionPage() {
  const { user } = useAuth();

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ['pt-nutrition-athletes', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const connections = await getPTConnections(user!.id, 'active');
      const ids = connections.map((c) => c.atleta_user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', ids);
      const nameById = new Map(
        (profiles ?? []).map((p) => [
          p.user_id,
          `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Atleta',
        ]),
      );
      const plans = await listActivePlansForPtAthletes(ids);
      return ids.map((id) => ({
        atletaUserId: id,
        name: nameById.get(id) ?? 'Atleta',
        activePlan: plans[id],
      }));
    },
  });

  return (
    <PTAppPageShell
      title="Nutrizione"
      description="Piani alimentari per i tuoi atleti collegati"
      showBack
      backTo="/pt/app"
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/pt/app/nutrition/modelli">
            <LayoutTemplate className="mr-1 h-4 w-4" />
            Modelli
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/pt/app/nutrition/ricette">
            <BookOpen className="mr-1 h-4 w-4" />
            Ricette
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/pt/app/nutrition/alimenti">
            <Apple className="mr-1 h-4 w-4" />
            Alimenti
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-app-muted-foreground py-8 text-center">Caricamento…</p>
      ) : athletes.length === 0 ? (
        <div className="rounded-2xl border border-app-border bg-app-card p-8 text-center">
          <Salad className="mx-auto h-10 w-10 text-app-muted-foreground mb-3" />
          <p className="text-sm text-app-muted-foreground">
            Nessun atleta collegato. Collega un atleta per assegnare un piano nutrizionale.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {athletes.map((a) => {
            const mine = a.activePlan?.pt_user_id === user?.id;
            const otherActive = a.activePlan && !mine;
            return (
              <li key={a.atletaUserId}>
                <Link
                  to={`/pt/app/nutrition/atleta/${a.atletaUserId}`}
                  className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card p-4 active:bg-app-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-app-foreground truncate">{a.name}</p>
                    <p className="text-xs text-app-muted-foreground mt-0.5">
                      {a.activePlan
                        ? `${a.activePlan.daily_kcal} kcal · P ${a.activePlan.protein_g}g`
                        : 'Nessun piano attivo'}
                    </p>
                  </div>
                  {otherActive && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      Altro PT
                    </Badge>
                  )}
                  {mine && (
                    <Badge className="bg-pt-primary/20 text-pt-primary border-0 text-[10px] shrink-0">
                      Attivo
                    </Badge>
                  )}
                  <ChevronRight className="h-5 w-5 shrink-0 text-app-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PTAppPageShell>
  );
}

export default PTAppNutritionPage;
