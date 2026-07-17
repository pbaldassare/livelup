// =====================================================
// API: Gestione connessioni PT-Atleta
// Logiche business per relazioni
// =====================================================

import { supabase } from '@/integrations/supabase/client';

export interface PtConnectionWithPtActive {
  id?: string;
  atleta_user_id: string;
  status?: string;
  is_pt_active?: boolean | null;
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
  const withPtActive =
    options?.columns === 'list'
      ? 'id, atleta_user_id, status, is_pt_active, created_at, accepted_at'
      : 'atleta_user_id, is_pt_active';
  const withoutPtActive =
    options?.columns === 'list'
      ? 'id, atleta_user_id, status, created_at, accepted_at'
      : 'atleta_user_id';

  let query = supabase.from('pt_atleta_connections').select(withPtActive).eq('pt_user_id', ptUserId);

  if (status) query = query.eq('status', status);
  if (options?.orderByCreatedAt) query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (!error) {
    return (data ?? []) as PtConnectionWithPtActive[];
  }

  if (!isMissingPtActiveColumn(error)) {
    throw new Error('Errore nel recupero connessioni: ' + error.message);
  }

  let fallbackQuery = supabase
    .from('pt_atleta_connections')
    .select(withoutPtActive)
    .eq('pt_user_id', ptUserId);

  if (status) fallbackQuery = fallbackQuery.eq('status', status);
  if (options?.orderByCreatedAt) {
    fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
  }

  const { data: fallbackData, error: fallbackError } = await fallbackQuery;

  if (fallbackError) {
    throw new Error('Errore nel recupero connessioni: ' + fallbackError.message);
  }

  return (fallbackData ?? []).map((row) => ({
    ...row,
    is_pt_active: true,
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

  // Verifica se atleta può connettersi (non ha già un PT attivo)
  const { data: canConnect, error: checkError } = await supabase
    .rpc('can_atleta_connect_to_pt', { _atleta_user_id: atletaUserId });

  if (checkError) {
    throw new Error('Errore durante la verifica: ' + checkError.message);
  }

  if (!canConnect) {
    throw new Error('L\'atleta ha già un Personal Trainer attivo. Deve prima terminare la connessione esistente.');
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

  return data;
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
  const { data, error } = await supabase
    .from('pt_atleta_connections')
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
// TERMINA CONNESSIONE
// =====================================================

export async function terminateConnection(connectionId: string) {
  const { data, error } = await supabase
    .from('pt_atleta_connections')
    .update({
      status: 'terminated',
      terminated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    throw new Error('Errore durante la terminazione: ' + error.message);
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

export async function searchPTsForTransfer(query?: string): Promise<PtTransferTarget[]> {
  const { data, error } = await supabase.rpc('search_pts_for_transfer', {
    _query: query?.trim() || null,
  });

  if (error) {
    throw new Error('Errore ricerca PT: ' + error.message);
  }

  return (data ?? []) as PtTransferTarget[];
}

export async function getRecallableAthletes(): Promise<RecallableAthlete[]> {
  const { data, error } = await supabase.rpc('get_recallable_athletes_for_pt');

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
  const { data, error } = await supabase.rpc('transfer_athlete_to_pt', {
    _atleta_user_id: params.atletaUserId,
    _to_pt_user_id: params.toPtUserId,
    _notes: params.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function recallAthleteFromTransfer(params: {
  atletaUserId: string;
  notes?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('recall_athlete_from_transfer', {
    _atleta_user_id: params.atletaUserId,
    _notes: params.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function getPtTransferHistory(ptUserId: string): Promise<PtAthleteTransferLog[]> {
  const { data, error } = await supabase
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
