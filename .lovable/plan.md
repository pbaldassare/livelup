

## Piano: Specializzazioni, Certificazioni, Attestati e Foto Profilo PT

### Panoramica
Ristrutturare la sezione "Specializzazioni e Certificazioni" del PT Settings: da campi testo libero a tabelle gestite dall'admin, con dropdown searchable multi-select per il PT. Aggiungere foto profilo, upload attestati, suggerimenti all'admin e Google Maps per l'indirizzo.

---

### 1. Nuove tabelle database (migration SQL)

**`pt_specializations`** — catalogo specializzazioni gestite dall'admin
- `id`, `name`, `description`, `is_active`, `sort_order`, `created_at`
- RLS: admin CRUD, authenticated read (attive)
- Seed: Bodybuilding, Calisthenics, Yoga, Pilates, Functional Training, HIIT, Powerlifting, Riabilitazione, Sport Performance, Dimagrimento

**`pt_certifications`** — catalogo certificazioni gestite dall'admin
- `id`, `name`, `description`, `is_active`, `sort_order`, `created_at`
- RLS: admin CRUD, authenticated read (attive)
- Seed: CONI, FIF, ACSM, NASM, ISSA, ACE, NSCA, CSEN

**`pt_profile_specializations`** — join table (PT sceglie le sue)
- `pt_user_id` (FK profiles), `specialization_id` (FK pt_specializations), PK composita
- RLS: PT gestisce le proprie, admin legge tutto

**`pt_profile_certifications`** — join table (PT sceglie le sue)
- `pt_user_id`, `certification_id`, PK composita
- RLS: come sopra

**`pt_certificates`** — attestati caricati dal PT (documenti)
- `id`, `pt_user_id`, `name`, `file_url`, `file_type`, `created_at`
- RLS: PT gestisce i propri, admin legge tutto

**`pt_category_suggestions`** — suggerimenti dal PT all'admin
- `id`, `pt_user_id`, `type` (enum: 'specialization' | 'certification'), `name`, `status` (pending/approved/rejected), `created_at`
- RLS: PT inserisce, admin gestisce

**Storage bucket**: `pt-certificates` (pubblico, per i documenti attestati)

### 2. Admin Settings (`AdminSettingsPage.tsx`)
- Tab "Categorie" ampliato con 3 sotto-sezioni:
  - **Tipologie PT** (esistente, invariato)
  - **Specializzazioni** — CRUD identico alle tipologie
  - **Certificazioni** — CRUD identico alle tipologie
- Nuova sotto-sezione **Suggerimenti** — lista suggerimenti dai PT con azioni approva/rifiuta (approva = crea nella tabella corrispondente)

### 3. PT Settings (`PTSettingsPage.tsx`)
- **Foto profilo**: aggiungere `ImageUpload` variant avatar nella card "Informazioni Base", salva su bucket `avatars` e aggiorna `profiles.avatar_url`
- **Specializzazioni**: sostituire input testo con dropdown multi-select searchable che carica da `pt_specializations` + pulsante "Suggerisci nuova"
- **Certificazioni**: stesso dropdown multi-select da `pt_certifications` + pulsante "Suggerisci nuova"
- **Attestati**: nuova sezione per upload documenti (nome + file), lista con anteprima/download, eliminazione
- **Località**: aggiornare PlacesAutocomplete con `types={['geocode']}` per indirizzo completo, salvare `location_address`

### 4. File modificati
- **Migration SQL** — tutte le nuove tabelle, seed, storage bucket, RLS
- **`AdminSettingsPage.tsx`** — sezioni Specializzazioni, Certificazioni, Suggerimenti nel tab Categorie
- **`PTSettingsPage.tsx`** — foto profilo, dropdown multi-select, upload attestati, suggerimenti, Maps geocode

### Dettagli tecnici

**Dropdown multi-select searchable**: Implementato con Popover + Command (componenti shadcn già presenti). L'utente digita per filtrare, seleziona/deseleziona con checkbox. I valori selezionati appaiono come badge.

**Upload attestati**: Usa il bucket `pt-certificates`, path `{user_id}/{timestamp}.{ext}`. Accetta PDF, JPG, PNG. Nome personalizzabile. Lista con icona tipo file + download link.

**Suggerimenti**: Il PT compila un input con il nome della specializzazione/certificazione mancante. L'admin vede la lista nel tab Categorie con pulsanti Approva/Rifiuta.

