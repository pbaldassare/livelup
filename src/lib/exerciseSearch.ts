export function normalizeExerciseText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function compactExerciseText(value: string): string {
  return normalizeExerciseText(value).replace(/ /g, '');
}

/** Strip PostgREST `.or()` separators so a typed query cannot break the filter. */
export function sanitizeIlikeFragment(value: string): string {
  return value.replace(/[,()]/g, ' ').replace(/\\/g, '').replace(/[%_]/g, '').trim();
}

export function exerciseIlikePatterns(query: string): string[] {
  const raw = sanitizeIlikeFragment(query);
  if (!raw) return [];
  const spaced = normalizeExerciseText(raw);
  const dashed = spaced.replace(/ /g, '-');
  const compact = spaced.replace(/ /g, '');
  const out: string[] = [];
  for (const pattern of [raw, spaced, dashed, compact]) {
    const next = sanitizeIlikeFragment(pattern);
    if (next && !out.includes(next)) out.push(next);
  }
  return out;
}

/** PostgREST `or()` clause matching spaced, hyphenated and glued names. */
export function exerciseNameOrFilter(query: string): string | null {
  const patterns = exerciseIlikePatterns(query);
  if (patterns.length === 0) return null;
  return patterns.map((pattern) => `name.ilike.%${pattern}%`).join(',');
}

/**
 * Lower is better. `null` = no match.
 * 0 exact · 1 name starts with query · 2 category (`X ·`) equals query
 * 3 a `·` segment starts with query · 4 token prefix · 5 contains.
 */
export function exerciseSearchRank(name: string, query: string): number | null {
  const q = normalizeExerciseText(query);
  if (!q) return 0;
  const n = normalizeExerciseText(name);
  const qCompact = q.replace(/ /g, '');
  const nCompact = n.replace(/ /g, '');
  if (!n.includes(q) && !(qCompact.length >= 2 && nCompact.includes(qCompact))) {
    return null;
  }
  if (n === q) return 0;
  if (n.startsWith(`${q} `) || n.startsWith(q)) return 1;

  const segments = name.split('·').map((part) => normalizeExerciseText(part));
  if (segments[0] && segments[0] === q) return 2;
  if (segments.some((part) => part === q || part.startsWith(`${q} `) || part.startsWith(q))) {
    return 3;
  }

  const qTokens = q.split(' ');
  const nTokens = n.split(' ');
  if (qTokens.length > 0 && nTokens.some((token) => token.startsWith(qTokens[0]!))) return 4;
  return 5;
}

export function filterAndRankExercises<T extends { name: string }>(items: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return items;
  return items
    .map((item) => ({ item, rank: exerciseSearchRank(item.name, q) }))
    .filter((row): row is { item: T; rank: number } => row.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name, 'it'))
    .map((row) => row.item);
}
