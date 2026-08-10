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
      athlete_documents: {
        Row: {
          atleta_user_id: string
          created_at: string
          doc_type: Database["public"]["Enums"]["athlete_doc_type"]
          expiry_date: string | null
          file_path: string | null
          id: string
          issued_date: string | null
          notes: string | null
          title: string
          updated_at: string
          uploaded_by_user_id: string
        }
        Insert: {
          atleta_user_id: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["athlete_doc_type"]
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          title: string
          updated_at?: string
          uploaded_by_user_id: string
        }
        Update: {
          atleta_user_id?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["athlete_doc_type"]
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          title?: string
          updated_at?: string
          uploaded_by_user_id?: string
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
      atleta_follows: {
        Row: {
          atleta_user_id: string
          created_at: string
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          atleta_user_id: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          atleta_user_id?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      atleta_profiles: {
        Row: {
          bio: string | null
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
          bio?: string | null
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
          bio?: string | null
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
        Relationships: [
          {
            foreignKeyName: "atleta_profiles_referred_by_pt_fkey"
            columns: ["referred_by_pt"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "atleta_profiles_referred_by_pt_fkey"
            columns: ["referred_by_pt"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
          author_kind: string
          content: string
          cover_image_url: string | null
          created_at: string | null
          hidden_at: string | null
          hidden_by: string | null
          id: string
          is_published: boolean | null
          post_type: string
          professional_profile_id: string | null
          pt_user_id: string
          published_at: string | null
          slug: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_kind?: string
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_published?: boolean | null
          post_type?: string
          professional_profile_id?: string | null
          pt_user_id: string
          published_at?: string | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_kind?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_published?: boolean | null
          post_type?: string
          professional_profile_id?: string | null
          pt_user_id?: string
          published_at?: string | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          atleta_user_id: string | null
          cancelled_at: string | null
          category: Database["public"]["Enums"]["calendar_event_category"]
          cover_image_url: string | null
          created_at: string
          creator_user_id: string
          description: string | null
          end_datetime: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          event_type_id: string | null
          google_event_id: string | null
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
          category?: Database["public"]["Enums"]["calendar_event_category"]
          cover_image_url?: string | null
          created_at?: string
          creator_user_id: string
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_type_id?: string | null
          google_event_id?: string | null
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
          category?: Database["public"]["Enums"]["calendar_event_category"]
          cover_image_url?: string | null
          created_at?: string
          creator_user_id?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_type_id?: string | null
          google_event_id?: string | null
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
      coupon_templates: {
        Row: {
          allowed_discount_types: string[]
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_discount_percentage: number | null
          max_free_months: number | null
          max_free_sessions: number | null
          max_validity_days: number | null
          name: string
          one_per_athlete: boolean
          pt_user_id: string | null
          requires_active_connection: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_discount_types?: string[]
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_discount_percentage?: number | null
          max_free_months?: number | null
          max_free_sessions?: number | null
          max_validity_days?: number | null
          name: string
          one_per_athlete?: boolean
          pt_user_id?: string | null
          requires_active_connection?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_discount_types?: string[]
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_discount_percentage?: number | null
          max_free_months?: number | null
          max_free_sessions?: number | null
          max_validity_days?: number | null
          name?: string
          one_per_athlete?: boolean
          pt_user_id?: string | null
          requires_active_connection?: boolean
          sort_order?: number
          updated_at?: string
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
          free_sessions: number | null
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_purchase_amount: number | null
          pt_package_id: string | null
          pt_user_id: string | null
          target_athlete_ids: string[] | null
          template_id: string | null
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
          free_sessions?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          pt_package_id?: string | null
          pt_user_id?: string | null
          target_athlete_ids?: string[] | null
          template_id?: string | null
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
          free_sessions?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          pt_package_id?: string | null
          pt_user_id?: string | null
          target_athlete_ids?: string[] | null
          template_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_pt_package_id_fkey"
            columns: ["pt_package_id"]
            isOneToOne: false
            referencedRelation: "pt_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coupon_templates"
            referencedColumns: ["id"]
          },
        ]
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
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          parent_comment_id?: string | null
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
          {
            foreignKeyName: "event_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
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
      exercise_catalog_items: {
        Row: {
          catalog_id: string
          created_at: string
          exercise_id: string
          id: string
        }
        Insert: {
          catalog_id: string
          created_at?: string
          exercise_id: string
          id?: string
        }
        Update: {
          catalog_id?: string
          created_at?: string
          exercise_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_catalog_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_catalog_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_catalogs: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          id: string
          name: string
          pt_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          name: string
          pt_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          name?: string
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
      group_announcement_rsvps: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_announcement_rsvps_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "group_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      group_announcements: {
        Row: {
          address_line: string | null
          body: string
          cover_url: string | null
          created_at: string
          created_by: string
          ends_at: string | null
          group_id: string
          id: string
          place_label: string | null
          requires_rsvp: boolean
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          ends_at?: string | null
          group_id: string
          id?: string
          place_label?: string | null
          requires_rsvp?: boolean
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string | null
          group_id?: string
          id?: string
          place_label?: string | null
          requires_rsvp?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_announcements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_disciplines: {
        Row: {
          group_id: string
          pt_type_id: string
        }
        Insert: {
          group_id: string
          pt_type_id: string
        }
        Update: {
          group_id?: string
          pt_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_disciplines_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_disciplines_pt_type_id_fkey"
            columns: ["pt_type_id"]
            isOneToOne: false
            referencedRelation: "pt_types"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_member_role"]
          status: Database["public"]["Enums"]["group_member_status"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          status?: Database["public"]["Enums"]["group_member_status"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          status?: Database["public"]["Enums"]["group_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_likes: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_message_likes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          channel: Database["public"]["Enums"]["group_channel"]
          content: string
          created_at: string
          group_id: string
          id: string
          sender_user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: Database["public"]["Enums"]["group_channel"]
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: Database["public"]["Enums"]["group_channel"]
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          address_line: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          invite_token: string
          is_official: boolean
          latitude: number | null
          location_name: string | null
          longitude: number | null
          members_count: number
          name: string
          owner_user_id: string
          place_label: string | null
          policy_accepted_at: string
          status: Database["public"]["Enums"]["group_status"]
          updated_at: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Insert: {
          address_line?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invite_token?: string
          is_official?: boolean
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          members_count?: number
          name: string
          owner_user_id: string
          place_label?: string | null
          policy_accepted_at?: string
          status?: Database["public"]["Enums"]["group_status"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Update: {
          address_line?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invite_token?: string
          is_official?: boolean
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          members_count?: number
          name?: string
          owner_user_id?: string
          place_label?: string | null
          policy_accepted_at?: string
          status?: Database["public"]["Enums"]["group_status"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          chat_group_id: string | null
          chat_id: string | null
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
          chat_group_id?: string | null
          chat_id?: string | null
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
          chat_group_id?: string | null
          chat_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_group_id_fkey"
            columns: ["chat_group_id"]
            isOneToOne: false
            referencedRelation: "pt_chat_groups"
            referencedColumns: ["id"]
          },
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
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          fiscal_code: string | null
          gender: string | null
          id: string
          last_name: string | null
          nickname: string | null
          notification_preferences: Json | null
          phone: string | null
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          fiscal_code?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          nickname?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          fiscal_code?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          nickname?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          postal_code?: string | null
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
      pt_athlete_categories: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          pt_user_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          pt_user_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          pt_user_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      pt_athlete_collaborator_assignments: {
        Row: {
          assigned_at: string
          atleta_user_id: string
          collaborator_pt_user_id: string
          created_at: string
          id: string
          notes: string | null
          owner_pt_user_id: string
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          atleta_user_id: string
          collaborator_pt_user_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_pt_user_id: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          atleta_user_id?: string
          collaborator_pt_user_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_pt_user_id?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pt_athlete_notes: {
        Row: {
          atleta_user_id: string
          body: string
          created_at: string
          id: string
          is_shared_with_athlete: boolean
          pt_user_id: string
          tag: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          atleta_user_id: string
          body: string
          created_at?: string
          id?: string
          is_shared_with_athlete?: boolean
          pt_user_id: string
          tag?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          atleta_user_id?: string
          body?: string
          created_at?: string
          id?: string
          is_shared_with_athlete?: boolean
          pt_user_id?: string
          tag?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pt_athlete_owners: {
        Row: {
          atleta_user_id: string
          created_at: string
          owner_pt_user_id: string
          updated_at: string
        }
        Insert: {
          atleta_user_id: string
          created_at?: string
          owner_pt_user_id: string
          updated_at?: string
        }
        Update: {
          atleta_user_id?: string
          created_at?: string
          owner_pt_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pt_atleta_connections: {
        Row: {
          accepted_at: string | null
          atleta_user_id: string
          category_id: string | null
          created_at: string
          id: string
          is_primary: boolean
          is_pt_active: boolean
          pt_user_id: string
          requested_at: string
          requested_by: string | null
          status: string
          terminated_at: string | null
          training_modality: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          atleta_user_id: string
          category_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          is_pt_active?: boolean
          pt_user_id: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          terminated_at?: string | null
          training_modality?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          atleta_user_id?: string
          category_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          is_pt_active?: boolean
          pt_user_id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          terminated_at?: string | null
          training_modality?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_atleta_connections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pt_athlete_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_atleta_transfers: {
        Row: {
          action: string
          atleta_user_id: string
          completed_at: string | null
          created_at: string
          from_pt_user_id: string
          id: string
          notes: string | null
          requested_at: string
          status: string
          to_pt_user_id: string
        }
        Insert: {
          action?: string
          atleta_user_id: string
          completed_at?: string | null
          created_at?: string
          from_pt_user_id: string
          id?: string
          notes?: string | null
          requested_at?: string
          status?: string
          to_pt_user_id: string
        }
        Update: {
          action?: string
          atleta_user_id?: string
          completed_at?: string | null
          created_at?: string
          from_pt_user_id?: string
          id?: string
          notes?: string | null
          requested_at?: string
          status?: string
          to_pt_user_id?: string
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
      pt_chat_group_members: {
        Row: {
          added_at: string
          atleta_user_id: string
          group_id: string
          id: string
        }
        Insert: {
          added_at?: string
          atleta_user_id: string
          group_id: string
          id?: string
        }
        Update: {
          added_at?: string
          atleta_user_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_chat_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "pt_chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_chat_group_reads: {
        Row: {
          group_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_chat_group_reads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "pt_chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_chat_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          pt_user_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          pt_user_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          pt_user_id?: string
          updated_at?: string
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
      pt_course_enrollments: {
        Row: {
          assigned_by: string
          atleta_user_id: string
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress_pct: number
          status: string
        }
        Insert: {
          assigned_by?: string
          atleta_user_id: string
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress_pct?: number
          status?: string
        }
        Update: {
          assigned_by?: string
          atleta_user_id?: string
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress_pct?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "pt_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_course_lessons: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_preview: boolean
          module_id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "pt_course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "pt_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_course_progress: {
        Row: {
          atleta_user_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          lesson_id: string | null
          step_id: string | null
          updated_at: string
          watch_seconds: number
        }
        Insert: {
          atleta_user_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          lesson_id?: string | null
          step_id?: string | null
          updated_at?: string
          watch_seconds?: number
        }
        Update: {
          atleta_user_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          lesson_id?: string | null
          step_id?: string | null
          updated_at?: string
          watch_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "pt_course_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "pt_course_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "pt_course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_course_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "pt_course_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_course_step_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          step_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          step_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_course_step_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_course_step_exercises_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "pt_course_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_course_step_progress: {
        Row: {
          atleta_user_id: string
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          progress_pct: number
          status: string
          step_id: string
          updated_at: string
        }
        Insert: {
          atleta_user_id: string
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          progress_pct?: number
          status?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          atleta_user_id?: string
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          progress_pct?: number
          status?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_course_step_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "pt_course_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_course_step_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "pt_course_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_course_steps: {
        Row: {
          completion_threshold: number
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          completion_threshold?: number
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          completion_threshold?: number
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_course_steps_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "pt_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_courses: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          id: string
          is_free: boolean
          price: number
          pt_user_id: string
          requires_sequential_steps: boolean
          status: string
          target_exercise: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean
          price?: number
          pt_user_id: string
          requires_sequential_steps?: boolean
          status?: string
          target_exercise?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean
          price?: number
          pt_user_id?: string
          requires_sequential_steps?: boolean
          status?: string
          target_exercise?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pt_favorite_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          pt_user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          pt_user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          pt_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_favorite_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_favorite_protocols: {
        Row: {
          created_at: string
          id: string
          protocol_id: string
          pt_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          protocol_id: string
          pt_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          protocol_id?: string
          pt_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_favorite_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "pt_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_google_calendar_connections: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string
          google_account_id: string | null
          google_email: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          pt_user_id: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          google_account_id?: string | null
          google_email?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          pt_user_id: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          google_account_id?: string | null
          google_email?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          pt_user_id?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
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
          availability_bookable: boolean
          bio: string | null
          certifications: string[] | null
          created_at: string
          currency: string | null
          experience_years: number | null
          gallery_photos: string[] | null
          hourly_rate: number | null
          id: string
          is_active: boolean
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
          availability_bookable?: boolean
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          currency?: string | null
          experience_years?: number | null
          gallery_photos?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
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
          availability_bookable?: boolean
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          currency?: string | null
          experience_years?: number | null
          gallery_photos?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
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
      pt_protocols: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          notes: string | null
          protocol_type: Database["public"]["Enums"]["protocol_type"]
          pt_user_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          notes?: string | null
          protocol_type?: Database["public"]["Enums"]["protocol_type"]
          pt_user_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          notes?: string | null
          protocol_type?: Database["public"]["Enums"]["protocol_type"]
          pt_user_id?: string
          updated_at?: string
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
          library_protocol_id: string | null
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
          library_protocol_id?: string | null
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
          library_protocol_id?: string | null
          name?: string | null
          order_index?: number
          params?: Json
          template_id?: string
          type?: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_blocks_library_protocol_id_fkey"
            columns: ["library_protocol_id"]
            isOneToOne: false
            referencedRelation: "pt_protocols"
            referencedColumns: ["id"]
          },
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
          library_protocol_id: string | null
          notes: string | null
          order_index: number
          prescribed_duration_seconds: number | null
          protocol_name: string | null
          protocol_params: Json
          protocol_type: string
          reps_max: number | null
          reps_min: number | null
          rest_seconds: number | null
          sets: number
          sets_data: Json | null
          template_id: string
          tempo: string | null
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          library_protocol_id?: string | null
          notes?: string | null
          order_index?: number
          prescribed_duration_seconds?: number | null
          protocol_name?: string | null
          protocol_params?: Json
          protocol_type?: string
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
          sets_data?: Json | null
          template_id: string
          tempo?: string | null
        }
        Update: {
          block_id?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          library_protocol_id?: string | null
          notes?: string | null
          order_index?: number
          prescribed_duration_seconds?: number | null
          protocol_name?: string | null
          protocol_params?: Json
          protocol_type?: string
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number
          sets_data?: Json | null
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
            foreignKeyName: "template_exercises_library_protocol_id_fkey"
            columns: ["library_protocol_id"]
            isOneToOne: false
            referencedRelation: "pt_protocols"
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
          library_protocol_id: string | null
          name: string | null
          order_index: number
          params: Json
          phase: string
          type: Database["public"]["Enums"]["protocol_type"]
          updated_at: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          info_note?: string | null
          library_protocol_id?: string | null
          name?: string | null
          order_index?: number
          params?: Json
          phase?: string
          type?: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          info_note?: string | null
          library_protocol_id?: string | null
          name?: string | null
          order_index?: number
          params?: Json
          phase?: string
          type?: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_blocks_library_protocol_id_fkey"
            columns: ["library_protocol_id"]
            isOneToOne: false
            referencedRelation: "pt_protocols"
            referencedColumns: ["id"]
          },
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
          library_protocol_id: string | null
          notes: string | null
          order_index: number
          phase: string
          prescribed_duration_seconds: number | null
          prescribed_reps_max: number | null
          prescribed_reps_min: number | null
          prescribed_sets: number
          prescribed_weight: number | null
          protocol_name: string | null
          protocol_params: Json
          protocol_type: string
          rest_seconds: number | null
          sets_data: Json | null
          workout_id: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          library_protocol_id?: string | null
          notes?: string | null
          order_index?: number
          phase?: string
          prescribed_duration_seconds?: number | null
          prescribed_reps_max?: number | null
          prescribed_reps_min?: number | null
          prescribed_sets?: number
          prescribed_weight?: number | null
          protocol_name?: string | null
          protocol_params?: Json
          protocol_type?: string
          rest_seconds?: number | null
          sets_data?: Json | null
          workout_id: string
        }
        Update: {
          block_id?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          library_protocol_id?: string | null
          notes?: string | null
          order_index?: number
          phase?: string
          prescribed_duration_seconds?: number | null
          prescribed_reps_max?: number | null
          prescribed_reps_min?: number | null
          prescribed_sets?: number
          prescribed_weight?: number | null
          protocol_name?: string | null
          protocol_params?: Json
          protocol_type?: string
          rest_seconds?: number | null
          sets_data?: Json | null
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
            foreignKeyName: "workout_exercises_library_protocol_id_fkey"
            columns: ["library_protocol_id"]
            isOneToOne: false
            referencedRelation: "pt_protocols"
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
          cooldown_template_id: string | null
          created_at: string
          description: string | null
          difficulty_level: Database["public"]["Enums"]["fitness_level"]
          estimated_duration: number | null
          id: string
          include_cooldown: boolean
          include_warmup: boolean
          is_public: boolean
          muscle_groups: string[]
          pt_user_id: string
          tags: string[] | null
          template_kind: string | null
          template_role: string
          title: string
          updated_at: string
          warmup_template_id: string | null
        }
        Insert: {
          category?: string | null
          cooldown_template_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["fitness_level"]
          estimated_duration?: number | null
          id?: string
          include_cooldown?: boolean
          include_warmup?: boolean
          is_public?: boolean
          muscle_groups?: string[]
          pt_user_id: string
          tags?: string[] | null
          template_kind?: string | null
          template_role?: string
          title: string
          updated_at?: string
          warmup_template_id?: string | null
        }
        Update: {
          category?: string | null
          cooldown_template_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["fitness_level"]
          estimated_duration?: number | null
          id?: string
          include_cooldown?: boolean
          include_warmup?: boolean
          is_public?: boolean
          muscle_groups?: string[]
          pt_user_id?: string
          tags?: string[] | null
          template_kind?: string | null
          template_role?: string
          title?: string
          updated_at?: string
          warmup_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_cooldown_template_id_fkey"
            columns: ["cooldown_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_warmup_template_id_fkey"
            columns: ["warmup_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          athlete_reordered_at: string | null
          atleta_user_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          duration_seconds: number | null
          id: string
          notes_atleta: string | null
          notes_pt: string | null
          pt_user_id: string
          rating: number | null
          reps_total: number | null
          scheduled_date: string | null
          sets_completed: number | null
          status: Database["public"]["Enums"]["workout_status"]
          template_id: string | null
          template_kind: string | null
          title: string
          updated_at: string
          volume_kg: number | null
        }
        Insert: {
          athlete_reordered_at?: string | null
          atleta_user_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_seconds?: number | null
          id?: string
          notes_atleta?: string | null
          notes_pt?: string | null
          pt_user_id: string
          rating?: number | null
          reps_total?: number | null
          scheduled_date?: string | null
          sets_completed?: number | null
          status?: Database["public"]["Enums"]["workout_status"]
          template_id?: string | null
          template_kind?: string | null
          title: string
          updated_at?: string
          volume_kg?: number | null
        }
        Update: {
          athlete_reordered_at?: string | null
          atleta_user_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_seconds?: number | null
          id?: string
          notes_atleta?: string | null
          notes_pt?: string | null
          pt_user_id?: string
          rating?: number | null
          reps_total?: number | null
          scheduled_date?: string | null
          sets_completed?: number | null
          status?: Database["public"]["Enums"]["workout_status"]
          template_id?: string | null
          template_kind?: string | null
          title?: string
          updated_at?: string
          volume_kg?: number | null
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
      public_profiles: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _activate_pt_atleta_connection: {
        Args: {
          _atleta_user_id: string
          _pt_user_id: string
          _requested_by: string
        }
        Returns: string
      }
      _ensure_athlete_owner: {
        Args: { _atleta_user_id: string; _owner_pt_user_id: string }
        Returns: string
      }
      admin_set_group_official: {
        Args: { _group_id: string; _is_official: boolean }
        Returns: undefined
      }
      admin_set_group_status: {
        Args: {
          _group_id: string
          _status: Database["public"]["Enums"]["group_status"]
        }
        Returns: undefined
      }
      are_connected: {
        Args: { _atleta_user_id: string; _pt_user_id: string }
        Returns: boolean
      }
      assign_athlete_to_collaborator: {
        Args: {
          _atleta_user_id: string
          _collaborator_pt_user_id: string
          _notes?: string
        }
        Returns: string
      }
      athlete_redo_workout: { Args: { _workout_id: string }; Returns: string }
      atleta_reorder_workout_exercises: {
        Args: { _ordered_exercise_ids: string[]; _workout_id: string }
        Returns: undefined
      }
      can_atleta_connect_to_pt: {
        Args: { _atleta_user_id: string }
        Returns: boolean
      }
      can_atleta_connect_to_specific_pt: {
        Args: { _atleta_user_id: string; _pt_user_id: string }
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
      can_view_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_profile_basic: {
        Args: { _target_user_id: string }
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
      count_pt_course_enrollments: {
        Args: { _course_ids: string[] }
        Returns: {
          course_id: string
          enrolled_count: number
        }[]
      }
      count_today_cheers: { Args: { _user_id: string }; Returns: number }
      count_unread_messages: { Args: { _user_id: string }; Returns: number }
      count_unread_notifications: {
        Args: { _user_id: string }
        Returns: number
      }
      create_group_with_disciplines: {
        Args: {
          _address_line?: string
          _description?: string
          _discipline_ids?: string[]
          _image_url?: string
          _latitude?: number
          _location_name?: string
          _longitude?: number
          _name: string
          _place_label?: string
          _policy_accepted?: boolean
          _visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Returns: {
          address_line: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          invite_token: string
          is_official: boolean
          latitude: number | null
          location_name: string | null
          longitude: number | null
          members_count: number
          name: string
          owner_user_id: string
          place_label: string | null
          policy_accepted_at: string
          status: Database["public"]["Enums"]["group_status"]
          updated_at: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_pt_chat_group: {
        Args: { _athlete_ids: string[]; _name: string }
        Returns: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          pt_user_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pt_chat_groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      find_atleta_by_email_for_pt: { Args: { _email: string }; Returns: Json }
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
      get_athlete_owner_pt: {
        Args: { _atleta_user_id: string }
        Returns: string
      }
      get_atleta_active_pts: {
        Args: { _atleta_user_id: string }
        Returns: {
          accepted_at: string
          connection_id: string
          is_primary: boolean
          is_pt_active: boolean
          pt_user_id: string
        }[]
      }
      get_atleta_current_pt: {
        Args: { _atleta_user_id: string }
        Returns: string
      }
      get_ceded_athletes_for_pt: {
        Args: never
        Returns: {
          atleta_user_id: string
          avatar_url: string
          category_id: string
          category_name: string
          current_pt_first_name: string
          current_pt_last_name: string
          current_pt_user_id: string
          email: string
          first_name: string
          fitness_level: string
          is_recallable: boolean
          last_name: string
          training_modality: string
          transferred_at: string
        }[]
      }
      get_group_by_invite_token: { Args: { _token: string }; Returns: Json }
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
      get_recallable_athletes_for_pt: {
        Args: never
        Returns: {
          atleta_user_id: string
          avatar_url: string
          current_pt_first_name: string
          current_pt_last_name: string
          current_pt_user_id: string
          first_name: string
          last_name: string
          transferred_at: string
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
      is_athlete_owner: {
        Args: { _atleta_user_id: string; _pt_user_id: string }
        Returns: boolean
      }
      is_atleta: { Args: { _user_id: string }; Returns: boolean }
      is_chat_group_participant: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_chat_participant: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_connected_to_pt: {
        Args: { _atleta_user_id: string; _pt_user_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      is_pt: { Args: { _user_id: string }; Returns: boolean }
      is_pt_active: { Args: { _user_id: string }; Returns: boolean }
      is_pt_course_lesson_owner: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      is_pt_course_module_owner: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      is_pt_course_owner: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_pt_course_published: { Args: { _course_id: string }; Returns: boolean }
      is_pt_course_step_owner: {
        Args: { _step_id: string; _user_id: string }
        Returns: boolean
      }
      join_group: { Args: { _group_id: string }; Returns: Json }
      list_my_collaborator_roster: {
        Args: never
        Returns: {
          assigned_at: string
          assignment_id: string
          atleta_user_id: string
          avatar_url: string
          email: string
          first_name: string
          last_name: string
          owner_first_name: string
          owner_last_name: string
          owner_pt_user_id: string
        }[]
      }
      mark_messages_as_read: { Args: { _chat_id: string }; Returns: undefined }
      move_athlete_to_collaborator: {
        Args: {
          _atleta_user_id: string
          _collaborator_pt_user_id: string
          _notes?: string
        }
        Returns: string
      }
      pt_save_workout_log: {
        Args: {
          _duration_seconds?: number
          _notes?: string
          _reps_completed?: number
          _rpe?: number
          _set_number: number
          _weight_used?: number
          _workout_exercise_id: string
        }
        Returns: string
      }
      recall_athlete_from_transfer: {
        Args: { _atleta_user_id: string; _notes?: string }
        Returns: string
      }
      revoke_collaborator_assignment: {
        Args: { _atleta_user_id: string; _collaborator_pt_user_id: string }
        Returns: boolean
      }
      search_pt_colleagues: {
        Args: { _query?: string }
        Returns: {
          avatar_url: string
          bio: string
          experience_years: number
          first_name: string
          last_name: string
          location_city: string
          offers_in_person: boolean
          offers_online: boolean
          rating_avg: number
          review_count: number
          specializations: string[]
          user_id: string
        }[]
      }
      search_pts_for_transfer: {
        Args: { _query?: string }
        Returns: {
          avatar_url: string
          first_name: string
          last_name: string
          location_city: string
          rating_avg: number
          user_id: string
        }[]
      }
      set_athlete_category: {
        Args: { _category_id: string; _connection_id: string }
        Returns: undefined
      }
      set_atleta_primary_pt: {
        Args: { _pt_user_id: string }
        Returns: undefined
      }
      start_course_step_workout: {
        Args: { _enrollment_id: string; _step_id: string }
        Returns: string
      }
      transfer_athlete_to_pt: {
        Args: {
          _atleta_user_id: string
          _notes?: string
          _to_pt_user_id: string
        }
        Returns: string
      }
      transfer_athletes_to_pt: {
        Args: {
          _atleta_user_ids: string[]
          _notes?: string
          _to_pt_user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "pt" | "atleta"
      athlete_doc_type:
        | "visita_medica"
        | "certificato_agonistico"
        | "assicurazione"
        | "consenso_privacy"
        | "altro"
      atleta_status: "non_collegato" | "collegato" | "premium"
      calendar_event_category: "evento" | "appuntamento"
      content_type: "pdf" | "video" | "image" | "document" | "other"
      coupon_type: "percentage" | "fixed_amount" | "free_months"
      event_type: "allenamento" | "evento" | "gara" | "raduno" | "altro"
      fitness_level:
        | "principiante"
        | "intermedio"
        | "avanzato"
        | "agonista"
        | "nessuno"
      group_channel: "general" | "announcements" | "admins"
      group_member_role: "owner" | "admin" | "member"
      group_member_status: "active" | "banned"
      group_status: "active" | "suspended" | "pending_review"
      group_visibility: "public" | "private"
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
      protocol_type:
        | "SET"
        | "TOP_SET_BACKOFF"
        | "RAMPING"
        | "EMOM"
        | "AMRAP"
        | "SUPERSET"
        | "LADDER"
        | "DEAD_LADDER"
        | "TABATA"
        | "HIIT"
        | "RXT"
        | "RUNNING_TOTAL"
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
      athlete_doc_type: [
        "visita_medica",
        "certificato_agonistico",
        "assicurazione",
        "consenso_privacy",
        "altro",
      ],
      atleta_status: ["non_collegato", "collegato", "premium"],
      calendar_event_category: ["evento", "appuntamento"],
      content_type: ["pdf", "video", "image", "document", "other"],
      coupon_type: ["percentage", "fixed_amount", "free_months"],
      event_type: ["allenamento", "evento", "gara", "raduno", "altro"],
      fitness_level: [
        "principiante",
        "intermedio",
        "avanzato",
        "agonista",
        "nessuno",
      ],
      group_channel: ["general", "announcements", "admins"],
      group_member_role: ["owner", "admin", "member"],
      group_member_status: ["active", "banned"],
      group_status: ["active", "suspended", "pending_review"],
      group_visibility: ["public", "private"],
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
      protocol_type: [
        "SET",
        "TOP_SET_BACKOFF",
        "RAMPING",
        "EMOM",
        "AMRAP",
        "SUPERSET",
        "LADDER",
        "DEAD_LADDER",
        "TABATA",
        "HIIT",
        "RXT",
        "RUNNING_TOTAL",
      ],
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
