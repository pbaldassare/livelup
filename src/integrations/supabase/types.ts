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
      admin_broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          user_id: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          user_id: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "admin_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_broadcasts: {
        Row: {
          content: string
          created_at: string
          id: string
          recipients_count: number
          sender_user_id: string
          subject: string
          target_type: string
          target_user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          recipients_count?: number
          sender_user_id: string
          subject: string
          target_type?: string
          target_user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          recipients_count?: number
          sender_user_id?: string
          subject?: string
          target_type?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      app_404_logs: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          role: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          role?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          role?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
          referred_by_pt: string | null
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
          referred_by_pt?: string | null
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
          referred_by_pt?: string | null
          status?: Database["public"]["Enums"]["atleta_status"]
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      atleta_pt_subscriptions: {
        Row: {
          atleta_user_id: string
          auto_renew: boolean | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          notes: string | null
          package_id: string | null
          price_paid: number
          pt_user_id: string
          renewal_requested_at: string | null
          renewal_status: string | null
          sessions_total: number | null
          sessions_used: number | null
          started_at: string
          status: Database["public"]["Enums"]["pt_subscription_status"]
          updated_at: string
        }
        Insert: {
          atleta_user_id: string
          auto_renew?: boolean | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          price_paid: number
          pt_user_id: string
          renewal_requested_at?: string | null
          renewal_status?: string | null
          sessions_total?: number | null
          sessions_used?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["pt_subscription_status"]
          updated_at?: string
        }
        Update: {
          atleta_user_id?: string
          auto_renew?: boolean | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          price_paid?: number
          pt_user_id?: string
          renewal_requested_at?: string | null
          renewal_status?: string | null
          sessions_total?: number | null
          sessions_used?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["pt_subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atleta_pt_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "pt_packages"
            referencedColumns: ["id"]
          },
        ]
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
      blog_posts: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          pt_user_id: string
          published_at: string | null
          slug: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          pt_user_id: string
          published_at?: string | null
          slug?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          pt_user_id?: string
          published_at?: string | null
          slug?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          atleta_user_id: string | null
          cancelled_at: string | null
          cover_image_url: string | null
          created_at: string
          creator_user_id: string
          description: string | null
          end_datetime: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          event_type_id: string | null
          id: string
          is_all_day: boolean
          is_cancelled: boolean
          is_closed_number: boolean
          is_public: boolean
          is_recurring: boolean
          location: string | null
          location_lat: number | null
          location_lng: number | null
          max_participants: number | null
          pt_user_id: string | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          start_datetime: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          atleta_user_id?: string | null
          cancelled_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_user_id: string
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_type_id?: string | null
          id?: string
          is_all_day?: boolean
          is_cancelled?: boolean
          is_closed_number?: boolean
          is_public?: boolean
          is_recurring?: boolean
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_participants?: number | null
          pt_user_id?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_datetime: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          atleta_user_id?: string | null
          cancelled_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_user_id?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_type_id?: string | null
          id?: string
          is_all_day?: boolean
          is_cancelled?: boolean
          is_closed_number?: boolean
          is_public?: boolean
          is_recurring?: boolean
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_participants?: number | null
          pt_user_id?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_datetime?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
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
      cheers: {
        Row: {
          created_at: string
          id: string
          receiver_user_id: string
          sender_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_user_id: string
          sender_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_user_id?: string
          sender_user_id?: string
        }
        Relationships: []
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          discount_applied: number
          id: string
          payment_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_applied: number
          id?: string
          payment_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_applied?: number
          id?: string
          payment_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_plans: string[] | null
          applicable_roles: Database["public"]["Enums"]["app_role"][] | null
          code: string
          coupon_type: Database["public"]["Enums"]["coupon_type"]
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_value: number
          free_months: number | null
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_purchase_amount: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          applicable_roles?: Database["public"]["Enums"]["app_role"][] | null
          code: string
          coupon_type: Database["public"]["Enums"]["coupon_type"]
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_value: number
          free_months?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          applicable_roles?: Database["public"]["Enums"]["app_role"][] | null
          code?: string
          coupon_type?: Database["public"]["Enums"]["coupon_type"]
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_value?: number
          free_months?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string | null
          id: string
          progress_pct: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string | null
          id?: string
          progress_pct?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string | null
          id?: string
          progress_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sessions: {
        Row: {
          content: string | null
          course_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          order_index: number | null
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number | null
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          id: string
          is_free: boolean | null
          is_published: boolean | null
          price: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean | null
          price?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean | null
          price?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_comments: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
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
      flagged_content: {
        Row: {
          action_taken: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
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
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      professional_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          created_at: string | null
          currency: string | null
          experience_years: number | null
          first_name: string
          hourly_rate: number | null
          id: string
          is_discoverable: boolean | null
          last_name: string
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          offers_in_person: boolean | null
          offers_online: boolean | null
          profession_type: string
          rating_avg: number | null
          review_count: number | null
          specializations: string[] | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string | null
          currency?: string | null
          experience_years?: number | null
          first_name: string
          hourly_rate?: number | null
          id?: string
          is_discoverable?: boolean | null
          last_name: string
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          offers_in_person?: boolean | null
          offers_online?: boolean | null
          profession_type: string
          rating_avg?: number | null
          review_count?: number | null
          specializations?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string | null
          currency?: string | null
          experience_years?: number | null
          first_name?: string
          hourly_rate?: number | null
          id?: string
          is_discoverable?: boolean | null
          last_name?: string
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          offers_in_person?: boolean | null
          offers_online?: boolean | null
          profession_type?: string
          rating_avg?: number | null
          review_count?: number | null
          specializations?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          notification_preferences: Json | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_assignments: {
        Row: {
          active_days: number[]
          atleta_user_id: string
          created_at: string
          current_index: number
          end_date: string | null
          id: string
          notes: string | null
          program_id: string
          pt_user_id: string
          start_date: string
          status: Database["public"]["Enums"]["program_assignment_status"]
          updated_at: string
          weeks_generated: number
        }
        Insert: {
          active_days?: number[]
          atleta_user_id: string
          created_at?: string
          current_index?: number
          end_date?: string | null
          id?: string
          notes?: string | null
          program_id: string
          pt_user_id: string
          start_date: string
          status?: Database["public"]["Enums"]["program_assignment_status"]
          updated_at?: string
          weeks_generated?: number
        }
        Update: {
          active_days?: number[]
          atleta_user_id?: string
          created_at?: string
          current_index?: number
          end_date?: string | null
          id?: string
          notes?: string | null
          program_id?: string
          pt_user_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["program_assignment_status"]
          updated_at?: string
          weeks_generated?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_schedules: {
        Row: {
          created_at: string
          day_of_week: number | null
          day_offset: number | null
          id: string
          order_index: number
          program_id: string
          template_id: string
          week_offset: number
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          day_offset?: number | null
          id?: string
          order_index?: number
          program_id: string
          template_id: string
          week_offset?: number
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          day_offset?: number | null
          id?: string
          order_index?: number
          program_id?: string
          template_id?: string
          week_offset?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_schedules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          atleta_user_id: string
          category: string
          created_at: string
          id: string
          notes: string | null
          photo_url: string
          taken_at: string
        }
        Insert: {
          atleta_user_id: string
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          photo_url: string
          taken_at?: string
        }
        Update: {
          atleta_user_id?: string
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string
          taken_at?: string
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
      pt_category_suggestions: {
        Row: {
          created_at: string
          id: string
          name: string
          pt_user_id: string
          status: Database["public"]["Enums"]["suggestion_status"]
          type: Database["public"]["Enums"]["suggestion_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pt_user_id: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          type: Database["public"]["Enums"]["suggestion_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pt_user_id?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          type?: Database["public"]["Enums"]["suggestion_type"]
        }
        Relationships: []
      }
      pt_certificates: {
        Row: {
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          name: string
          pt_user_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          pt_user_id: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          pt_user_id?: string
        }
        Relationships: []
      }
      pt_certifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      pt_content_library: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          description: string | null
          download_count: number | null
          file_size_bytes: number | null
          file_url: string
          folder: string | null
          id: string
          is_public: boolean
          pt_user_id: string
          shared_with_athletes: string[] | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_size_bytes?: number | null
          file_url: string
          folder?: string | null
          id?: string
          is_public?: boolean
          pt_user_id: string
          shared_with_athletes?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_size_bytes?: number | null
          file_url?: string
          folder?: string | null
          id?: string
          is_public?: boolean
          pt_user_id?: string
          shared_with_athletes?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pt_packages: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          duration_days: number | null
          id: string
          includes_chat: boolean | null
          includes_video_calls: boolean | null
          is_active: boolean
          is_featured: boolean | null
          max_workouts_per_week: number | null
          name: string
          package_type: Database["public"]["Enums"]["package_type"]
          price: number
          pt_user_id: string
          sessions_count: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          includes_chat?: boolean | null
          includes_video_calls?: boolean | null
          is_active?: boolean
          is_featured?: boolean | null
          max_workouts_per_week?: number | null
          name: string
          package_type: Database["public"]["Enums"]["package_type"]
          price: number
          pt_user_id: string
          sessions_count?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          includes_chat?: boolean | null
          includes_video_calls?: boolean | null
          is_active?: boolean
          is_featured?: boolean | null
          max_workouts_per_week?: number | null
          name?: string
          package_type?: Database["public"]["Enums"]["package_type"]
          price?: number
          pt_user_id?: string
          sessions_count?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pt_profile_certifications: {
        Row: {
          certification_id: string
          pt_user_id: string
        }
        Insert: {
          certification_id: string
          pt_user_id: string
        }
        Update: {
          certification_id?: string
          pt_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_profile_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "pt_certifications"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_profile_specializations: {
        Row: {
          pt_user_id: string
          specialization_id: string
        }
        Insert: {
          pt_user_id: string
          specialization_id: string
        }
        Update: {
          pt_user_id?: string
          specialization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_profile_specializations_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "pt_specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_profiles: {
        Row: {
          bio: string | null
          certifications: string[] | null
          created_at: string
          currency: string | null
          experience_years: number | null
          gallery_photos: string[] | null
          hourly_rate: number | null
          id: string
          is_discoverable: boolean | null
          level: Database["public"]["Enums"]["pt_level"] | null
          location_address: string | null
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
          pt_type_id: string | null
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
          gallery_photos?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_discoverable?: boolean | null
          level?: Database["public"]["Enums"]["pt_level"] | null
          location_address?: string | null
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
          pt_type_id?: string | null
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
          gallery_photos?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_discoverable?: boolean | null
          level?: Database["public"]["Enums"]["pt_level"] | null
          location_address?: string | null
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
          pt_type_id?: string | null
          rating_avg?: number | null
          review_count?: number | null
          specializations?: string[] | null
          status?: Database["public"]["Enums"]["pt_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_profiles_pt_type_id_fkey"
            columns: ["pt_type_id"]
            isOneToOne: false
            referencedRelation: "pt_types"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_reviews: {
        Row: {
          atleta_user_id: string
          comment: string | null
          created_at: string
          id: string
          is_verified: boolean
          is_visible: boolean
          pt_response: string | null
          pt_response_at: string | null
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
          pt_response?: string | null
          pt_response_at?: string | null
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
          pt_response?: string | null
          pt_response_at?: string | null
          pt_user_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      pt_specializations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      pt_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          includes_analytics: boolean | null
          includes_chat: boolean | null
          includes_video_calls: boolean | null
          is_active: boolean
          is_featured: boolean | null
          max_athletes: number | null
          name: string
          plan_type: Database["public"]["Enums"]["subscription_type"]
          price_monthly: number
          price_yearly: number | null
          sort_order: number | null
          storage_gb: number | null
          stripe_price_id: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          includes_analytics?: boolean | null
          includes_chat?: boolean | null
          includes_video_calls?: boolean | null
          is_active?: boolean
          is_featured?: boolean | null
          max_athletes?: number | null
          name: string
          plan_type: Database["public"]["Enums"]["subscription_type"]
          price_monthly: number
          price_yearly?: number | null
          sort_order?: number | null
          storage_gb?: number | null
          stripe_price_id?: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          includes_analytics?: boolean | null
          includes_chat?: boolean | null
          includes_video_calls?: boolean | null
          is_active?: boolean
          is_featured?: boolean | null
          max_athletes?: number | null
          name?: string
          plan_type?: Database["public"]["Enums"]["subscription_type"]
          price_monthly?: number
          price_yearly?: number | null
          sort_order?: number | null
          storage_gb?: number | null
          stripe_price_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"]
          trial_days?: number | null
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
      support_tickets: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          attachments: string[] | null
          category: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_blocks: {
        Row: {
          created_at: string
          id: string
          info_note: string | null
          name: string | null
          order_index: number
          params: Json
          template_id: string
          type: Database["public"]["Enums"]["protocol_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          info_note?: string | null
          name?: string | null
          order_index?: number
          params?: Json
          template_id: string
          type?: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          info_note?: string | null
          name?: string | null
          order_index?: number
          params?: Json
          template_id?: string
          type?: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_blocks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          block_id: string | null
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          prescribed_duration_seconds: number | null
          reps_max: number | null
          reps_min: number | null
          rest_seconds: number | null
          sets: number
          template_id: string
          tempo: string | null
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          prescribed_duration_seconds?: number | null
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
          template_id: string
          tempo?: string | null
        }
        Update: {
          block_id?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          prescribed_duration_seconds?: number | null
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
          template_id?: string
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "template_blocks"
            referencedColumns: ["id"]
          },
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
      ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
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
      workout_blocks: {
        Row: {
          created_at: string
          id: string
          info_note: string | null
          name: string | null
          order_index: number
          params: Json
          type: Database["public"]["Enums"]["protocol_type"]
          updated_at: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          info_note?: string | null
          name?: string | null
          order_index?: number
          params?: Json
          type?: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          info_note?: string | null
          name?: string | null
          order_index?: number
          params?: Json
          type?: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_blocks_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          block_id: string | null
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          prescribed_duration_seconds: number | null
          prescribed_reps_max: number | null
          prescribed_reps_min: number | null
          prescribed_sets: number
          prescribed_weight: number | null
          rest_seconds: number | null
          workout_id: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          prescribed_duration_seconds?: number | null
          prescribed_reps_max?: number | null
          prescribed_reps_min?: number | null
          prescribed_sets?: number
          prescribed_weight?: number | null
          rest_seconds?: number | null
          workout_id: string
        }
        Update: {
          block_id?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          prescribed_duration_seconds?: number | null
          prescribed_reps_max?: number | null
          prescribed_reps_min?: number | null
          prescribed_sets?: number
          prescribed_weight?: number | null
          rest_seconds?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "workout_blocks"
            referencedColumns: ["id"]
          },
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
      workout_programs: {
        Row: {
          active_days: number[]
          created_at: string
          description: string | null
          duration_weeks: number
          frequency_per_week: number
          id: string
          is_archived: boolean
          mode: string
          name: string
          notes: string | null
          pt_user_id: string
          updated_at: string
        }
        Insert: {
          active_days?: number[]
          created_at?: string
          description?: string | null
          duration_weeks?: number
          frequency_per_week?: number
          id?: string
          is_archived?: boolean
          mode?: string
          name: string
          notes?: string | null
          pt_user_id: string
          updated_at?: string
        }
        Update: {
          active_days?: number[]
          created_at?: string
          description?: string | null
          duration_weeks?: number
          frequency_per_week?: number
          id?: string
          is_archived?: boolean
          mode?: string
          name?: string
          notes?: string | null
          pt_user_id?: string
          updated_at?: string
        }
        Relationships: []
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
      can_atleta_review_pt: {
        Args: { _atleta_user_id: string; _pt_user_id: string }
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
      count_today_cheers: { Args: { _user_id: string }; Returns: number }
      count_unread_messages: { Args: { _user_id: string }; Returns: number }
      count_unread_notifications: {
        Args: { _user_id: string }
        Returns: number
      }
      get_admin_stats: {
        Args: never
        Returns: {
          active_pts: number
          active_subscriptions: number
          connected_athletes: number
          open_tickets: number
          pending_pts: number
          premium_athletes: number
          suspended_pts: number
          total_athletes: number
          total_pts: number
        }[]
      }
      get_atleta_current_pt: {
        Args: { _atleta_user_id: string }
        Returns: string
      }
      get_my_role: { Args: never; Returns: string }
      get_pt_stats: {
        Args: { _pt_user_id: string }
        Returns: {
          active_athletes: number
          completed_workouts: number
          pending_requests: number
          total_workouts: number
          unread_messages: number
          upcoming_events: number
        }[]
      }
      get_sessions_remaining: {
        Args: { _subscription_id: string }
        Returns: number
      }
      get_subscription_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_weekly_workout_stats: {
        Args: { _atleta_user_id: string }
        Returns: {
          completed_this_week: number
          current_streak: number
          total_completed: number
        }[]
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
      content_type: "pdf" | "video" | "image" | "document" | "other"
      coupon_type: "percentage" | "fixed_amount" | "free_months"
      event_type: "allenamento" | "evento" | "gara" | "raduno" | "altro"
      fitness_level: "principiante" | "intermedio" | "avanzato" | "agonista"
      package_type:
        | "sessioni"
        | "mensile"
        | "trimestrale"
        | "semestrale"
        | "annuale"
        | "custom"
      payment_method: "stripe" | "paypal" | "bank_transfer" | "cash"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      program_assignment_status: "active" | "completed" | "cancelled" | "paused"
      protocol_type: "SET" | "TOP_SET_BACKOFF" | "RAMPING" | "EMOM" | "AMRAP"
      pt_level: "junior" | "senior" | "elite"
      pt_status:
        | "registrato"
        | "in_attesa_approvazione"
        | "attivo"
        | "sospeso"
        | "premium"
      pt_subscription_status: "attivo" | "completato" | "scaduto" | "cancellato"
      relation_origin: "ricerca" | "invito" | "referral" | "qr"
      relation_status: "richiesta" | "attivo" | "rifiutato" | "terminato"
      subscription_status: "attivo" | "scaduto" | "bloccato" | "trial"
      subscription_type:
        | "atleta_free"
        | "atleta_premium"
        | "pt_base"
        | "pt_premium"
      suggestion_status: "pending" | "approved" | "rejected"
      suggestion_type: "specialization" | "certification"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      workout_status:
        | "attivo"
        | "completato"
        | "scaduto"
        | "in_corso"
        | "in_sospeso"
        | "saltato"
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
      content_type: ["pdf", "video", "image", "document", "other"],
      coupon_type: ["percentage", "fixed_amount", "free_months"],
      event_type: ["allenamento", "evento", "gara", "raduno", "altro"],
      fitness_level: ["principiante", "intermedio", "avanzato", "agonista"],
      package_type: [
        "sessioni",
        "mensile",
        "trimestrale",
        "semestrale",
        "annuale",
        "custom",
      ],
      payment_method: ["stripe", "paypal", "bank_transfer", "cash"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      program_assignment_status: ["active", "completed", "cancelled", "paused"],
      protocol_type: ["SET", "TOP_SET_BACKOFF", "RAMPING", "EMOM", "AMRAP"],
      pt_level: ["junior", "senior", "elite"],
      pt_status: [
        "registrato",
        "in_attesa_approvazione",
        "attivo",
        "sospeso",
        "premium",
      ],
      pt_subscription_status: ["attivo", "completato", "scaduto", "cancellato"],
      relation_origin: ["ricerca", "invito", "referral", "qr"],
      relation_status: ["richiesta", "attivo", "rifiutato", "terminato"],
      subscription_status: ["attivo", "scaduto", "bloccato", "trial"],
      subscription_type: [
        "atleta_free",
        "atleta_premium",
        "pt_base",
        "pt_premium",
      ],
      suggestion_status: ["pending", "approved", "rejected"],
      suggestion_type: ["specialization", "certification"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      workout_status: [
        "attivo",
        "completato",
        "scaduto",
        "in_corso",
        "in_sospeso",
        "saltato",
      ],
    },
  },
} as const
