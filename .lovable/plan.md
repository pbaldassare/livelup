

# Piano Integrazione Completa: PT, Atleta, Eventi, Gamification, Corsi, Blog

## Analisi Stato Attuale

### GIA' ESISTENTE (da riutilizzare):
- **Chat PT-Atleta**: realtime completa (tabelle `chats`, `messages`, pagine PT e Atleta)
- **Esercizi**: tabella `exercises` con `video_url`, `image_url`, `instructions`, `muscle_groups`, `created_by`
- **Video Player**: `ExerciseVideoPlayer` supporta YouTube, URL diretti, immagini
- **Template + Assegnazione**: `TemplateExerciseBuilder`, `AssignWorkoutDialog` (web + mobile)
- **Workout Execution**: `AtletaWorkoutDetailPage` con `SetTracker`, timer, RPE, resume
- **Progress Tracking**: `AtletaProgressPage` con calendario, grafici peso/mood/energia
- **Eventi**: `calendar_events` + `event_participants` + `event_comments` + geolocalizzazione + `CreatePublicEventDialog`
- **Marketplace PT**: `PTDiscoveryPage` + `AtletaDiscoverPage` con filtri, mappa, GPS
- **Profilo pubblico PT**: `PTProfilePage` con bio, certificazioni, recensioni, galleria
- **Gamification**: 13 badge automatici via trigger DB + `BadgeCard` + `atleta_badges`
- **Storage**: bucket `pt-gallery`, `avatars`, `cover-images`, `exercise-images`

### MANCANTE (da implementare):
1. **PT creazione esercizi custom** - il PT non ha UI per creare nuovi esercizi (solo seleziona da libreria)
2. **Upload video PT** - nessun bucket `exercise-videos`, nessuna UI upload video
3. **Blog PT** - nessuna tabella, nessuna pagina
4. **Corsi Admin** - nessuna tabella, nessuna pagina
5. **PT assegnazione badge manuale** - solo automatica via trigger
6. **Chat di gruppo PT** - solo chat 1:1

### INCOMPLETO (da completare):
- **Stato esercizio atleta** - il `SetTracker` traccia set completati ma non ha stato "quasi completato"
- **Geolocalizzazione eventi** - esiste nella creazione ma manca filtro per distanza nella lista eventi

---

## Piano di Implementazione (8 blocchi)

### Blocco 1: PT Creazione Esercizi Custom
**File da modificare:** `src/pages/pt/PTWorkoutsPage.tsx`
**Nessuna migrazione DB** - la tabella `exercises` ha già `created_by` e supporta esercizi privati (`is_public = false`)

- Aggiungere tab "Libreria Esercizi" nella pagina Workouts PT
- Dialog per creare esercizio: nome, categoria, muscoli, difficoltà, istruzioni, video_url (link YouTube/Vimeo/URL), image_url
- Il PT vede sia esercizi pubblici che i propri privati nel template builder

### Blocco 2: Upload Video Esercizi PT
**Migrazione DB:** creare bucket `exercise-videos` (public) + RLS
**File da creare:** nessun componente nuovo, estendere il dialog creazione esercizio

- Aggiungere bucket storage per video
- Nel dialog creazione esercizio: 3 tab (libreria piattaforma / link esterno / upload video)
- Upload video su bucket, salvataggio URL in `exercises.video_url`

### Blocco 3: Blog PT
**Migrazione DB:** creare tabella `blog_posts` (id, pt_user_id, title, content, cover_image_url, published_at, is_published, slug, tags[], created_at, updated_at) + RLS
**File da creare:**
- `src/pages/pt/PTBlogPage.tsx` - lista + creazione articoli (dashboard web)
- `src/pages/pt/PTAppBlogPage.tsx` - vista mobile
- `src/pages/atleta/AtletaBlogPage.tsx` - lettura articoli nell'app
- `src/pages/public/BlogPostPage.tsx` - lettura pubblica (condivisibile)

**Routing:** aggiungere rotte in App.tsx
**Nav:** aggiungere "Blog" nella sidebar PT dashboard e nel profilo pubblico PT

### Blocco 4: Corsi Admin
**Migrazione DB:** creare tabelle:
- `courses` (id, title, description, cover_image_url, price, is_free, difficulty_level, duration_minutes, category, is_published, created_by, created_at)
- `course_sessions` (id, course_id, title, description, order_index, duration_minutes, video_url, content)
- `course_enrollments` (id, course_id, user_id, enrolled_at, completed_at, progress_pct)
+ RLS appropriate

**File da creare:**
- `src/pages/admin/AdminCoursesPage.tsx` - CRUD corsi
- `src/pages/atleta/AtletaCoursesPage.tsx` - catalogo + esecuzione corsi
- `src/components/admin/CourseBuilder.tsx` - editor sessioni

**Seed data:** 2 corsi demo (Addominali d'acciaio 8min, Percorso Tai Chi) via edge function o insert tool

### Blocco 5: PT Assegnazione Badge Manuale
**Nessuna migrazione DB** - la tabella `atleta_badges` supporta già inserimenti dal PT (serve solo aggiungere RLS policy per PT)
**Migrazione:** aggiungere RLS policy INSERT per PT su `atleta_badges` dove `are_connected(auth.uid(), atleta_user_id)`

**File da modificare:**
- `src/pages/pt/PTAthleteDetailPage.tsx` - aggiungere sezione "Assegna Badge" nel dettaglio atleta

### Blocco 6: Miglioramento Stato Esercizi Atleta
**Nessuna migrazione DB** - il campo esiste già (set completati vs prescritti)
**File da modificare:** `src/components/app/SetTracker.tsx`

- Calcolare stato automatico: tutti i set completati = "completato", >50% = "quasi completato", <50% = "non completato"
- Mostrare icona stato colorata per ogni esercizio nella vista workout
- Rendere visibile al PT nel dettaglio atleta

### Blocco 7: Filtro Eventi per Distanza
**Nessuna migrazione** - `calendar_events` ha già `location_lat`, `location_lng`
**File da modificare:** `src/components/app/EventsSection.tsx`

- Aggiungere filtro distanza (slider km) nella sezione eventi di Discover
- Calcolare distanza client-side dalla posizione utente

### Blocco 8: Routing e Navigazione
**File da modificare:** `src/App.tsx`, `src/components/layouts/AdminLayout.tsx`, `src/components/layouts/PTDashboardLayout.tsx`, `src/components/app/MobileNav.tsx`

- Aggiungere tutte le nuove rotte
- Aggiungere link navigazione per Blog, Corsi nelle sidebar/nav appropriate

---

## Migrazioni DB Necessarie

```sql
-- 1. Bucket exercise-videos
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-videos', 'exercise-videos', true);
-- + RLS policies per PT upload

-- 2. Tabella blog_posts
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  slug TEXT,
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- + RLS: PT CRUD own, anyone SELECT published

-- 3. Tabelle courses + course_sessions + course_enrollments
-- + RLS: admin CRUD, authenticated SELECT published, user manage own enrollments

-- 4. RLS badge assignment per PT
```

## File Totali da Creare/Modificare

**Nuovi (6):**
- `src/pages/pt/PTBlogPage.tsx`
- `src/pages/public/BlogPostPage.tsx`
- `src/pages/admin/AdminCoursesPage.tsx`
- `src/pages/atleta/AtletaCoursesPage.tsx`
- `src/components/admin/CourseBuilder.tsx`
- `src/components/pt/CreateExerciseDialog.tsx`

**Modificati (7):**
- `src/pages/pt/PTWorkoutsPage.tsx` (tab libreria esercizi)
- `src/pages/pt/PTAthleteDetailPage.tsx` (assegnazione badge)
- `src/components/app/EventsSection.tsx` (filtro distanza)
- `src/components/app/SetTracker.tsx` (stati esercizio)
- `src/App.tsx` (nuove rotte)
- `src/components/layouts/AdminLayout.tsx` (link Corsi)
- `src/components/layouts/PTDashboardLayout.tsx` (link Blog)

## Ordine di Implementazione Consigliato
1. Migrazioni DB (tutte insieme)
2. Blocco 1+2 (esercizi PT + video)
3. Blocco 3 (blog)
4. Blocco 4 (corsi)
5. Blocchi 5+6+7 (badge, stati, filtri)
6. Blocco 8 (routing finale)

