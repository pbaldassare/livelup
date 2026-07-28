// =====================================================
// API: Seguiti atleta ("Attività" hub — tab Seguiti)
// Tabella: atleta_follows (event | course | group | pt | professional)
// Cast `as any` finché types.ts non viene rigenerato da Lovable.
// =====================================================

import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export type FollowTargetType = 'event' | 'course' | 'group' | 'pt' | 'professional';

export interface AtletaFollowRow {
  id: string;
  atleta_user_id: string;
  target_type: FollowTargetType;
  target_id: string;
  created_at: string;
}

export const followQueryKeys = {
  list: (userId: string) => ['atleta-follows', userId] as const,
  isFollowing: (userId: string, type: FollowTargetType, id: string) =>
    ['atleta-follow', userId, type, id] as const,
};

// =====================================================
// CRUD
// =====================================================

export async function listFollows(userId: string): Promise<AtletaFollowRow[]> {
  if (!userId) return [];
  const { data, error } = await db()
    .from('atleta_follows')
    .select('*')
    .eq('atleta_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Errore caricamento preferiti: ' + error.message);
  return (data || []) as AtletaFollowRow[];
}

export async function isFollowing(
  userId: string,
  targetType: FollowTargetType,
  targetId: string,
): Promise<boolean> {
  if (!userId || !targetId) return false;
  const { data, error } = await db()
    .from('atleta_follows')
    .select('id')
    .eq('atleta_user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  if (error) throw new Error('Errore verifica preferito: ' + error.message);
  return !!data;
}

/** Aggiunge/rimuove il preferito. Ritorna il nuovo stato (true = ora seguito). */
export async function toggleFollow(
  userId: string,
  targetType: FollowTargetType,
  targetId: string,
): Promise<boolean> {
  const { data: existing, error: findError } = await db()
    .from('atleta_follows')
    .select('id')
    .eq('atleta_user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  if (findError) throw new Error('Errore preferiti: ' + findError.message);

  if (existing) {
    const { error } = await db().from('atleta_follows').delete().eq('id', existing.id);
    if (error) throw new Error('Errore rimozione preferito: ' + error.message);
    return false;
  }

  const { error } = await db()
    .from('atleta_follows')
    .insert({ atleta_user_id: userId, target_type: targetType, target_id: targetId });
  if (error) throw new Error('Errore aggiunta preferito: ' + error.message);
  return true;
}

// =====================================================
// HYDRATION — dettagli (titolo/copertina/link) per la lista Seguiti
// =====================================================

export interface FollowedItemCard {
  followId: string;
  targetType: FollowTargetType;
  targetId: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  href: string;
  createdAt: string;
}

async function hydrateEvents(ids: string[]): Promise<Map<string, { title: string; subtitle: string | null }>> {
  const map = new Map<string, { title: string; subtitle: string | null }>();
  if (!ids.length) return map;
  const { data } = await db()
    .from('calendar_events')
    .select('id, title, start_datetime, location')
    .in('id', ids);
  for (const row of data || []) {
    const date = row.start_datetime
      ? new Date(row.start_datetime).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
      : null;
    map.set(row.id, {
      title: row.title,
      subtitle: [date, row.location].filter(Boolean).join(' · ') || null,
    });
  }
  return map;
}

async function hydrateCourses(
  ids: string[],
): Promise<Map<string, { title: string; subtitle: string | null; cover: string | null }>> {
  const map = new Map<string, { title: string; subtitle: string | null; cover: string | null }>();
  if (!ids.length) return map;
  const { data } = await db()
    .from('pt_courses')
    .select('id, title, category, cover_image_url')
    .in('id', ids);
  for (const row of data || []) {
    map.set(row.id, {
      title: row.title,
      subtitle: row.category || null,
      cover: row.cover_image_url || null,
    });
  }
  return map;
}

async function hydrateGroups(
  ids: string[],
): Promise<Map<string, { title: string; subtitle: string | null; cover: string | null }>> {
  const map = new Map<string, { title: string; subtitle: string | null; cover: string | null }>();
  if (!ids.length) return map;
  const { data } = await db().from('groups').select('id, name, location_name, image_url').in('id', ids);
  for (const row of data || []) {
    map.set(row.id, {
      title: row.name,
      subtitle: row.location_name || null,
      cover: row.image_url || null,
    });
  }
  return map;
}

async function hydratePts(
  ids: string[],
): Promise<Map<string, { title: string; subtitle: string | null; cover: string | null }>> {
  const map = new Map<string, { title: string; subtitle: string | null; cover: string | null }>();
  if (!ids.length) return map;
  const [{ data: pts }, { data: profiles }] = await Promise.all([
    db().from('pt_profiles').select('user_id, specializations').in('user_id', ids),
    db().from('profiles').select('user_id, first_name, last_name, avatar_url').in('user_id', ids),
  ]);
  const profileByUser = new Map<string, { first_name: string | null; last_name: string | null; avatar_url: string | null }>(
    (profiles || []).map((p: { user_id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }) => [
      p.user_id,
      p,
    ]),
  );
  for (const pt of pts || []) {
    const profile = profileByUser.get(pt.user_id);
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    map.set(pt.user_id, {
      title: name || 'Personal Trainer',
      subtitle: (pt.specializations || []).slice(0, 2).join(', ') || null,
      cover: profile?.avatar_url || null,
    });
  }
  return map;
}

async function hydrateProfessionals(
  ids: string[],
): Promise<Map<string, { title: string; subtitle: string | null; cover: string | null }>> {
  const map = new Map<string, { title: string; subtitle: string | null; cover: string | null }>();
  if (!ids.length) return map;
  const { data } = await db()
    .from('professional_profiles')
    .select('id, first_name, last_name, avatar_url, profession_type')
    .in('id', ids);
  for (const row of data || []) {
    map.set(row.id, {
      title: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Professionista',
      subtitle: row.profession_type === 'nutrizionista' ? 'Nutrizionista' : 'Fisioterapista',
      cover: row.avatar_url || null,
    });
  }
  return map;
}

function hrefFor(targetType: FollowTargetType, targetId: string): string {
  switch (targetType) {
    case 'event':
      return `/app/events/${targetId}`;
    case 'course':
      return `/app/courses/${targetId}`;
    case 'group':
      return `/app/groups/${targetId}`;
    case 'pt':
      return `/app/pt/${targetId}`;
    case 'professional':
      return `/app/professional/${targetId}`;
    default:
      return '/app';
  }
}

/** Arricchisce le righe atleta_follows con titolo/copertina/link per la UI. Righe orfane (target eliminato) vengono scartate. */
export async function hydrateFollowedItems(follows: AtletaFollowRow[]): Promise<FollowedItemCard[]> {
  const idsByType: Record<FollowTargetType, string[]> = {
    event: [],
    course: [],
    group: [],
    pt: [],
    professional: [],
  };
  for (const f of follows) {
    idsByType[f.target_type]?.push(f.target_id);
  }

  const [events, courses, groups, pts, professionals] = await Promise.all([
    hydrateEvents(idsByType.event),
    hydrateCourses(idsByType.course),
    hydrateGroups(idsByType.group),
    hydratePts(idsByType.pt),
    hydrateProfessionals(idsByType.professional),
  ]);

  const cards: FollowedItemCard[] = [];
  for (const f of follows) {
    let details: { title: string; subtitle: string | null; cover?: string | null } | undefined;
    if (f.target_type === 'event') details = events.get(f.target_id);
    else if (f.target_type === 'course') details = courses.get(f.target_id);
    else if (f.target_type === 'group') details = groups.get(f.target_id);
    else if (f.target_type === 'pt') details = pts.get(f.target_id);
    else if (f.target_type === 'professional') details = professionals.get(f.target_id);

    if (!details) continue; // target eliminato/non più visibile

    cards.push({
      followId: f.id,
      targetType: f.target_type,
      targetId: f.target_id,
      title: details.title,
      subtitle: details.subtitle ?? null,
      coverUrl: details.cover ?? null,
      href: hrefFor(f.target_type, f.target_id),
      createdAt: f.created_at,
    });
  }

  return cards;
}
