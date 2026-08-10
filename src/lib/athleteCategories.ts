// =====================================================
// Categorie cliente — schema Lovable Cloud:
// id, pt_user_id, name, slug, is_system (+ updated_at)
// =====================================================

export interface AthleteCategory {
  id: string;
  pt_user_id: string | null;
  name: string;
  slug: string;
  is_system: boolean;
}

export const SYSTEM_CATEGORY_SLUGS = ['in_presenza', 'online', 'mix'] as const;
export type SystemCategorySlug = (typeof SYSTEM_CATEGORY_SLUGS)[number];

export const SYSTEM_CATEGORY_LABELS: Record<SystemCategorySlug, string> = {
  in_presenza: 'In presenza',
  online: 'Online',
  mix: 'Mix',
};

/** Solo UI se il backend non risponde; gli id non sono usati per write. */
export const SYSTEM_BASE_CATEGORIES_FALLBACK: AthleteCategory[] = [
  { id: 'fallback-in_presenza', pt_user_id: null, name: 'In presenza', slug: 'in_presenza', is_system: true },
  { id: 'fallback-online', pt_user_id: null, name: 'Online', slug: 'online', is_system: true },
  { id: 'fallback-mix', pt_user_id: null, name: 'Mix', slug: 'mix', is_system: true },
];

/** @deprecated alias — prefer SYSTEM_BASE_CATEGORIES_FALLBACK */
export const SYSTEM_BASE_CATEGORIES = SYSTEM_BASE_CATEGORIES_FALLBACK;

export const ATHLETE_CATEGORIES_MIGRATION_HINT =
  'Categorie non disponibili sul backend. Controlla che la tabella pt_athlete_categories sia presente su Lovable Cloud.';

export function isSystemCategorySlug(value: unknown): value is SystemCategorySlug {
  return value === 'in_presenza' || value === 'online' || value === 'mix';
}

export function slugifyCategoryName(name: string): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'categoria';
  return `${base}_${Date.now().toString(36).slice(-5)}`;
}

export function resolveCategoryId(
  categoryId: string | null | undefined,
  trainingModality: string | null | undefined,
  categories: AthleteCategory[],
): string | null {
  if (categoryId) return categoryId;
  const slug = isSystemCategorySlug(trainingModality) ? trainingModality : 'mix';
  return categories.find((c) => c.is_system && c.slug === slug)?.id ?? null;
}

/** Compat: risolve id di sistema da slug usando la lista caricata (o fallback UI). */
export function systemCategoryIdFromSlug(
  slug: string | null | undefined,
  categories?: AthleteCategory[],
): string {
  const list = categories?.length ? categories : SYSTEM_BASE_CATEGORIES_FALLBACK;
  const key = isSystemCategorySlug(slug) ? slug : 'mix';
  return list.find((c) => c.is_system && c.slug === key)?.id ?? SYSTEM_BASE_CATEGORIES_FALLBACK[2].id;
}

export function categoryDisplayName(
  category: Pick<AthleteCategory, 'name'> | null | undefined,
  fallback = 'Mix',
): string {
  const name = category?.name?.trim();
  return name || fallback;
}

export function sortAthleteCategories(rows: AthleteCategory[]): AthleteCategory[] {
  return [...rows].sort((a, b) => {
    if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
    const ai = SYSTEM_CATEGORY_SLUGS.indexOf(a.slug as SystemCategorySlug);
    const bi = SYSTEM_CATEGORY_SLUGS.indexOf(b.slug as SystemCategorySlug);
    if (a.is_system && b.is_system && ai !== -1 && bi !== -1) return ai - bi;
    return a.name.localeCompare(b.name, 'it');
  });
}
