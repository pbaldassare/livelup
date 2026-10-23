import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { getTemplateRecipeBySlug, nutritionRecipeKeys } from '@/lib/api/nutrition';
import { RecipeDetailView } from '@/components/nutrition/RecipeDetailView';

export function PTAppNutritionRecipeDetailPage() {
  const { slug = '' } = useParams();
  const { data: recipe, isLoading } = useQuery({
    queryKey: nutritionRecipeKeys.detail(slug),
    enabled: !!slug,
    queryFn: () => getTemplateRecipeBySlug(slug),
  });

  return (
    <PTAppPageShell title="Ricetta" showBack backTo="/pt/app/nutrition/ricette">
      {isLoading ? (
        <p className="text-sm text-center py-8 text-app-muted-foreground">Caricamento…</p>
      ) : !recipe ? (
        <p className="text-sm text-app-muted-foreground">Ricetta non trovata.</p>
      ) : (
        <RecipeDetailView recipe={recipe} />
      )}
    </PTAppPageShell>
  );
}

export default PTAppNutritionRecipeDetailPage;
