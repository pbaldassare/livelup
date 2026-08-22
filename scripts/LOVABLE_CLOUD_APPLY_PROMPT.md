# LIVELLAPP — Prompt Lovable Cloud: applica backend 17–18 luglio 2026

> **Come usare questo file**
> 1. Copia la sezione **PROMPT DA INCOLLARE IN LOVABLE** (blocco sotto) nella chat Lovable.
> 2. Se Lovable chiede SQL “a mano”, usa i path canonici elencati (o i blocchi SQL in appendice).
> 3. Non modificare `src/integrations/supabase/client.ts`, `types.ts`, `.env`.
> 4. Dopo le migration: **rigenera i TypeScript types** del backend e synca il frontend.
>
> **Project ref backend:** `kxgaqnksylntokyrpaxp`  
> **Dominio app:** `https://livelapp.iaconnect.it`  
> **Branch:** `main` (sync bidirezionale Lovable ↔ GitHub)

---

## PROMPT DA INCOLLARE IN LOVABLE

```text
Sei Lovable Cloud per il progetto LIVELLAPP (repo elevate-roles-hub, project ref kxgaqnksylntokyrpaxp).

OBIETTIVO
Applica TUTTO il lavoro backend del 17–18 luglio 2026 ancora mancante sul Cloud:
- migration SQL (schema, RLS, RPC, storage, seed opzionali)
- deploy Edge Functions nuove/modificate
- secrets richiesti
- rigenerazione types TypeScript del backend

REGOLE
1. Esegui le migration in ORDINE DI DIPENDENZA (vedi STEP sotto). Non inventare SQL.
2. Ogni file SQL è IDEMPOTENTE: se tabella/colonna/policy/funzione esiste già, SKIP e continua.
3. Preferisci i path CANONICI in supabase/migrations/*.sql. I file in scripts/*.sql sono MIRROR: usali solo se la migration omonima manca.
4. NON toccare src/integrations/supabase/client.ts, types.ts, .env.
5. Dopo SQL + functions: rigenera i types del backend e verifica che il frontend veda le nuove tabelle/colonne.
6. Per Google Calendar: dopo deploy, configura i secrets e la Redirect URI in Google Cloud Console (vedi STEP G).
7. Riporta un report finale: applicato / skip (già presente) / errore, per ogni step.

═══════════════════════════════════════════════════════════
FASE A — SQL SCHEMA (obbligatorio, in ordine)
═══════════════════════════════════════════════════════════

NOTA TIMESTAMP COLLISION: quattro file condividono il prefisso 20260718170000 — eseguili come step A7–A10 nell’ordine indicato sotto (non affidarti solo al sort alfabetico).

--- STEP A1 — Tipologie scheda + riordino atleta (CANONICO) ---
File: supabase/migrations/20260717140000_scheda_libera_reorder.sql
Cosa fa: colonne template_kind + athlete_reordered_at; CHECK libera|propedeutica|progressiva; RPC atleta_reorder_workout_exercises (solo scheda libera, solo free exercises).
Skip se: esiste già la funzione atleta_reorder_workout_exercises E colonna workouts.athlete_reordered_at.
Nota: supersede le bozze UUID 20260717125742 / 20260717130933 (se già applicate da sync Lovable, rieseguire questo file è OK — è più completo).
Mirror: nessuno.

--- STEP A2 — Constraint tipologie (rinforzo) ---
File: supabase/migrations/20260717143000_template_kind_three_types.sql
Cosa fa: riafferma CHECK su template_kind (3 valori).
Skip se: constraint già presenti con gli stessi valori.

--- STEP A3 — Hotfix colonne tipologie (se A1 non è passato) ---
File: supabase/migrations/20260717173000_hotfix_template_kind_columns.sql
Cosa fa: ADD COLUMN IF NOT EXISTS template_kind + athlete_reordered_at (senza RPC completa).
Skip se: A1 già ok. Utile solo come safety net.

--- STEP A4 — Cataloghi esercizi PT ---
File: supabase/migrations/20260717190000_exercise_catalogs.sql
Cosa fa: tabella exercise_catalogs + RLS + trigger updated_at.
Skip se: EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_catalogs').
Mirror: scripts/create-exercise-catalogs.sql
Nota: la bozza UUID 20260717141106 è una versione incompleta — preferisci QUESTO file.

--- STEP A5 — Items catalogo (DOPO A4) ---
File: supabase/migrations/20260717200000_exercise_catalog_items.sql
Cosa fa: exercise_catalog_items (junction) + RLS.
Skip se: tabella exercise_catalog_items esiste.
Mirror: scripts/create-exercise-catalog-items.sql

--- STEP A6 — Hotfix UNIQUE workout_logs (set) ---
File: supabase/migrations/20260718130000_hotfix_workout_logs_set_unique.sql
Cosa fa: dedupe log duplicati + UNIQUE (workout_exercise_id, set_number) per upsert “Completa serie”.
Skip se: indice workout_logs_workout_exercise_set_unique esiste.
Mirror: scripts/hotfix-workout-logs-set-unique.sql

--- STEP A7 — Gruppi community: canale Staff + membri pubblici ---
File: supabase/migrations/20260718140000_group_admins_channel_and_members_visibility.sql
Cosa fa: enum group_channel += 'admins'; policy group_members_select / group_messages_*.
Skip se: enum già contiene 'admins' E policy già aggiornate.
Mirror: scripts/group-admins-channel-and-members-visibility.sql

--- STEP A8 — Riepilogo sessione workout ---
File: supabase/migrations/20260718150000_workout_session_summary.sql
Cosa fa: workouts.duration_seconds, sets_completed, reps_total, volume_kg.
Skip se: colonna workouts.duration_seconds esiste.
Mirror: scripts/workout-session-summary.sql

--- STEP A9 — Availability bookable + Google Calendar connections ---
File: supabase/migrations/20260718160000_pt_availability_bookable_and_google_calendar.sql
Cosa fa:
  - pt_profiles.availability_bookable
  - policy atleta su pt_availability (solo se bookable)
  - tabella pt_google_calendar_connections (token solo service_role; client vede status)
Skip se: tabella pt_google_calendar_connections esiste E colonna availability_bookable esiste.
Mirror: scripts/pt-availability-bookable-and-google-calendar.sql

--- STEP A10 — Blog & Q&A schema ---
File: supabase/migrations/20260718170000_blog_qa_schema.sql
Cosa fa: blog_posts.post_type/status/author_kind/professional_profile_id/hidden_*; trigger sync_blog_post_status; RLS autori/admin/pubblico.
Skip se: colonna blog_posts.post_type esiste.
Mirror: scripts/blog-qa-schema.sql

--- STEP A11 — RPC ricerca colleghi PT ---
File: supabase/migrations/20260718170000_pt_colleague_search.sql
Cosa fa: SECURITY DEFINER search_pt_colleagues(text).
Skip se: funzione search_pt_colleagues esiste.
Mirror: nessuno.

--- STEP A12 — Gruppi: RLS profiles per lista membri (DOPO A7) ---
File: supabase/migrations/20260718170000_group_members_profiles_visibility.sql
Cosa fa: policy profiles per membri dello stesso gruppo + visitatori gruppi pubblici; riafferma group_members_select.
Skip se: policy "Group members can view fellow group members profiles" esiste.
Mirror: scripts/group-members-profiles-visibility.sql

--- STEP A13 — Chat PT: gruppi atleti + allegati storage ---
File: supabase/migrations/20260718170000_pt_chat_groups_and_attachments.sql
Cosa fa:
  - tabelle pt_chat_groups / pt_chat_group_members / pt_chat_group_reads
  - messages.chat_id nullable + messages.chat_group_id + CHECK esclusività
  - helper is_chat_group_participant; trigger last_message/notifiche estesi
  - RLS messages per gruppi
  - bucket privato storage chat-attachments (+ policy path ${user_id}/…)
Skip se: tabella pt_chat_groups esiste E bucket chat-attachments esiste.
Mirror: scripts/pt-chat-groups-and-attachments.sql
IMPORTANTE: questo file riscrive update_chat_last_message e create_message_notification — deve essere l’ultima versione applicata di quei trigger.

--- STEP A14 — Training modality + transfer RPC ---
File: supabase/migrations/20260718190000_pt_athlete_training_modality.sql
Cosa fa:
  - pt_atleta_connections.training_modality (in_presenza|online|mix)
  - _activate_pt_atleta_connection (copia modality)
  - get_ceded_athletes_for_pt()
  - transfer_athletes_to_pt(uuid[], uuid, text)
Skip se: colonna training_modality esiste E funzione get_ceded_athletes_for_pt esiste.
Mirror: scripts/pt-athlete-training-modality.sql

--- STEP A15 — google_event_id su calendar_events (DOPO A9) ---
File: supabase/migrations/20260718200000_google_calendar_event_id.sql
Cosa fa: calendar_events.google_event_id + index.
Skip se: colonna google_event_id esiste.
Mirror: scripts/google-calendar-event-id.sql

═══════════════════════════════════════════════════════════
FASE B — SQL SEED / DEMO (opzionale — solo ambienti demo)
═══════════════════════════════════════════════════════════

Esegui SOLO se serve dati di test. Skip in produzione se non richiesto.

--- STEP B1 — Seed programma Kato 4 settimane ---
File: supabase/migrations/20260717160000_seed_kato_4week_three_kinds.sql
(alt: edge function seed-kato-4week-program)

--- STEP B2 — Reset password Kato (demo) ---
File: supabase/migrations/20260717170000_reset_kato_password.sql
Password temporanea documentata nel file. NON eseguire in prod senza consenso.

--- STEP B3 — Seed Giulia 4 settimane ---
File: supabase/migrations/20260717172000_seed_giulia_4week_three_kinds.sql
(alt bozza: 20260717130621_*.sql — preferisci il file named)

--- STEP B4 — Seed blog/Q&A demo (DOPO A10) ---
File: supabase/migrations/20260718180000_blog_qa_seed.sql
Mirror: scripts/blog-qa-seed.sql
Idempotente per slug.

--- STEP B5 — (storico) assign all athletes → Marco Ferrari ---
File: scripts/assign-all-athletes-marco-ferrari.sql
Solo se serve reset demo massivo. ATTENZIONE: termina altre connessioni attive (1 PT/atleta).

═══════════════════════════════════════════════════════════
FASE C — EDGE FUNCTIONS (deploy)
═══════════════════════════════════════════════════════════

Deploy / aggiorna queste funzioni dal repo. Rispetta verify_jwt in supabase/config.toml.

OBBLIGATORIE (nuove / critiche 17–18 luglio):

1) google-calendar-oauth
   Path: supabase/functions/google-calendar-oauth/
   Shared: supabase/functions/_shared/googleCalendar.ts
   verify_jwt = false  (callback Google senza JWT utente; auth interna su start/status/disconnect)
   README: supabase/functions/google-calendar-oauth/README.md

2) google-calendar-sync
   Path: supabase/functions/google-calendar-sync/
   Shared: stesso _shared/googleCalendar.ts
   verify_jwt = true
   README: supabase/functions/google-calendar-sync/README.md

3) send-athlete-welcome-email
   Path: supabase/functions/send-athlete-welcome-email/
   Shared: supabase/functions/_shared/athleteWelcomeEmail.ts
   Nota config.toml: c’è una doppia entry verify_jwt (true poi false) — lascia UNA sola entry:
     [functions.send-athlete-welcome-email]
     verify_jwt = false
   (oppure true se invochi solo con JWT; la logica email usa RESEND_API_KEY).

4) pt-create-athlete
   Path: supabase/functions/pt-create-athlete/
   verify_jwt = true
   Usa athleteWelcomeEmail shared — ridistribuire insieme a (3).

5) create-user
   Path: supabase/functions/create-user/
   verify_jwt = false
   Ridistribuire se ha ricevuto cambiamenti recenti (welcome / create flow).

6) admin-assign-athlete-workouts
   Path: supabase/functions/admin-assign-athlete-workouts/
   verify_jwt = true (default — non è in config.toml: ok così)

OPZIONALI / demo:
7) seed-kato-4week-program
8) seed-marco-ferrari-demo (verify_jwt = true)
9) seed-demo-pts, seed-platform-data, seed-test-users — solo se li usi ancora

Dopo deploy: conferma che le funzioni compaiono nell’elenco Edge Functions del Cloud.

═══════════════════════════════════════════════════════════
FASE D — SECRETS (Edge Functions)
═══════════════════════════════════════════════════════════

Imposta nei secrets delle Edge Functions (Lovable Cloud → Secrets / Edge Function secrets):

GOOGLE CALENDAR (obbligatori per connect/sync):
- GOOGLE_CLIENT_ID          = <OAuth Web Client ID da Google Cloud Console>
- GOOGLE_CLIENT_SECRET      = <OAuth Client Secret>
- GOOGLE_REDIRECT_URI       = https://kxgaqnksylntokyrpaxp.supabase.co/functions/v1/google-calendar-oauth?action=callback
  (opzionale: se omesso, la function usa questo default da SUPABASE_URL)
- APP_ORIGIN                = https://livelapp.iaconnect.it
  (opzionale: destinazione post-OAuth; default nello stesso codice)

EMAIL WELCOME ATLETA (opzionale ma consigliato):
- RESEND_API_KEY            = <chiave Resend>
- RESEND_FROM_EMAIL         = LIVELLAPP <noreply@livelapp.iaconnect.it>  (o dominio verificato)
- SITE_URL                  = https://livelapp.iaconnect.it

Già presenti di solito (non ricreare a mano se Lovable li gestisce):
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

═══════════════════════════════════════════════════════════
FASE E — GOOGLE CLOUD CONSOLE (manuale, fuori da Lovable SQL)
═══════════════════════════════════════════════════════════

1. Abilita Google Calendar API sul progetto GCP.
2. Crea OAuth Client tipo “Web application”.
3. Authorized redirect URI (match ESATTO):
   https://kxgaqnksylntokyrpaxp.supabase.co/functions/v1/google-calendar-oauth?action=callback
4. Authorized JavaScript origins (se richiesti):
   https://livelapp.iaconnect.it
   https://elevate-roles-hub.lovable.app
   https://id-preview--05f7b58c-39e8-4ba3-a7bf-bd051bc56040.lovable.app
5. Copia Client ID / Secret nei secrets (Fase D).

═══════════════════════════════════════════════════════════
FASE F — TYPES + CONFIG
═══════════════════════════════════════════════════════════

1. Rigenera i TypeScript types del backend (Lovable: regenerate types) così
   src/integrations/supabase/types.ts include:
   exercise_catalogs, exercise_catalog_items, pt_chat_groups*,
   pt_google_calendar_connections, nuove colonne blog_posts / workouts /
   calendar_events / pt_atleta_connections / pt_profiles.
2. Assicurati che supabase/config.toml sul Cloud abbia:
   [functions.google-calendar-oauth] verify_jwt = false
   [functions.google-calendar-sync] verify_jwt = true
   e UNA sola entry per send-athlete-welcome-email.
3. NON editare a mano client.ts / .env.

═══════════════════════════════════════════════════════════
FASE G — VERIFICA SQL RAPIDA (esegui e riporta risultati)
═══════════════════════════════════════════════════════════

Esegui queste query di smoke (adatta se qualche oggetto manca — segnala):

SELECT to_regclass('public.exercise_catalogs') AS catalogs,
       to_regclass('public.exercise_catalog_items') AS catalog_items,
       to_regclass('public.pt_chat_groups') AS chat_groups,
       to_regclass('public.pt_google_calendar_connections') AS gcal;

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='workouts'
  AND column_name IN ('template_kind','athlete_reordered_at','duration_seconds','sets_completed','reps_total','volume_kg');

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='blog_posts'
  AND column_name IN ('post_type','status','author_kind','professional_profile_id');

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='pt_atleta_connections'
  AND column_name = 'training_modality';

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='calendar_events'
  AND column_name = 'google_event_id';

SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'chat-attachments';

SELECT proname FROM pg_proc
WHERE proname IN (
  'atleta_reorder_workout_exercises',
  'search_pt_colleagues',
  'get_ceded_athletes_for_pt',
  'transfer_athletes_to_pt',
  'is_chat_group_participant'
);

═══════════════════════════════════════════════════════════
FASE H — SMOKE TEST UI (checklist)
═══════════════════════════════════════════════════════════

PT PWA / web:
[ ] Cataloghi: crea catalogo + aggiungi esercizi (exercise_catalogs / items)
[ ] Scheda: crea template libera / propedeutica / progressiva; assegna
[ ] Atleta: riordino esercizi solo su scheda libera prima di partire
[ ] Completa serie: nessun errore ON CONFLICT su workout_logs
[ ] Fine allenamento: duration_seconds / sets / reps / volume salvati e visibili in storico
[ ] Disponibilità: toggle “bookable”; atleta vede slot solo se attivo
[ ] Google Calendar: Connetti → redirect Google → status connected; crea appuntamento → sync (google_event_id)
[ ] Chat: crea gruppo atleti, invia messaggio, allega immagine (bucket chat-attachments)
[ ] Cerca colleghi PT (RPC search_pt_colleagues)
[ ] Modalità allenamento atleta (in_presenza/online/mix) + lista ceduti / transfer bulk
[ ] Blog PT: bozza/pubblica article|curiosity|qa; admin può nascondere

Gruppi community:
[ ] Tab Membri mostra nomi (non lista vuota) — RLS profiles
[ ] Canale Staff (admins) visibile solo agli admin del gruppo

Atleta:
[ ] Welcome email (se RESEND configurato) alla creazione da PT
[ ] Chat gruppo + allegati

REPORT FINALE
Per ogni step A1–A15, B*, C*, D*: stato = applied | skipped_already_present | failed(+errore).
Elenca eventuali blocker (secrets Google mancanti, Resend, migration già parziale).
```

---

## Inventario file (17–18 luglio 2026)

### Migration canoniche (`supabase/migrations/`)

| Ordine | File | Tipo | Note |
|---|---|---|---|
| A1 | `20260717140000_scheda_libera_reorder.sql` | schema+RPC | Canonico tipologie + riordino |
| A2 | `20260717143000_template_kind_three_types.sql` | schema | Rinforzo CHECK |
| A3 | `20260717173000_hotfix_template_kind_columns.sql` | hotfix | Solo se A1 manca |
| A4 | `20260717190000_exercise_catalogs.sql` | schema | |
| A5 | `20260717200000_exercise_catalog_items.sql` | schema | Dopo A4 |
| A6 | `20260718130000_hotfix_workout_logs_set_unique.sql` | hotfix | |
| A7 | `20260718140000_group_admins_channel_and_members_visibility.sql` | RLS/enum | |
| A8 | `20260718150000_workout_session_summary.sql` | columns | |
| A9 | `20260718160000_pt_availability_bookable_and_google_calendar.sql` | schema+RLS | Prima di A15 |
| A10 | `20260718170000_blog_qa_schema.sql` | schema+RLS | Prima di B4 |
| A11 | `20260718170000_pt_colleague_search.sql` | RPC | Stesso timestamp — ordine esplicito |
| A12 | `20260718170000_group_members_profiles_visibility.sql` | RLS | Dopo A7 |
| A13 | `20260718170000_pt_chat_groups_and_attachments.sql` | schema+storage | Dopo A6 ok; indip. da blog |
| A14 | `20260718190000_pt_athlete_training_modality.sql` | schema+RPC | |
| A15 | `20260718200000_google_calendar_event_id.sql` | column | Dopo A9 |
| B1 | `20260717160000_seed_kato_4week_three_kinds.sql` | seed | Opzionale |
| B2 | `20260717170000_reset_kato_password.sql` | seed/auth | Opzionale / demo |
| B3 | `20260717172000_seed_giulia_4week_three_kinds.sql` | seed | Opzionale |
| B4 | `20260718180000_blog_qa_seed.sql` | seed | Dopo A10 |

### Bozze Lovable UUID (17 luglio) — di solito già syncate; NON preferirle ai named

| File | Contenuto | Azione |
|---|---|---|
| `20260717125742_ec918a01-….sql` | bozza template_kind + reorder | Skip se A1 applicato |
| `20260717125949_291d72f6-….sql` | reset password Kato | Equiv. B2 |
| `20260717130621_bf106a97-….sql` | seed Giulia | Preferisci B3 named |
| `20260717130933_a00896c8-….sql` | athlete_reordered_at + RPC | Skip se A1 |
| `20260717141106_089e2eb6-….sql` | bozza exercise_catalogs | Preferisci A4 |

### Mirror `scripts/*.sql` ↔ migration

| Script | Migration canonica |
|---|---|
| `scripts/create-exercise-catalogs.sql` | `20260717190000_exercise_catalogs.sql` |
| `scripts/create-exercise-catalog-items.sql` | `20260717200000_exercise_catalog_items.sql` |
| `scripts/hotfix-workout-logs-set-unique.sql` | `20260718130000_hotfix_workout_logs_set_unique.sql` |
| `scripts/group-admins-channel-and-members-visibility.sql` | `20260718140000_…` |
| `scripts/workout-session-summary.sql` | `20260718150000_…` |
| `scripts/pt-availability-bookable-and-google-calendar.sql` | `20260718160000_…` |
| `scripts/blog-qa-schema.sql` | `20260718170000_blog_qa_schema.sql` |
| `scripts/blog-qa-seed.sql` | `20260718180000_blog_qa_seed.sql` |
| `scripts/group-members-profiles-visibility.sql` | `20260718170000_group_members_profiles_visibility.sql` |
| `scripts/pt-chat-groups-and-attachments.sql` | `20260718170000_pt_chat_groups_and_attachments.sql` |
| `scripts/pt-athlete-training-modality.sql` | `20260718190000_…` |
| `scripts/google-calendar-event-id.sql` | `20260718200000_…` |
| `scripts/assign-all-athletes-marco-ferrari.sql` | (solo demo; no migration omonima 17–18) |

---

## Grafo dipendenze (riassunto)

```text
A1 scheda/riordino ──► A2/A3 (rinforzo)
A4 catalogs ──► A5 catalog_items
A6 workout_logs unique          (indipendente)
A7 group admins channel ──► A12 profiles visibility
A8 session summary              (indipendente)
A9 gcal connections + bookable ──► A15 google_event_id
A10 blog schema ──► B4 blog seed
A11 colleague search            (indipendente)
A13 chat groups + attachments   (indipendente; ultima versione trigger messages)
A14 training_modality           (indipendente)

Edge: A9+A15 prima che google-calendar-sync sia utile end-to-end
Secrets Google: prima del primo “Connetti Google Calendar” in UI
```

---

## Edge Functions — riepilogo deploy

| Function | Path | verify_jwt | Secrets extra |
|---|---|---|---|
| `google-calendar-oauth` | `supabase/functions/google-calendar-oauth/` | **false** | GOOGLE_* , APP_ORIGIN |
| `google-calendar-sync` | `supabase/functions/google-calendar-sync/` | true | GOOGLE_* |
| `_shared/googleCalendar.ts` | shared | — | usato da entrambe |
| `send-athlete-welcome-email` | `…/send-athlete-welcome-email/` | false (consigliato) | RESEND_* , SITE_URL |
| `pt-create-athlete` | `…/pt-create-athlete/` | true | RESEND_* (via shared) |
| `create-user` | `…/create-user/` | false | (se welcome/create aggiornato) |
| `admin-assign-athlete-workouts` | `…/admin-assign-athlete-workouts/` | true (default) | — |
| `seed-kato-4week-program` | opzionale demo | — | — |

Redirect URI Google (copia esatta):

```
https://kxgaqnksylntokyrpaxp.supabase.co/functions/v1/google-calendar-oauth?action=callback
```

---

## Appendice — SQL inline (se Lovable non legge i file)

> Usa i file del repo se disponibili. Incolla da qui solo se serve SQL editor manuale.
> Per file molto lunghi (chat groups, seed blog/kato/giulia) apri il path indicato e incolla l’intero file.

### A3 — Hotfix colonne tipologie (corto)

```sql
-- File: supabase/migrations/20260717173000_hotfix_template_kind_columns.sql
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'libera';

ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_template_kind_check;

ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_template_kind_check
  CHECK (template_kind IN ('libera', 'propedeutica', 'progressiva'));

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'libera';

ALTER TABLE public.workouts
  DROP CONSTRAINT IF EXISTS workouts_template_kind_check;

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_template_kind_check
  CHECK (template_kind IN ('libera', 'propedeutica', 'progressiva'));

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS athlete_reordered_at timestamptz;

COMMENT ON COLUMN public.workouts.athlete_reordered_at IS
  'Timestamp ultimo riordino esercizi free da parte dell''atleta (scheda libera)';
```

### A6 — Hotfix UNIQUE workout_logs

```sql
-- File: supabase/migrations/20260718130000_hotfix_workout_logs_set_unique.sql
DELETE FROM public.workout_logs wl
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY workout_exercise_id, set_number
        ORDER BY logged_at DESC
      ) AS rn
    FROM public.workout_logs
  ) ranked
  WHERE ranked.rn > 1
) dupes
WHERE wl.id = dupes.id;

CREATE UNIQUE INDEX IF NOT EXISTS workout_logs_workout_exercise_set_unique
  ON public.workout_logs (workout_exercise_id, set_number);
```

### A8 — Session summary

```sql
-- File: supabase/migrations/20260718150000_workout_session_summary.sql
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS sets_completed integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS reps_total integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS volume_kg numeric;

COMMENT ON COLUMN public.workouts.duration_seconds IS 'Durata sessione in secondi (timer client al complete)';
COMMENT ON COLUMN public.workouts.sets_completed IS 'Set completati (snapshot a fine allenamento)';
COMMENT ON COLUMN public.workouts.reps_total IS 'Reps totali (snapshot a fine allenamento)';
COMMENT ON COLUMN public.workouts.volume_kg IS 'Volume totale kg = Σ(reps × peso) (snapshot)';
```

### A15 — google_event_id

```sql
-- File: supabase/migrations/20260718200000_google_calendar_event_id.sql
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS google_event_id text;

COMMENT ON COLUMN public.calendar_events.google_event_id IS
  'Google Calendar event id when synced via google-calendar-sync edge function.';

CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id
  ON public.calendar_events(google_event_id)
  WHERE google_event_id IS NOT NULL;
```

### File grandi — apri e incolla intero contenuto

| Step | Path (incolla tutto) |
|---|---|
| A1 | `supabase/migrations/20260717140000_scheda_libera_reorder.sql` |
| A4 | `supabase/migrations/20260717190000_exercise_catalogs.sql` |
| A5 | `supabase/migrations/20260717200000_exercise_catalog_items.sql` |
| A7 | `supabase/migrations/20260718140000_group_admins_channel_and_members_visibility.sql` |
| A9 | `supabase/migrations/20260718160000_pt_availability_bookable_and_google_calendar.sql` |
| A10 | `supabase/migrations/20260718170000_blog_qa_schema.sql` |
| A11 | `supabase/migrations/20260718170000_pt_colleague_search.sql` |
| A12 | `supabase/migrations/20260718170000_group_members_profiles_visibility.sql` |
| A13 | `supabase/migrations/20260718170000_pt_chat_groups_and_attachments.sql` |
| A14 | `supabase/migrations/20260718190000_pt_athlete_training_modality.sql` |
| B4 | `supabase/migrations/20260718180000_blog_qa_seed.sql` |

---

## Blocker tipici

1. **Google Calendar non si connette** → secrets `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` mancanti, oppure Redirect URI non identica in Google Console.
2. **`verify_jwt` su oauth** → deve restare `false` altrimenti il callback `?action=callback` fallisce.
3. **Chat allegati 403** → migration A13 non applicata (bucket/policy) o path upload non inizia con `${user.id}/`.
4. **Tab Membri gruppo vuota** → manca A12 (RLS profiles); il frontend fa fetch separata, non embed FK.
5. **ON CONFLICT workout_logs** → manca A6.
6. **Types frontend stale** → dopo SQL, rigenerare types Lovable (i cast `as any` in chat API spariscono dopo regen).
7. **Timestamp collision `20260718170000_*`** → applicare A10→A11→A12→A13 nell’ordine del prompt, non solo per nome file.

---

_Ultimo aggiornamento: 2026-07-18 — generato per applicare il backlog backend 17–18 luglio su Lovable Cloud._
