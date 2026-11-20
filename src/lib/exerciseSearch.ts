import { EXERCISE_ARCHIVE_CATEGORIES } from '@/lib/exerciseArchiveCategories';

export type ExerciseSearchHit = {
  name: string;
  category?: string | null;
  muscle_groups?: string[] | null;
};

const CATEGORY_ORDER = new Map<string, number>(
  EXERCISE_ARCHIVE_CATEGORIES.map((name, index) => [name.toLowerCase(), index]),
);

export function normalizeExerciseSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** PostgREST `or()` filter: name or category contains the term. */
export function exerciseNameOrCategoryIlike(term: string): string {
  const safe = term.replace(/[%_,.()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe) return '';
  return `name.ilike.%${safe}%,category.ilike.%${safe}%`;
}

export function matchesExerciseSearch(query: string, hit: ExerciseSearchHit): boolean {
  const q = normalizeExerciseSearchText(query);
  if (!q) return true;
  if (normalizeExerciseSearchText(hit.category ?? '').includes(q)) return true;
  if (normalizeExerciseSearchText(hit.name).includes(q)) return true;
  return (hit.muscle_groups ?? []).some((m) => normalizeExerciseSearchText(m).includes(q));
}

/** Lower is better: 0 category, 1 exact name, 2 name prefix, 3 name contains, 4 muscles. */
export function exerciseSearchRank(query: string, hit: ExerciseSearchHit): number {
  const q = normalizeExerciseSearchText(query);
  if (!q) return 0;
  const cat = normalizeExerciseSearchText(hit.category ?? '');
  if (cat && (cat === q || cat.startsWith(q) || cat.includes(q))) return 0;
  const name = normalizeExerciseSearchText(hit.name);
  if (name === q) return 1;
  const tokens = name.split(/[\s/_-]+/).filter(Boolean);
  if (name.startsWith(q) || tokens.some((w) => w.startsWith(q))) return 2;
  if (name.includes(q)) return 3;
  const muscles = (hit.muscle_groups ?? []).map(normalizeExerciseSearchText);
  if (muscles.some((m) => m.includes(q))) return 4;
  return 5;
}

function categorySortIndex(category: string | null | undefined): number {
  const key = (category ?? '').trim().toLowerCase();
  if (!key) return 1000;
  return CATEGORY_ORDER.get(key) ?? 500;
}

export function rankExerciseSearchHits<T extends ExerciseSearchHit>(query: string, rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const rankA = exerciseSearchRank(query, a);
    const rankB = exerciseSearchRank(query, b);
    if (rankA !== rankB) return rankA - rankB;
    const cat = categorySortIndex(a.category) - categorySortIndex(b.category);
    if (cat !== 0) return cat;
    const catName = (a.category ?? 'Altro').localeCompare(b.category ?? 'Altro', 'it', {
      sensitivity: 'base',
    });
    if (catName !== 0) return catName;
    return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
  });
}

export function applyExerciseSearch<T extends ExerciseSearchHit>(query: string, rows: T[]): T[] {
  const q = query.trim();
  const pool = q ? rows.filter((row) => matchesExerciseSearch(q, row)) : rows;
  return rankExerciseSearchHits(q, pool);
}

export function groupExercisesByCategory<T extends ExerciseSearchHit>(
  rows: T[],
): Array<{ category: string; items: T[] }> {
  const groups: Array<{ category: string; items: T[] }> = [];
  const index = new Map<string, T[]>();
  for (const row of rows) {
    const category = row.category?.trim() || 'Altro';
    let items = index.get(category);
    if (!items) {
      items = [];
      index.set(category, items);
      groups.push({ category, items });
    }
    items.push(row);
  }
  return groups;
}
