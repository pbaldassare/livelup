// =====================================================
// Tipi dominio Gruppi (fino a rigenerazione types.ts)
// =====================================================

export type GroupVisibility = 'public' | 'private';
export type GroupStatus = 'active' | 'suspended' | 'pending_review';
export type GroupMemberRole = 'owner' | 'admin' | 'member';
export type GroupMemberStatus = 'active' | 'banned';
export type GroupChannel = 'general' | 'announcements' | 'admins';

export interface GroupRow {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  place_label: string | null;
  address_line: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  visibility: GroupVisibility;
  status: GroupStatus;
  is_official: boolean;
  invite_token: string;
  policy_accepted_at: string;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupDisciplineRow {
  group_id: string;
  pt_type_id: string;
  pt_types?: { id: string; name: string } | null;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joined_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

export interface GroupMessageRow {
  id: string;
  group_id: string;
  sender_user_id: string;
  channel: GroupChannel;
  content: string;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
}

export interface GroupWithDetails extends GroupRow {
  disciplines: { id: string; name: string }[];
  my_role?: GroupMemberRole | null;
  is_member?: boolean;
  distance_km?: number;
  /** PT è owner o PT attivo del owner-atleta (accesso coach senza membership) */
  is_coach_access?: boolean;
  /** Nome display del creatore (per lista Messaggi PT) */
  owner_name?: string | null;
}

export interface GroupSearchFilters {
  query?: string;
  disciplineIds?: string[];
  userLat?: number;
  userLng?: number;
  maxDistanceKm?: number;
}

/** Campi condivisi tra creazione e modifica */
export interface GroupFormInput {
  name: string;
  description?: string;
  imageUrl?: string | null;
  placeLabel?: string;
  addressLine?: string;
  locationName?: string;
  latitude?: number | null;
  longitude?: number | null;
  visibility: GroupVisibility;
  disciplineIds: string[];
  policyAccepted?: boolean;
}

export interface CreateGroupInput extends GroupFormInput {
  policyAccepted: boolean;
}

export type UpdateGroupInput = GroupFormInput;
