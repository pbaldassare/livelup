import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTemplateRecipeBySlug, nutritionRecipeKeys } from '@/lib/api/nutrition';
import { RecipeDetailView } from '@/components/nutrition/RecipeDetailView';
import { AddRecipeToDiaryDialog } from '@/components/nutrition/AddRecipeToDiaryDialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export function AtletaNutritionRecipeDetailPage() {
  const { slug = '' } = useParams();
  const { data: recipe, isLoading } = useQuery({
    queryKey: nutritionRecipeKeys.detail(slug),
    enabled: !!slug,
    queryFn: () => getTemplateRecipeBySlug(slug),
  });

  return (
    <div className="min-h-screen bg-app-background pb-20 p-4 space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/app/nutrition">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Nutrizione
        </Link>
      </Button>
      {isLoading ? (
        <p className="text-sm text-center py-8 text-app-muted-foreground">Caricamento…</p>
      ) : !recipe ? (
        <p className="text-sm text-app-muted-foreground">Ricetta non trovata.</p>
      ) : (
        <>
          <RecipeDetailView recipe={recipe} />
          <AddRecipeToDiaryDialog recipe={recipe} />
        </>
      )}
    </div>
  );
}

export default AtletaNutritionRecipeDetailPage;
