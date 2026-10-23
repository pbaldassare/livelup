import type { NutritionTemplateRecipe } from '@/types/nutrition';
import {
  NUTRITION_DIET_PLAN_LABELS,
  NUTRITION_RECIPE_CATEGORY_LABELS,
  type NutritionDietPlan,
} from '@/types/nutrition';

export function RecipeDetailView({ recipe }: { recipe: NutritionTemplateRecipe }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-app-muted-foreground">
          {NUTRITION_RECIPE_CATEGORY_LABELS[recipe.category]}
          {recipe.diet_plan && (
            <>
              {' · '}
              {NUTRITION_DIET_PLAN_LABELS[recipe.diet_plan as NutritionDietPlan] ??
                recipe.diet_plan}
            </>
          )}
          {recipe.prep_time_min ? ` · ${recipe.prep_time_min} min` : ''}
        </p>
        <h2 className="text-xl font-bold text-app-foreground">{recipe.name}</h2>
        {recipe.description && (
          <p className="text-sm text-app-muted-foreground mt-1">{recipe.description}</p>
        )}
      </div>
      <div className="rounded-xl border border-app-border bg-app-card p-4 text-sm">
        <p>
          <span className="font-medium">Porzione:</span> {recipe.per_serving_kcal} kcal · P{' '}
          {recipe.per_serving_protein_g}g · C {recipe.per_serving_carbs_g}g · G{' '}
          {recipe.per_serving_fat_g}g
        </p>
      </div>
      <div>
        <h3 className="font-semibold text-app-foreground mb-2">Ingredienti</h3>
        <pre className="text-sm whitespace-pre-wrap text-app-muted-foreground font-sans">
          {recipe.ingredients}
        </pre>
      </div>
      {recipe.instructions && (
        <div>
          <h3 className="font-semibold text-app-foreground mb-2">Preparazione</h3>
          <p className="text-sm text-app-muted-foreground whitespace-pre-wrap">{recipe.instructions}</p>
        </div>
      )}
    </div>
  );
}
