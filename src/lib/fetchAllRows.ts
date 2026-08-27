/** PostgREST default max rows per request. */
export const POSTGREST_MAX_ROWS = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * Loads every row by paging through PostgREST's 1000-row cap.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize = POSTGREST_MAX_ROWS,
): Promise<T[]> {
  if (pageSize < 1) throw new Error('pageSize must be >= 1');

  const all: T[] = [];
  let from = 0;

  for (let page = 0; page < 100; page += 1) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) return all;
    from += pageSize;
  }

  return all;
}
