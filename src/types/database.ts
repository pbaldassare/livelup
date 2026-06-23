// =====================================================
// TIPI DATABASE - Generati da schema BLOCCO 2
// =====================================================

import type { Database, Json } from '@/integrations/supabase/types';
import type { ProtocolParams } from '@/lib/protocols/registry';

// =====================================================
// TIPI ENUM
// =====================================================

export type AppRole = 'admin' | 'pt' | 'atleta';
export type PTStatus = 'registrato' | 'in_attesa_approvazione' | 'attivo' | 'sospeso' | 'premium';
export type AtletaStatus = 'non_collegato' | 'collegato' | 'premium';
export type PTLevel = 'junior' | 'senior' | 'elite';
export type FitnessLevel = 'nessuno' | 'principiante' | 'intermedio' | 'avanzato' | 'agonista';
export type RelationStatus = 'richiesta' | 'attivo' | 'rifiutato' | 'terminato';
export type RelationOrigin = 'ricerca' | 'invito' | 'referral' | 'qr';
export type WorkoutStatus = 'attivo' | 'completato' | 'scaduto';
export type EventType = 'allenamento' | 'evento' | 'gara' | 'raduno' | 'altro';
export type SubscriptionStatus = 'attivo' | 'scaduto' | 'bloccato' | 'trial';
export type SubscriptionType = 'atleta_free' | 'atleta_premium' | 'pt_base' | 'pt_premium';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'stripe' | 'paypal' | 'bank_transfer' | 'cash';

// =====================================================
// TIPI TABELLE - Aliases
// =====================================================

// Core tables
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type UserRole = Database['public']['Tables']['user_roles']['Row'];

// PT tables
export type PTProfile = Database['public']['Tables']['pt_profiles']['Row'];
export type PTProfileInsert = Database['public']['Tables']['pt_profiles']['Insert'];
export type PTProfileUpdate = Database['public']['Tables']['pt_profiles']['Update'];

// Atleta tables
export type AtletaProfile = Database['public']['Tables']['atleta_profiles']['Row'];
export type AtletaProfileInsert = Database['public']['Tables']['atleta_profiles']['Insert'];
export type AtletaProfileUpdate = Database['public']['Tables']['atleta_profiles']['Update'];

// Connection
export type PTAtletaConnection = Database['public']['Tables']['pt_atleta_connections']['Row'];

// =====================================================
// WORKOUT JSON COLUMNS & LOG TYPES
// =====================================================

/** Protocol configuration stored in `protocol_params` JSON columns. */
export type ProtocolConfig = ProtocolParams;

/** Per-set prescription stored in `sets_data` JSON columns. */
export interface SetData {
  reps: number | null;
  weight: number | null;
  rest_seconds: number | null;
}

export type WorkoutLogInsert = Database['public']['Tables']['workout_logs']['Insert'];
export type TemplateExerciseInsert = Database['public']['Tables']['template_exercises']['Insert'];
export type TemplateExerciseUpdate = Database['public']['Tables']['template_exercises']['Update'];
export type WorkoutRowUpdate = Database['public']['Tables']['workouts']['Update'];

/** Cast structured app types to Supabase `Json` columns without `as any`. */
export function toJson<T>(value: T): Json {
  return value as Json;
}

// =====================================================
// TIPI CUSTOM (non ancora in types.ts)
// =====================================================

export interface PTAvailability {
  id: string;
  pt_user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface PTReview {
  id: string;
  pt_user_id: string;
  atleta_user_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  description: string | null;
  instructions: string | null;
  video_url: string | null;
  image_url: string | null;
  difficulty_level: FitnessLevel;
  equipment: string[];
  created_by: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutTemplate {
  id: string;
  pt_user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty_level: FitnessLevel;
  estimated_duration: number | null;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number;
  tempo: string | null;
  notes: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  atleta_user_id: string;
  pt_user_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  due_date: string | null;
  status: WorkoutStatus;
  completed_at: string | null;
  notes_pt: string | null;
  notes_atleta: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps_min: number | null;
  prescribed_reps_max: number | null;
  prescribed_weight: number | null;
  rest_seconds: number;
  notes: string | null;
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps_completed: number | null;
  weight_used: number | null;
  duration_seconds: number | null;
  is_completed: boolean;
  rpe: number | null;
  notes: string | null;
  logged_at: string;
}

export interface ProgressTracking {
  id: string;
  atleta_user_id: string;
  tracked_date: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  bicep_left_cm: number | null;
  bicep_right_cm: number | null;
  thigh_left_cm: number | null;
  thigh_right_cm: number | null;
  energy_level: number | null;
  mood_level: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  notes: string | null;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  pt_user_id: string;
  atleta_user_id: string;
  is_active: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  creator_user_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_datetime: string;
  end_datetime: string | null;
  is_all_day: boolean;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_public: boolean;
  pt_user_id: string | null;
  atleta_user_id: string | null;
  reminder_minutes: number | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  is_cancelled: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  subscription_type: SubscriptionType;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  next_billing_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  price_monthly: number | null;
  currency: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  paid_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
  description: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: string;
  criteria: Record<string, unknown>;
  points: number;
  is_active: boolean;
  created_at: string;
}

export interface AtletaBadge {
  id: string;
  atleta_user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

// =====================================================
// TIPI COMPOSITI (per query con join)
// =====================================================

export interface PTProfileWithUser extends PTProfile {
  profiles?: Profile;
}

export interface AtletaProfileWithUser extends AtletaProfile {
  profiles?: Profile;
}

export interface WorkoutWithExercises extends Workout {
  workout_exercises?: (WorkoutExercise & { exercises?: Exercise })[];
}

export interface ChatWithMessages extends Chat {
  messages?: Message[];
  pt_profile?: Profile;
  atleta_profile?: Profile;
}

export interface PTConnectionWithProfile extends PTAtletaConnection {
  pt_profiles?: PTProfile;
  atleta_profiles?: AtletaProfile;
  pt_user?: Profile;
  atleta_user?: Profile;
}
