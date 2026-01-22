-- =====================================================
-- BLOCCO 2 PARTE 2: RLS POLICIES COMPLETE
-- Sicurezza per tutte le nuove tabelle
-- =====================================================

-- =====================================================
-- ENABLE RLS SU TUTTE LE NUOVE TABELLE
-- =====================================================

ALTER TABLE public.pt_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atleta_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNZIONI HELPER AGGIUNTIVE
-- =====================================================

-- Verifica se PT è collegato a un atleta (relazione attiva)
CREATE OR REPLACE FUNCTION public.are_connected(_pt_user_id UUID, _atleta_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pt_atleta_connections
    WHERE pt_user_id = _pt_user_id
      AND atleta_user_id = _atleta_user_id
      AND status = 'active'
  )
$$;

-- Verifica se user è parte di una chat
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id UUID, _chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chats
    WHERE id = _chat_id
      AND (pt_user_id = _user_id OR atleta_user_id = _user_id)
  )
$$;

-- Verifica se atleta ha workout da PT
CREATE OR REPLACE FUNCTION public.has_workout_access(_user_id UUID, _workout_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workouts
    WHERE id = _workout_id
      AND (atleta_user_id = _user_id OR pt_user_id = _user_id)
  )
$$;

-- =====================================================
-- POLICIES: pt_availability
-- =====================================================

CREATE POLICY "PT can manage own availability"
  ON public.pt_availability FOR ALL
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Atleta can view connected PT availability"
  ON public.pt_availability FOR SELECT
  USING (
    public.is_atleta(auth.uid()) 
    AND public.are_connected(pt_user_id, auth.uid())
  );

CREATE POLICY "Admins can view all availability"
  ON public.pt_availability FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: pt_reviews
-- =====================================================

CREATE POLICY "Atleta can create review for connected PT"
  ON public.pt_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = atleta_user_id 
    AND public.is_atleta(auth.uid())
    -- Solo se era/è collegato al PT
  );

CREATE POLICY "Users can view visible reviews"
  ON public.pt_reviews FOR SELECT
  USING (is_visible = true OR auth.uid() = atleta_user_id OR auth.uid() = pt_user_id);

CREATE POLICY "Atleta can update own review"
  ON public.pt_reviews FOR UPDATE
  USING (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "Atleta can delete own review"
  ON public.pt_reviews FOR DELETE
  USING (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "Admins can manage all reviews"
  ON public.pt_reviews FOR ALL
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: exercises
-- =====================================================

CREATE POLICY "Anyone can view public exercises"
  ON public.exercises FOR SELECT
  USING (is_public = true OR created_by IS NULL);

CREATE POLICY "PT can view own exercises"
  ON public.exercises FOR SELECT
  USING (auth.uid() = created_by AND public.is_pt(auth.uid()));

CREATE POLICY "PT can create exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (auth.uid() = created_by AND public.is_pt(auth.uid()));

CREATE POLICY "PT can update own exercises"
  ON public.exercises FOR UPDATE
  USING (auth.uid() = created_by AND public.is_pt(auth.uid()));

CREATE POLICY "PT can delete own exercises"
  ON public.exercises FOR DELETE
  USING (auth.uid() = created_by AND public.is_pt(auth.uid()));

CREATE POLICY "Admins can manage all exercises"
  ON public.exercises FOR ALL
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: workout_templates
-- =====================================================

CREATE POLICY "PT can manage own templates"
  ON public.workout_templates FOR ALL
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Anyone can view public templates"
  ON public.workout_templates FOR SELECT
  USING (is_public = true);

CREATE POLICY "Admins can view all templates"
  ON public.workout_templates FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: template_exercises
-- =====================================================

CREATE POLICY "PT can manage exercises in own templates"
  ON public.template_exercises FOR ALL
  USING (
    public.is_pt(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.workout_templates 
      WHERE id = template_id AND pt_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view exercises in public templates"
  ON public.template_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates 
      WHERE id = template_id AND is_public = true
    )
  );

-- =====================================================
-- POLICIES: workouts
-- =====================================================

CREATE POLICY "PT can manage workouts for connected atleti"
  ON public.workouts FOR ALL
  USING (
    auth.uid() = pt_user_id 
    AND public.is_pt(auth.uid())
    AND public.are_connected(auth.uid(), atleta_user_id)
  );

CREATE POLICY "Atleta can view own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "Atleta can update own workout feedback"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "Admins can view all workouts"
  ON public.workouts FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: workout_exercises
-- =====================================================

CREATE POLICY "PT can manage exercises in own workouts"
  ON public.workout_exercises FOR ALL
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE id = workout_id AND pt_user_id = auth.uid()
    )
  );

CREATE POLICY "Atleta can view exercises in own workouts"
  ON public.workout_exercises FOR SELECT
  USING (
    public.is_atleta(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workouts 
      WHERE id = workout_id AND atleta_user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: workout_logs
-- =====================================================

CREATE POLICY "Atleta can manage own workout logs"
  ON public.workout_logs FOR ALL
  USING (
    public.is_atleta(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE we.id = workout_exercise_id AND w.atleta_user_id = auth.uid()
    )
  );

CREATE POLICY "PT can view logs of connected atleti"
  ON public.workout_logs FOR SELECT
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workout_exercises we
      JOIN public.workouts w ON w.id = we.workout_id
      WHERE we.id = workout_exercise_id AND w.pt_user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: progress_tracking
-- =====================================================

CREATE POLICY "Atleta can manage own progress"
  ON public.progress_tracking FOR ALL
  USING (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "PT can view connected atleta progress"
  ON public.progress_tracking FOR SELECT
  USING (
    public.is_pt(auth.uid())
    AND public.are_connected(auth.uid(), atleta_user_id)
  );

CREATE POLICY "Admins can view all progress"
  ON public.progress_tracking FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: chats
-- =====================================================

CREATE POLICY "Participants can view their chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = pt_user_id OR auth.uid() = atleta_user_id);

CREATE POLICY "Connected users can create chat"
  ON public.chats FOR INSERT
  WITH CHECK (
    (auth.uid() = pt_user_id OR auth.uid() = atleta_user_id)
    AND public.are_connected(pt_user_id, atleta_user_id)
  );

CREATE POLICY "Participants can update chat"
  ON public.chats FOR UPDATE
  USING (auth.uid() = pt_user_id OR auth.uid() = atleta_user_id);

CREATE POLICY "Admins can view all chats"
  ON public.chats FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: messages
-- =====================================================

CREATE POLICY "Chat participants can view messages"
  ON public.messages FOR SELECT
  USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "Chat participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_user_id
    AND public.is_chat_participant(auth.uid(), chat_id)
  );

CREATE POLICY "Sender can update own message"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_user_id);

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: calendar_events
-- =====================================================

CREATE POLICY "Users can manage own events"
  ON public.calendar_events FOR ALL
  USING (auth.uid() = creator_user_id);

CREATE POLICY "Anyone can view public events"
  ON public.calendar_events FOR SELECT
  USING (is_public = true);

CREATE POLICY "Involved users can view their events"
  ON public.calendar_events FOR SELECT
  USING (
    auth.uid() = pt_user_id 
    OR auth.uid() = atleta_user_id
  );

CREATE POLICY "Admins can view all events"
  ON public.calendar_events FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: subscriptions
-- =====================================================

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: payments
-- =====================================================

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payments"
  ON public.payments FOR ALL
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: badges
-- =====================================================

CREATE POLICY "Anyone can view active badges"
  ON public.badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage badges"
  ON public.badges FOR ALL
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: atleta_badges
-- =====================================================

CREATE POLICY "Atleta can view own badges"
  ON public.atleta_badges FOR SELECT
  USING (auth.uid() = atleta_user_id);

CREATE POLICY "PT can view connected atleta badges"
  ON public.atleta_badges FOR SELECT
  USING (
    public.is_pt(auth.uid())
    AND public.are_connected(auth.uid(), atleta_user_id)
  );

CREATE POLICY "Admins can manage all atleta badges"
  ON public.atleta_badges FOR ALL
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- POLICIES: notifications
-- =====================================================

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- REALTIME: Enable per chat/messages/notifications
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;