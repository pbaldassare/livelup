// =====================================================
// API: Gestione connessioni PT-Atleta
// Logiche business per relazioni
// =====================================================

import { supabase } from '@/integrations/supabase/client';

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
