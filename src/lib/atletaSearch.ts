export type AtletaSearchHit = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  has_active_pt: boolean;
  has_other_pts: boolean;
  connection_with_me: string | null;
};

function asHit(value: unknown): AtletaSearchHit | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const userId = typeof row.user_id === 'string' ? row.user_id : null;
  if (!userId) return null;
  return {
    user_id: userId,
    email: typeof row.email === 'string' ? row.email : null,
    first_name: typeof row.first_name === 'string' ? row.first_name : null,
    last_name: typeof row.last_name === 'string' ? row.last_name : null,
    has_active_pt: Boolean(row.has_active_pt),
    has_other_pts: Boolean(row.has_other_pts),
    connection_with_me: typeof row.connection_with_me === 'string' ? row.connection_with_me : null,
  };
}

/** PostgREST può restituire JSONB come array, stringa o oggetto wrappato. */
export function normalizeAtletaSearchHits(data: unknown): AtletaSearchHit[] {
  let payload = data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return [];
    }
  }
  if (Array.isArray(payload)) {
    return payload.map(asHit).filter((hit): hit is AtletaSearchHit => hit !== null);
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return normalizeAtletaSearchHits(record.data);
    }
    const single = asHit(payload);
    return single ? [single] : [];
  }
  return [];
}

export function isMissingSearchRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    msg.includes('search_atleti_for_pt') ||
    msg.includes('could not find the function')
  );
}
