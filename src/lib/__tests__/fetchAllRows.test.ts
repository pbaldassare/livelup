import { describe, expect, it } from 'vitest';
import { fetchAllRows } from '@/lib/fetchAllRows';

describe('fetchAllRows', () => {
  it('returns an empty list when the first page is empty', async () => {
    const rows = await fetchAllRows(async () => ({ data: [], error: null }), 3);
    expect(rows).toEqual([]);
  });

  it('pages until a short last page and concatenates in order', async () => {
    const pages = [
      [1, 2, 3],
      [4, 5, 6],
      [7],
    ];
    let calls = 0;
    const rows = await fetchAllRows(async (from, to) => {
      expect(to - from + 1).toBe(3);
      const page = pages[calls] ?? [];
      calls += 1;
      return { data: page, error: null };
    }, 3);
    expect(rows).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(calls).toBe(3);
  });

  it('stops after an exact full last page', async () => {
    const pages = [[1, 2], [3, 4], []];
    let calls = 0;
    const rows = await fetchAllRows(async () => {
      const page = pages[calls] ?? [];
      calls += 1;
      return { data: page, error: null };
    }, 2);
    expect(rows).toEqual([1, 2, 3, 4]);
    expect(calls).toBe(3);
  });

  it('throws when a page returns an error', async () => {
    await expect(
      fetchAllRows(async () => ({ data: null, error: { message: 'boom' } }), 10),
    ).rejects.toMatchObject({ message: 'boom' });
  });
});
