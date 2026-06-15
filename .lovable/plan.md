## Cosa capisco dalla richiesta

Hai un solo calendario PT (`/pt/calendar`) che mescola due cose molto diverse:

1. **Eventi pubblici/community** — open day, lezioni di gruppo, gare, "Calisthenics Day Brescia"… creati dal PT, visibili agli atleti (anche non collegati a seconda della `visibility`).
2. **Appuntamenti 1-a-1** — sessioni di allenamento prenotate da un atleta collegato (`AtletaBookingPage` inserisce `event_type='allenamento'` + `atleta_user_id`), o create dal PT per un atleta specifico.

Oggi vivono entrambi in `calendar_events`, distinguibili solo indirettamente (presenza di `atleta_user_id`, `is_public`, `visibility`). La pagina mostra tutto insieme con un calendarino mensile shadcn + lista — poco utile e graficamente debole.

Voglio replicare l'esperienza calendario di **garda rent boat**: header con switch Giorno / Settimana / Mese, navigazione prev/next + datepicker + "Oggi", vista a griglia oraria per giorno/settimana, vista mese con badge per giorno, ricerca, card dettaglio, click su slot vuoto per creare.

Sul lato **atleta** (PWA dark/lime) le due categorie devono restare distinte: gli **eventi** si vedono già in Discover/Eventi, mentre gli **appuntamenti** vanno in evidenza nel calendario personale (oggi `AtletaCalendarView` mostra solo le attività della scheda).

---

## Modello dati

Aggiungere un campo esplicito `category` su `calendar_events` (no nuova tabella: la struttura è già adatta, cambia solo la semantica e il filtraggio).

```sql
-- enum
create type public.calendar_event_category as enum ('evento', 'appuntamento');

alter table public.calendar_events
  add column category public.calendar_event_category;

-- backfill
update public.calendar_events
  set category = case
    when atleta_user_id is not null then 'appuntamento'::public.calendar_event_category
    else 'evento'::public.calendar_event_category
  end
  where category is null;

alter table public.calendar_events
  alter column category set not null,
  alter column category set default 'evento';

-- vincolo logico: un appuntamento deve avere atleta_user_id, un evento no
create or replace function public.calendar_events_validate()
returns trigger language plpgsql as $$
begin
  if new.category = 'appuntamento' and new.atleta_user_id is null then
    raise exception 'Un appuntamento deve avere atleta_user_id';
  end if;
  if new.category = 'evento' and new.atleta_user_id is not null then
    raise exception 'Un evento pubblico non può avere atleta_user_id';
  end if;
  return new;
end $$;

create trigger trg_calendar_events_validate
  before insert or update on public.calendar_events
  for each row execute function public.calendar_events_validate();

create index if not exists idx_calendar_events_pt_cat_start
  on public.calendar_events (pt_user_id, category, start_datetime);
```

Nessuna modifica a RLS: le policy esistenti già coprono PT/atleta.

Aggiornare di conseguenza gli insert già presenti:
- `AtletaBookingPage` → `category: 'appuntamento'`
- `PTCalendarPage` (dialog "Nuovo Evento") → `category: 'evento'`
- `CreatePublicEventDialog` → `category: 'evento'`
- nuovo dialog "Nuovo Appuntamento" (lato PT, per fissare manualmente una sessione con un atleta collegato) → `category: 'appuntamento'`

---

## Routing e navigazione PT

```text
/pt/calendar              → redirect a /pt/calendar/eventi (retro-compat)
/pt/calendar/eventi       → Calendario Eventi
/pt/calendar/appuntamenti → Calendario Appuntamenti
```

Nella sidebar PT (`PTDashboardLayout`) sostituire la voce "Calendario" con un gruppo collassabile:
- Calendario
  - Eventi
  - Appuntamenti

Tab segmentate in cima alla pagina per switch rapido tra le due viste (stato sincronizzato con l'URL).

---

## UI calendario PT (stile garda rent boat)

Nuovi componenti riutilizzati da entrambe le pagine (Eventi/Appuntamenti):

```text
src/components/pt/calendar/
├── CalendarShell.tsx        // header con view-switch, prev/next, datepicker, "Oggi", search, bottone Nuovo
├── CalendarDayView.tsx      // griglia oraria 06–23, blocchi colorati posizionati per ora
├── CalendarWeekView.tsx     // 7 colonne giorno × righe ora
├── CalendarMonthView.tsx    // griglia mese con max 3 chip per cella + "+N"
├── EventBlock.tsx           // card colorata (titolo, ora, location/atleta) usata da Day/Week
└── EventDetailDialog.tsx    // dialog dettaglio + azioni (modifica, annulla, contatta)
```

Differenze per tipologia (stessa shell, dataset e UX diversi):

**Calendario Eventi**
- Query: `category = 'evento'`, `pt_user_id = me`.
- Colore base: rosso brand (`role-pt`).
- Filtri: tipologia evento (catalogo `event_types`), visibilità.
- "Nuovo Evento": dialog attuale, già ricco di campi (cover, luogo, posti, visibilità).
- Click su slot vuoto Day/Week → pre-compila data/ora.

**Calendario Appuntamenti**
- Query: `category = 'appuntamento'`, `pt_user_id = me`.
- Colore base: teal PT dashboard.
- Vista Day/Week mostra blocchi con nome atleta + foto, badge "1-a-1".
- Filtri: atleta (combobox sugli atleti collegati), stato (futuro/passato/annullato).
- "Nuovo Appuntamento": dialog nuovo, simile a quello eventi ma con select obbligatoria atleta collegato e durata standard (60'). Reuse della logica di overlap già usata in `AtletaBookingPage`.
- Click su slot vuoto → apre dialog precompilato.

Ricerca globale stile garda: input nell'header che cerca per titolo evento o nome atleta e apre direttamente il dettaglio.

Tutti i blocchi sono cliccabili → aprono `EventDetailDialog` che mostra info + pulsanti Modifica / Annulla (riusa `EditEventDialog` esistente, esteso per gestire entrambe le category).

---

## Lato atleta (PWA dark + lime)

Anche qui le due cose vanno separate ma in modo coerente con la mobile-first:

1. **Appuntamenti personali in Programma**
   `AtletaCalendarView` (oggi mostra solo workout della scheda) viene esteso:
   - stessa griglia Day/Week/Month già presente
   - secondo dataset: `calendar_events` dove `atleta_user_id = me` e `category='appuntamento'`
   - i blocchi appuntamento si vedono in cima alla lista del giorno con badge lime "Appuntamento col tuo PT" e ora, accanto agli workout pianificati
   - nel mese il pallino del giorno cambia da neutro a lime quando c'è un appuntamento

2. **Eventi rimangono nel Discover/Eventi** (già esiste `EventsSection` + `AtletaEventDetailPage`). Niente duplicazioni nel calendario personale: gli eventi pubblici non sono "miei appuntamenti".
   Aggiunta: nella home atleta, sotto "Prossimi appuntamenti", chip che linka anche agli eventi a cui sono iscritto (`event_participants`) — opzionale, lo lascio per Step 2.

3. **Nuova pagina dedicata `/app/appuntamenti`** (mobile) — lista cronologica futuri/passati con possibilità di disdire (≥24h, regola già esistente). Linkata da Home atleta e da Profilo.

---

## Esempi concreti (per dimostrare di aver capito)

**Esempio 1 — Laura PT crea un open day**
1. Va su `/pt/calendar/eventi`, clicca "Nuovo Evento".
2. Compila titolo "Open Day Brescia", tipologia "Calisthenics", visibilità "Aperto a tutti", 50 posti.
3. Insert con `category='evento'`, `atleta_user_id=null`.
4. Compare in vista Settimana del PT come blocco rosso; appare anche nella sezione Eventi dell'app atleta e in `/discovery`.

**Esempio 2 — Atleta Marco prenota una sessione**
1. Apre profilo del suo PT → `AtletaBookingPage`, sceglie giovedì 10:00.
2. Insert con `category='appuntamento'`, `atleta_user_id=Marco`, `event_type='allenamento'`.
3. Compare in `/pt/calendar/appuntamenti` di Laura come blocco teal "Marco Rossi – 10:00–11:00".
4. Compare in `/app/programma` di Marco come blocco lime nella griglia del giovedì + nella lista `/app/appuntamenti`.
5. Marco può disdire fino a 24h prima dalla sua lista.

**Esempio 3 — Laura fissa manualmente un appuntamento**
1. Va su `/pt/calendar/appuntamenti`, click su slot vuoto mercoledì 18:00.
2. Dialog precompilato chiede di selezionare un atleta collegato → "Giulia".
3. Insert con `category='appuntamento'`, `atleta_user_id=Giulia`.
4. Giulia riceve notifica push "Laura ha fissato un appuntamento mercoledì alle 18:00" e lo vede nel suo `/app/programma`.

**Esempio 4 — Ricerca**
1. Laura nell'header del calendario eventi digita "open" → dropdown con i match → click apre il dettaglio.
2. Nel calendario appuntamenti digita "Marco" → trova tutte le sessioni con Marco Rossi.

---

## Step di consegna (controlli intermedi)

**Step 1 — Dati + routing**
- Migrazione `category` + trigger + indice + backfill.
- Aggiorno gli insert esistenti (`AtletaBookingPage`, `PTCalendarPage`, `CreatePublicEventDialog`).
- Split route PT in `/pt/calendar/eventi` e `/pt/calendar/appuntamenti` + voci sidebar.
- Le due pagine inizialmente mostrano la UI attuale ma filtrata per `category`. Pausa per verifica visiva.

**Step 2 — UI nuova stile garda**
- Componenti `CalendarShell`, `CalendarDayView/WeekView/MonthView`, `EventBlock`, `EventDetailDialog`.
- Implementazione completa Eventi e Appuntamenti con filtri, ricerca, click su slot vuoto, dialog nuovo appuntamento.
- Pausa per verifica.

**Step 3 — Lato atleta**
- Estensione `AtletaCalendarView` per mostrare anche gli appuntamenti.
- Nuova pagina `/app/appuntamenti` con lista + disdetta.
- Link da Home atleta e Profilo.

---

## Note tecniche

- Riuso completo di `calendar_events`, `EditEventDialog`, `PlacesAutocomplete`, `ImageUpload`, `event_types`.
- Nessun impatto su `event_participants`, `pt_availability`, `notifications`.
- I tipi TS `Database` vengono rigenerati dopo la migrazione (Step 1).
- Le RLS già coprono "PT vede i propri eventi" e "atleta vede gli eventi in cui è coinvolto / pubblici" — non serve toccarle.
- Performance: indice composito `(pt_user_id, category, start_datetime)` per query range Day/Week/Month.

Confermi lo Step 1 (migrazione + split route + filtraggio base) così procediamo a step come da tua preferenza?
