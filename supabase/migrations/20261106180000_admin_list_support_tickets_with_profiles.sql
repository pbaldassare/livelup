-- Admin: elenco ticket supporto con profilo mittente in una sola chiamata (bypass RLS aggregata)
-- Usato dalla dashboard admin su hosting statico; evita seconda query su profiles soggetta a policy restrittive.

CREATE OR REPLACE FUNCTION public.admin_list_support_tickets_with_profiles()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', st.id,
          'user_id', st.user_id,
          'subject', st.subject,
          'description', st.description,
          'category', st.category,
          'status', st.status,
          'priority', st.priority,
          'needs_admin_reply', st.needs_admin_reply,
          'created_at', st.created_at,
          'profiles', json_build_object(
            'first_name', p.first_name,
            'last_name', p.last_name,
            'email', p.email
          )
        )
        ORDER BY st.created_at DESC
      )
      FROM public.support_tickets st
      LEFT JOIN public.profiles p ON p.user_id = st.user_id
    ),
    '[]'::json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_support_tickets_with_profiles() TO authenticated;
