

## Piano: Migliorare form eventi — immagine copertina + modifica evento

### Panoramica
Aggiungere una colonna `cover_image_url` alla tabella `calendar_events`, un bucket storage dedicato, upload immagine nel form di creazione, e la possibilità di modificare eventi esistenti.

### 1. Migration SQL
- `ALTER TABLE public.calendar_events ADD COLUMN cover_image_url text;`
- Creare bucket storage `event-covers` (pubblico)
- RLS storage: PT carica nelle proprie cartelle, tutti leggono

### 2. Form creazione evento migliorato (`CreatePublicEventDialog.tsx`)
- Aggiungere upload immagine copertina in cima al form usando `ImageUpload` variant `cover`
- Bucket: `event-covers`, path: `{user_id}/{timestamp}.{ext}`
- Salvare `cover_image_url` nell'insert
- Migliorare layout: raggruppare i campi in sezioni logiche con separatori visivi

### 3. Dialog modifica evento (nuovo componente `EditEventDialog.tsx`)
- Stesso layout del form creazione, precompilato con i dati dell'evento
- Mutation `update` su `calendar_events`
- Possibilità di cambiare immagine copertina
- Pulsante "Elimina evento" con conferma

### 4. Integrazione nella pagina calendario (`PTCalendarPage.tsx`)
- Aggiungere pulsante modifica (icona pencil) su ogni evento nella sidebar e nella lista "Prossimi 7 Giorni"
- Aprire `EditEventDialog` al click
- Mostrare anteprima immagine copertina nella card evento se presente
- Stesso dialog anche nel form inline della dashboard web

### File modificati
- **Migration SQL** — colonna + bucket storage
- **`CreatePublicEventDialog.tsx`** — upload immagine, layout migliorato
- **Nuovo `EditEventDialog.tsx`** — form modifica con precompilazione + delete
- **`PTCalendarPage.tsx`** — pulsanti modifica, anteprima immagini, integrazione EditEventDialog

