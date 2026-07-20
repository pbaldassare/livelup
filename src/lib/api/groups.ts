// =====================================================
// API: Gruppi — creazione, ricerca, membri, chat
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  CreateGroupInput,
  GroupChannel,
  GroupMemberRole,
  GroupMessageRow,
  GroupRow,
  GroupSearchFilters,
  GroupStatus,
  GroupWithDetails,
  UpdateGroupInput,
} from '@/types/groups';

// Client tipizzato manualmente fino a rigenerazione types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function attachDisciplines(groups: GroupRow[]): Promise<GroupWithDetails[]> {
  if (groups.length === 0) return [];
  const ids = groups.map((g) => g.id);
  const { data: links } = await db()
    .from('group_disciplines')
    .select('group_id, pt_type_id, pt_types(id, name)')
    .in('group_id', ids);

  const byGroup = new Map<string, { id: string; name: string }[]>();
  for (const row of links || []) {
    const list = byGroup.get(row.group_id) || [];
    if (row.pt_types?.name) {
      list.push({ id: row.pt_type_id, name: row.pt_types.name });
    }
    byGroup.set(row.group_id, list);
  }

  return groups.map((g) => ({
    ...g,
    disciplines: byGroup.get(g.id) || [],
  }));
}

async function attachMyMembership(
  groups: GroupWithDetails[],
  userId?: string,
): Promise<GroupWithDetails[]> {
  if (!userId || groups.length === 0) return groups;
  const ids = groups.map((g) => g.id);
  const { data: memberships } = await db()
    .from('group_members')
    .select('group_id, role, status')
    .eq('user_id', userId)
    .in('group_id', ids);

  const typedMemberships = (memberships || []) as {
    group_id: string;
    role: GroupMemberRole;
    status: string;
  }[];
  const byGroup = new Map<string, { group_id: string; role: GroupMemberRole; status: string }>(
    typedMemberships.map((m) => [m.group_id, m]),
  );

  return groups.map((g) => {
    const m = byGroup.get(g.id);
    return {
      ...g,
      my_role: m?.status === 'active' ? m.role : null,
      is_member: m?.status === 'active',
    };
  });
}

// =====================================================
// DISCIPLINE (pt_types)
// =====================================================

export async function getDisciplines() {
  const { data, error } = await supabase
    .from('pt_types')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data || [];
}

// =====================================================
// CRUD GRUPPI
// =====================================================

function groupLocationPayload(input: Pick<
  CreateGroupInput | UpdateGroupInput,
  'placeLabel' | 'addressLine' | 'locationName' | 'latitude' | 'longitude'
>) {
  return {
    place_label: input.placeLabel?.trim() || null,
    address_line: input.addressLine?.trim() || null,
    location_name: input.locationName?.trim() || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
}

function isMissingPlaceColumnsError(message?: string): boolean {
  if (!message) return false;
  return (
    message.includes('place_label') ||
    message.includes('address_line') ||
    message.includes("'groups' in the schema cache")
  );
}

/** Unisce i campi luogo in location_name quando le colonne nuove non esistono ancora sul backend */
function legacyLocationName(loc: ReturnType<typeof groupLocationPayload>): string | null {
  const parts = [loc.place_label, loc.address_line, loc.location_name].filter(
    (p): p is string => !!p && p.length > 0,
  );
  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.length > 0 ? unique.join(' · ') : null;
}

export async function updateGroup(
  groupId: string,
  patch: Partial<{
    name: string;
    description: string | null;
    image_url: string | null;
    place_label: string | null;
    address_line: string | null;
    location_name: string | null;
    latitude: number | null;
    longitude: number | null;
    visibility: 'public' | 'private';
  }>,
) {
  const { data, error } = await db()
    .from('groups')
    .update(patch)
    .eq('id', groupId)
    .select()
    .single();

  if (!error) return data as GroupRow;

  if (!isMissingPlaceColumnsError(error.message)) {
    throw new Error(error.message);
  }

  const { place_label, address_line, location_name, latitude, longitude, ...rest } = patch;
  const legacyPatch = {
    ...rest,
    location_name:
      legacyLocationName({
        place_label: place_label ?? null,
        address_line: address_line ?? null,
        location_name: location_name ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      }) ?? location_name ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };

  const { data: legacyData, error: legacyError } = await db()
    .from('groups')
    .update(legacyPatch)
    .eq('id', groupId)
    .select()
    .single();

  if (legacyError) throw new Error(legacyError.message);
  return legacyData as GroupRow;
}

export async function createGroup(_userId: string, input: CreateGroupInput) {
  if (!input.policyAccepted) {
    throw new Error('Devi accettare le policy di LivelApp per creare un gruppo');
  }
  if (!input.name.trim()) throw new Error('Il nome del gruppo è obbligatorio');
  if (input.disciplineIds.length === 0) {
    throw new Error('Seleziona almeno una disciplina');
  }

  const loc = groupLocationPayload(input);
  const payload = {
    _name: input.name.trim(),
    _description: input.description?.trim() || null,
    _image_url: input.imageUrl || null,
    _location_name: loc.location_name,
    _latitude: loc.latitude,
    _longitude: loc.longitude,
    _visibility: input.visibility,
    _discipline_ids: input.disciplineIds,
    _policy_accepted: input.policyAccepted,
    _place_label: loc.place_label,
    _address_line: loc.address_line,
  };

  const { data: rpcGroup, error: rpcError } = await supabase.rpc(
    'create_group_with_disciplines',
    payload,
  );

  if (!rpcError && rpcGroup) {
    return rpcGroup as GroupRow;
  }

  const rpcPlaceColumnError = isMissingPlaceColumnsError(rpcError?.message);
  const rpcUnavailable =
    rpcError?.code === 'PGRST202' ||
    rpcError?.message?.includes('create_group_with_disciplines') ||
    rpcError?.message?.includes('Could not find the function') ||
    rpcPlaceColumnError;

  if (!rpcUnavailable && rpcError) {
    throw new Error(rpcError.message || 'Creazione gruppo non riuscita');
  }

  if (rpcPlaceColumnError) {
    const legacyLoc = legacyLocationName(loc);
    const { data: rpcLegacy, error: rpcLegacyErr } = await supabase.rpc(
      'create_group_with_disciplines',
      {
        _name: input.name.trim(),
        _description: input.description?.trim() || null,
        _image_url: input.imageUrl || null,
        _location_name: legacyLoc,
        _latitude: loc.latitude,
        _longitude: loc.longitude,
        _visibility: input.visibility,
        _discipline_ids: input.disciplineIds,
        _policy_accepted: input.policyAccepted,
      },
    );
    if (!rpcLegacyErr && rpcLegacy) return rpcLegacy as GroupRow;
  }

  const insertPayload = {
    owner_user_id: _userId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    image_url: input.imageUrl || null,
    ...loc,
    visibility: input.visibility,
    policy_accepted_at: new Date().toISOString(),
  };

  let { data: group, error } = await db()
    .from('groups')
    .insert(insertPayload)
    .select()
    .single();

  if (error && isMissingPlaceColumnsError(error.message)) {
    const legacyLoc = legacyLocationName(loc);
    const retry = await db()
      .from('groups')
      .insert({
        owner_user_id: _userId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        image_url: input.imageUrl || null,
        location_name: legacyLoc,
        latitude: loc.latitude,
        longitude: loc.longitude,
        visibility: input.visibility,
        policy_accepted_at: new Date().toISOString(),
      })
      .select()
      .single();
    group = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(error.message);

  const disciplineRows = input.disciplineIds.map((pt_type_id) => ({
    group_id: group.id,
    pt_type_id,
  }));
  const { error: discError } = await db().from('group_disciplines').insert(disciplineRows);
  if (discError) throw new Error(discError.message);

  return group as GroupRow;
}

export async function saveGroupEdit(groupId: string, input: UpdateGroupInput) {
  if (!input.name.trim()) throw new Error('Il nome del gruppo è obbligatorio');
  if (input.disciplineIds.length === 0) {
    throw new Error('Seleziona almeno una disciplina');
  }

  const loc = groupLocationPayload(input);
  await updateGroup(groupId, {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    image_url: input.imageUrl ?? null,
    ...loc,
    visibility: input.visibility,
  });
  await setGroupDisciplines(groupId, input.disciplineIds);
  return getGroup(groupId);
}

export async function setGroupDisciplines(groupId: string, disciplineIds: string[]) {
  await db().from('group_disciplines').delete().eq('group_id', groupId);
  if (disciplineIds.length === 0) return;
  const rows = disciplineIds.map((pt_type_id) => ({ group_id: groupId, pt_type_id }));
  const { error } = await db().from('group_disciplines').insert(rows);
  if (error) throw new Error(error.message);
}

export async function getGroup(groupId: string, userId?: string): Promise<GroupWithDetails | null> {
  const { data, error } = await db().from('groups').select('*').eq('id', groupId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [withDisc] = await attachDisciplines([data as GroupRow]);
  const [withMember] = await attachMyMembership([withDisc], userId);
  return withMember;
}

export async function getMyGroups(userId: string): Promise<GroupWithDetails[]> {
  const { data: memberships, error: mErr } = await db()
    .from('group_members')
    .select('group_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (mErr) throw new Error(mErr.message);
  const ids = (memberships || []).map((m: { group_id: string }) => m.group_id);
  if (ids.length === 0) return [];

  const { data, error } = await db()
    .from('groups')
    .select('*')
    .in('id', ids)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  const withDisc = await attachDisciplines((data || []) as GroupRow[]);
  return attachMyMembership(withDisc, userId);
}

export async function searchGroups(
  filters: GroupSearchFilters = {},
  userId?: string,
): Promise<GroupWithDetails[]> {
  let query = db()
    .from('groups')
    .select('*')
    .eq('status', 'active')
    .eq('visibility', 'public');

  if (filters.query?.trim()) {
    query = query.ilike('name', `%${filters.query.trim()}%`);
  }

  const { data, error } = await query.order('members_count', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);

  let results = await attachDisciplines((data || []) as GroupRow[]);

  if (filters.disciplineIds?.length) {
    const set = new Set(filters.disciplineIds);
    results = results.filter((g) => g.disciplines.some((d) => set.has(d.id)));
  }

  if (
    filters.userLat != null &&
    filters.userLng != null &&
    filters.maxDistanceKm != null
  ) {
    results = results
      .map((g) => {
        if (g.latitude == null || g.longitude == null) return g;
        return {
          ...g,
          distance_km: haversineKm(
            filters.userLat!,
            filters.userLng!,
            g.latitude,
            g.longitude,
          ),
        };
      })
      .filter((g) => g.distance_km == null || g.distance_km <= filters.maxDistanceKm!);
  }

  return attachMyMembership(results, userId);
}

export async function getGroupByInviteToken(token: string) {
  const { data, error } = await supabase.rpc('get_group_by_invite_token', {
    _token: token,
  });
  if (error) throw new Error(error.message);
  return data as {
    found: boolean;
    id?: string;
    name?: string;
    description?: string;
    image_url?: string;
    location_name?: string;
    visibility?: string;
    members_count?: number;
    is_official?: boolean;
  };
}

export async function joinGroup(groupId: string) {
  const { data, error } = await supabase.rpc('join_group', { _group_id: groupId });
  if (error) throw new Error(error.message);
  return data as { joined: boolean; already_member: boolean };
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await db()
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// =====================================================
// MEMBRI
// =====================================================

export async function getGroupMembers(groupId: string) {
  // Niente embed FK (group_members.user_id → profiles non esiste come foreign key,
  // entrambe referenziano solo auth.users): fetch separato + merge in JS, come nel
  // resto della codebase (vedi src/lib/api/eventParticipants.ts).
  const { data, error } = await db()
    .from('group_members')
    .select('id, group_id, user_id, role, status, joined_at')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });
  if (error) throw new Error(error.message);

  const members = data || [];
  if (members.length === 0) return [];

  const userIds = [...new Set(members.map((m: { user_id: string }) => m.user_id))];
  const { data: profilesData, error: profilesError } = await db()
    .from('profiles')
    .select('user_id, first_name, last_name, avatar_url, email')
    .in('user_id', userIds);

  // Non bloccare la lista membri se i profili non sono leggibili (RLS/rete):
  // meglio mostrare i membri con nome generico che una lista vuota.
  if (profilesError) {
    return members.map((m: Record<string, unknown>) => ({ ...m, profiles: null }));
  }

  const profileByUser = new Map(
    (profilesData || []).map((p: { user_id: string }) => [p.user_id, p]),
  );

  return members.map((m: { user_id: string } & Record<string, unknown>) => ({
    ...m,
    profiles: profileByUser.get(m.user_id) || null,
  }));
}

export async function setMemberRole(
  groupId: string,
  userId: string,
  role: GroupMemberRole,
) {
  const { error } = await db()
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function removeMember(groupId: string, userId: string) {
  const { error } = await db()
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// =====================================================
// CHAT
// =====================================================

export async function getGroupMessages(
  groupId: string,
  channel: GroupChannel,
  limit = 50,
  before?: string,
) {
  let query = db()
    .from('group_messages')
    .select('*')
    .eq('group_id', groupId)
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data || []) as GroupMessageRow[]).reverse();
}

export async function sendGroupMessage(params: {
  groupId: string;
  senderUserId: string;
  channel: GroupChannel;
  content: string;
}) {
  const { data, error } = await db()
    .from('group_messages')
    .insert({
      group_id: params.groupId,
      sender_user_id: params.senderUserId,
      channel: params.channel,
      content: params.content,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as GroupMessageRow;
}

export function subscribeToGroupMessages(
  groupId: string,
  channel: GroupChannel,
  callback: (message: GroupMessageRow) => void,
) {
  const channelName = `group-messages:${groupId}:${channel}`;
  const sub = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        const msg = payload.new as GroupMessageRow;
        if (msg.channel === channel) callback(msg);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(sub);
  };
}

// =====================================================
// ADMIN
// =====================================================

export async function adminListGroups(filters?: {
  status?: GroupStatus;
  query?: string;
  officialOnly?: boolean;
}) {
  let query = db().from('groups').select('*').order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.officialOnly) query = query.eq('is_official', true);
  if (filters?.query?.trim()) query = query.ilike('name', `%${filters.query.trim()}%`);

  const { data, error } = await query.limit(200);
  if (error) throw new Error(error.message);
  return attachDisciplines((data || []) as GroupRow[]);
}

export async function adminSetGroupStatus(groupId: string, status: GroupStatus) {
  const { error } = await supabase.rpc('admin_set_group_status', {
    _group_id: groupId,
    _status: status,
  });
  if (error) throw new Error(error.message);
}

export async function adminSetGroupOfficial(groupId: string, isOfficial: boolean) {
  const { error } = await supabase.rpc('admin_set_group_official', {
    _group_id: groupId,
    _is_official: isOfficial,
  });
  if (error) throw new Error(error.message);
}

export function getGroupInviteUrl(inviteToken: string, basePath = '/app/groups') {
  return `${window.location.origin}${basePath}/join/${inviteToken}`;
}
