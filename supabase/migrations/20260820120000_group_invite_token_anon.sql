-- Invito gruppi: la landing pubblica /g/:token deve poter leggere
-- i metadati del gruppo anche da ospite (anon). join_group resta solo authenticated.

GRANT EXECUTE ON FUNCTION public.get_group_by_invite_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_by_invite_token(uuid) TO authenticated;
