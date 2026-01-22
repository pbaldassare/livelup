-- =====================================================
-- BLOCCO 2: DATABASE, STATI, RELAZIONI E LOGICHE
-- Struttura dati completa per piattaforma fitness
-- =====================================================

-- =====================================================
-- NUOVI ENUM PER STATI E TIPI
-- =====================================================

-- Livelli PT
CREATE TYPE public.pt_level AS ENUM ('junior', 'senior', 'elite');

-- Livello fitness atleta
CREATE TYPE public.fitness_level AS ENUM ('principiante', 'intermedio', 'avanzato', 'agonista');

-- Stato relazione PT-Atleta
CREATE TYPE public.relation_status AS ENUM ('richiesta', 'attivo', 'rifiutato', 'terminato');

-- Origine relazione
CREATE TYPE public.relation_origin AS ENUM ('ricerca', 'invito', 'referral', 'qr');

-- Stato workout
CREATE TYPE public.workout_status AS ENUM ('attivo', 'completato', 'scaduto');

-- Tipo evento calendario
CREATE TYPE public.event_type AS ENUM ('allenamento', 'evento', 'gara', 'raduno', 'altro');

-- Stato subscription
CREATE TYPE public.subscription_status AS ENUM ('attivo', 'scaduto', 'bloccato', 'trial');

-- Tipo subscription
CREATE TYPE public.subscription_type AS ENUM ('atleta_free', 'atleta_premium', 'pt_base', 'pt_premium');

-- Stato pagamento
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Metodo pagamento
CREATE TYPE public.payment_method AS ENUM ('stripe', 'paypal', 'bank_transfer', 'cash');

-- =====================================================
-- TABELLA: PT AVAILABILITY (Disponibilità PT)
-- =====================================================

CREATE TABLE public.pt_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Dom, 6=Sab
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id, day_of_week, start_time)
);

-- =====================================================
-- TABELLA: PT REVIEWS (Recensioni PT)
-- =====================================================

CREATE TABLE public.pt_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id, atleta_user_id) -- Un atleta può recensire un PT una sola volta
);

-- =====================================================
-- TABELLA: EXERCISES (Esercizi)
-- =====================================================

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'forza', 'cardio', 'flessibilità', 'funzionale'
  muscle_groups TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  instructions TEXT,
  video_url TEXT,
  image_url TEXT,
  difficulty_level fitness_level NOT NULL DEFAULT 'intermedio',
  equipment TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = esercizio di sistema
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: WORKOUT TEMPLATES (Schede modello)
-- =====================================================

CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'forza', 'ipertrofia', 'dimagrimento', 'funzionale'
  difficulty_level fitness_level NOT NULL DEFAULT 'intermedio',
  estimated_duration INTEGER, -- minuti
  is_public BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: TEMPLATE EXERCISES (Esercizi nel template)
-- =====================================================

CREATE TABLE public.template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER NOT NULL DEFAULT 3,
  reps_min INTEGER,
  reps_max INTEGER,
  rest_seconds INTEGER DEFAULT 60,
  tempo TEXT, -- es. "3-1-2-0"
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: WORKOUTS (Allenamenti assegnati)
-- =====================================================

CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  due_date DATE,
  status workout_status NOT NULL DEFAULT 'attivo',
  completed_at TIMESTAMPTZ,
  notes_pt TEXT, -- Note del PT
  notes_atleta TEXT, -- Feedback atleta
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Valutazione atleta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: WORKOUT EXERCISES (Esercizi nel workout)
-- =====================================================

CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  prescribed_sets INTEGER NOT NULL DEFAULT 3,
  prescribed_reps_min INTEGER,
  prescribed_reps_max INTEGER,
  prescribed_weight DECIMAL(6,2), -- kg
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: WORKOUT LOGS (Log esecuzione esercizi)
-- =====================================================

CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps_completed INTEGER,
  weight_used DECIMAL(6,2), -- kg
  duration_seconds INTEGER, -- per esercizi a tempo
  is_completed BOOLEAN NOT NULL DEFAULT false,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: PROGRESS TRACKING (Tracciamento progressi)
-- =====================================================

CREATE TABLE public.progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracked_date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,1),
  -- Misure corpo
  chest_cm DECIMAL(5,1),
  waist_cm DECIMAL(5,1),
  hips_cm DECIMAL(5,1),
  bicep_left_cm DECIMAL(5,1),
  bicep_right_cm DECIMAL(5,1),
  thigh_left_cm DECIMAL(5,1),
  thigh_right_cm DECIMAL(5,1),
  -- Stato mentale
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  mood_level INTEGER CHECK (mood_level >= 1 AND mood_level <= 10),
  sleep_hours DECIMAL(3,1),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  -- Note
  notes TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (atleta_user_id, tracked_date)
);

-- =====================================================
-- TABELLA: CHATS (Conversazioni)
-- =====================================================

CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id, atleta_user_id)
);

-- =====================================================
-- TABELLA: MESSAGES (Messaggi)
-- =====================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT, -- 'image', 'video', 'document'
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: CALENDAR EVENTS (Eventi calendario)
-- =====================================================

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL DEFAULT 'allenamento',
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  is_public BOOLEAN NOT NULL DEFAULT false,
  -- Se evento legato a relazione PT-Atleta
  pt_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  atleta_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Reminder
  reminder_minutes INTEGER, -- minuti prima dell'evento
  -- Ricorrenza
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT, -- RRULE format
  -- Status
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: SUBSCRIPTIONS (Abbonamenti)
-- =====================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type subscription_type NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trial',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  -- Stripe info
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  -- Pricing
  price_monthly DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- Trial
  trial_ends_at TIMESTAMPTZ,
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: PAYMENTS (Pagamenti)
-- =====================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  -- Provider info
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  -- Timestamps
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  -- Details
  description TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: BADGES (Badge gamification)
-- =====================================================

CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT,
  category TEXT NOT NULL, -- 'workout', 'progress', 'social', 'achievement'
  criteria JSONB NOT NULL, -- Regole per ottenere il badge
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELLA: ATLETA BADGES (Badge ottenuti)
-- =====================================================

CREATE TABLE public.atleta_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (atleta_user_id, badge_id)
);

-- =====================================================
-- TABELLA: NOTIFICATIONS (Notifiche)
-- =====================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'message', 'workout', 'connection', 'payment', 'badge', 'system'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB, -- Dati aggiuntivi
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT, -- URL da aprire al click
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- AGGIORNAMENTO TABELLA pt_profiles (aggiungi colonne mancanti)
-- =====================================================

ALTER TABLE public.pt_profiles 
ADD COLUMN IF NOT EXISTS level pt_level DEFAULT 'junior',
ADD COLUMN IF NOT EXISTS method_description TEXT,
ADD COLUMN IF NOT EXISTS online_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS price_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- =====================================================
-- AGGIORNAMENTO TABELLA atleta_profiles (aggiungi colonne mancanti)
-- =====================================================

ALTER TABLE public.atleta_profiles 
ADD COLUMN IF NOT EXISTS level fitness_level DEFAULT 'intermedio',
ADD COLUMN IF NOT EXISTS health_notes TEXT;

-- =====================================================
-- TRIGGERS PER UPDATED_AT
-- =====================================================

CREATE TRIGGER update_pt_availability_updated_at
  BEFORE UPDATE ON public.pt_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pt_reviews_updated_at
  BEFORE UPDATE ON public.pt_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_templates_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progress_tracking_updated_at
  BEFORE UPDATE ON public.progress_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INDICI PER PERFORMANCE
-- =====================================================

CREATE INDEX idx_pt_availability_pt ON public.pt_availability(pt_user_id);
CREATE INDEX idx_pt_reviews_pt ON public.pt_reviews(pt_user_id);
CREATE INDEX idx_pt_reviews_atleta ON public.pt_reviews(atleta_user_id);
CREATE INDEX idx_exercises_category ON public.exercises(category);
CREATE INDEX idx_exercises_public ON public.exercises(is_public) WHERE is_public = true;
CREATE INDEX idx_workout_templates_pt ON public.workout_templates(pt_user_id);
CREATE INDEX idx_workout_templates_public ON public.workout_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_template_exercises_template ON public.template_exercises(template_id);
CREATE INDEX idx_workouts_atleta ON public.workouts(atleta_user_id);
CREATE INDEX idx_workouts_pt ON public.workouts(pt_user_id);
CREATE INDEX idx_workouts_status ON public.workouts(status);
CREATE INDEX idx_workouts_scheduled ON public.workouts(scheduled_date);
CREATE INDEX idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX idx_workout_logs_exercise ON public.workout_logs(workout_exercise_id);
CREATE INDEX idx_progress_tracking_atleta ON public.progress_tracking(atleta_user_id);
CREATE INDEX idx_progress_tracking_date ON public.progress_tracking(tracked_date);
CREATE INDEX idx_chats_pt ON public.chats(pt_user_id);
CREATE INDEX idx_chats_atleta ON public.chats(atleta_user_id);
CREATE INDEX idx_messages_chat ON public.messages(chat_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_calendar_events_creator ON public.calendar_events(creator_user_id);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_datetime);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_atleta_badges_atleta ON public.atleta_badges(atleta_user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;