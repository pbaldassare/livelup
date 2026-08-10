// =====================================================
// API: Assegnazione atleti a collaboratori PT
// Allineata alle RPC singolari live (migration 20260808123439).
// Cast `as any` finché types.ts non viene rigenerato da Lovable.
// =====================================================

import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export const COLLABORATORS_MIGRATION_HINT =
  'Funzione backend non allineata: le RPC collaboratori non sono disponibili su Lovable Cloud.';

export interface CollaboratorRosterRow {
  view_mode: 'owner' | 'collaborator';
  owner_pt_user_id: string;
  owner_first_name: string | null;
  owner_last_name: string | null;
  collaborator_pt_user_id: string;
  collaborator_first_name: string | null;
  collaborator_last_name: string | null;
  collaborator_avatar_url: string | null;
  atleta_user_id: string;
  atleta_first_name: string | null;
  atleta_last_name: string | null;
  atleta_avatar_url: string | null;
  assignment_id: string;
  assigned_at: string;
  notes: string | null;
}

export interface CollaboratorGroup {
  collaborator_pt_user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  athletes: Array<{
    atleta_user_id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    assignment_id: string;
    assigned_at: string;
    notes: string | null;
    owner_pt_user_id: string;
    owner_first_name: string | null;
    owner_last_name: string | null;
    view_mode: 'owner' | 'collaborator';
  }>;
}

type ProfileNameRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

function isMissingCollaboratorRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST202') return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('could not find the function') ||
    msg.includes('list_my_collaborator_roster') ||
    msg.includes('assign_athlete_to_collaborator') ||
    msg.includes('assign_athlete_to_collaborators') ||
    msg.includes('move_athlete_to_collaborator') ||
    msg.includes('move_athlete_collaborator') ||
    msg.includes('revoke_collaborator_assignment') ||
    msg.includes('revoke_athlete_collaborator') ||
    msg.includes('get_athlete_owner_pt')
  );
}

function throwCollaboratorError(error: { message?: string; code?: string }): never {
  if (isMissingCollaboratorRpc(error)) {
    throw new Error(COLLABORATORS_MIGRATION_HINT);
  }
  throw new Error(error.message ?? 'Errore collaboratori');
}

async function fetchProfilesByUserIds(userIds: string[]): Promise<Map<string, ProfileNameRow>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, ProfileNameRow>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, avatar_url')
    .in('user_id', unique);

  if (error) {
    throw new Error('Errore caricamento profili: ' + error.message);
  }

  for (const row of (data ?? []) as ProfileNameRow[]) {
    map.set(row.user_id, row);
  }
  return map;
}

export function groupCollaboratorRoster(rows: CollaboratorRosterRow[]): CollaboratorGroup[] {
  const map = new Map<string, CollaboratorGroup>();

  for (const row of rows) {
    let group = map.get(row.collaborator_pt_user_id);
    if (!group) {
      group = {
        collaborator_pt_user_id: row.collaborator_pt_user_id,
        first_name: row.collaborator_first_name,
        last_name: row.collaborator_last_name,
        avatar_url: row.collaborator_avatar_url,
        athletes: [],
      };
      map.set(row.collaborator_pt_user_id, group);
    }
    group.athletes.push({
      atleta_user_id: row.atleta_user_id,
      first_name: row.atleta_first_name,
      last_name: row.atleta_last_name,
      avatar_url: row.atleta_avatar_url,
      assignment_id: row.assignment_id,
      assigned_at: row.assigned_at,
      notes: row.notes,
      owner_pt_user_id: row.owner_pt_user_id,
      owner_first_name: row.owner_first_name,
      owner_last_name: row.owner_last_name,
      view_mode: row.view_mode,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const an = `${a.last_name ?? ''} ${a.first_name ?? ''}`.trim().toLowerCase();
    const bn = `${b.last_name ?? ''} ${b.first_name ?? ''}`.trim().toLowerCase();
    return an.localeCompare(bn, 'it');
  });
}

/** Assegnazioni in cui l'utente corrente è il PT titolare (owner view). */
export async function listOwnerCollaboratorAssignments(
  ownerPtUserId: string,
): Promise<CollaboratorRosterRow[]> {
  const { data, error } = await db()
    .from('pt_athlete_collaborator_assignments')
    .select(
      'id, atleta_user_id, collaborator_pt_user_id, owner_pt_user_id, assigned_at, notes, status',
    )
    .eq('owner_pt_user_id', ownerPtUserId)
    .eq('status', 'active');

  if (error) {
    if (isMissingCollaboratorRpc(error) || error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error(COLLABORATORS_MIGRATION_HINT);
    }
    throw new Error('Errore caricamento assegnazioni collaboratori: ' + error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    atleta_user_id: string;
    collaborator_pt_user_id: string;
    owner_pt_user_id: string;
    assigned_at: string;
    notes: string | null;
  }>;

  if (rows.length === 0) return [];

  const profileIds = rows.flatMap((r) => [
    r.atleta_user_id,
    r.collaborator_pt_user_id,
    r.owner_pt_user_id,
  ]);
  const profiles = await fetchProfilesByUserIds(profileIds);

  return rows.map((r) => {
    const athlete = profiles.get(r.atleta_user_id);
    const collaborator = profiles.get(r.collaborator_pt_user_id);
    const owner = profiles.get(r.owner_pt_user_id);
    return {
      view_mode: 'owner' as const,
      owner_pt_user_id: r.owner_pt_user_id,
      owner_first_name: owner?.first_name ?? null,
      owner_last_name: owner?.last_name ?? null,
      collaborator_pt_user_id: r.collaborator_pt_user_id,
      collaborator_first_name: collaborator?.first_name ?? null,
      collaborator_last_name: collaborator?.last_name ?? null,
      collaborator_avatar_url: collaborator?.avatar_url ?? null,
      atleta_user_id: r.atleta_user_id,
      atleta_first_name: athlete?.first_name ?? null,
      atleta_last_name: athlete?.last_name ?? null,
      atleta_avatar_url: athlete?.avatar_url ?? null,
      assignment_id: r.id,
      assigned_at: r.assigned_at,
      notes: r.notes,
    };
  });
}

/**
 * Roster "Assegnati a te": RPC live restituisce solo atleti assegnati
 * all'utente come collaboratore (non la vista owner).
 */
export async function listMyCollaboratorRoster(
  currentUserId?: string,
): Promise<CollaboratorRosterRow[]> {
  const { data, error } = await db().rpc('list_my_collaborator_roster');

  if (error) {
    throwCollaboratorError(error);
  }

  let me = currentUserId;
  if (!me) {
    const { data: authData } = await supabase.auth.getUser();
    me = authData.user?.id;
  }

  type LiveRosterRow = {
    assignment_id: string;
    atleta_user_id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email?: string | null;
    owner_pt_user_id: string;
    owner_first_name: string | null;
    owner_last_name: string | null;
    assigned_at: string;
  };

  return ((data ?? []) as LiveRosterRow[]).map((r) => ({
    view_mode: 'collaborator' as const,
    owner_pt_user_id: r.owner_pt_user_id,
    owner_first_name: r.owner_first_name,
    owner_last_name: r.owner_last_name,
    collaborator_pt_user_id: me ?? '',
    collaborator_first_name: null,
    collaborator_last_name: null,
    collaborator_avatar_url: null,
    atleta_user_id: r.atleta_user_id,
    atleta_first_name: r.first_name,
    atleta_last_name: r.last_name,
    atleta_avatar_url: r.avatar_url,
    assignment_id: r.assignment_id,
    assigned_at: r.assigned_at,
    notes: null,
  }));
}

/** Vista unificata: assegnazioni da me (owner) + assegnati a me (collaborator). */
export async function listCollaboratorRosterViews(
  currentUserId: string,
): Promise<CollaboratorRosterRow[]> {
  const [owned, assignedToMe] = await Promise.all([
    listOwnerCollaboratorAssignments(currentUserId),
    listMyCollaboratorRoster(currentUserId),
  ]);
  return [...owned, ...assignedToMe];
}

export async function listOwnedAthleteIds(ownerPtUserId: string): Promise<string[]> {
  const { data, error } = await db()
    .from('pt_athlete_owners')
    .select('atleta_user_id')
    .eq('owner_pt_user_id', ownerPtUserId);

  if (error) {
    if (isMissingCollaboratorRpc(error) || error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error(COLLABORATORS_MIGRATION_HINT);
    }
    throw new Error('Errore caricamento atleti di proprietà: ' + error.message);
  }

  return ((data ?? []) as Array<{ atleta_user_id: string }>).map((r) => r.atleta_user_id);
}

/**
 * Atleti con almeno un'assegnazione collaboratore attiva (owner = me).
 * Usato per escluderli dalla lista Cedi (cessione piena).
 */
export async function listActiveCollaboratorAssignedAthleteIds(
  ownerPtUserId: string,
): Promise<string[]> {
  const { data, error } = await db()
    .from('pt_athlete_collaborator_assignments')
    .select('atleta_user_id')
    .eq('owner_pt_user_id', ownerPtUserId)
    .eq('status', 'active');

  if (error) {
    if (isMissingCollaboratorRpc(error) || error.code === '42P01' || error.code === 'PGRST205') {
      // Se la tabella non è ancora disponibile, non bloccare Cedi
      return [];
    }
    throw new Error('Errore caricamento assegnazioni attive: ' + error.message);
  }

  return Array.from(
    new Set(
      ((data ?? []) as Array<{ atleta_user_id: string }>).map((r) => r.atleta_user_id),
    ),
  );
}

export async function getAthleteOwnerPt(atletaUserId: string): Promise<string | null> {
  const { data, error } = await db().rpc('get_athlete_owner_pt', {
    _atleta_user_id: atletaUserId,
  });

  if (error) {
    if (isMissingCollaboratorRpc(error)) {
      return null;
    }
    throw new Error(error.message);
  }

  return (data as string | null) ?? null;
}

/** True if PT is titolare in pt_athlete_owners (RPC is_athlete_owner when available). */
export async function isAthleteOwner(
  atletaUserId: string,
  ptUserId: string,
): Promise<boolean> {
  const { data, error } = await db().rpc('is_athlete_owner', {
    _atleta_user_id: atletaUserId,
    _pt_user_id: ptUserId,
  });

  if (!error) {
    return Boolean(data);
  }

  const msg = (error.message ?? '').toLowerCase();
  const missing =
    error.code === 'PGRST202' ||
    msg.includes('is_athlete_owner') ||
    msg.includes('could not find the function');

  if (!missing) {
    throw new Error(error.message);
  }

  const owner = await getAthleteOwnerPt(atletaUserId);
  return owner != null && owner === ptUserId;
}

export async function assignAthleteToCollaborators(params: {
  atletaUserId: string;
  collaboratorPtIds: string[];
  notes?: string;
}): Promise<number> {
  const ids = params.collaboratorPtIds.filter(Boolean);
  if (ids.length === 0) {
    throw new Error('Seleziona almeno un collaboratore');
  }

  let assigned = 0;
  for (const collaboratorPtId of ids) {
    const { error } = await db().rpc('assign_athlete_to_collaborator', {
      _atleta_user_id: params.atletaUserId,
      _collaborator_pt_user_id: collaboratorPtId,
      _notes: params.notes ?? null,
    });

    if (error) {
      throwCollaboratorError(error);
    }
    assigned += 1;
  }

  return assigned;
}

export async function moveAthleteCollaborator(params: {
  atletaUserId: string;
  fromCollaboratorPtId: string;
  toCollaboratorPtId: string;
  notes?: string;
}): Promise<void> {
  // Live RPC revoca le altre assegnazioni attive e assegna alla destinazione.
  void params.fromCollaboratorPtId;
  const { error } = await db().rpc('move_athlete_to_collaborator', {
    _atleta_user_id: params.atletaUserId,
    _collaborator_pt_user_id: params.toCollaboratorPtId,
    _notes: params.notes ?? null,
  });

  if (error) {
    throwCollaboratorError(error);
  }
}

export async function revokeAthleteCollaborator(params: {
  atletaUserId: string;
  collaboratorPtId: string;
}): Promise<void> {
  const { error } = await db().rpc('revoke_collaborator_assignment', {
    _atleta_user_id: params.atletaUserId,
    _collaborator_pt_user_id: params.collaboratorPtId,
  });

  if (error) {
    throwCollaboratorError(error);
  }
}
