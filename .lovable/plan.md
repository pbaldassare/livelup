

## Piano: Integrazione Google Places API nel form creazione PT

### Obiettivo
Sostituire il campo testo libero "Città" con il componente `PlacesAutocomplete` già esistente, estendendolo per supportare anche indirizzi completi (via, città, coordinate).

### Modifiche

#### 1. Nuova colonna `location_address` su `pt_profiles`
- Migration SQL per aggiungere `location_address text` alla tabella `pt_profiles`
- Salverà l'indirizzo completo (es. "Via Roma 15, Milano, Italia")

#### 2. Aggiornamento `PlacesAutocomplete` — supporto indirizzi completi
- Aggiungere una prop opzionale `types` (default `['(cities)']`) per permettere ricerche per indirizzo completo (`['address']` o `['geocode']`)
- Nessuna breaking change per gli usi esistenti

#### 3. Aggiornamento form creazione PT (`AdminPTsPage.tsx`)
- Sostituire il campo `Input` "Città" con `PlacesAutocomplete` configurato per indirizzi completi
- Al momento della selezione di un luogo, salvare:
  - `location_city` — nome della città (estratto dal risultato)
  - `location_address` — indirizzo completo formattato
  - `location_lat` / `location_lng` — coordinate GPS
- Aggiornare la chiamata `create-user` per passare i nuovi campi

#### 4. Edge function `create-user`
- Accettare e salvare i nuovi campi `location_address`, `location_lat`, `location_lng` nel profilo PT

### File modificati
- **Migration SQL** — `ALTER TABLE pt_profiles ADD COLUMN location_address text`
- **`PlacesAutocomplete.tsx`** — prop `types` configurabile
- **`AdminPTsPage.tsx`** — integrazione PlacesAutocomplete + salvataggio coordinate e indirizzo
- **`create-user/index.ts`** — supporto campi indirizzo aggiuntivi

