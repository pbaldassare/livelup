// =====================================================
// Tipi dominio Gruppi Chat PT (fino a rigenerazione types.ts)
// Gruppo chat creato dal PT con un sottoinsieme dei propri atleti collegati.
// Da non confondere con i "Gruppi" community (src/types/groups.ts).
// =====================================================

export interface ChatGroupRow {
  id: string;
  pt_user_id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatGroupMemberRow {
  id: string;
  group_id: string;
  atleta_user_id: string;
  added_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

export interface ChatGroupWithMeta extends ChatGroupRow {
  members_count: number;
  last_message?: {
    content: string | null;
    attachment_type: string | null;
    sender_user_id: string;
    created_at: string;
  } | null;
  unread_count: number;
}
