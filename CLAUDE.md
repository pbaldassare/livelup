# CLAUDE.md — Contesto progetto LIVELLAPP

> **Per Claude (Claude Code / Claude.ai con accesso al repo):** leggi **tutto** questo file all'inizio di ogni sessione prima di modificare codice, schema DB o configurazioni. È la fonte di verità sul progetto.
>
> **Per il team:** aggiorna questo file quando cambiano architettura, regole critiche, task aperti o workflow. Esiste anche `CURSOR.md` con lo stesso contenuto per Cursor — tienili allineati.

---

## Istruzioni per Claude

1. **Prima di ogni task:** rileggi le sezioni *Panoramica*, *Regole critiche* e *Task aperti* rilevanti.
2. **Lingua UI:** italiano. **Stati DB:** inglese (`active`, `pending`, `completato`…). Non mescolare.
3. **Backend:** chiamalo "Lovable Cloud" / "backend" con l'utente — non "Supabase".
4. **Scope minimo:** cambia solo ciò che serve; rispetta convenzioni esistenti in `src/`.
5. **Dopo modifiche workout:** verifica la checklist qualità (sezione 15, regola 7).
6. **Nuove migration SQL:** sempre GRANT + RLS + policy.
7. **Non toccare** file auto-generati (elenco in sezione 15).

### Comandi locali

```bash
npm install          # oppure: bun install
npm run dev          # oppure: bun run dev  → Vite su :8080
npx vitest run       # oppure: bunx vitest run
```

### Link utili

| Risorsa | URL / valore |
|---|---|
| Repo | https://github.com/pbaldassare/elevate-roles-hub.git |
| Preview Lovable | https://id-preview--05f7b58c-39e8-4ba3-a7bf-bd051bc56040.lovable.app |
| Produzione | https://elevate-roles-hub.lovable.app |
| Dominio custom | https://livelapp.iaconnect.it |
| Lovable project ID | `05f7b58c-39e8-4ba3-a7bf-bd051bc56040` |
| Supabase project ref | `uiowzycolsmgcsvihmhy` |
| Branch principale | `main` (sync bidirezionale con Lovable) |

---

## 1. PANORAMICA PROGETTO

- **Nome:** LIVELLAPP
- **Scopo:** piattaforma fitness italiana modulare che sostituisce CRM, builder schede, chat, calendario, pagamenti e gamification con un unico sistema integrato per Personal Trainer e Atleti.
- **Ruoli** (rigidi, non mescolabili):
  - **Admin** — solo web (`/admin`) — gestisce piattaforma, PT, cataloghi, corsi, pagamenti
  - **PT** (Personal Trainer) — dashboard web (`/pt`) + PWA (`/pt/app`) — gestisce atleti, schede, calendario, blog, coupon
  - **Atleta** — solo PWA (`/app`) — si allena, traccia progressi, chatta col PT, scopre eventi
- **Stato:** MVP avanzato, quasi production-ready. Flussi core completi; integrazioni reali (Stripe live, email transazionali, trigger push) ancora pending.
- **Lingua:** UI in **italiano** ("Attività", "Calisthenics", "Professionista"). Identificatori di stato nel DB in **inglese**. Localizza solo nel layer UI.

---

## 2. TECH STACK

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript 5 |
| Styling | Tailwind CSS v3 + shadcn/ui + CSS variables (token semantici) |
| Routing | react-router-dom v6 |
| State / Data | TanStack Query (React Query) + Supabase realtime |
| Backend | **Lovable Cloud** (Supabase) — Postgres, Auth, Storage, Edge Functions, Realtime |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Animations | Framer Motion |
| Charts | Recharts |
| Forms | react-hook-form + zod |
| PWA | Workbox (precache, offline, prompt aggiornamento) |
| Maps | Google Maps JS API + Places API |
| Push | Web Push API + Service Worker + Edge Function `send-push-notification` |
| AI | Lovable AI Gateway (BeeBot assistant) |
| Testing | Vitest + React Testing Library; Playwright (via shell) |
| Icons | lucide-react |

---

## 3. STRUTTURA FILE E CARTELLE

```
src/
├── App.tsx                      # Route root (admin/pt/atleta/public) + ProtectedRoute
├── main.tsx                     # Bootstrap React, QueryClient, AuthProvider
├── index.css                    # Design tokens (--app-*, --pt-*, --admin-*)
│
├── assets/                      # Logo SVG e asset brand
├── components/
│   ├── admin/                   # Widget solo admin (CourseBuilder, SubscriptionPlanForm)
│   ├── app/                     # Componenti PWA atleta (workout player, chat, calendario)
│   │   ├── GuidedWorkoutFlow.tsx       # Runner allenamento interattivo
│   │   ├── SetTracker.tsx              # Log set-by-set con RPE
│   │   ├── AtletaEmomPlayer.tsx        # Player protocollo EMOM
│   │   ├── AtletaTimedRoundsPlayer.tsx # Player AMRAP / timed rounds
│   │   ├── NextExercisePreview.tsx     # Anteprima esercizio in pausa
│   │   ├── PTAppPageShell.tsx          # Shell mobile PT PWA
│   │   ├── PTMoreDrawer.tsx            # Drawer "altro" PT PWA
│   │   └── MobileNav.tsx               # Tab bar inferiore
│   ├── auth/                    # ProtectedRoute, RequireUserName
│   ├── common/                  # EmptyState, PermissionGate, LoadingSpinner, ImageUpload
│   ├── dashboard/               # PageHeader, DataTable, DetailSheet, KPICard (PT/Admin web)
│   ├── exercises/               # ExerciseDetailDialog
│   ├── layouts/
│   │   ├── AdminLayout.tsx
│   │   ├── PTDashboardLayout.tsx        # Sidebar PT web, redirect mobile → /pt/app
│   │   ├── AppLayout.tsx                # Layout PWA atleta + PT
│   │   └── PublicLayout.tsx
│   ├── notifications/           # NotificationDropdown
│   ├── protocols/               # ProtocolInfoPopover (standard/emom/amrap/superset/hiit)
│   ├── pt/                      # Widget dashboard PT
│   ├── pwa/                     # InstallBanner, PWAUpdatePrompt
│   ├── reviews/                 # PTReviewForm, AtletaReviewsHistory
│   ├── settings/                # PushNotificationToggle
│   ├── shared/                  # WorkoutHistoryList (condiviso PT/atleta)
│   ├── skeletons/               # Placeholder shimmer
│   └── ui/                      # Primitivi shadcn/ui (non modificare aggressivamente)
│
├── hooks/
│   ├── useAuth.tsx              # Sessione + risoluzione ruolo (lastGoodRoleRef)
│   ├── usePermissions.tsx       # ROLE_ACCESS_MATRIX
│   ├── useAtletaStatus.tsx      # Stato collegato / premium
│   ├── usePTSurface.tsx         # PT 'web' vs 'app'; mappa /pt/* → /pt/app/*
│   ├── usePTHomeData.tsx, usePTStats.tsx, useAdminStats.tsx
│   ├── usePushNotifications.tsx, useRealtimeNotifications.tsx, useNotifications.tsx
│   ├── usePWAUpdate.tsx, useInstallPrompt.tsx
│   ├── useTeammates.tsx, useConnectionRequest.tsx, usePTConnectionRequests.tsx
│   └── use-mobile.tsx, use-toast.ts
│
├── lib/
│   ├── api/                     # Accesso dati Supabase tipizzato
│   │   ├── connections.ts       # Ciclo vita connessione PT-Atleta
│   │   ├── discovery.ts         # Ricerca PT, filtri, distanza
│   │   ├── messages.ts          # Chat CRUD + realtime
│   │   ├── programs.ts          # Programmi multi-settimana
│   │   ├── templateLoader.ts    # Caricamento template + esercizi
│   │   └── workouts.ts          # CRUD workout, completamento, log
│   ├── protocols/               # Logica protocolli (emom, amrap, superset, timedRounds)
│   ├── coupons.ts, setsData.ts, safeStorage.ts, utils.ts
│
├── pages/
│   ├── Index.tsx                # Redirect home per ruolo
│   ├── admin/                   # 17 pagine admin
│   ├── atleta/                  # 22 pagine PWA atleta
│   ├── pt/                      # Dashboard PT + pagine PT PWA (PTApp* con embedded=true)
│   ├── auth/AuthPage.tsx        # Login/signup (param ref + coupon)
│   └── public/                  # Landing, Blog, PTDiscovery, PTProfile, Install
│
├── integrations/supabase/
│   ├── client.ts                # ⚠️ AUTO-GENERATO — non modificare
│   └── types.ts                 # ⚠️ AUTO-GENERATO — non modificare
│
├── types/
│   ├── roles.ts                 # AppRole, ROLE_ACCESS_MATRIX, getHomeRoute()
│   └── database.ts              # Alias tipi dominio
│
└── test/                        # Setup Vitest + test esempio

.lovable/
├── memory/                      # Regole memoria progetto (mem://...)
└── plan.md                      # Piano implementazione corrente

supabase/
├── config.toml                  # ⚠️ Gestito da Lovable
├── functions/                   # Edge Functions
└── migrations/                  # Migration SQL (timestampate)

public/
├── sw.js, offline.html, livellapp-icon.svg, robots.txt
```

---

## 4. SCHEMA DATABASE

### Tabelle core (RLS su tutte)

| Tabella | Scopo | Colonne chiave |
|---|---|---|
| `profiles` | Profilo base (join `auth.users`) | `user_id`, `email`, `full_name`, `avatar_url`, `city` |
| `user_roles` | Assegnazione ruolo (separata da profiles) | `user_id`, `role` (`admin`/`pt`/`atleta`) |
| `permissions` | Flag capability granulari | |
| `pt_profiles` | Info PT | `user_id`, `status`, `bio`, `pt_types`, `rating_avg`, `max_athletes` |
| `atleta_profiles` | Info atleta | `user_id`, `status`, `goals`, `fitness_level` |
| `professional_profiles` | Nutrizionisti, fisioterapisti | separato da PT |
| `pt_atleta_connections` | 1 PT attivo per atleta (trigger) | `pt_user_id`, `atleta_user_id`, `status`, `requested_by` |
| `pt_packages`, `atleta_pt_subscriptions` | Pacchetti PT e abbonamenti atleta | decremento sessioni automatico |
| `pt_reviews`, `pt_athlete_notes`, `pt_favorite_exercises` | Recensioni, note, preferiti | |

### Workout

| Tabella | Scopo |
|---|---|
| `exercises` | Libreria globale (admin) + privata (PT) |
| `workout_templates`, `template_blocks`, `template_exercises` | Template PT |
| `workout_programs`, `program_schedules`, `program_assignments` | Programmi multi-settimana |
| `workouts` | Attività assegnata (`attivo`/`completato`/`scaduto`) |
| `workout_blocks`, `workout_exercises` | Struttura per-workout (copia da template) |
| `workout_logs` | Log per set (reps, peso, durata, RPE) |

### Chat, calendario, gamification, pagamenti

- **Chat/calendario:** `chats`, `messages`, `calendar_events`, `event_types`, `event_participants`, `event_comments`, `notifications`, `push_subscriptions`
- **Gamification:** `badges`, `atleta_badges`, `cheers`, `progress_tracking`, `progress_photos`
- **Contenuti:** `courses`, `course_sessions`, `course_enrollments`, `blog_posts`
- **Pagamenti:** `coupon_templates`, `coupons`, `subscription_plans`, `subscriptions`, `payments`
- **Supporto:** `support_tickets`, `ticket_messages`, `audit_logs`, `platform_settings`

### Storage buckets

| Bucket | Pubblico | Uso |
|---|---|---|
| `avatars`, `cover-images`, `pt-gallery`, `pt-certificates` | ✅ | Profili, gallery PT |
| `exercise-images`, `exercise-videos`, `event-covers` | ✅ | Media esercizi/eventi |
| `progress-photos`, `athlete-documents` | ❌ | Dati privati atleta |

**Convenzione path:** prefissa sempre con `${user.id}/` per RLS.

### Funzioni DB chiave (SECURITY DEFINER)

`has_role`, `get_my_role`, `are_connected`, `can_atleta_review_pt`, `get_admin_stats`, `get_pt_stats`, `get_weekly_workout_stats`, `count_unread_messages`, `pt_save_workout_log`, `is_premium`, `get_sessions_remaining`

### Trigger chiave

`handle_new_user_role`, `enforce_single_pt_connection`, `update_atleta_status_on_connection`, `update_pt_rating`, `check_and_award_badges`, `decrement_subscription_session`, `create_message_notification`, `create_connection_notification`

---

## 5. ROUTING E NAVIGAZIONE

| Superficie | Prefisso | Route guard |
|---|---|---|
| Pubblico | `/`, `/install`, `/blog/:slug`, `/pt-discovery`, `/pt/:slug`, `/auth` | — |
| Admin | `/admin/*` | `AdminRoute` |
| PT web | `/pt/*` | `PTDashboardRoute` (redirect mobile → `/pt/app/*`) |
| PT PWA | `/pt/app/*` | `PTAppRoute` |
| Atleta PWA | `/app/*` | `AtletaRoute` |

**Override:** `?view=web` forza layout PT web anche su mobile (test/dev).

**File ruoli:** `src/types/roles.ts` — `AppRole`, `ROLE_ACCESS_MATRIX`, `getHomeRoute()`.

---

## 6. COMPONENTI CHIAVE

| Componente | Ruolo | Scopo |
|---|---|---|
| `GuidedWorkoutFlow` | Atleta | Runner allenamento end-to-end con timer e resume |
| `SetTracker` | Atleta | Log per set con RPE e note |
| `AtletaEmomPlayer` / `AtletaTimedRoundsPlayer` | Atleta | Player protocolli specializzati |
| `NextExercisePreview` | Atleta | Anteprima esercizio in pausa |
| `PTAppPageShell` | PT PWA | Header sticky, safe-area, wrapper mobile |
| `ProtectedRoute` + route guards | Auth | Protezione per ruolo |
| `PermissionGate`, `ConnectedAtletaGate` | Auth | Gating inline |
| `DataTable`, `DetailSheet`, `PageHeader` | Dashboard | Blocchi riusabili PT/Admin |
| `ChatList` / `ChatMessages` | Entrambi | Chat realtime |
| `PWAUpdatePrompt` / `InstallBanner` | PWA | Update e installazione |

---

## 7. GESTIONE STATO

- **Server state:** TanStack Query — letture via `useQuery` in `src/hooks/` o pagine; mutazioni con `useMutation` + `invalidateQueries`.
- **Auth:** `useAuth` (Context) — `onAuthStateChange` + `get_my_role` RPC con `lastGoodRoleRef`.
- **UI locale:** `useState` / `useReducer`; workout flow usa `localStorage` via `safeStorage`.
- **Realtime:** canali Postgres Changes su `messages`, `notifications`, `pt_atleta_connections`.
- **Niente Redux, Zustand, Jotai.**

---

## 8. API E DATA LAYER

### `src/lib/api/`

| File | Operazioni principali |
|---|---|
| `connections.ts` | request/accept/reject/terminate connection |
| `discovery.ts` | searchPTs, filtro Haversine client-side |
| `messages.ts` | sendMessage, markAsRead, subscribeToChat |
| `programs.ts` | CRUD programmi, assegnazione |
| `workouts.ts` | assignWorkout (copia template), completeWorkout, saveLog |

### Edge Functions (`supabase/functions/`)

`create-user`, `delete-user`, `admin-audit`, `import-workout-schema`, `seed-platform-data`, `seed-test-users`, `send-push-notification`

---

## 9. LOGICA DI BUSINESS

### Matrice accesso ruoli

```
admin  → dashboard_admin only
pt     → dashboard_pt + app_pt + profilo pubblico
atleta → app_atleta + sito pubblico
```

### Connessione PT–Atleta (3 step)

1. **Richiesta** — una delle parti (`status='pending'`)
2. **Accetta/Rifiuta** — controparte aggiorna status
3. **Attivazione** — `status='active'`: termina altre connessioni attive (1 PT/atleta), `atleta_profiles.status='collegato'`, notifica

### Assegnazione e completamento workout

- Assegnare template **copia** blocchi/esercizi in `workout_blocks` / `workout_exercises` (snapshot immutabile)
- Atleta logga set via `SetTracker` → `workout_logs`
- Su `completato`: badge, decremento sessioni pacchetto, eligibilità recensione
- PT può loggare per conto atleta via `pt_save_workout_log` RPC

### Protocolli (`src/lib/protocols/`)

`standard`, `emom`, `amrap`, `superset`, `hiit`/`tabata` — tempo cadence: 4 cifre `Eccentric-Pause-Concentric-Pause` (es. `3010`)

### Gamification, recensioni, abbonamenti, coupon, eventi

- 13 badge attivi; cheers con limite giornaliero; PT può assegnare badge manualmente
- Recensione dopo ≥1 workout completato con quel PT
- Pacchetti PT con decremento sessioni automatico
- Coupon via `?ref=<pt_slug>&coupon=<code>` in signup
- Eventi geolocalizzati con filtro distanza Haversine; booking slot 1h, cancellazione 24h

---

## 10. VARIABILI AMBIENTE

Frontend (`.env` — gestito da Lovable, **non modificare**):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

Secrets Edge Functions: `SUPABASE_*`, `LOVABLE_API_KEY` — `SERVICE_ROLE_KEY` non accessibile agli utenti Lovable Cloud.

---

## 11. ISSUE NOTE E FEATURE PENDING

### Completato

- Fix redirect loop auth, fix chiamate ripetute `get_my_role`
- Fix upload esercizi, fix RLS medio
- Overhaul shell/routing PT PWA
- Test `usePTSurface` (32 passing)

### Pending piattaforma

- Stripe pagamenti reali (attualmente mock)
- Email transazionali (SMTP/Resend)
- Trigger push automatici (solo fan-out manuale)
- Test E2E Playwright su flussi critici

---

## 12. TASK APERTI (Todoist — label: Mancanti + Livel up)

### Archivio esercizi — Lorenzo
Filtri muscoli/attrezzatura, import CSV bulk, versionamento con storico, tag PT personalizzati

### Scheda — Lorenzo
Editor drag-and-drop blocchi, duplica blocco, note PT in esecuzione, anteprima protocollo pre-assegnazione

### Programmi — Lorenzo
Multi-settimana con progressione auto, template riusabili, calendario visuale assegnazioni

### Atleti — Paolo
Filtri stato/abbonamento/ultima attività, export CSV, lista compatta mobile, note private con tag

### Corsi — Paolo
Player video + tracking, quiz fine sezione, certificato, sezione "I miei corsi" atleta

### Lato atleta
Storico allenamenti con grafici volume, feed sociale squadra, wishlist esercizi, diario alimentare base

### Messaggistica (5 fasi)
1. Chat 1:1 stabile + typing + delivery receipts
2. Allegati (immagini, video, audio)
3. Gruppi squadra PT + atleti
4. Broadcast PT → tutti atleti
5. Reazioni emoji, reply, pin

### Profili, discipline sportive, collaboratori PT
Testimonianze video PT, highlights atleta, badge verificato; catalogo discipline multi-sport; inviti staff con permessi granulari

---

## 13. DESIGN SYSTEM

- **Brand:** LIVELLAPP — logo rosso gradiente su nero
- **PWA atleta:** dark theme + accent lime `#D4FF00`
- **Dashboard PT web:** teal `#0d4f4f`
- **Admin:** default shadcn/ui
- **Token CSS:** `--app-*` (atleta), `--pt-*` (PT), `--admin-*` (admin) in `src/index.css`
- **Tailwind:** classi semantiche (`bg-app-background`, `border-pt-primary`)

### Mai fare

- Colori raw (`bg-white`, `text-black`, `bg-[#...]`) — bypassa theming
- Mescolare token `app-*` e `pt-*` sulla stessa superficie

---

## 14. REGOLE CRITICHE PER ASSISTENTI AI

1. **Non modificare** `src/integrations/supabase/client.ts` o `types.ts` — auto-generati.
2. **Non modificare** `.env` — gestito da Lovable.
3. **Non modificare** `supabase/config.toml` a livello progetto — auto-generato.
4. **Stati DB in inglese** — localizza solo in UI.
5. **Ruoli solo in `user_roles`** + RPC `has_role()` — mai su `profiles`.
6. **Storage:** path `${user.id}/` per RLS.
7. **Dopo modifiche workout** (`GuidedWorkoutFlow`, `SetTracker`, player protocolli, `workout_logs`, history PT): checklist qualità — anteprima prossimo esercizio, note atleta + badge, PT-on-behalf con `athleteUserId`, history ko/delta corretti.
8. **RLS-first:** ogni nuova tabella `public.*` → GRANT + ENABLE RLS + almeno una policy.
9. **Un PT per atleta** — rispetta trigger `enforce_single_pt_connection`.
10. **Terminologia:** "Attività", "Calisthenics", "Professionista".
11. **Routing:** Admin `/admin`, PT web `/pt`, PT PWA `/pt/app`, Atleta `/app` — non mescolare.
12. **PT mobile:** `usePTSurface` redirect → `/pt/app/*`; override `?view=web`.
13. **Push su `main`:** Lovable applica migration da `supabase/migrations/*.sql`.
14. **Edge Functions:** `verify_jwt = true` di default; `service_role` solo server-side.
15. **Con l'utente:** dire "Lovable Cloud" / "backend", non "Supabase".

---

## 15. CHANGELOG CONTESTO

Aggiorna questa sezione quando fai modifiche significative al progetto (nuove feature, refactor architetturali, nuove regole):

| Data | Modifica |
|---|---|
| 2026-06-22 | Creazione `CLAUDE.md` — contesto iniziale allineato a `CURSOR.md` |

---

_Ultimo aggiornamento: 2026-06-22_
