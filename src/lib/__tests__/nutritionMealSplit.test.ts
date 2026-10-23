import { describe, expect, it } from 'vitest';
import { defaultMealTargetsFromDaily } from '@/lib/nutritionMealSplit';

describe('nutritionMealSplit', () => {
  it('ripartisce i macro sui pasti principali', () => {
    const rows = defaultMealTargetsFromDaily({
      kcal: 2000,
      protein_g: 100,
      carbs_g: 200,
      fat_g: 60,
    });
    expect(rows.find((r) => r.meal_type === 'pranzo')?.kcal).toBe(600);
    const sumKcal = rows.reduce((s, r) => s + r.kcal, 0);
    expect(sumKcal).toBe(2000);
  });
});
