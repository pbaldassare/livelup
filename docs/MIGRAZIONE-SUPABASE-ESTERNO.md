# Migrazione da Lovable Cloud a Supabase esterno — Livelapp

Guida completa e ordinata per trasportare **tutto** il backend (schema, dati, storage,
auth, edge functions, secret, configurazioni) dal progetto Lovable Cloud
(`kxgaqnksylntokyrpaxp`) a un progetto **Supabase self-managed / account proprio**.

> Regola d'oro: esegui i passi **nell'ordine indicato**. Ogni passo ha una verifica.
> Non cancellare nulla sul progetto sorgente finché il passo 10 (collaudo) non è verde.

---

## 0. Inventario di ciò che va trasportato

| Componente | Quantità attuale | Come si trasporta |
|---|---|---|
| Tabelle schema `public` | **92** | `pg_dump` schema + dati (passi 3–4) |
| Enum / tipi custom | 30 | inclusi nel dump schema |
| Funzioni DB (SECURITY DEFINER, RPC) | ~100 | incluse nel dump schema |
| Trigger | ~40 | inclusi nel dump schema |
| Policy RLS + GRANT | tutte | incluse nel dump schema |
| Migration nel repo | 183 file in `supabase/migrations/` | alternativa "clean rebuild" (passo 3B) |
| Storage buckets | **12** (vedi sotto) | script `scripts/migrate/copy-storage.mjs` |
| Utenti Auth (`auth.users`, identities) | tutti | dump dello schema `auth` (passo 5) |
| Edge Functions | **16** in `supabase/functions/` | `supabase functions deploy` (passo 6) |
| Secret Edge Functions | 12 nomi (vedi passo 7) | reinserimento manuale |
| Auth hook "Send Email" | attivo → `auth-send-email` | riconfigurare (passo 8) |
| Provider OAuth Google | attivo | riconfigurare + nuovo redirect URI |
| Frontend env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | passo 9 |

**Buckets:** `avatars`, `cover-images`, `pt-gallery` (5 MB limit), `pt-certificates`,
`exercise-images`, `exercise-videos`, `event-covers` → **pubblici**;
`athlete-documents`, `progress-photos`, `chat-attachments`, `group-chat-attachments`,
`group-images` → **privati**.

---

## 1. Prerequisiti locali

```bash
brew install postgresql@16 supabase/tap/supabase   # o equivalente Linux
node -v   # >= 20
```

Serve `pg_dump`/`psql` **versione ≥ 15** (allineata al Postgres di Supabase).

## 2. Crea il progetto Supabase di destinazione

1. supabase.com → New project (stessa region della sorgente, es. `eu-central-1`).
2. Annota: `PROJECT_REF`, `DB PASSWORD`, `anon key`, `service_role key`.
3. Crea `scripts/migrate/.env.migrate` (NON committarlo):

```bash
# SORGENTE (Lovable Cloud) — chiedi l'export/credenziali dalla dashboard Cloud
SRC_DB_URL="postgresql://postgres:PASSWORD@db.kxgaqnksylntokyrpaxp.supabase.co:5432/postgres"
SRC_URL="https://kxgaqnksylntokyrpaxp.supabase.co"
SRC_SERVICE_KEY="..."

# DESTINAZIONE
DST_DB_URL="postgresql://postgres:PASSWORD@db.NUOVOREF.supabase.co:5432/postgres"
DST_URL="https://NUOVOREF.supabase.co"
DST_SERVICE_KEY="..."
DST_REF="NUOVOREF"
```

> Il database password del progetto Lovable Cloud **non è esposto**: usa
> **Cloud → Advanced settings → Export data** per ottenere il dump dei dati, oppure
> collega il repo GitHub e ricostruisci lo schema dalle migration (passo 3B).

## 3A. Schema (via dump) — percorso consigliato se hai la connection string sorgente

```bash
bash scripts/migrate/dump.sh          # crea backup/schema.sql, backup/data.sql, backup/auth.sql
bash scripts/migrate/restore.sh       # ripristina sulla destinazione
```

## 3B. Schema (via migration del repo) — percorso senza connection string sorgente

```bash
supabase link --project-ref $DST_REF
supabase db push          # applica in ordine tutte le 183 migration di supabase/migrations/
```

Poi importa **solo i dati** dall'export CSV/dump ottenuto da Cloud → Advanced settings → Export data.

**Verifica passo 3:**
```sql
select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'; -- 92
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
select count(*) from pg_policies where schemaname='public';
```

## 4. Dati

`restore.sh` carica `data.sql` con `--disable-triggers` (evita che i trigger di
notifica/badge generino record spuri) e in ordine di dipendenza FK.

**Verifica:** confronta i conteggi riga tabella per tabella:
```bash
bash scripts/migrate/verify-counts.sh
```

## 5. Utenti Auth

Gli utenti vivono in `auth.users` + `auth.identities`. Il dump `auth.sql` contiene
solo queste due tabelle (le altre sono ricreate da Supabase).

- Gli hash password (`encrypted_password`, bcrypt) sono portabili: **gli utenti
  mantengono la stessa password**.
- Gli UUID restano identici → tutte le FK `user_id` in `public` restano valide.
- Se importi `auth` DOPO `public`, disattiva temporaneamente i trigger
  `handle_new_user_role` / `on_auth_user_created` per non duplicare profili
  (già gestito da `restore.sh`).

**Verifica:** `select count(*) from auth.users;` deve coincidere, e un login di prova
con un account reale deve funzionare.

## 6. Storage

```bash
node scripts/migrate/copy-storage.mjs
```

Ricrea i 12 bucket con le stesse visibilità/limiti e copia tutti gli oggetti
mantenendo i path (`${user.id}/...`, fondamentale per le policy RLS).
Le **policy storage** sono incluse nel dump schema (tabella `storage.objects` policies);
se usi il percorso 3B, riapplica gli statement `create policy ... on storage.objects`
presenti nelle migration.

## 7. Edge Functions + secret

```bash
supabase link --project-ref $DST_REF
supabase functions deploy --no-verify-jwt=false   # oppure una per una
```

Funzioni da deployare (16): `admin-assign-athlete-workouts`, `admin-audit`,
`auth-send-email`, `create-user`, `delete-user`, `google-calendar-oauth`,
`google-calendar-sync`, `import-workout-schema`, `pt-create-athlete`,
`seed-demo-pts`, `seed-kato-4week-program`, `seed-marco-ferrari-demo`,
`seed-platform-data`, `seed-test-users`, `send-athlete-welcome-email`,
`send-push-notification`.

`supabase/config.toml` contiene già i flag `verify_jwt` per ciascuna: sostituisci
`project_id` con il nuovo ref.

Secret da reimpostare (`supabase secrets set NOME=valore`):

| Secret | Note |
|---|---|
| `RESEND_API_KEY` | invariato |
| `RESEND_FROM_EMAIL` | invariato |
| `SEND_EMAIL_HOOK_SECRET` | **rigenerare** e riallineare all'hook (passo 8) |
| `SITE_URL` | `https://livelapp.iaconnect.it` |
| `APP_ORIGIN` | idem |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | invariati |
| `GOOGLE_REDIRECT_URI` | **nuovo**: `https://NUOVOREF.supabase.co/functions/v1/google-calendar-oauth` |
| `LOVABLE_API_KEY` | ⚠️ **non funziona fuori da Lovable Cloud**: se usi BeeBot/AI Gateway serve sostituirlo con una chiave OpenAI/Gemini propria e adattare la chiamata |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | iniettati automaticamente da Supabase |

## 8. Configurazione Auth

Da replicare nel nuovo progetto (Authentication → settings):

1. **Site URL**: `https://livelapp.iaconnect.it`; **Redirect URLs**: aggiungi
   `https://livelapp.iaconnect.it/**`, l'eventuale dominio di preview e `http://localhost:8080/**`.
2. **Email confirmation attiva** (`auto_confirm_email = false`).
3. **Auth Hook "Send Email"** → URI `https://NUOVOREF.supabase.co/functions/v1/auth-send-email`,
   secret = `SEND_EMAIL_HOOK_SECRET`.
4. **Provider Google**: stesso client ID/secret, aggiungi il nuovo callback
   `https://NUOVOREF.supabase.co/auth/v1/callback` nella Google Cloud Console.
5. Password policy / JWT expiry come nella sorgente.

## 9. Frontend

`src/integrations/supabase/client.ts` legge:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Su Lovable questi file sono gestiti dalla piattaforma. Dopo lo scollegamento da Cloud
(o sull'hosting proprio: Vercel/Netlify/VPS) imposta le tre variabili con i valori del
nuovo progetto e rideploya. Nessun'altra modifica di codice è necessaria: tutte le
chiamate passano dal client condiviso.

Rigenera i tipi:
```bash
supabase gen types typescript --project-id $DST_REF > src/integrations/supabase/types.ts
```

## 10. Collaudo end-to-end (checklist)

- [ ] Login PT esistente + login atleta esistente (password invariate)
- [ ] Signup nuovo atleta → email di conferma via Resend arriva e il link funziona
- [ ] PT crea atleta (`pt-create-athlete`) + welcome email
- [ ] Richiesta connessione PT↔Atleta → accetta → atleta vede la scheda
- [ ] Assegnazione scheda, esecuzione allenamento, `workout_logs` salvati
- [ ] Chat 1:1 e di gruppo, realtime + allegati (bucket privati)
- [ ] Upload avatar/foto progressi (path `${user.id}/`, RLS ok)
- [ ] Calendario + sync Google (nuovo redirect URI)
- [ ] Export PDF scheda
- [ ] Push notification
- [ ] Pannello Admin: audit/coerenza, statistiche (`get_admin_stats`)
- [ ] Coupon / abbonamenti

## 11. Cutover

1. Metti l'app in sola lettura o avvisa gli utenti (finestra ~30 min).
2. Ri-esegui `dump.sh` + `restore.sh` **solo dati** per catturare le ultime modifiche.
3. Ri-esegui `copy-storage.mjs` (copia incrementale: salta i file già presenti).
4. Cambia le env del frontend → deploy.
5. Monitora log Auth/Edge per 24h.
6. Solo dopo, disattiva Lovable Cloud.

## 12. Punti di attenzione specifici di Livelapp

- **`LOVABLE_API_KEY` / AI Gateway**: unica dipendenza non portabile. Va sostituito il
  provider AI (BeeBot / assistente PT) con chiave propria.
- **Realtime**: abilita la publication `supabase_realtime` sulle tabelle usate
  (`messages`, `notifications`, `pt_atleta_connections`, `group_messages`):
  `alter publication supabase_realtime add table public.messages;` ecc.
- **Cron/scheduled**: nessun job pg_cron in uso — verificare comunque `select * from cron.job;`.
- **`app_404_logs`, `audit_logs`**: tabelle storiche, opzionalmente non migrabili.
- **Estensioni**: assicurati che nel nuovo progetto siano attive `pgcrypto`, `uuid-ossp`,
  `pg_net` (se usata), `pg_trgm` (ricerche testo).
