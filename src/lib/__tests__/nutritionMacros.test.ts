import { describe, expect, it } from 'vitest';
import { macrosForGrams, sumMacroTotals, macroProgress } from '@/lib/nutritionMacros';

describe('nutritionMacros', () => {
  it('scala i macro per grammatura', () => {
    const m = macrosForGrams(
      { per_100g_kcal: 100, per_100g_protein_g: 10, per_100g_carbs_g: 5, per_100g_fat_g: 2 },
      50,
    );
    expect(m).toEqual({ kcal: 50, protein_g: 5, carbs_g: 2.5, fat_g: 1 });
  });

  it('somma i totali giornalieri', () => {
    const total = sumMacroTotals([
      { kcal: 100, protein_g: 10, carbs_g: 5, fat_g: 2 },
      { kcal: 50, protein_g: 5, carbs_g: 2.5, fat_g: 1 },
    ]);
    expect(total.kcal).toBe(150);
    expect(total.protein_g).toBe(15);
  });

  it('calcola progresso percentuale capped a 100', () => {
    expect(macroProgress(50, 100)).toBe(50);
    expect(macroProgress(150, 100)).toBe(100);
  });
});
