

## Piano: Chat Admin con Broadcast e Log Messaggi

### Panoramica
Creare una nuova pagina **Messaggi** nell'admin per inviare comunicazioni broadcast (a tutti gli atleti, a tutti i PT, o a utenti singoli) e visualizzare il log completo di tutte le chat della piattaforma.

---

### 1. Migration SQL

**Nuova tabella `admin_broadcasts`**:
- `id uuid PK`, `sender_user_id uuid` (admin), `subject text`, `content text`
- `target_type text` — valori: `all_athletes`, `all_pts`, `all_users`, `single_user`
- `target_user_id uuid` (nullable, solo per `single_user`)
- `recipients_count integer`, `created_at timestamptz`
- RLS: solo admin CRUD

**Nuova tabella `admin_broadcast_recipients`**:
- `id uuid PK`, `broadcast_id uuid FK`, `user_id uuid`, `is_read boolean DEFAULT false`, `read_at timestamptz`
- RLS: admin vede tutto, utente vede i propri

### 2. Pagina Admin Messaggi (`AdminMessagesPage.tsx`)

Due tab principali:

**Tab "Broadcast"**:
- Form per comporre un messaggio broadcast con:
  - **Destinatari**: select con opzioni (Tutti gli atleti / Tutti i PT / Tutti gli utenti / Utente specifico)
  - Se "Utente specifico": campo ricerca utente con autocomplete
  - **Oggetto** e **Contenuto** (textarea)
  - Pulsante "Invia"
- Sotto il form: lista degli ultimi broadcast inviati con data, target, n. destinatari, tasso di lettura

**Tab "Log Chat"**:
- Tabella con tutte le chat della piattaforma: PT ↔ Atleta
- Colonne: PT, Atleta, Ultimo messaggio, Data, N. messaggi totali
- Click su una riga → apre un pannello laterale (Sheet) con lo storico completo dei messaggi (read-only)
- Filtri: ricerca per nome PT/atleta, intervallo date

### 3. Notifiche broadcast
- Quando l'admin invia un broadcast, crea una `notification` per ogni destinatario con type `broadcast`
- I destinatari vedono la notifica nella loro bell icon

### 4. Integrazione nel layout admin
- Aggiungere voce **"Messaggi"** nella sidebar di `AdminLayout.tsx` con icona `MessageSquare`
- Aggiungere rotta `/admin/messages` in `App.tsx`

### File modificati/creati
- **Migration SQL** — tabelle `admin_broadcasts` + `admin_broadcast_recipients`
- **Nuovo `AdminMessagesPage.tsx`** — pagina con tab Broadcast + Log Chat
- **`AdminLayout.tsx`** — voce sidebar "Messaggi"
- **`App.tsx`** — rotta `/admin/messages`

