import { describe, expect, it } from 'vitest';
import { isMissingSearchRpc, normalizeAtletaSearchHits } from '@/lib/atletaSearch';

const sample = {
  user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  email: 'atleta@email.com',
  first_name: 'Giulia',
  last_name: 'Rossi',
  has_active_pt: true,
  has_other_pts: false,
  connection_with_me: null,
};

describe('normalizeAtletaSearchHits', () => {
  it('keeps a plain array of hits', () => {
    expect(normalizeAtletaSearchHits([sample])).toEqual([
      { ...sample, connection_with_me: null },
    ]);
  });

  it('parses a JSON string from a JSONB RPC', () => {
    expect(normalizeAtletaSearchHits(JSON.stringify([sample]))[0]?.email).toBe('atleta@email.com');
  });

  it('unwraps { data: [...] }', () => {
    expect(normalizeAtletaSearchHits({ data: [sample] })).toHaveLength(1);
  });

  it('drops rows without user_id', () => {
    expect(normalizeAtletaSearchHits([{ email: 'x@y.z' }])).toEqual([]);
  });
});

describe('isMissingSearchRpc', () => {
  it('detects PostgREST missing-function errors', () => {
    expect(isMissingSearchRpc({ code: 'PGRST202', message: 'Could not find the function' })).toBe(true);
    expect(isMissingSearchRpc({ message: 'search_atleti_for_pt does not exist' })).toBe(true);
    expect(isMissingSearchRpc({ message: 'permission denied' })).toBe(false);
  });
});
