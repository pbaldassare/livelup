// =====================================================
// Categorie cliente atleta (sistema + catalogo PT)
// =====================================================

export const SYSTEM_CATEGORY_IDS = {
  in_presenza: 'a1111111-1111-4111-8111-111111111101',
  online: 'a1111111-1111-4111-8111-111111111102',
  mix: 'a1111111-1111-4111-8111-111111111103',
} as const;

export type SystemCategorySlug = keyof typeof SYSTEM_CATEGORY_IDS;

export interface AthleteCategory {
  id: string;
  pt_user_id: string | null;
  name: string;
  slug: string | null;
  color: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
}

export function systemCategoryIdFromSlug(slug: string | null | undefined): string {
  if (slug === 'in_presenza') return SYSTEM_CATEGORY_IDS.in_presenza;
  if (slug === 'online') return SYSTEM_CATEGORY_IDS.online;
  return SYSTEM_CATEGORY_IDS.mix;
}

export function categoryDisplayName(
  category: Pick<AthleteCategory, 'name'> | null | undefined,
  fallback = 'Mix',
): string {
  const name = category?.name?.trim();
  return name || fallback;
}
