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

/** Sempre disponibili in UI anche se la migration non è ancora su Cloud. */
export const SYSTEM_BASE_CATEGORIES: AthleteCategory[] = [
  {
    id: SYSTEM_CATEGORY_IDS.in_presenza,
    pt_user_id: null,
    name: 'In presenza',
    slug: 'in_presenza',
    color: null,
    sort_order: 10,
    is_system: true,
    is_active: true,
  },
  {
    id: SYSTEM_CATEGORY_IDS.online,
    pt_user_id: null,
    name: 'Online',
    slug: 'online',
    color: null,
    sort_order: 20,
    is_system: true,
    is_active: true,
  },
  {
    id: SYSTEM_CATEGORY_IDS.mix,
    pt_user_id: null,
    name: 'Mix',
    slug: 'mix',
    color: null,
    sort_order: 30,
    is_system: true,
    is_active: true,
  },
];

export const ATHLETE_CATEGORIES_MIGRATION_HINT =
  'Categorie non disponibili sul backend: applica su Lovable la migration 20260810150000_pt_athlete_categories.sql';

export function mergeWithSystemCategories(rows: AthleteCategory[]): AthleteCategory[] {
  const byId = new Map<string, AthleteCategory>();
  for (const sys of SYSTEM_BASE_CATEGORIES) byId.set(sys.id, sys);
  for (const row of rows) {
    byId.set(row.id, {
      ...row,
      is_system: Boolean(row.is_system),
      is_active: row.is_active !== false,
    });
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name, 'it');
  });
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
