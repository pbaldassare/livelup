export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      atleta_badges: {
        Row: {
          atleta_user_id: string
          badge_id: string
          earned_at: string
          id: string
        }
        Insert: {
          atleta_user_id: string
          badge_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          atleta_user_id?: string
          badge_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atleta_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      atleta_profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          fitness_level: string | null
          goals: string[] | null
          health_notes: string | null
          height_cm: number | null
          id: string
          injuries: string[] | null
          level: Database["public"]["Enums"]["fitness_level"] | null
          status: Database["public"]["Enums"]["atleta_status"]
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          fitness_level?: string | null
          goals?: string[] | null
          health_notes?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string[] | null
          level?: Database["public"]["Enums"]["fitness_level"] | null
          status?: Database["public"]["Enums"]["atleta_status"]
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          fitness_level?: string | null
          goals?: string[] | null
          health_notes?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string[] | null
          level?: Database["public"]["Enums"]["fitness_level"] | null
          status?: Database["public"]["Enums"]["atleta_status"]
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          resource_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          created_at: string
          criteria: Json
          description: string
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          points: number
        }
        Insert: {
          category: string
          created_at?: string
          criteria: Json
          description: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          points?: number
        }
        Update: {
          category?: string
          created_at?: string
          criteria?: Json
          description?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points?: number
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          atleta_user_id: string | null
          cancelled_at: string | null
          created_at: string
          creator_user_id: string
          description: string | null
          end_datetime: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_all_day: boolean
          is_cancelled: boolean
          is_public: boolean
          is_recurring: boolean
          location: string | null
          location_lat: number | null
          location_lng: number | null
          pt_user_id: string | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          start_datetime: string
          title: string
          updated_at: string
        }
        Insert: {
          atleta_user_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          creator_user_id: string
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_all_day?: boolean
          is_cancelled?: boolean
          is_public?: boolean
          is_recurring?: boolean
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          pt_user_id?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_datetime: string
          title: string
          updated_at?: string
        }
        Update: {
          atleta_user_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          creator_user_id?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_all_day?: boolean
          is_cancelled?: boolean
          is_public?: boolean
          is_recurring?: boolean
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          pt_user_id?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_datetime?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          atleta_user_id: string
          created_at: string
          id: string
          is_active: boolean
          last_message_at: string | null
          pt_user_id: string
          updated_at: string
        }
        Insert: {
          atleta_user_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          pt_user_id: string
          updated_at?: string
        }
        Update: {
          atleta_user_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          pt_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: Database["public"]["Enums"]["fitness_level"]
          equipment: string[] | null
          id: string
          image_url: string | null
          instructions: string | null
          is_public: boolean
          muscle_groups: string[]
          name: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["fitness_level"]
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_public?: boolean
          muscle_groups?: string[]
          name: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["fitness_level"]
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_public?: boolean
          muscle_groups?: string[]
          name?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          chat_id: string
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          sender_user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          chat_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          sender_user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          chat_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          invoice_url: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_url: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_url?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_url?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_tracking: {
        Row: {
          atleta_user_id: string
          bicep_left_cm: number | null
          bicep_right_cm: number | null
          body_fat_percentage: number | null
          chest_cm: number | null
          created_at: string
          energy_level: number | null
          hips_cm: number | null
          id: string
          mood_level: number | null
          notes: string | null
          photo_urls: string[] | null
          sleep_hours: number | null
          sleep_quality: number | null
          stress_level: number | null
          thigh_left_cm: number | null
          thigh_right_cm: number | null
          tracked_date: string
          updated_at: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          atleta_user_id: string
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          body_fat_percentage?: number | null
          chest_cm?: number | null
          created_at?: string
          energy_level?: number | null
          hips_cm?: number | null
          id?: string
          mood_level?: number | null
          notes?: string | null
          photo_urls?: string[] | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          tracked_date: string
          updated_at?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          atleta_user_id?: string
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          body_fat_percentage?: number | null
          chest_cm?: number | null
          created_at?: string
          energy_level?: number | null
          hips_cm?: number | null
          id?: string
          mood_level?: number | null
          notes?: string | null
          photo_urls?: string[] | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          tracked_date?: string
          updated_at?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      pt_atleta_connections: {
        Row: {
          accepted_at: string | null
          atleta_user_id: string
          created_at: string
          id: string
          pt_user_id: string
          requested_at: string
          requested_by: string | null
          status: string
          terminated_at: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          atleta_user_id: string
          created_at?: string
          id?: string
          pt_user_id: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          terminated_at?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          atleta_user_id?: string
          created_at?: string
          id?: string
          pt_user_id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          terminated_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pt_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          pt_user_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          pt_user_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          pt_user_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      pt_profiles: {
        Row: {
          bio: string | null
          certifications: string[] | null
          created_at: string
          currency: string | null
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_discoverable: boolean | null
          level: Database["public"]["Enums"]["pt_level"] | null
          location_city: string | null
          location_country: string | null
          location_lat: number | null
          location_lng: number | null
          max_athletes: number | null
          method_description: string | null
          offers_in_person: boolean | null
          offers_online: boolean | null
          online_only: boolean | null
          price_max: number | null
          price_min: number | null
          rating_avg: number | null
          review_count: number | null
          specializations: string[] | null
          status: Database["public"]["Enums"]["pt_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          currency?: string | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_discoverable?: boolean | null
          level?: Database["public"]["Enums"]["pt_level"] | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_athletes?: number | null
          method_description?: string | null
          offers_in_person?: boolean | null
          offers_online?: boolean | null
          online_only?: boolean | null
          price_max?: number | null
          price_min?: number | null
          rating_avg?: number | null
          review_count?: number | null
          specializations?: string[] | null
          status?: Database["public"]["Enums"]["pt_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          currency?: string | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_discoverable?: boolean | null
          level?: Database["public"]["Enums"]["pt_level"] | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_athletes?: number | null
          method_description?: string | null
          offers_in_person?: boolean | null
          offers_online?: boolean | null
          online_only?: boolean | null
          price_max?: number | null
          price_min?: number | null
          rating_avg?: number | null
          review_count?: number | null
          specializations?: string[] | null
          status?: Database["public"]["Enums"]["pt_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pt_reviews: {
        Row: {
          atleta_user_id: string
          comment: string | null
          created_at: string
          id: string
          is_verified: boolean
          is_visible: boolean
          pt_user_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          atleta_user_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          is_visible?: boolean
          pt_user_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          atleta_user_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          is_visible?: boolean
          pt_user_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          next_billing_at: string | null
          price_monthly: number | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          next_billing_at?: string | null
          price_monthly?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          next_billing_at?: string | null
          price_monthly?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          reps_max: number | null
          reps_min: number | null
          rest_seconds: number | null
          sets: number
          template_id: string
          tempo: string | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
          template_id: string
          tempo?: string | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
          template_id?: string
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          prescribed_reps_max: number | null
          prescribed_reps_min: number | null
          prescribed_sets: number
          prescribed_weight: number | null
          rest_seconds: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          prescribed_reps_max?: number | null
          prescribed_reps_min?: number | null
          prescribed_sets?: number
          prescribed_weight?: number | null
          rest_seconds?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          prescribed_reps_max?: number | null
          prescribed_reps_min?: number | null
          prescribed_sets?: number
          prescribed_weight?: number | null
          rest_seconds?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          duration_seconds: number | null
          id: string
          is_completed: boolean
          logged_at: string
          notes: string | null
          reps_completed: number | null
          rpe: number | null
          set_number: number
          weight_used: number | null
          workout_exercise_id: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          is_completed?: boolean
          logged_at?: string
          notes?: string | null
          reps_completed?: number | null
          rpe?: number | null
          set_number: number
          weight_used?: number | null
          workout_exercise_id: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          is_completed?: boolean
          logged_at?: string
          notes?: string | null
          reps_completed?: number | null
          rpe?: number | null
          set_number?: number
          weight_used?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty_level: Database["public"]["Enums"]["fitness_level"]
          estimated_duration: number | null
          id: string
          is_public: boolean
          pt_user_id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["fitness_level"]
          estimated_duration?: number | null
          id?: string
          is_public?: boolean
          pt_user_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["fitness_level"]
          estimated_duration?: number | null
          id?: string
          is_public?: boolean
          pt_user_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          atleta_user_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notes_atleta: string | null
          notes_pt: string | null
          pt_user_id: string
          rating: number | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["workout_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          atleta_user_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes_atleta?: string | null
          notes_pt?: string | null
          pt_user_id: string
          rating?: number | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["workout_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          atleta_user_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes_atleta?: string | null
          notes_pt?: string | null
          pt_user_id?: string
          rating?: number | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["workout_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_connected: {
        Args: { _atleta_user_id: string; _pt_user_id: string }
        Returns: boolean
      }
      can_atleta_connect_to_pt: {
        Args: { _atleta_user_id: string }
        Returns: boolean
      }
      can_pt_accept_athletes: {
        Args: { _pt_user_id: string }
        Returns: boolean
      }
      check_subscription_block: { Args: { _user_id: string }; Returns: boolean }
      count_completed_workouts: {
        Args: { _atleta_user_id: string }
        Returns: number
      }
      count_pt_active_athletes: {
        Args: { _pt_user_id: string }
        Returns: number
      }
      count_unread_messages: { Args: { _user_id: string }; Returns: number }
      count_unread_notifications: {
        Args: { _user_id: string }
        Returns: number
      }
      get_atleta_current_pt: {
        Args: { _atleta_user_id: string }
        Returns: string
      }
      get_subscription_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workout_access: {
        Args: { _user_id: string; _workout_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_atleta: { Args: { _user_id: string }; Returns: boolean }
      is_chat_participant: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_connected_to_pt: {
        Args: { _atleta_user_id: string; _pt_user_id: string }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      is_pt: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "pt" | "atleta"
      atleta_status: "non_collegato" | "collegato" | "premium"
      event_type: "allenamento" | "evento" | "gara" | "raduno" | "altro"
      fitness_level: "principiante" | "intermedio" | "avanzato" | "agonista"
      payment_method: "stripe" | "paypal" | "bank_transfer" | "cash"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      pt_level: "junior" | "senior" | "elite"
      pt_status:
        | "registrato"
        | "in_attesa_approvazione"
        | "attivo"
        | "sospeso"
        | "premium"
      relation_origin: "ricerca" | "invito" | "referral" | "qr"
      relation_status: "richiesta" | "attivo" | "rifiutato" | "terminato"
      subscription_status: "attivo" | "scaduto" | "bloccato" | "trial"
      subscription_type:
        | "atleta_free"
        | "atleta_premium"
        | "pt_base"
        | "pt_premium"
      workout_status: "attivo" | "completato" | "scaduto"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "pt", "atleta"],
      atleta_status: ["non_collegato", "collegato", "premium"],
      event_type: ["allenamento", "evento", "gara", "raduno", "altro"],
      fitness_level: ["principiante", "intermedio", "avanzato", "agonista"],
      payment_method: ["stripe", "paypal", "bank_transfer", "cash"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      pt_level: ["junior", "senior", "elite"],
      pt_status: [
        "registrato",
        "in_attesa_approvazione",
        "attivo",
        "sospeso",
        "premium",
      ],
      relation_origin: ["ricerca", "invito", "referral", "qr"],
      relation_status: ["richiesta", "attivo", "rifiutato", "terminato"],
      subscription_status: ["attivo", "scaduto", "bloccato", "trial"],
      subscription_type: [
        "atleta_free",
        "atleta_premium",
        "pt_base",
        "pt_premium",
      ],
      workout_status: ["attivo", "completato", "scaduto"],
    },
  },
} as const
