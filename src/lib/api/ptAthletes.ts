import { supabase } from '@/integrations/supabase/client';
import { requestConnection } from '@/lib/api/connections';
import { getSystemCategoryIdBySlug } from '@/lib/api/athleteCategories';
import { isMissingSearchRpc, normalizeAtletaSearchHits } from '@/lib/atletaSearch';
import type { AtletaSearchHit } from '@/lib/atletaSearch';

export type { AtletaSearchHit };

export type AtletaLookupResult = {
  found: boolean;
  user_id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  has_active_pt?: boolean;
  has_other_pts?: boolean;
  connection_with_me?: string | null;
};

export type CreateAthleteInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  fitnessLevel?: string;
  goals?: string[];
  /** Categoria cliente (system o custom PT) — obbligatoria */
  categoryId: string;
};

export type CreateAthleteResult = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailSent?: boolean;
  emailStatus?: string;
};

export async function findAtletaByEmail(email: string): Promise<AtletaLookupResult> {
  const { data, error } = await (supabase.rpc as any)('find_atleta_by_email_for_pt', {
    _email: email.trim(),
  });

  if (error) throw error;
  return (data ?? { found: false }) as AtletaLookupResult;
}

export async function searchAtletiForPt(query: string): Promise<AtletaSearchHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const { data, error } = await (supabase.rpc as any)('search_atleti_for_pt', {
    _query: q,
  });

  if (error) {
    if (isMissingSearchRpc(error) && q.includes('@')) {
      const exact = await findAtletaByEmail(q);
      if (!exact.found || !exact.user_id) return [];
      return [
        {
          user_id: exact.user_id,
          email: exact.email ?? q,
          first_name: exact.first_name ?? null,
          last_name: exact.last_name ?? null,
          has_active_pt: Boolean(exact.has_active_pt),
          has_other_pts: Boolean(exact.has_other_pts),
          connection_with_me: exact.connection_with_me ?? null,
        },
      ];
    }
    throw error;
  }

  const hits = normalizeAtletaSearchHits(data);
  if (hits.length > 0) return hits;

  if (q.includes('@')) {
    const exact = await findAtletaByEmail(q);
    if (!exact.found || !exact.user_id) return [];
    return [
      {
        user_id: exact.user_id,
        email: exact.email ?? q,
        first_name: exact.first_name ?? null,
        last_name: exact.last_name ?? null,
        has_active_pt: Boolean(exact.has_active_pt),
        has_other_pts: Boolean(exact.has_other_pts),
        connection_with_me: exact.connection_with_me ?? null,
      },
    ];
  }

  return [];
}

export async function resolveInviteCategoryId(categoryId: string): Promise<string> {
  const id = categoryId.trim();
  if (!id) throw new Error('Seleziona la categoria cliente');
  if (!id.startsWith('fallback-')) return id;

  const slug = id.replace(/^fallback-/, '');
  const realId = await getSystemCategoryIdBySlug(slug);
  if (realId) return realId;
  throw new Error(
    'Categorie non disponibili sul backend. Riprova tra poco o scegli di nuovo Mix / In presenza / Online.',
  );
}

export async function inviteExistingAtleta(
  ptUserId: string,
  atletaUserId: string,
  categoryId: string,
): Promise<void> {
  const resolvedCategoryId = await resolveInviteCategoryId(categoryId);
  await requestConnection({
    ptUserId,
    atletaUserId,
    requestedBy: ptUserId,
    origin: 'invito',
    categoryId: resolvedCategoryId,
  });
}

export async function createAndConnectAtleta(
  input: CreateAthleteInput,
): Promise<CreateAthleteResult> {
  if (!input.categoryId?.trim()) {
    throw new Error('Seleziona la categoria cliente');
  }

  const categoryId = await resolveInviteCategoryId(input.categoryId);

  const { data, error } = await supabase.functions.invoke('pt-create-athlete', {
    body: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      fitnessLevel: input.fitnessLevel,
      goals: input.goals ?? [],
      categoryId,
    },
  });

  const bodyError =
    data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
      ? (data as { error: string }).error
      : null;
  if (bodyError) throw new Error(bodyError);
  if (error) throw new Error(error.message || 'Errore durante la creazione');
  if (!data?.success) throw new Error('Creazione atleta fallita');

  return {
    ...data.user,
    emailSent: data.emailSent,
    emailStatus: data.emailStatus,
  };
}
