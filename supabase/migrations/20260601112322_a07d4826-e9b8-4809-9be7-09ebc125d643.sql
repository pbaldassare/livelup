
-- Fix: get_admin_stats — add admin check
CREATE OR REPLACE FUNCTION public.get_admin_stats()
 RETURNS TABLE(total_pts integer, active_pts integer, pending_pts integer, suspended_pts integer, total_athletes integer, connected_athletes integer, premium_athletes integer, active_subscriptions integer, open_tickets integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY SELECT
    (SELECT COUNT(*)::INTEGER FROM user_roles WHERE role = 'pt'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'attivo'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'in_attesa_approvazione'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'sospeso'),
    (SELECT COUNT(*)::INTEGER FROM user_roles WHERE role = 'atleta'),
    (SELECT COUNT(*)::INTEGER FROM atleta_profiles WHERE status = 'collegato'),
    (SELECT COUNT(*)::INTEGER FROM atleta_profiles WHERE status = 'premium'),
    (SELECT COUNT(*)::INTEGER FROM subscriptions WHERE status = 'attivo'),
    (SELECT COUNT(*)::INTEGER FROM support_tickets WHERE status IN ('open', 'in_progress'));
END;
$function$;

-- Fix: get_pt_stats — add ownership/admin check
CREATE OR REPLACE FUNCTION public.get_pt_stats(_pt_user_id uuid)
 RETURNS TABLE(active_athletes integer, pending_requests integer, total_workouts integer, completed_workouts integer, unread_messages integer, upcoming_events integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (auth.uid() = _pt_user_id OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT
    (SELECT COUNT(*)::INTEGER FROM pt_atleta_connections WHERE pt_user_id = _pt_user_id AND status = 'active'),
    (SELECT COUNT(*)::INTEGER FROM pt_atleta_connections WHERE pt_user_id = _pt_user_id AND status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM workouts WHERE pt_user_id = _pt_user_id),
    (SELECT COUNT(*)::INTEGER FROM workouts WHERE pt_user_id = _pt_user_id AND status = 'completato'),
    (SELECT public.count_unread_messages(_pt_user_id)),
    (SELECT COUNT(*)::INTEGER FROM calendar_events WHERE creator_user_id = _pt_user_id AND start_datetime > now() AND NOT is_cancelled);
END;
$function$;

-- Fix: pt_reviews INSERT must require active connection
DROP POLICY IF EXISTS "Atleta can create review for connected PT" ON public.pt_reviews;
CREATE POLICY "Atleta can create review for connected PT"
ON public.pt_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = atleta_user_id
  AND public.is_atleta(auth.uid())
  AND public.are_connected(pt_user_id, auth.uid())
);

-- Fix: audit_logs — clients must not insert; only server-side (SECURITY DEFINER / service_role)
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
