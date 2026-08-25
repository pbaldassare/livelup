import { supabase } from '@/integrations/supabase/client';
import { requestConnection } from '@/lib/api/connections';

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

export type AtletaSearchHit = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  has_active_pt: boolean;
  has_other_pts: boolean;
  connection_with_me: string | null;
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

  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data as AtletaSearchHit[];
}

export async function inviteExistingAtleta(
  ptUserId: string,
  atletaUserId: string,
  categoryId: string,
): Promise<void> {
  await requestConnection({
    ptUserId,
    atletaUserId,
    requestedBy: ptUserId,
    origin: 'invito',
    categoryId,
  });
}

export async function createAndConnectAtleta(
  input: CreateAthleteInput,
): Promise<CreateAthleteResult> {
  if (!input.categoryId?.trim()) {
    throw new Error('Seleziona la categoria cliente');
  }

  const { data, error } = await supabase.functions.invoke('pt-create-athlete', {
    body: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      fitnessLevel: input.fitnessLevel,
      goals: input.goals ?? [],
      categoryId: input.categoryId,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error('Creazione atleta fallita');

  return {
    ...data.user,
    emailSent: data.emailSent,
    emailStatus: data.emailStatus,
  };
}
