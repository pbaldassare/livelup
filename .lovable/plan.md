

# Piano: Punto 7 — Calendario PT Completo con Prenotazione Atleta

## Stato Attuale

**Già implementato:**
- `AtletaBookingPage` (/app/booking): selettore data (14 giorni), slot orari dalla disponibilità PT, creazione evento + notifica PT
- `PTAppCalendarPage`: vista settimanale mobile con eventi
- `PTCalendarPage`: vista dashboard web con calendario mensile + creazione eventi
- `PTAvailabilityManager`: gestione disponibilità settimanale (giorni + orari)
- Tabelle `calendar_events`, `pt_availability` con RLS corrette

**Problemi identificati:**
1. **PTCalendarPage (dashboard web)** filtra per `creator_user_id = user.id` — non mostra le prenotazioni degli atleti
2. **Nessun link alla booking page** dalla navigazione atleta (non in MobileNav, non nella home)
3. **No vista "Le mie prenotazioni"** lato atleta — dopo aver prenotato non c'è modo di rivederle
4. **No cancellazione** — né atleta né PT possono cancellare una prenotazione
5. **PT non ha il calendario nella nav mobile** — manca il tab Calendar

## Piano di Implementazione

### 1. Fix query PTCalendarPage (dashboard web)
- Cambiare filtro da `creator_user_id = user.id` a `pt_user_id = user.id` per includere le prenotazioni degli atleti
- Aggiungere badge "Prenotato da atleta" agli eventi creati da altri

### 2. Fix query PTAppCalendarPage (app mobile)
- Già filtra per `pt_user_id` — OK, funziona correttamente
- Aggiungere pulsante cancellazione su ogni EventCard (solo per il PT)

### 3. Aggiungere tab Calendario nella MobileNav PT
- Sostituire un tab o aggiungerne uno (es. Calendar al posto di Chat, o ridisegnare a 5 tab con Calendar)

### 4. Aggiungere accesso booking dalla home atleta
- Aggiungere bottone "Prenota sessione" nella home atleta (AtletaAppHome) e/o nella pagina workout
- Opzionalmente sostituire un tab nella nav (es. aggiungere Calendar)

### 5. Sezione "Le mie sessioni" nell'atleta
- Nella booking page o in una sezione dedicata, mostrare le prossime sessioni prenotate dall'atleta
- Query su `calendar_events` dove `atleta_user_id = user.id`
- Possibilità di cancellare (update `is_cancelled = true`)

### 6. Cancellazione prenotazione
- Atleta: può cancellare le proprie prenotazioni (almeno 24h prima)
- PT: può cancellare qualsiasi evento dal proprio calendario
- Notifica all'altra parte alla cancellazione

## File da modificare
- `src/pages/pt/PTCalendarPage.tsx` — fix query + badge prenotazioni atleta
- `src/pages/atleta/AtletaBookingPage.tsx` — aggiungere sezione "Le mie sessioni" + cancellazione
- `src/components/app/MobileNav.tsx` — aggiungere Calendar per PT, accesso booking per atleta
- `src/pages/atleta/AtletaAppHome.tsx` — bottone "Prenota sessione"
- `src/pages/pt/PTAppCalendarPage.tsx` — aggiungere cancellazione eventi

## Nessuna modifica DB necessaria
Le tabelle e le policy RLS sono già configurate correttamente per questo flusso.

