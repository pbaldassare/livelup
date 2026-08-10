// =====================================================
// API: Categorie cliente (schema Cloud: name + slug + is_system)
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import {
  ATHLETE_CATEGORIES_MIGRATION_HINT,
  SYSTEM_BASE_CATEGORIES_FALLBACK,
  slugifyCategoryName,
  sortAthleteCategories,
  type AthleteCategory,
} from '@/lib/athleteCategories';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

function isMissingCategoriesBackend(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('pt_athlete_categories') &&
    (msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('could not find'))
  );
}

export async function listAthleteCategories(): Promise<AthleteCategory[]> {
  const { data, error } = await sb
    .from('pt_athlete_categories')
    .select('id, pt_user_id, name, slug, is_system')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    if (isMissingCategoriesBackend(error)) {
      return [...SYSTEM_BASE_CATEGORIES_FALLBACK];
    }
    // Retry without order on is_system if unsupported
    const retry = await sb
      .from('pt_athlete_categories')
      .select('id, pt_user_id, name, slug, is_system')
      .order('name', { ascending: true });
    if (retry.error) {
      if (isMissingCategoriesBackend(retry.error)) {
        return [...SYSTEM_BASE_CATEGORIES_FALLBACK];
      }
      throw new Error('Errore recupero categorie: ' + retry.error.message);
    }
    return sortAthleteCategories((retry.data ?? []) as AthleteCategory[]);
  }

  const rows = sortAthleteCategories((data ?? []) as AthleteCategory[]);
  if (rows.filter((r) => r.is_system).length === 0) {
    // Tabella ok ma seed assente: mostra fallback UI (create custom può comunque funzionare)
    return sortAthleteCategories([...SYSTEM_BASE_CATEGORIES_FALLBACK, ...rows.filter((r) => !r.is_system)]);
  }
  return rows;
}

export async function getSystemCategoryIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await sb
    .from('pt_athlete_categories')
    .select('id')
    .eq('is_system', true)
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data.id as string;
}

export async function createAthleteCategory(params: {
  name: string;
}): Promise<AthleteCategory> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Non autenticato');

  const name = params.name.trim();
  if (!name) throw new Error('Nome categoria obbligatorio');

  const slug = slugifyCategoryName(name);

  const { data, error } = await sb
    .from('pt_athlete_categories')
    .insert({
      pt_user_id: user.id,
      name,
      slug,
      is_system: false,
    })
    .select('id, pt_user_id, name, slug, is_system')
    .single();

  if (error) {
    if (isMissingCategoriesBackend(error)) {
      throw new Error(ATHLETE_CATEGORIES_MIGRATION_HINT);
    }
    throw new Error('Errore creazione categoria: ' + error.message);
  }
  return data as AthleteCategory;
}

export async function updateAthleteCategory(params: {
  id: string;
  name?: string;
}): Promise<AthleteCategory> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.name !== undefined) {
    const name = params.name.trim();
    if (!name) throw new Error('Nome categoria obbligatorio');
    patch.name = name;
  }

  const { data, error } = await sb
    .from('pt_athlete_categories')
    .update(patch)
    .eq('id', params.id)
    .eq('is_system', false)
    .select('id, pt_user_id, name, slug, is_system')
    .single();

  if (error) {
    if (isMissingCategoriesBackend(error)) {
      throw new Error(ATHLETE_CATEGORIES_MIGRATION_HINT);
    }
    throw new Error('Errore aggiornamento categoria: ' + error.message);
  }
  return data as AthleteCategory;
}

export async function archiveAthleteCategory(id: string): Promise<void> {
  // Schema Cloud senza is_active → hard delete (o no-op se referenziata)
  await deleteAthleteCategory(id);
}

export async function deleteAthleteCategory(id: string): Promise<void> {
  const { error } = await sb
    .from('pt_athlete_categories')
    .delete()
    .eq('id', id)
    .eq('is_system', false);

  if (error) {
    if (isMissingCategoriesBackend(error)) {
      throw new Error(ATHLETE_CATEGORIES_MIGRATION_HINT);
    }
    if (error.code === '23503') {
      throw new Error('Categoria in uso su uno o più atleti: riassegnarla prima di eliminarla.');
    }
    throw new Error('Errore eliminazione categoria: ' + error.message);
  }
}

export async function setAthleteCategory(params: {
  connectionId: string;
  categoryId: string;
}) {
  if (params.categoryId.startsWith('fallback-')) {
    throw new Error(ATHLETE_CATEGORIES_MIGRATION_HINT);
  }

  const { data, error } = await sb.rpc('set_athlete_category', {
    _connection_id: params.connectionId,
    _category_id: params.categoryId,
  });

  if (error) {
    const msg = (error.message ?? '').toLowerCase();
    if (
      error.code === 'PGRST202' ||
      msg.includes('set_athlete_category') ||
      msg.includes('pt_athlete_categories')
    ) {
      throw new Error(ATHLETE_CATEGORIES_MIGRATION_HINT);
    }
    throw new Error(error.message || 'Errore aggiornamento categoria');
  }
  return data;
}
