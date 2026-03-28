

## Piano: Tipi evento gestiti dall'admin + visibilità + numero chiuso

### Panoramica
Trasformare i tipi evento da enum hardcoded a **tabella gestita dall'admin**, rimuovere il campo "Atleta", aggiungere **visibilità** (tutti / utenti app / solo atleti collegati) e **numero chiuso** con counter max partecipanti.

---

### 1. Migration SQL

**Nuova tabella `event_types`** (stessa struttura di `pt_types`):
- `id uuid PK`, `name text`, `description text`, `icon text`, `color text`, `is_active bool`, `sort_order int`, `created_at`
- Seed: Raduno, Evento, Gara, Allenamento, Altro
- RLS: admin CRUD, authenticated read (attive)

**Nuove colonne su `calendar_events`**:
- `event_type_id uuid REFERENCES event_types(id)` — sostituisce l'enum `event_type`
- `visibility text DEFAULT 'public'` — valori: `public` (tutti), `app_users` (utenti registrati), `connected_only` (solo atleti collegati al PT)
- `is_closed_number boolean DEFAULT false`
- `max_participants integer` — se numero chiuso, massimo partecipanti

Rimuovere la colonna `atleta_user_id` non è necessario (usata altrove per sessioni private), basta non mostrarla nel form eventi pubblici.

### 2. Admin Settings — tab "Categorie" → sezione "Tipi Evento"

Aggiungere una quarta sezione al tab Categorie, usando lo stesso componente `CatalogManager` già esistente:
- CRUD completo su `event_types`
- Stessa UX di Tipologie PT / Specializzazioni / Certificazioni

### 3. Form creazione evento (`CreatePublicEventDialog.tsx`)

- **Tipo evento**: dropdown che carica da `event_types` (non più hardcoded)
- **Rimuovere** il campo "Atleta (opzionale)"
- **Aggiungere campo "Visibilità"**: select con 3 opzioni:
  - Aperto a tutti
  - Solo utenti app
  - Solo atleti collegati
- **Aggiungere "Numero chiuso"**: switch + campo numerico per max partecipanti
- Salvare `event_type_id`, `visibility`, `is_closed_number`, `max_participants`

### 4. Form creazione evento dashboard web (`PTCalendarPage.tsx`)

Stesse modifiche del dialog mobile: tipo evento da DB, visibilità, numero chiuso. Rimuovere dropdown atleta dal form eventi pubblici.

### 5. Logica partecipazione (`PublicEventCard.tsx`, `EventsSection.tsx`)

- Controllare `visibility` per mostrare/nascondere eventi
- Se `is_closed_number = true` e partecipanti >= `max_participants`, disabilitare il pulsante "Partecipa" con messaggio "Posti esauriti"

### File modificati
- **Migration SQL** — tabella `event_types` + colonne su `calendar_events`
- **`AdminSettingsPage.tsx`** — sezione "Tipi Evento" nel tab Categorie
- **`CreatePublicEventDialog.tsx`** — tipo da DB, visibilità, numero chiuso, no atleta
- **`PTCalendarPage.tsx`** — stesse modifiche al form
- **`PublicEventCard.tsx`** — logica posti esauriti
- **`EventsSection.tsx`** / **`AtletaDiscoverPage.tsx`** — filtro visibilità

