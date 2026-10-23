import { describe, expect, it } from 'vitest';
import type { NutritionTemplateRecipe } from '@/types/nutrition';

/** Logica porzioni (allineata a addDiaryEntryFromRecipe) */
function macrosForRecipeServings(recipe: NutritionTemplateRecipe, servings: number) {
  const s = Math.max(0.25, servings);
  return {
    kcal: Math.round(recipe.per_serving_kcal * s * 10) / 10,
    protein_g: Math.round(recipe.per_serving_protein_g * s * 10) / 10,
  };
}

describe('nutritionDiaryRecipe', () => {
  it('scala i macro della ricetta per porzioni', () => {
    const recipe: NutritionTemplateRecipe = {
      id: '1',
      slug: 'x',
      category: 'pranzo',
      name: 'Test',
      description: null,
      servings: 1,
      per_serving_kcal: 500,
      per_serving_protein_g: 40,
      per_serving_carbs_g: 50,
      per_serving_fat_g: 10,
      ingredients: 'a',
      instructions: null,
      sort_order: 0,
    };
    expect(macrosForRecipeServings(recipe, 2).kcal).toBe(1000);
    expect(macrosForRecipeServings(recipe, 0.5).protein_g).toBe(20);
  });
});
