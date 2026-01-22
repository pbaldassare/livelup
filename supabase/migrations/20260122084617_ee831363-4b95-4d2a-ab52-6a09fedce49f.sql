-- =====================================================
-- BLOCCO 3: TABELLE AGGIUNTIVE BACK OFFICE
-- Coupon, Ticket Support, Piani Abbonamento, Content Library
-- =====================================================

-- =====================================================
-- ENUM AGGIUNTIVI
-- =====================================================

CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.coupon_type AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE public.content_type AS ENUM ('pdf', 'video', 'image', 'document', 'other');

-- =====================================================
-- TABELLA: SUBSCRIPTION PLANS (Piani abbonamento)
-- =====================================================

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_role app_role NOT NULL, -- 'pt' o 'atleta'
  plan_type subscription_type NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- Features
  features JSONB NOT NULL DEFAULT '[]',
  max_athletes INTEGER, -- Per PT
  includes_chat BOOLEAN DEFAULT true,
  includes_video_calls BOOLEAN DEFAULT false,
  includes_analytics BOOLEAN DEFAULT false,
  storage_gb INTEGER DEFAULT 1,
  -- Validity
  trial_days INTEGER DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  -- Metadata
  stripe_price_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: COUPONS (Codici sconto)
-- =====================================================

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  coupon_type coupon_type NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL, -- % o importo fisso
  -- Validità
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  -- Limiti
  max_uses INTEGER, -- NULL = illimitato
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  -- Restrizioni
  min_purchase_amount DECIMAL(10,2),
  applicable_plans UUID[] DEFAULT '{}', -- UUID dei piani applicabili
  applicable_roles app_role[] DEFAULT '{}', -- Ruoli applicabili
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: COUPON USES (Utilizzo coupon)
-- =====================================================

CREATE TABLE public.coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id, payment_id)
);

-- =====================================================
-- TABELLA: SUPPORT TICKETS
-- =====================================================

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- 'billing', 'technical', 'account', 'other'
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  -- Metadata
  attachments TEXT[] DEFAULT '{}',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: TICKET MESSAGES (Risposte ticket)
-- =====================================================

CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Note interne staff
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: PT CONTENT LIBRARY (Libreria contenuti PT)
-- =====================================================

CREATE TABLE public.pt_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type content_type NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  thumbnail_url TEXT,
  -- Organization
  folder TEXT, -- Cartella organizzativa
  tags TEXT[] DEFAULT '{}',
  -- Sharing
  is_public BOOLEAN NOT NULL DEFAULT false,
  shared_with_athletes UUID[] DEFAULT '{}', -- Lista atleti con accesso
  -- Metadata
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: FLAGGED CONTENT (Contenuti segnalati)
-- =====================================================

CREATE TABLE public.flagged_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'message', 'review', 'profile', 'content'
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, actioned, dismissed
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_content ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- subscription_plans: Tutti possono vedere piani attivi
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (public.is_admin(auth.uid()));

-- coupons: Solo admin
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin(auth.uid()));

-- coupon_uses: Utenti vedono i propri
CREATE POLICY "Users can view own coupon uses"
  ON public.coupon_uses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert coupon uses"
  ON public.coupon_uses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all coupon uses"
  ON public.coupon_uses FOR SELECT
  USING (public.is_admin(auth.uid()));

-- support_tickets: Utenti vedono i propri, admin tutti
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own open tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('open', 'in_progress'));

CREATE POLICY "Admins can manage all tickets"
  ON public.support_tickets FOR ALL
  USING (public.is_admin(auth.uid()));

-- ticket_messages
CREATE POLICY "Ticket participants can view messages"
  ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND (user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
    AND (NOT is_internal OR public.is_admin(auth.uid()))
  );

CREATE POLICY "Users can add messages to own tickets"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
    AND is_internal = false
  );

CREATE POLICY "Admins can add messages"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- pt_content_library
CREATE POLICY "PT can manage own content"
  ON public.pt_content_library FOR ALL
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Atleti can view shared content"
  ON public.pt_content_library FOR SELECT
  USING (
    public.is_atleta(auth.uid()) 
    AND (is_public = true OR auth.uid() = ANY(shared_with_athletes))
  );

CREATE POLICY "Admins can view all content"
  ON public.pt_content_library FOR SELECT
  USING (public.is_admin(auth.uid()));

-- flagged_content
CREATE POLICY "Users can report content"
  ON public.flagged_content FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view own reports"
  ON public.flagged_content FOR SELECT
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can manage flagged content"
  ON public.flagged_content FOR ALL
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pt_content_library_updated_at
  BEFORE UPDATE ON public.pt_content_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flagged_content_updated_at
  BEFORE UPDATE ON public.flagged_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_subscription_plans_active ON public.subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX idx_subscription_plans_role ON public.subscription_plans(target_role);
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX idx_coupon_uses_coupon ON public.coupon_uses(coupon_id);
CREATE INDEX idx_coupon_uses_user ON public.coupon_uses(user_id);
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX idx_pt_content_library_pt ON public.pt_content_library(pt_user_id);
CREATE INDEX idx_flagged_content_status ON public.flagged_content(status);

-- =====================================================
-- FUNZIONI HELPER AGGIUNTIVE
-- =====================================================

-- Conteggio statistiche admin
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  total_pts INTEGER,
  active_pts INTEGER,
  pending_pts INTEGER,
  suspended_pts INTEGER,
  total_athletes INTEGER,
  connected_athletes INTEGER,
  premium_athletes INTEGER,
  active_subscriptions INTEGER,
  open_tickets INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::INTEGER FROM user_roles WHERE role = 'pt'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'attivo'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'in_attesa_approvazione'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'sospeso'),
    (SELECT COUNT(*)::INTEGER FROM user_roles WHERE role = 'atleta'),
    (SELECT COUNT(*)::INTEGER FROM atleta_profiles WHERE status = 'collegato'),
    (SELECT COUNT(*)::INTEGER FROM atleta_profiles WHERE status = 'premium'),
    (SELECT COUNT(*)::INTEGER FROM subscriptions WHERE status = 'attivo'),
    (SELECT COUNT(*)::INTEGER FROM support_tickets WHERE status IN ('open', 'in_progress'))
$$;

-- Conteggio statistiche PT
CREATE OR REPLACE FUNCTION public.get_pt_stats(_pt_user_id UUID)
RETURNS TABLE (
  active_athletes INTEGER,
  pending_requests INTEGER,
  total_workouts INTEGER,
  completed_workouts INTEGER,
  unread_messages INTEGER,
  upcoming_events INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::INTEGER FROM pt_atleta_connections WHERE pt_user_id = _pt_user_id AND status = 'active'),
    (SELECT COUNT(*)::INTEGER FROM pt_atleta_connections WHERE pt_user_id = _pt_user_id AND status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM workouts WHERE pt_user_id = _pt_user_id),
    (SELECT COUNT(*)::INTEGER FROM workouts WHERE pt_user_id = _pt_user_id AND status = 'completato'),
    (SELECT public.count_unread_messages(_pt_user_id)),
    (SELECT COUNT(*)::INTEGER FROM calendar_events WHERE creator_user_id = _pt_user_id AND start_datetime > now() AND NOT is_cancelled)
$$;