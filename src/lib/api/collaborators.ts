// =====================================================
// API: Assegnazione atleti a collaboratori PT (option B)
// Cast `as any` finché types.ts non viene rigenerato da Lovable.
// =====================================================

import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export const COLLABORATORS_MIGRATION_HINT =
  'Funzione non disponibile: applica su Lovable la migration 20260808170000_pt_athlete_collaborator_assignments.sql e attendi il deploy del backend.';

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

function isMissingCollaboratorRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST202') return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('could not find the function') ||
    msg.includes('list_my_collaborator_roster') ||
    msg.includes('assign_athlete_to_collaborators') ||
    msg.includes('move_athlete_collaborator') ||
    msg.includes('revoke_athlete_collaborator') ||
    msg.includes('get_athlete_owner_pt') ||
    msg.includes('pt_athlete_owners') ||
    msg.includes('pt_athlete_collaborator_assignments')
  );
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

export async function listMyCollaboratorRoster(): Promise<CollaboratorRosterRow[]> {
  const { data, error } = await db().rpc('list_my_collaborator_roster');

  if (error) {
    if (isMissingCollaboratorRpc(error)) {
      throw new Error(COLLABORATORS_MIGRATION_HINT);
    }
    throw new Error(error.message);
  }

  return (data ?? []) as CollaboratorRosterRow[];
}

export async function listOwnedAthleteIds(ownerPtUserId: string): Promise<string[]> {
  const { data, error } = await db()
    .from('pt_athlete_owners')
    .select('atleta_user_id')
    .eq('owner_pt_user_id', ownerPtUserId);

  if (error) {
    if (isMissingCollaboratorRpc(error)) {
      throw new Error(COLLABORATORS_MIGRATION_HINT);
    }
    throw new Error('Errore caricamento atleti di proprietà: ' + error.message);
  }

  return ((data ?? []) as Array<{ atleta_user_id: string }>).map((r) => r.atleta_user_id);
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

export async function assignAthleteToCollaborators(params: {
  atletaUserId: string;
  collaboratorPtIds: string[];
  notes?: string;
}): Promise<number> {
  const ids = params.collaboratorPtIds.filter(Boolean);
  if (ids.length === 0) {
    throw new Error('Seleziona almeno un collaboratore');
  }

  const { data, error } = await db().rpc('assign_athlete_to_collaborators', {
    _atleta_user_id: params.atletaUserId,
    _collaborator_pt_ids: ids,
    _notes: params.notes ?? null,
  });

  if (error) {
    if (isMissingCollaboratorRpc(error)) {
      throw new Error(COLLABORATORS_MIGRATION_HINT);
    }
    throw new Error(error.message);
  }

  return (data as number) ?? ids.length;
}

export async function moveAthleteCollaborator(params: {
  atletaUserId: string;
  fromCollaboratorPtId: string;
  toCollaboratorPtId: string;
  notes?: string;
}): Promise<void> {
  const { error } = await db().rpc('move_athlete_collaborator', {
    _atleta_user_id: params.atletaUserId,
    _from_collaborator_pt_id: params.fromCollaboratorPtId,
    _to_collaborator_pt_id: params.toCollaboratorPtId,
    _notes: params.notes ?? null,
  });

  if (error) {
    if (isMissingCollaboratorRpc(error)) {
      throw new Error(COLLABORATORS_MIGRATION_HINT);
    }
    throw new Error(error.message);
  }
}

export async function revokeAthleteCollaborator(params: {
  atletaUserId: string;
  collaboratorPtId: string;
}): Promise<void> {
  const { error } = await db().rpc('revoke_athlete_collaborator', {
    _atleta_user_id: params.atletaUserId,
    _collaborator_pt_id: params.collaboratorPtId,
  });

  if (error) {
    if (isMissingCollaboratorRpc(error)) {
      throw new Error(COLLABORATORS_MIGRATION_HINT);
    }
    throw new Error(error.message);
  }
}
