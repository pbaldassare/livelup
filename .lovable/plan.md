

# Piano: Completamento Funzionalita Mancanti (esclusi Stripe, Email, Push)

## Cosa resta da fare

Escludendo Stripe, email transazionali e push notification triggers, restano queste aree:

### 1. Seed Data Corsi Demo
Inserire 2 corsi con sessioni nella tabella `courses` e `course_sessions`:
- **Addominali d'acciaio in 8 minuti al giorno** (gratuito, 3 sessioni: bassi/alti/medi, 8 min)
- **Percorso Tai Chi** (a pagamento €29.99, 4 sessioni con movimenti base)

Uso: insert tool (non migrazione)

### 2. PT Export CSV (Atleti + Pagamenti)
**File da modificare:** `src/pages/pt/PTAthletesPage.tsx`, `src/pages/pt/PTPaymentsPage.tsx`
- Aggiungere bottone "Esporta CSV" nell'header di entrambe le pagine
- Stesso pattern gia usato in `AdminAuditLogPage.tsx` (generazione CSV client-side, download via link)

### 3. Admin Settings Persistenza
**Migrazione DB:** creare tabella `platform_settings` (key TEXT PK, value JSONB, updated_at, updated_by) + RLS admin-only
**File da modificare:** `src/pages/admin/AdminSettingsPage.tsx`
- Sostituire useState locale con fetch/save da tabella `platform_settings`
- Caricare impostazioni all'avvio, salvare su click "Salva"

### 4. Foto Progresso Atleta (Prima/Dopo)
**Migrazione DB:** creare tabella `progress_photos` (id, atleta_user_id, photo_url, category [fronte/lato/retro], notes, taken_at, created_at) + RLS (atleta CRUD own, PT SELECT connected)
**Storage:** creare bucket `progress-photos` (public: false per privacy)
**File da creare:** `src/components/app/ProgressPhotos.tsx` — grid foto con upload, categorizzazione, confronto temporale
**File da modificare:** `src/pages/atleta/AtletaProgressPage.tsx` — aggiungere tab/sezione "Foto Progresso"

### 5. Chat di Gruppo PT (semplificata)
Funzionalita opzionale e complessa. Richiede ristrutturazione tabella `chats` (aggiungere `is_group`, `group_name`, tabella `chat_members`). **Propongo di rimandare** questa a un secondo momento per non rischiare di rompere la chat 1:1 esistente.

---

## Ordine di Implementazione

1. Migrazione DB (platform_settings + progress_photos + bucket)
2. Seed corsi demo (insert tool)
3. Admin Settings persistenza
4. PT Export CSV
5. Foto Progresso Atleta

## Riepilogo Modifiche

**Migrazioni:**
- Tabella `platform_settings`
- Tabella `progress_photos` + bucket storage

**Insert (seed):**
- 2 corsi + 7 sessioni

**File nuovi (1):**
- `src/components/app/ProgressPhotos.tsx`

**File modificati (4):**
- `src/pages/admin/AdminSettingsPage.tsx`
- `src/pages/pt/PTAthletesPage.tsx`
- `src/pages/pt/PTPaymentsPage.tsx`
- `src/pages/atleta/AtletaProgressPage.tsx`

