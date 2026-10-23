import type { FoodTemplate } from '@/types/nutrition';
import { searchFoodTemplates } from './foods';

/**
 * Provider per ricerca alimenti: catalogo locale + API esterna opzionale.
 * Configura `VITE_NUTRITION_FOOD_API_URL` (base URL) quando disponibile.
 * L'endpoint atteso: GET `{base}/search?q=` e GET `{base}/barcode/{code}` → JSON FoodTemplate-like.
 */
export interface FoodLookupProvider {
  searchByText(query: string): Promise<FoodTemplate[]>;
  lookupBarcode(barcode: string): Promise<FoodTemplate | null>;
}

export const localFoodLookupProvider: FoodLookupProvider = {
  searchByText: (query) => searchFoodTemplates(query),
  async lookupBarcode() {
    return null;
  },
};

function remoteBaseUrl(): string | null {
  if (import.meta.env.VITE_NUTRITION_FOOD_PROXY === 'true') {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
    if (supabaseUrl) return `${supabaseUrl}/functions/v1/nutrition-food-proxy`;
  }
  const url = import.meta.env.VITE_NUTRITION_FOOD_API_URL?.trim();
  return url || null;
}

async function authorizedFetch(url: string): Promise<Response> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (import.meta.env.VITE_NUTRITION_FOOD_PROXY === 'true' && key) {
    headers.Authorization = `Bearer ${key}`;
  }
  return fetch(url, { headers });
}

function mapRemoteFood(row: Record<string, unknown>): FoodTemplate {
  return {
    id: String(row.id ?? `remote-${row.barcode ?? row.name}`),
    name: String(row.name ?? 'Alimento'),
    brand: row.brand != null ? String(row.brand) : null,
    per_100g_kcal: Number(row.per_100g_kcal ?? row.kcal ?? 0),
    per_100g_protein_g: Number(row.per_100g_protein_g ?? row.protein_g ?? 0),
    per_100g_carbs_g: Number(row.per_100g_carbs_g ?? row.carbs_g ?? 0),
    per_100g_fat_g: Number(row.per_100g_fat_g ?? row.fat_g ?? 0),
    is_platform: false,
  };
}

async function remoteSearch(query: string): Promise<FoodTemplate[]> {
  const base = remoteBaseUrl();
  if (!base || query.trim().length < 2) return [];
  try {
    const res = await authorizedFetch(`${base.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
    const items = Array.isArray(json) ? json : json.items ?? [];
    return items.map(mapRemoteFood);
  } catch {
    return [];
  }
}

async function remoteBarcode(barcode: string): Promise<FoodTemplate | null> {
  const base = remoteBaseUrl();
  if (!base || !barcode.trim()) return null;
  try {
    const res = await authorizedFetch(`${base.replace(/\/$/, '')}/barcode/${encodeURIComponent(barcode)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    return mapRemoteFood(json);
  } catch {
    return null;
  }
}

export function getNutritionFoodLookupProvider(): FoodLookupProvider {
  const base = remoteBaseUrl();
  if (!base) return localFoodLookupProvider;

  return {
    async searchByText(query) {
      const [local, remote] = await Promise.all([
        searchFoodTemplates(query),
        remoteSearch(query),
      ]);
      const seen = new Set(local.map((f) => f.name.toLowerCase()));
      const merged = [...local];
      for (const r of remote) {
        if (!seen.has(r.name.toLowerCase())) merged.push(r);
      }
      return merged.slice(0, 50);
    },
    async lookupBarcode(barcode) {
      const remote = await remoteBarcode(barcode);
      return remote ?? localFoodLookupProvider.lookupBarcode(barcode);
    },
  };
}
