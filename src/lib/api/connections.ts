// =====================================================
// API: Gestione connessioni PT-Atleta
// Logiche business per relazioni
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { SYSTEM_CATEGORY_IDS } from '@/lib/athleteCategories';
import {
  isTrainingModality,
  type TrainingModality,
} from '@/lib/trainingModality';

export interface PtConnectionCategory {
  id: string;
  name: string;
  slug: string | null;
  color: string | null;
  is_system: boolean;
}

export interface PtConnectionWithPtActive {
  id?: string;
  atleta_user_id: string;
  status?: string;
  is_pt_active?: boolean | null;
  training_modality?: TrainingModality | null;
  category_id?: string | null;
  athlete_category?: PtConnectionCategory | null;
  created_at?: string;
  accepted_at?: string | null;
}

export const PT_ACTIVE_MIGRATION_HINT =
  'Funzione non disponibile: applica su Lovable la migration 20260714183000_pt_connection_is_pt_active.sql e attendi il deploy del backend.';

function isMissingPtActiveColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  // Postgres undefined_column, PostgREST schema cache miss
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('is_pt_active') &&
    (msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('could not find'))
  );
}

export class PtActiveMigrationRequiredError extends Error {
  constructor(message = PT_ACTIVE_MIGRATION_HINT) {
    super(message);
    this.name = 'PtActiveMigrationRequiredError';
  }
}

export const TRAINING_MODALITY_MIGRATION_HINT =
  'Funzione non disponibile: applica su Lovable la migration 20260718190000_pt_athlete_training_modality.sql e attendi il deploy del backend.';

function isMissingTrainingModalityColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('training_modality') &&
    (msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('could not find'))
  );
}

export class TrainingModalityMigrationRequiredError extends Error {
  constructor(message = TRAINING_MODALITY_MIGRATION_HINT) {
    super(message);
    this.name = 'TrainingModalityMigrationRequiredError';
  }
}

function isMissingCategoryColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST200') return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    (msg.includes('category_id') ||
      msg.includes('pt_athlete_categories') ||
      msg.includes('athlete_category')) &&
    (msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('could not find') ||
      msg.includes('relationship'))
  );
}

function normalizeConnectionCategoryRows(
  rows: PtConnectionWithPtActive[],
): PtConnectionWithPtActive[] {
  return rows.map((row) => {
    const raw = row as PtConnectionWithPtActive & {
      athlete_category?: PtConnectionCategory | PtConnectionCategory[] | null;
    };
    const embedded = Array.isArray(raw.athlete_category)
      ? raw.athlete_category[0] ?? null
      : raw.athlete_category ?? null;
    return { ...row, athlete_category: embedded };
  });
}

/** Probe whether is_pt_active exists on pt_atleta_connections (migration applied). */
export async function checkPtActiveColumnAvailable(): Promise<boolean> {
  const { error } = await supabase
    .from('pt_atleta_connections')
    .select('is_pt_active')
    .limit(1);

  if (!error) return true;
  return !isMissingPtActiveColumn(error);
}

/**
 * Loads PT connections with optional is_pt_active flag.
 * Falls back when the column migration has not been applied yet (defaults to active).
 */
export async function getPTConnectionsWithPtActive(
  ptUserId: string,
  options?: {
    status?: string;
    columns?: 'minimal' | 'list';
    orderByCreatedAt?: boolean;
  },
): Promise<PtConnectionWithPtActive[]> {
  const status = options?.status;
  const withAll =
    options?.columns === 'list'
      ? 'id, atleta_user_id, status, is_pt_active, training_modality, category_id, created_at, accepted_at, athlete_category:pt_athlete_categories(id, name, slug, color, is_system)'
      : 'atleta_user_id, is_pt_active, training_modality, category_id, athlete_category:pt_athlete_categories(id, name, slug, color, is_system)';
  const withoutCategory =
    options?.columns === 'list'
      ? 'id, atleta_user_id, status, is_pt_active, training_modality, created_at, accepted_at'
      : 'atleta_user_id, is_pt_active, training_modality';
  const withoutModality =
    options?.columns === 'list'
      ? 'id, atleta_user_id, status, is_pt_active, created_at, accepted_at'
      : 'atleta_user_id, is_pt_active';
  const withoutPtActive =
    options?.columns === 'list'
      ? 'id, atleta_user_id, status, created_at, accepted_at'
      : 'atleta_user_id';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabase.from('pt_atleta_connections') as any)
    .select(withAll)
    .eq('pt_user_id', ptUserId);

  if (status) query = query.eq('status', status);
  if (options?.orderByCreatedAt) query = query.order('created_at', { ascending: false });

  const { data, error } = (await query) as { data: unknown[] | null; error: { message?: string; code?: string } | null };

  if (!error) {
    return normalizeConnectionCategoryRows((data ?? []) as PtConnectionWithPtActive[]);
  }

  // Fall back when category join/column not yet applied
  if (isMissingCategoryColumn(error) && !isMissingPtActiveColumn(error)) {
    let categoryFallback = (supabase.from('pt_atleta_connections') as any)
      .select(withoutCategory)
      .eq('pt_user_id', ptUserId);
    if (status) categoryFallback = categoryFallback.eq('status', status);
    if (options?.orderByCreatedAt) {
      categoryFallback = categoryFallback.order('created_at', { ascending: false });
    }
    const { data: catData, error: catError } = await categoryFallback;
    if (!catError) {
      return normalizeConnectionCategoryRows((catData ?? []) as PtConnectionWithPtActive[]);
    }
    if (!isMissingTrainingModalityColumn(catError)) {
      throw new Error('Errore nel recupero connessioni: ' + catError.message);
    }
  }

  // Prefer modality-aware select; fall back if column missing
  if (isMissingTrainingModalityColumn(error) && !isMissingPtActiveColumn(error)) {
    let modalityFallback = supabase
      .from('pt_atleta_connections')
      .select(withoutModality)
      .eq('pt_user_id', ptUserId);
    if (status) modalityFallback = modalityFallback.eq('status', status);
    if (options?.orderByCreatedAt) {
      modalityFallback = modalityFallback.order('created_at', { ascending: false });
    }
    const { data: midData, error: midError } = await modalityFallback;
    if (midError) {
      if (!isMissingPtActiveColumn(midError)) {
        throw new Error('Errore nel recupero connessioni: ' + midError.message);
      }
    } else {
      return ((midData ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        training_modality: 'mix' as TrainingModality,
      })) as unknown as PtConnectionWithPtActive[];
    }
  }

  if (!isMissingPtActiveColumn(error) && !isMissingTrainingModalityColumn(error)) {
    throw new Error('Errore nel recupero connessioni: ' + error.message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallbackQuery: any = (supabase.from('pt_atleta_connections') as any)
    .select(withoutPtActive)
    .eq('pt_user_id', ptUserId);

  if (status) fallbackQuery = fallbackQuery.eq('status', status);
  if (options?.orderByCreatedAt) {
    fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
  }

  const { data: fallbackData, error: fallbackError } = (await fallbackQuery) as {
    data: Array<Record<string, unknown>> | null;
    error: { message?: string } | null;
  };

  if (fallbackError) {
    throw new Error('Errore nel recupero connessioni: ' + fallbackError.message);
  }

  return (fallbackData ?? []).map((row) => ({
    ...(row as Record<string, unknown>),
    is_pt_active: true,
    training_modality: 'mix' as TrainingModality,
  })) as PtConnectionWithPtActive[];
}

// =====================================================
// RICHIESTA CONNESSIONE
// =====================================================

export async function requestConnection(params: {
  ptUserId: string;
  atletaUserId: string;
  requestedBy: string;
  origin?: 'ricerca' | 'invito' | 'referral' | 'qr';
}) {
  const { ptUserId, atletaUserId, requestedBy, origin = 'ricerca' } = params;

  // Multi-PT: blocco solo se esiste già active/pending con QUESTO PT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: canConnectSpecific, error: specificError } = await (supabase.rpc as any)(
    'can_atleta_connect_to_specific_pt',
    { _atleta_user_id: atletaUserId, _pt_user_id: ptUserId },
  );

  if (!specificError && canConnectSpecific === false) {
    throw new Error('Esiste già una connessione o richiesta con questo Professionista.');
  }

  if (specificError) {
    // Fallback se RPC multi-PT non ancora deployata: check client-side
    const { data: existing } = await supabase
      .from('pt_atleta_connections')
      .select('id, status')
      .eq('atleta_user_id', atletaUserId)
      .eq('pt_user_id', ptUserId)
      .in('status', ['active', 'pending'])
      .maybeSingle();
    if (existing) {
      throw new Error('Esiste già una connessione o richiesta con questo Professionista.');
    }
  }

  // Verifica se PT può accettare nuovi atleti
  const { data: canAccept, error: acceptError } = await supabase
    .rpc('can_pt_accept_athletes', { _pt_user_id: ptUserId });

  if (acceptError) {
    throw new Error('Errore durante la verifica: ' + acceptError.message);
  }

  if (!canAccept) {
    throw new Error('Il Personal Trainer ha raggiunto il numero massimo di atleti.');
  }

  // Crea richiesta connessione
  const { data, error } = await supabase
    .from('pt_atleta_connections')
    .insert({
      pt_user_id: ptUserId,
      atleta_user_id: atletaUserId,
      requested_by: requestedBy,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Esiste già una richiesta di connessione tra questo PT e atleta.');
    }
    throw new Error('Errore durante la richiesta: ' + error.message);
  }

  void origin; // reserved for analytics
  return data;
}

/** Atleta sceglie il coach primario tra le connessioni active. */
export async function setPrimaryCoach(ptUserId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('set_atleta_primary_pt', {
    _pt_user_id: ptUserId,
  });
  if (error) {
    throw new Error(error.message || 'Errore impostazione coach primario');
  }
}

// =====================================================
// ACCETTA CONNESSIONE
// =====================================================

export async function acceptConnection(connectionId: string) {
  const { data, error } = await supabase
    .from('pt_atleta_connections')
    .update({
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) {
    throw new Error('Errore durante l\'accettazione: ' + error.message);
  }

  return data;
}

// =====================================================
// RIFIUTA CONNESSIONE
// =====================================================

export async function rejectConnection(connectionId: string) {
  const { data, error } = await supabase
    .from('pt_atleta_connections')
    .update({
      status: 'rifiutato',
    })
    .eq('id', connectionId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) {
    throw new Error('Errore durante il rifiuto: ' + error.message);
  }

  return data;
}

// =====================================================
// ATTIVA / DISATTIVA ATLETA (controllo manuale PT)
// =====================================================

export async function setAthletePtActive(connectionId: string, isPtActive: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('pt_atleta_connections') as any)
    .update({
      is_pt_active: isPtActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    if (isMissingPtActiveColumn(error)) {
      throw new PtActiveMigrationRequiredError();
    }
    throw new Error('Errore durante l\'aggiornamento stato atleta: ' + error.message);
  }

  return data;
}

// =====================================================
// MODALITÀ ALLENAMENTO (in presenza / online / mix)
// =====================================================

export async function setAthleteTrainingModality(
  connectionId: string,
  modality: TrainingModality,
) {
  if (!isTrainingModality(modality)) {
    throw new Error('Modalità non valida');
  }

  // Prefer category_id (system) when available; keep training_modality sync via trigger
  const categoryId = SYSTEM_CATEGORY_IDS[modality];

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('set_athlete_category', {
    _connection_id: connectionId,
    _category_id: categoryId,
  });

  if (!rpcError) return rpcData;

  const rpcMsg = (rpcError.message ?? '').toLowerCase();
  const missingRpc =
    rpcError.code === 'PGRST202' ||
    rpcMsg.includes('set_athlete_category') ||
    rpcMsg.includes('could not find the function');

  if (!missingRpc) {
    throw new Error(rpcError.message || 'Errore durante l\'aggiornamento modalità');
  }

  const { data, error } = await (supabase.from('pt_atleta_connections') as any)
    .update({
      training_modality: modality,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    if (isMissingTrainingModalityColumn(error)) {
      throw new TrainingModalityMigrationRequiredError();
    }
    throw new Error('Errore durante l\'aggiornamento modalità: ' + error.message);
  }

  return data;
}

// =====================================================
// TERMINA CONNESSIONE
// =====================================================

/**
 * Termina SOLO la connessione PT–atleta.
 * - Non tocca l'abbonamento piattaforma (`subscriptions` / `is_premium`).
 * - Opzionale: chiude i pacchetti PT (`atleta_pt_subscriptions`) di QUEL PT
 *   (rimangono in storico; workout/corsi restano consultabili in sola lettura).
 */
export async function terminateConnection(connectionId: string) {
  const { data, error } = await supabase
    .from('pt_atleta_connections')
    .update({
      status: 'terminated',
      terminated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('status', 'active')
    .select('id, pt_user_id, atleta_user_id')
    .single();

  if (error) {
    throw new Error('Errore durante la terminazione: ' + error.message);
  }

  // Pacchetto PT (separato dalla piattaforma): chiudi solo quelli di questo PT
  if (data?.pt_user_id && data?.atleta_user_id) {
    await supabase
      .from('atleta_pt_subscriptions')
      .update({
        status: 'cancellato',
        updated_at: new Date().toISOString(),
      })
      .eq('pt_user_id', data.pt_user_id)
      .eq('atleta_user_id', data.atleta_user_id)
      .eq('status', 'attivo');
  }

  return data;
}

// =====================================================
// OTTIENI CONNESSIONI PT
// =====================================================

export async function getPTConnections(ptUserId: string, status?: string) {
  let query = supabase
    .from('pt_atleta_connections')
    .select(`
      *,
      atleta_profiles:atleta_user_id (
        id,
        user_id,
        status,
        fitness_level,
        goals
      ),
      profiles:atleta_user_id (
        first_name,
        last_name,
        email,
        avatar_url
      )
    `)
    .eq('pt_user_id', ptUserId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Errore nel recupero connessioni: ' + error.message);
  }

  return data;
}

// =====================================================
// OTTIENI CONNESSIONE ATLETA (PT attuale)
// =====================================================

export async function getAtletaCurrentConnection(atletaUserId: string) {
  const { data, error } = await supabase
    .from('pt_atleta_connections')
    .select(`
      *,
      pt_profiles:pt_user_id (
        id,
        user_id,
        status,
        bio,
        specializations,
        hourly_rate,
        rating_avg,
        review_count
      ),
      profiles:pt_user_id (
        first_name,
        last_name,
        email,
        avatar_url
      )
    `)
    .eq('atleta_user_id', atletaUserId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    throw new Error('Errore nel recupero connessione: ' + error.message);
  }

  return data;
}

// =====================================================
// OTTIENI STORICO CONNESSIONI ATLETA
// =====================================================

export async function getAtletaConnectionHistory(atletaUserId: string) {
  const { data, error } = await supabase
    .from('pt_atleta_connections')
    .select(`
      *,
      pt_profiles:pt_user_id (
        id,
        user_id,
        bio,
        specializations
      ),
      profiles:pt_user_id (
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('atleta_user_id', atletaUserId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Errore nel recupero storico: ' + error.message);
  }

  return data;
}

// =====================================================
// CONTA ATLETI ATTIVI PT
// =====================================================

export async function countPTActiveAthletes(ptUserId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('count_pt_active_athletes', { _pt_user_id: ptUserId });

  if (error) {
    throw new Error('Errore nel conteggio: ' + error.message);
  }

  return data ?? 0;
}

// =====================================================
// TRASFERIMENTO ATLETA TRA PT (cedi / riprendi)
// =====================================================

export interface PtTransferTarget {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  location_city: string | null;
  rating_avg: number | null;
}

export interface RecallableAthlete {
  atleta_user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  current_pt_user_id: string;
  current_pt_first_name: string | null;
  current_pt_last_name: string | null;
  transferred_at: string | null;
}

export interface CededAthlete {
  atleta_user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
  training_modality: TrainingModality | null;
  category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  category_is_system?: boolean | null;
  fitness_level: string | null;
  current_pt_user_id: string | null;
  current_pt_first_name: string | null;
  current_pt_last_name: string | null;
  transferred_at: string | null;
  is_recallable: boolean;
}

export interface PtAthleteTransferLog {
  id: string;
  atleta_user_id: string;
  from_pt_user_id: string;
  to_pt_user_id: string;
  action: 'transfer_out' | 'transfer_in' | 'recall';
  status: 'pending' | 'completed' | 'cancelled';
  requested_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sbAny = supabase as any;

async function searchPtColleaguesAsTransferTargets(
  query: string | null,
): Promise<PtTransferTarget[]> {
  // Exact same RPC as PTAppColleagueSearchPage / "Cerca colleghi".
  const { data: colleagues, error: colleaguesError } = await supabase.rpc(
    'search_pt_colleagues',
    { _query: query },
  );

  if (colleaguesError) {
    throw new Error('Errore ricerca PT: ' + colleaguesError.message);
  }

  return (colleagues ?? []).map((p) => ({
    user_id: p.user_id,
    first_name: p.first_name,
    last_name: p.last_name,
    avatar_url: p.avatar_url,
    location_city: p.location_city,
    rating_avg: p.rating_avg,
  }));
}

/**
 * Active PT pool for Cedi destinatario / Collaboratori assign.
 * Prefer search_pt_colleagues (live + in generated types). Only use
 * search_pts_for_transfer when it actually returns rows — a successful
 * empty response must NOT block the colleagues path (that was emptying
 * both Assegna lists while Cerca colleghi still worked).
 */
export async function searchPTsForTransfer(query?: string): Promise<PtTransferTarget[]> {
  const q = query?.trim() || null;

  // Primary: same path as Cerca colleghi
  try {
    const colleagues = await searchPtColleaguesAsTransferTargets(q);
    if (colleagues.length > 0) return colleagues;
  } catch (colleaguesErr) {
    const { data, error } = await sbAny.rpc('search_pts_for_transfer', {
      _query: q,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as PtTransferTarget[];
    }
    throw colleaguesErr instanceof Error
      ? colleaguesErr
      : new Error('Errore ricerca PT');
  }

  // Colleagues returned [] — try transfer RPC before accepting empty
  const { data, error } = await sbAny.rpc('search_pts_for_transfer', {
    _query: q,
  });
  if (!error && Array.isArray(data) && data.length > 0) {
    return data as PtTransferTarget[];
  }

  // Both empty (transfer missing/errored is fine if colleagues already said empty)
  return [];
}

export async function getRecallableAthletes(): Promise<RecallableAthlete[]> {
  const { data, error } = await sbAny.rpc('get_recallable_athletes_for_pt');

  if (error) {
    throw new Error('Errore recupero atleti: ' + error.message);
  }

  return (data ?? []) as RecallableAthlete[];
}

export async function transferAthleteToPt(params: {
  atletaUserId: string;
  toPtUserId: string;
  notes?: string;
}): Promise<string> {
  const { data, error } = await sbAny.rpc('transfer_athlete_to_pt', {
    _atleta_user_id: params.atletaUserId,
    _to_pt_user_id: params.toPtUserId,
    _notes: params.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function transferAthletesToPt(params: {
  atletaUserIds: string[];
  toPtUserId: string;
  notes?: string;
}): Promise<number> {
  const ids = params.atletaUserIds.filter(Boolean);
  if (ids.length === 0) {
    throw new Error('Seleziona almeno un atleta');
  }

  const { data, error } = await (supabase.rpc as any)('transfer_athletes_to_pt', {
    _atleta_user_ids: ids,
    _to_pt_user_id: params.toPtUserId,
    _notes: params.notes ?? null,
  });

  if (!error) {
    return (data as number) ?? ids.length;
  }

  // Fallback: sequential single transfers if bulk RPC not deployed yet
  const msg = (error.message ?? '').toLowerCase();
  const missingRpc =
    error.code === 'PGRST202' ||
    msg.includes('transfer_athletes_to_pt') ||
    msg.includes('could not find the function');

  if (!missingRpc) {
    throw new Error(error.message);
  }

  for (const atletaUserId of ids) {
    await transferAthleteToPt({
      atletaUserId,
      toPtUserId: params.toPtUserId,
      notes: params.notes,
    });
  }
  return ids.length;
}

export async function getCededAthletes(): Promise<CededAthlete[]> {
  const { data, error } = await (supabase.rpc as any)('get_ceded_athletes_for_pt');

  if (!error) {
    return (data ?? []) as CededAthlete[];
  }

  const msg = (error.message ?? '').toLowerCase();
  const missingRpc =
    error.code === 'PGRST202' ||
    msg.includes('get_ceded_athletes_for_pt') ||
    msg.includes('could not find the function');

  if (!missingRpc) {
    throw new Error('Errore recupero atleti ceduti: ' + error.message);
  }

  // Fallback from recallable list when RPC not yet applied
  const recallable = await getRecallableAthletes();
  return recallable.map((r) => ({
    atleta_user_id: r.atleta_user_id,
    first_name: r.first_name,
    last_name: r.last_name,
    avatar_url: r.avatar_url,
    email: null,
    training_modality: 'mix' as TrainingModality,
    fitness_level: null,
    current_pt_user_id: r.current_pt_user_id,
    current_pt_first_name: r.current_pt_first_name,
    current_pt_last_name: r.current_pt_last_name,
    transferred_at: r.transferred_at,
    is_recallable: true,
  }));
}

export async function recallAthleteFromTransfer(params: {
  atletaUserId: string;
  notes?: string;
}): Promise<string> {
  const { data, error } = await sbAny.rpc('recall_athlete_from_transfer', {
    _atleta_user_id: params.atletaUserId,
    _notes: params.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function getPtTransferHistory(ptUserId: string): Promise<PtAthleteTransferLog[]> {
  const { data, error } = await sbAny
    .from('pt_atleta_transfers')
    .select('*')
    .or(`from_pt_user_id.eq.${ptUserId},to_pt_user_id.eq.${ptUserId}`)
    .order('completed_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error('Errore recupero storico: ' + error.message);
  }

  return (data ?? []) as PtAthleteTransferLog[];
}

export interface ReceivedAthlete {
  id: string;
  atleta_user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  from_pt_user_id: string;
  from_pt_first_name: string | null;
  from_pt_last_name: string | null;
  completed_at: string | null;
  notes: string | null;
}

/** Atleti ricevuti tramite cessione piena (tu sei il PT destinatario). */
export async function getReceivedAthletes(): Promise<ReceivedAthlete[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await sbAny
    .from('pt_atleta_transfers')
    .select(
      'id, atleta_user_id, from_pt_user_id, to_pt_user_id, action, status, completed_at, notes',
    )
    .eq('to_pt_user_id', user.id)
    .eq('status', 'completed')
    .in('action', ['transfer_out', 'transfer_in'])
    .order('completed_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error('Errore recupero atleti ricevuti: ' + error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    atleta_user_id: string;
    from_pt_user_id: string;
    to_pt_user_id: string;
    action: string;
    status: string;
    completed_at: string | null;
    notes: string | null;
  }>;

  if (rows.length === 0) return [];

  const profileIds = Array.from(
    new Set(rows.flatMap((r) => [r.atleta_user_id, r.from_pt_user_id])),
  );

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, avatar_url')
    .in('user_id', profileIds);

  if (profilesError) {
    throw new Error('Errore caricamento profili: ' + profilesError.message);
  }

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [
      p.user_id,
      {
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
      },
    ]),
  );

  return rows.map((r) => {
    const athlete = profileMap[r.atleta_user_id];
    const fromPt = profileMap[r.from_pt_user_id];
    return {
      id: r.id,
      atleta_user_id: r.atleta_user_id,
      first_name: athlete?.first_name ?? null,
      last_name: athlete?.last_name ?? null,
      avatar_url: athlete?.avatar_url ?? null,
      from_pt_user_id: r.from_pt_user_id,
      from_pt_first_name: fromPt?.first_name ?? null,
      from_pt_last_name: fromPt?.last_name ?? null,
      completed_at: r.completed_at,
      notes: r.notes,
    };
  });
}
