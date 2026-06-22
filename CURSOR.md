# CURSOR.md — LIVELLAPP Project Context

> **Purpose**: Persistent context document for Cursor AI / Claude Code / any AI assistant working on this codebase. Read this file at the start of every session to avoid losing context.

---

## 1. PROJECT OVERVIEW

- **Name**: LIVELLAPP
- **Purpose**: Modular Italian fitness platform that replaces external tools (CRM, workout builder, chat, calendar, payments, gamification) with a single integrated system for Personal Trainers and Athletes.
- **Roles** (rigid, non-mixable):
  - **Admin** — web only (`/admin`) — manages platform, PTs, catalogs, courses, payments
  - **PT** (Personal Trainer) — web dashboard (`/pt`) + PWA (`/pt/app`) — manages own athletes, workouts, calendar, blog, coupons
  - **Athlete** — PWA only (`/app`) — trains, tracks progress, chats with PT, discovers events
- **Status**: Advanced MVP, near production-ready. Core flows complete; integrations (Stripe live, email sending, push triggers) pending.
- **Language**: UI in **Italian** ("Attività", "Calisthenics", "Professionista"). DB status identifiers in **English** (`active`, `pending`, `completato`). Always localize in UI layer only.

---

## 2. TECH STACK

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript 5 |
| Styling | Tailwind CSS v3 + shadcn/ui + CSS variables (semantic tokens) |
| Routing | react-router-dom v6 |
| State / Data | TanStack Query (React Query) + Supabase realtime |
| Backend | **Lovable Cloud** (Supabase) — Postgres, Auth, Storage, Edge Functions, Realtime |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Animations | Framer Motion |
| Charts | Recharts |
| Forms | react-hook-form + zod |
| PWA | Workbox (precache, offline support, in-app update prompt) |
| Maps | Google Maps JS API + Places API |
| Push | Web Push API + Service Worker + Supabase Edge Function `send-push-notification` |
| AI | Lovable AI Gateway (BeeBot assistant) |
| Testing | Vitest + React Testing Library; Playwright (driven via shell) |
| Icons | lucide-react |

---

## 3. FILE & FOLDER STRUCTURE

```
src/
├── App.tsx                      # Root routes (admin/pt/atleta/public) + ProtectedRoute wrappers
├── main.tsx                     # ReactDOM bootstrap, QueryClient, AuthProvider
├── index.css                    # Design tokens (CSS vars: --app-*, --pt-*, --admin-*)
│
├── assets/                      # Static SVG logos and brand assets
├── components/
│   ├── admin/                   # Admin-only widgets (CourseBuilder, SubscriptionPlanForm)
│   ├── app/                     # Athlete PWA components (workout players, chat, calendar, cards)
│   │   ├── GuidedWorkoutFlow.tsx       # Main interactive workout runner
│   │   ├── SetTracker.tsx              # Set-by-set logging with RPE
│   │   ├── AtletaEmomPlayer.tsx        # EMOM protocol player
│   │   ├── AtletaTimedRoundsPlayer.tsx # AMRAP / Timed rounds player
│   │   ├── NextExercisePreview.tsx     # Preview next exercise during rest
│   │   ├── PTAppPageShell.tsx          # Mobile shell for PT PWA pages (safe-area, sticky header)
│   │   ├── PTMoreDrawer.tsx            # PT PWA "more" bottom drawer
│   │   └── MobileNav.tsx               # Bottom tab bar
│   ├── auth/                    # ProtectedRoute, RequireUserName
│   ├── common/                  # EmptyState, PermissionGate, LoadingSpinner, ImageUpload, Logo
│   ├── dashboard/               # PT/Admin web: PageHeader, DataTable, DetailSheet, KPICard, charts
│   ├── exercises/               # ExerciseDetailDialog
│   ├── layouts/
│   │   ├── AdminLayout.tsx              # Admin sidebar + header
│   │   ├── PTDashboardLayout.tsx        # PT web sidebar, mobile swipe drawer, /pt/app redirect
│   │   ├── AppLayout.tsx                # Athlete + PT PWA layout (bottom nav, safe-area)
│   │   └── PublicLayout.tsx             # Marketing / public site
│   ├── notifications/           # NotificationDropdown
│   ├── protocols/               # ProtocolInfoPopover (standard/emom/amrap/superset/hiit)
│   ├── pt/                      # PT-specific dashboard widgets
│   ├── pwa/                     # InstallBanner, PWAUpdatePrompt
│   ├── reviews/                 # PTReviewForm, AtletaReviewsHistory, ReviewPromptCard
│   ├── settings/                # PushNotificationToggle
│   ├── shared/                  # WorkoutHistoryList (shared PT/atleta)
│   ├── skeletons/               # Shimmer placeholders (Card/List/Profile/Table)
│   └── ui/                      # shadcn/ui primitives (do not modify aggressively)
│
├── hooks/
│   ├── useAuth.tsx              # Session + role resolution (sync, with lastGoodRoleRef)
│   ├── usePermissions.tsx       # ROLE_ACCESS_MATRIX consumer
│   ├── useAtletaStatus.tsx      # Connected / premium status
│   ├── usePTSurface.tsx         # Decides PT 'web' vs 'app' surface; maps /pt/* → /pt/app/*
│   ├── usePTHomeData.tsx        # PT dashboard aggregated data
│   ├── usePTStats.tsx           # PT KPIs via get_pt_stats RPC
│   ├── useAdminStats.tsx        # Admin KPIs via get_admin_stats RPC
│   ├── usePushNotifications.tsx # Web Push subscribe/unsubscribe
│   ├── useRealtimeNotifications.tsx # Supabase channel for in-app notifications
│   ├── useNotifications.tsx     # Notification list + mark-as-read
│   ├── usePWAUpdate.tsx         # Workbox update prompt
│   ├── useInstallPrompt.tsx     # PWA install banner
│   ├── useTeammates.tsx         # Athlete's teammates (same PT)
│   ├── useConnectionRequest.tsx # Athlete → PT request
│   ├── usePTConnectionRequests.tsx # PT inbox of requests
│   ├── usePTFavoriteExercises.tsx
│   ├── usePTAppStats.tsx
│   └── use-mobile.tsx, use-toast.ts
│
├── lib/
│   ├── api/                     # Typed Supabase data access
│   │   ├── connections.ts       # PT-Athlete connection lifecycle
│   │   ├── discovery.ts         # PT search, filters, distance
│   │   ├── messages.ts          # Chat CRUD + realtime helpers
│   │   ├── programs.ts          # Workout programs / multi-week plans
│   │   ├── templateLoader.ts    # Load template + exercises
│   │   └── workouts.ts          # Workout CRUD, completion, logs
│   ├── protocols/               # Protocol logic (registry, emom, amrap, superset, timedRounds)
│   ├── coupons.ts               # Coupon validation
│   ├── setsData.ts              # Set parsing helpers
│   ├── athleteName.ts, coachName.ts
│   ├── safeStorage.ts           # SSR-safe localStorage wrapper
│   └── utils.ts                 # cn() + misc
│
├── pages/
│   ├── Index.tsx                # Role-based home redirect
│   ├── NotFound.tsx
│   ├── admin/                   # 17 admin pages (PTs, payments, coupons, courses, support, audit, settings, sitemap)
│   ├── atleta/                  # 22 athlete PWA pages (home, workout, programma, scheda, discover, chat, profile, etc.)
│   ├── pt/                      # PT dashboard + PT PWA pages (PTApp* wrappers reuse web pages with embedded=true)
│   ├── auth/AuthPage.tsx        # Sign in / sign up (ref + coupon param support)
│   └── public/                  # Landing, BlogPost, PTDiscovery, PTProfile, Install
│
├── integrations/supabase/
│   ├── client.ts                # ⚠️ AUTO-GENERATED — never edit
│   └── types.ts                 # ⚠️ AUTO-GENERATED — never edit
│
├── types/
│   ├── roles.ts                 # AppRole, ROLE_ACCESS_MATRIX, getHomeRoute()
│   └── database.ts              # Domain type aliases over Supabase generated types
│
└── test/                        # Vitest setup + example tests
.lovable/
├── memory/                      # Project memory rules (mem://...)
└── plan.md                      # Current implementation plan
supabase/
├── config.toml                  # ⚠️ Lovable-managed
├── functions/                   # Edge Functions (see §8)
└── migrations/                  # SQL migrations (timestamped)
public/
├── sw.js, offline.html, livellapp-icon.svg, robots.txt
```

---

## 4. DATABASE SCHEMA

### Core tables (RLS enabled on all)

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | Base user profile (joined to `auth.users`) | `user_id`, `email`, `full_name`, `avatar_url`, `city` |
| `user_roles` | Role assignment (separate to prevent privilege escalation) | `user_id`, `role` (`admin`/`pt`/`atleta`) |
| `permissions` | Fine-grained capability flags |  |
| `pt_profiles` | PT-specific info | `user_id`, `status`, `bio`, `pt_types`, `rating_avg`, `review_count`, `max_athletes` |
| `atleta_profiles` | Athlete-specific info | `user_id`, `status`, `goals`, `fitness_level` |
| `professional_profiles` | Nutritionists, physios | separate from PT |
| `pt_atleta_connections` | 1 active PT per athlete (enforced by trigger) | `pt_user_id`, `atleta_user_id`, `status`, `requested_by` |
| `pt_specializations`, `pt_certifications`, `pt_types`, `pt_profile_specializations`, `pt_profile_certifications` | Catalog + join tables |
| `pt_availability` | Weekly slots |  |
| `pt_packages` | PT-defined service packages |  |
| `atleta_pt_subscriptions` | Athlete's active package with a PT | `sessions_total`, `sessions_used`, auto-decrement trigger |
| `pt_reviews` | Verified reviews (after ≥1 completed workout) | trigger updates `pt_profiles.rating_avg` |
| `pt_athlete_notes` | PT private notes per athlete |  |
| `pt_favorite_exercises` |  |  |
| `pt_content_library`, `pt_certificates` |  |  |

### Workouts

| Table | Purpose |
|---|---|
| `exercises` | Global (admin) + private (PT) exercise library; supports overrides |
| `workout_templates` | PT-built templates |
| `template_blocks`, `template_exercises` | Block/exercise children of templates |
| `workout_programs`, `program_schedules`, `program_assignments` | Multi-week programs |
| `workouts` | Concrete assigned activity (`status`: `attivo`/`completato`/`scaduto`) |
| `workout_blocks`, `workout_exercises` | Per-workout structure (copied from template on assignment) |
| `workout_logs` | Per-set logs (reps, weight, duration, RPE) |

### Chat & calendar

- `chats`, `messages` — realtime + read state + push notification triggers
- `calendar_events`, `event_types`, `event_participants`, `event_comments`
- `notifications`, `push_subscriptions`
- `admin_broadcasts`, `admin_broadcast_recipients`

### Gamification, content, payments

- `badges`, `atleta_badges`, `cheers` (badge auto-award via triggers)
- `progress_tracking`, `progress_photos`, `athlete_documents`
- `courses`, `course_sessions`, `course_enrollments`
- `blog_posts` (PT-authored markdown)
- `coupon_templates`, `coupons`, `coupon_uses`
- `subscription_plans`, `subscriptions`, `payments`
- `support_tickets`, `ticket_messages`, `flagged_content`, `pt_category_suggestions`
- `platform_settings` (key/value JSONB), `audit_logs`, `app_404_logs`

### Storage buckets

| Bucket | Public | Use |
|---|---|---|
| `avatars` | ✅ | Profile pictures |
| `cover-images` | ✅ | Profile/event covers |
| `pt-gallery` | ✅ | PT gallery uploads |
| `pt-certificates` | ✅ | PT credentials |
| `exercise-images`, `exercise-videos` | ✅ | Exercise media |
| `event-covers` | ✅ | Event posters |
| `progress-photos` | ❌ | Private progress |
| `athlete-documents` | ❌ | Medical certs, etc. |

**Storage path convention**: Always prefix uploads with `${user.id}/` for RLS.

### Key DB functions (SECURITY DEFINER)

- `has_role(user, role)`, `is_admin/is_pt/is_atleta(user)`, `get_user_role(user)`, `get_my_role()`
- `are_connected(pt, atleta)`, `is_connected_to_pt(...)`, `can_atleta_connect_to_pt(...)`, `can_pt_accept_athletes(...)`, `get_atleta_current_pt(...)`, `count_pt_active_athletes(...)`
- `has_workout_access`, `is_chat_participant`
- `can_atleta_review_pt(...)`, `can_view_profile_basic(...)`
- `count_unread_messages`, `count_unread_notifications`, `count_today_cheers`, `count_completed_workouts`
- `get_admin_stats()`, `get_pt_stats(pt)`, `get_weekly_workout_stats(atleta)`
- `has_active_subscription`, `is_premium`, `get_subscription_status`, `check_subscription_block`, `get_sessions_remaining`
- `pt_save_workout_log(...)` — PT-on-behalf logging

### Key triggers

- `handle_new_user_role` — auto-create profile + role-specific profile on signup
- `enforce_single_pt_connection` — terminates other active connections when one is activated
- `update_atleta_status_on_connection` — keeps `atleta_profiles.status` in sync
- `update_pt_rating` — recompute `rating_avg` on review insert/update
- `update_chat_last_message`, `create_message_notification`, `create_connection_notification`
- `check_and_award_badges`, `check_cheer_badges`
- `decrement_subscription_session` — on workout completion, decrement remaining sessions
- `calendar_events_validate` — enforce appuntamento/evento invariants
- `update_updated_at_column` — generic timestamp updater

---

## 5. ROUTING & NAVIGATION

### Public
- `/` `/install` `/blog/:slug` `/pt-discovery` `/pt/:slug` (public profile) `/auth`

### Admin (`/admin/*`) — `AdminRoute`
`/admin` (dashboard) · `/admin/pts` · `/admin/pt-readiness` · `/admin/payments` · `/admin/subscriptions` · `/admin/coupons` · `/admin/coupon-templates` · `/admin/courses` · `/admin/exercises` · `/admin/messages` · `/admin/support` · `/admin/support/:ticketId` · `/admin/audit` · `/admin/audit-coherence` · `/admin/settings` · `/admin/sitemap`

### PT Web Dashboard (`/pt/*`) — `PTDashboardRoute` (auto-redirects to `/pt/app/*` on mobile/PWA)
`/pt` · `/pt/athletes` · `/pt/athletes/:id` · `/pt/workouts` · `/pt/templates` · `/pt/templates/:id` · `/pt/exercises` · `/pt/calendar` · `/pt/chat` · `/pt/blog` · `/pt/coupons` · `/pt/payments` · `/pt/settings` · `/pt/profile` · `/pt/onboarding`

### PT PWA (`/pt/app/*`) — `PTAppRoute`
`/pt/app` · `/pt/app/athletes` · `/pt/app/athlete/:atletaId` · `/pt/app/athlete/:atletaId/workouts` · `/pt/app/workouts` · `/pt/app/templates` · `/pt/app/templates/:id` · `/pt/app/exercises` · `/pt/app/calendar` · `/pt/app/chat` · `/pt/app/chat/:chatId` · `/pt/app/blog` · `/pt/app/coupons` · `/pt/app/payments` · `/pt/app/settings` · `/pt/app/profile`

### Athlete PWA (`/app/*`) — `AtletaRoute`
`/app` · `/app/discover` · `/app/programma` · `/app/scheda` · `/app/workout/:id` · `/app/esercizi` · `/app/progress` · `/app/calendar` · `/app/appuntamenti` · `/app/booking/:ptId` · `/app/events/:id` · `/app/chat` · `/app/chat/:chatId` · `/app/notifications` · `/app/profile` · `/app/settings` · `/app/subscription` · `/app/coupons` · `/app/courses` · `/app/help` · `/app/documents` · `/app/pt/:slug` · `/app/professional/:slug` · `/app/onboarding`

### Surface override
`?view=web` forces PT into web layout regardless of viewport (used for testing/dev).

---

## 6. KEY COMPONENTS

| Component | Role | Purpose |
|---|---|---|
| `ProtectedRoute` + `AdminRoute/PTDashboardRoute/PTAppRoute/AtletaRoute` | Auth | Role-gated routes |
| `PermissionGate`, `ConnectedAtletaGate`, `PTOnlyGate`, `AdminOnlyGate` | Auth | Inline gating + empty states |
| `AppLayout` / `PTDashboardLayout` / `AdminLayout` / `PublicLayout` | Layout | Per-channel shell |
| `PTAppPageShell` | PT PWA | Sticky header, `safe-top`, `overflow-x-hidden` wrapper for PT mobile pages |
| `PTMoreDrawer` | PT PWA | Bottom drawer for secondary nav |
| `MobileNav` | PWA | Bottom tab bar |
| `GuidedWorkoutFlow` | Athlete | End-to-end workout runner with timer + persistence + resume |
| `SetTracker` | Athlete | Per-set logging with RPE & notes |
| `AtletaEmomPlayer` / `AtletaTimedRoundsPlayer` | Athlete | Specialized protocol players |
| `NextExercisePreview` | Athlete | Shows upcoming exercise during rest |
| `WorkoutTimer` | Athlete | Rest/work countdown |
| `ChatList` / `ChatMessages` | Both | Realtime chat |
| `WeekCalendar` / `ActivityCalendar` / `AtletaCalendarView` | Athlete | Calendar views |
| `ProgressPhotos` / `ProgressBanner` | Athlete | Photo timeline + progress encouragement |
| `BadgeCard` / `TeammatesRow` | Gamification | Social features |
| `BeeIcon` + `AIAssistantCard` | Athlete | BeeBot AI entry point |
| `DataTable`, `DetailSheet`, `PageHeader`, `KPICard`, `StatusBadge` | Dashboard | Reusable PT/Admin web building blocks |
| `PTMapView` + `PlacesAutocomplete` | Discovery | Google Maps clustering |
| `ExerciseVideoPlayer` | Both | Auto-extracts YouTube IDs for thumbnails/iframes |
| `PWAUpdatePrompt` / `InstallBanner` | PWA | Update + install UX |
| `AppTour` + `AppTourContext` | Onboarding | Step-by-step guided tour |
| `ImageUpload` | Common | Standard upload with cache-busting |

---

## 7. STATE MANAGEMENT

- **Server state**: TanStack Query — every Supabase read goes through a `useQuery` hook in `src/hooks/` or inline in pages. Mutations use `useMutation` with `queryClient.invalidateQueries`.
- **Auth state**: `useAuth` (React Context) — listens to `supabase.auth.onAuthStateChange` and resolves role synchronously via `get_my_role` RPC with `lastGoodRoleRef` to survive token refresh.
- **Local UI state**: `useState` / `useReducer`. Workout flow uses `localStorage` (via `safeStorage`) for resume capability.
- **Realtime**: Supabase Postgres Changes channels for `messages`, `notifications`, `pt_atleta_connections`.
- **Tour state**: `AppTourContext`.
- **No Redux, Zustand, or Jotai.**

---

## 8. API & DATA LAYER

### `src/lib/api/`
- **`connections.ts`** — `requestConnection`, `acceptConnection`, `rejectConnection`, `terminateConnection`
- **`discovery.ts`** — `searchPTs(filters, location)`, Haversine distance filter client-side
- **`messages.ts`** — `sendMessage`, `markAsRead`, `subscribeToChat`, `createOrGetChat`
- **`programs.ts`** — Program CRUD, assignment to athletes
- **`templateLoader.ts`** — Load template with blocks/exercises (eager join)
- **`workouts.ts`** — `assignWorkout` (copies template), `completeWorkout`, `saveLog`, `getWorkoutHistory`

### Key RPCs called from frontend
`has_role`, `get_my_role`, `get_admin_stats`, `get_pt_stats`, `get_weekly_workout_stats`, `count_unread_messages`, `count_unread_notifications`, `count_today_cheers`, `can_atleta_review_pt`, `pt_save_workout_log`, `is_premium`, `get_sessions_remaining`.

### Realtime channels
- `messages:chat_id=eq.<id>` — per-chat
- `notifications:user_id=eq.<id>` — user notifications
- `pt_atleta_connections` — connection updates

### Edge Functions (`supabase/functions/`)
- `create-user` — admin-only user provisioning
- `delete-user` — cascade-safe deletion
- `admin-audit` — audit log queries
- `import-workout-schema` — bulk template import
- `seed-platform-data`, `seed-test-users` — dev seeding
- `send-push-notification` — Web Push fan-out

---

## 9. BUSINESS LOGIC & RULES

### Roles & access matrix (see `src/types/roles.ts`)
```
admin → dashboard_admin only
pt    → dashboard_pt + app_pt + public profile
atleta→ app_atleta + public site
```

### PT–Athlete connection (3 steps)
1. **Request** — either party initiates (`status='pending'`, `requested_by` set)
2. **Accept/Reject** — counterparty updates status
3. **Activation** — `status='active'` triggers: terminate other active connections for that athlete (1 PT per athlete), update `atleta_profiles.status='collegato'`, send notification

### Workout assignment & completion
- Assigning a template **copies** all blocks/exercises into `workout_blocks` / `workout_exercises` (immutable snapshot)
- Athlete logs per-set via `SetTracker` → `workout_logs`
- On `workouts.status='completato'` triggers: badge check, session decrement on active package, review prompt eligibility
- PT can log on behalf via `pt_save_workout_log` RPC (requires active connection)

### Protocol types (`src/lib/protocols/`)
- **standard** — sets × reps with rest
- **emom** — Every Minute On the Minute (`AtletaEmomPlayer`)
- **amrap** — As Many Rounds As Possible (`AtletaTimedRoundsPlayer`)
- **superset** — grouped exercises, minimal rest between
- **hiit / tabata** — work/rest intervals

### Tempo (cadence)
4-digit string `Eccentric-Pause-Concentric-Pause` (e.g. `3010`).

### Gamification
- 13 active badges (workouts_completed, streak_weeks, first_cheer)
- Awarded automatically via `check_and_award_badges` trigger
- Cheers: peer encouragement, daily limit tracked via `count_today_cheers`
- PTs can also assign badges manually

### Reviews
- Eligible after ≥1 completed workout with that PT (`can_atleta_review_pt`)
- `update_pt_rating` trigger recomputes `pt_profiles.rating_avg`
- PT can publicly respond

### Subscriptions & packages
- **Platform**: `subscription_plans` (admin) → `subscriptions` (user)
- **PT packages**: `pt_packages` → `atleta_pt_subscriptions` (per pair)
- Session-based packages auto-decrement on workout completion

### Coupons
- Admin catalog (`coupon_templates`) + PT-issued (`coupons`) — discount or `free_months`
- URL params `?ref=<pt_slug>&coupon=<code>` auto-applied on signup
- Athlete redemption UI pending

### Events
- PT-created, geolocated, visibility configurable
- Client-side Haversine distance filter
- Comments + participants

### Booking
- 1-hour slots, 24h cancellation rule

---

## 10. ENVIRONMENT VARIABLES

Frontend (`.env` — Lovable-managed, never edit):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Supabase Secrets (Edge Functions):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`
- `LOVABLE_API_KEY` (AI Gateway)

> `SUPABASE_SERVICE_ROLE_KEY` and the DB password are **not accessible** to users on Lovable Cloud.

---

## 11. KNOWN ISSUES & PENDING FEATURES

### Done
- ✅ Auth redirect loop fix (sync role resolution + `lastGoodRoleRef`)
- ✅ `get_my_role` repeated calls fix
- ✅ Exercise upload bug fix (migration `20260613140000`)
- ✅ Medium RLS fixes (migration `20260613150000`)
- ✅ PT PWA shell + routing overhaul (`PTAppPageShell`, missing `/pt/app/*` routes, mobile redirect from `/pt/*`)
- ✅ Unit + E2E-style tests for `usePTSurface` (32 passing)

### Pending
- ⏳ **Stripe real payments** — currently mocked
- ⏳ **Transactional emails** — auth + notifications via SMTP/Resend
- ⏳ **Push notification auto-triggers** — manual fan-out only; need server-side trigger on new messages/connections/badges
- ⏳ **End-to-end tests** — Playwright coverage of critical flows

---

## 12. CURRENT OPEN TASKS (Todoist — label: Mancanti + Livel up)

### Archivio esercizi — owner: Lorenzo
- Filtri avanzati per gruppo muscolare e attrezzatura
- Bulk import esercizi via CSV
- Versionamento esercizi con storico modifiche
- Tag personalizzati PT

### Scheda — owner: Lorenzo
- Editor drag-and-drop blocchi con preview
- Duplicazione blocco con un click
- Note PT visibili in esecuzione
- Anteprima protocollo (emom/amrap) prima di assegnare

### Programmi — owner: Lorenzo
- Programmi multi-settimana con progressione automatica
- Template di programma riutilizzabili
- Calendario visuale assegnazioni

### Atleti — owner: Paolo
- Filtri atleti per stato/abbonamento/ultima attività
- Export CSV completo dati atleta
- Vista compatta lista atleti per mobile
- Note PT private con tag

### Corsi — owner: Paolo
- Player video corso con tracking progresso
- Quiz a fine sezione
- Certificato di completamento
- Sezione "I miei corsi" lato atleta

### Lato atleta
- Storico completo allenamenti con grafici di volume
- Feed sociale (cheers, badge, foto progress) della squadra
- Wishlist esercizi
- Diario alimentare base

### Messaggistica e gruppi (5 phases)
1. **Phase 1** — Chat 1:1 stabile con typing indicator e delivery receipts
2. **Phase 2** — Allegati (immagini, video brevi, audio note)
3. **Phase 3** — Gruppi (chat di squadra PT + atleti)
4. **Phase 4** — Broadcast PT → tutti gli atleti
5. **Phase 5** — Reazioni emoji, reply, pin messaggi

### Profili
- Profilo pubblico PT con sezione "testimonianze video"
- Profilo atleta con highlights e best-lift
- Verifica identità PT (badge "verificato")

### Discipline sportive
- Catalogo discipline (oltre Calisthenics: Powerlifting, Functional, Yoga, Running, Climbing, ecc.)
- Filtri discovery per disciplina
- Specializzazioni multi-disciplina per PT

### Collaboratori PT
- Inviti staff (assistenti, nutrizionisti, fisioterapisti) collegati al PT
- Permessi granulari per collaboratore
- Vista condivisa atleti del team

---

## 13. WORKFLOW

- **Development**: VS Code + Claude Code / Cursor (locally) **or** Lovable web editor
- **Repo**: https://github.com/pbaldassare/elevate-roles-hub.git
- **Lovable project ID**: `05f7b58c-39e8-4ba3-a7bf-bd051bc56040`
- **Supabase project ref**: `uiowzycolsmgcsvihmhy`
- **Preview URL**: https://id-preview--05f7b58c-39e8-4ba3-a7bf-bd051bc56040.lovable.app
- **Published URL**: https://elevate-roles-hub.lovable.app
- **Custom domain**: https://livelapp.iaconnect.it
- **Branch**: `main` — Lovable auto-syncs bidirectionally from/to `main` and applies migrations on push.

### Local dev
```bash
bun install
bun run dev      # Vite on :8080
bunx vitest run  # tests
```

---

## 14. DESIGN SYSTEM

- **Brand**: LIVELLAPP — **red gradient on black** logo
- **Athlete PWA**: strict **dark theme** + lime accent `#D4FF00`
- **PT web dashboard**: **teal** `#0d4f4f`
- **Admin**: shadcn/ui defaults
- **CSS variables**: defined in `src/index.css` — semantic tokens `--app-*` (athlete), `--pt-*` (PT), `--admin-*` (admin)
- **Tailwind**: extended in `tailwind.config.ts` to map tokens to utility classes (e.g. `bg-app-background`, `text-app-foreground`, `border-pt-primary`)
- **Typography**: System sans (Inter-like) — never serif unless specifically requested
- **Animations**: Framer Motion for page transitions, splash screens, wizards
- **Skeletons**: shimmer loaders to reduce CLS
- **Dialogs**: absolute centering + viewport-safe sizing (see `mem://style/dialog-standardization-system`)

### ❌ Never do
- Raw color utilities (`bg-white`, `text-black`, `bg-[#...]`) in components — bypasses theming
- Mix athlete (`app-*`) and PT (`pt-*`) tokens in the same surface

---

## 15. CRITICAL RULES FOR AI ASSISTANTS

1. **Never edit** `src/integrations/supabase/client.ts` or `src/integrations/supabase/types.ts` — both auto-generated.
2. **Never edit** `.env` — Lovable-managed (`VITE_SUPABASE_*` vars).
3. **Never edit** `supabase/config.toml` for project-level settings — auto-generated.
4. **DB statuses stay in English**: `active`, `pending`, `completato`, `attivo`, `terminated`. Localize only in UI.
5. **Roles**: Never store roles on `profiles`. Always use `user_roles` + `has_role()` security-definer RPC. Storing roles on profiles enables privilege escalation.
6. **Storage paths**: Always prefix with `${user.id}/` so RLS policies match.
7. **After any workout component change** (`GuidedWorkoutFlow`, `SetTracker`, `AtletaTimedRoundsPlayer`, `AtletaEmomPlayer`, `workout_logs`, PT history / "Allena ora"), run the workout quality checklist at `mem://features/workout-quality-checklist`:
   - Next-exercise preview present
   - Athlete notes + badge rendered
   - PT-on-behalf passes `athleteUserId`
   - History shows ko / delta correctly
8. **RLS-first**: Every new `public.<table>` migration must include `GRANT` to `authenticated` (and `service_role`), `ENABLE ROW LEVEL SECURITY`, and at least one `CREATE POLICY`. No GRANTs → runtime "permission denied".
9. **One PT per athlete** — `enforce_single_pt_connection` trigger handles it; don't bypass.
10. **Terminology**: "Attività" (not Workout), "Calisthenics" (not Crossfit), "Professionista" (covers PT/nutritionist/physio).
11. **Routing**: Admin → `/admin`, PT web → `/pt`, PT PWA → `/pt/app`, Athlete → `/app`. Never mix.
12. **PT mobile**: `usePTSurface` auto-redirects `/pt/*` → `/pt/app/*` on narrow viewports or PWA standalone. `?view=web` overrides.
13. **Pushing to `main`**: Lovable auto-syncs and applies any new `supabase/migrations/*.sql`. Never run stateful git commands locally inside the Lovable sandbox.
14. **Edge Functions**: Default `verify_jwt = true` unless explicitly public. Use `service_role` only server-side, never expose to client.
15. **Don't say "Supabase" to users** — say "Lovable Cloud" / "backend" / "database" / "auth".

---

_Last updated: 2026-06-22_
