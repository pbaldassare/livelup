import type { FoodTemplate } from '@/types/nutrition';
import { searchFoodTemplates } from './foods';

/**
 * Provider esterno per barcode / immagini / ricerca open food (fase successiva).
 * MVP: solo catalogo locale `food_templates`.
 */
export interface FoodLookupProvider {
  searchByText(query: string): Promise<FoodTemplate[]>;
  lookupBarcode(_barcode: string): Promise<FoodTemplate | null>;
}

export const localFoodLookupProvider: FoodLookupProvider = {
  searchByText: (query) => searchFoodTemplates(query),
  async lookupBarcode() {
    return null;
  },
};
