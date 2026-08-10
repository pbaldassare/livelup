// =====================================================
// API: Categorie cliente atleta (sistema + private PT)
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import {
  ATHLETE_CATEGORIES_MIGRATION_HINT,
  SYSTEM_BASE_CATEGORIES,
  mergeWithSystemCategories,
  type AthleteCategory,
} from '@/lib/athleteCategories';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

function isMissingCategoriesTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204') return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('pt_athlete_categories') &&
    (msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('could not find'))
  );
}

export async function listAthleteCategories(options?: {
  includeInactive?: boolean;
}): Promise<AthleteCategory[]> {
  let query = sb
    .from('pt_athlete_categories')
    .select('id, pt_user_id, name, slug, color, sort_order, is_system, is_active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingCategoriesTable(error)) {
      // UI resta usabile con le 3 di base finché Lovable non applica la migration
      return [...SYSTEM_BASE_CATEGORIES];
    }
    throw new Error('Errore recupero categorie: ' + error.message);
  }

  return mergeWithSystemCategories((data ?? []) as AthleteCategory[]);
}

export async function createAthleteCategory(params: {
  name: string;
  color?: string | null;
  sortOrder?: number;
}): Promise<AthleteCategory> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Non autenticato');

  const name = params.name.trim();
  if (!name) throw new Error('Nome categoria obbligatorio');

  const { data, error } = await sb
    .from('pt_athlete_categories')
    .insert({
      pt_user_id: user.id,
      name,
      color: params.color ?? null,
      sort_order: params.sortOrder ?? 100,
      is_system: false,
      is_active: true,
    })
    .select('id, pt_user_id, name, slug, color, sort_order, is_system, is_active')
    .single();

  if (error) {
    if (isMissingCategoriesTable(error)) {
      throw new Error(ATHLETE_CATEGORIES_MIGRATION_HINT);
    }
    throw new Error('Errore creazione categoria: ' + error.message);
  }
  return data as AthleteCategory;
}

export async function updateAthleteCategory(params: {
  id: string;
  name?: string;
  color?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<AthleteCategory> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.name !== undefined) {
    const name = params.name.trim();
    if (!name) throw new Error('Nome categoria obbligatorio');
    patch.name = name;
  }
  if (params.color !== undefined) patch.color = params.color;
  if (params.sortOrder !== undefined) patch.sort_order = params.sortOrder;
  if (params.isActive !== undefined) patch.is_active = params.isActive;

  const { data, error } = await sb
    .from('pt_athlete_categories')
    .update(patch)
    .eq('id', params.id)
    .eq('is_system', false)
    .select('id, pt_user_id, name, slug, color, sort_order, is_system, is_active')
    .single();

  if (error) {
    if (isMissingCategoriesTable(error)) {
      throw new Error(ATHLETE_CATEGORIES_MIGRATION_HINT);
    }
    throw new Error('Errore aggiornamento categoria: ' + error.message);
  }
  return data as AthleteCategory;
}

export async function archiveAthleteCategory(id: string): Promise<void> {
  await updateAthleteCategory({ id, isActive: false });
}

export async function deleteAthleteCategory(id: string): Promise<void> {
  const { error } = await sb
    .from('pt_athlete_categories')
    .delete()
    .eq('id', id)
    .eq('is_system', false);

  if (error) {
    if (isMissingCategoriesTable(error)) {
      throw new Error(ATHLETE_CATEGORIES_MIGRATION_HINT);
    }
    // Likely still referenced — soft archive instead
    if (error.code === '23503') {
      await archiveAthleteCategory(id);
      return;
    }
    throw new Error('Errore eliminazione categoria: ' + error.message);
  }
}

export async function setAthleteCategory(params: {
  connectionId: string;
  categoryId: string;
}) {
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
