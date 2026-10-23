import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import {
  listTemplateRecipes,
  nutritionRecipeKeys,
} from '@/lib/api/nutrition';
import {
  NUTRITION_DIET_PLAN_LABELS,
  NUTRITION_RECIPE_CATEGORY_LABELS,
  type NutritionDietPlan,
  type NutritionRecipeCategory,
} from '@/types/nutrition';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CATEGORIES = (['colazione', 'spuntino', 'pranzo', 'cena'] as const) satisfies readonly NutritionRecipeCategory[];
const DIETS = Object.keys(NUTRITION_DIET_PLAN_LABELS) as NutritionDietPlan[];

export function PTAppNutritionRecipesPage() {
  const [tab, setTab] = useState<NutritionRecipeCategory | 'tutte'>('tutte');
  const [search, setSearch] = useState('');
  const [diet, setDiet] = useState<NutritionDietPlan | 'tutte'>('tutte');

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: nutritionRecipeKeys.list(
      tab === 'tutte' ? undefined : tab,
      diet === 'tutte' ? undefined : diet,
      search,
    ),
    queryFn: () =>
      listTemplateRecipes(
        tab === 'tutte' ? undefined : tab,
        search || undefined,
        diet === 'tutte' ? undefined : diet,
      ),
  });

  return (
    <PTAppPageShell
      title="Ricette"
      description="Idee pasto da condividere con gli atleti"
      showBack
      backTo="/pt/app/nutrition"
    >
      <div className="flex flex-col gap-2 sm:flex-row mb-2">
        <Input
          placeholder="Cerca ricetta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={diet} onValueChange={(v) => setDiet(v as NutritionDietPlan | 'tutte')}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Piano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutte">Tutti i piani</SelectItem>
            {DIETS.map((d) => (
              <SelectItem key={d} value={d}>{NUTRITION_DIET_PLAN_LABELS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as NutritionRecipeCategory | 'tutte')}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="tutte">Tutte</TabsTrigger>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c} className="text-xs">
              {NUTRITION_RECIPE_CATEGORY_LABELS[c]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <p className="text-sm text-center py-8 text-app-muted-foreground">Caricamento…</p>
          ) : (
            <ul className="space-y-2">
              {recipes.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/pt/app/nutrition/ricette/${r.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{r.name}</p>
                      <p className="text-xs text-app-muted-foreground">
                        {NUTRITION_RECIPE_CATEGORY_LABELS[r.category]} · {r.per_serving_kcal} kcal
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-app-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </PTAppPageShell>
  );
}

export default PTAppNutritionRecipesPage;
