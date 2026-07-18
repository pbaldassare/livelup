-- Fix: tab "Membri" del gruppo vuoto per tutti (PT e atleta).
-- Copia su Lovable Cloud SQL editor se la migration
-- 20260718170000_group_members_profiles_visibility.sql non è ancora applicata.
--
-- Root cause: group_members.user_id e profiles.user_id referenziano solo
-- auth.users(id) (nessun FK diretto tra le due tabelle), quindi l'embed
-- PostgREST `profiles:user_id(...)` usato dal frontend falliva sempre con
-- "Could not find a relationship between 'group_members' and 'profiles'",
-- e l'errore veniva ignorato silenziosamente mostrando la lista vuota.
-- Il frontend è stato corretto per fare due query separate (group_members
-- poi profiles by user_id, come nel resto della app), ma serve anche una
-- policy RLS su profiles che permetta ai membri di leggere i profili degli
-- altri membri dello stesso gruppo.

-- 1) Membri attivi di un gruppo possono leggere i profili degli altri
--    membri attivi con cui condividono almeno un gruppo (PT e atleta).
DROP POLICY IF EXISTS "Group members can view fellow group members profiles" ON public.profiles;
CREATE POLICY "Group members can view fellow group members profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_members gm_self
      JOIN public.group_members gm_target
        ON gm_target.group_id = gm_self.group_id
      WHERE gm_self.user_id = auth.uid()
        AND gm_self.status = 'active'
        AND gm_target.user_id = profiles.user_id
        AND gm_target.status = 'active'
    )
  );

-- 2) Visitatori autenticati (non membri) possono leggere i profili dei
--    membri di gruppi pubblici attivi, coerente con la policy
--    "group_members_select" che già mostra la lista membri ai visitatori.
DROP POLICY IF EXISTS "Anyone can view profiles of public group members" ON public.profiles;
CREATE POLICY "Anyone can view profiles of public group members"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.user_id = profiles.user_id
        AND gm.status = 'active'
        AND g.status = 'active'
        AND g.visibility = 'public'
    )
  );

-- 3) Ri-applica in modo idempotente group_members_select (nel caso la
--    migration 20260718140000 non fosse ancora stata eseguita): qualsiasi
--    membro attivo di un gruppo deve poter leggere TUTTE le righe membro di
--    quel gruppo, non solo la propria.
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.status = 'active'
        AND g.visibility = 'public'
    )
  );
