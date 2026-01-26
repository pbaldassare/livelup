
# Piano: Sezione Eventi Pubblici nella Pagina Scopri

## Obiettivo
Quando un atleta è già collegato a un PT, la pagina "Scopri" mostrerà una sezione **Eventi** con eventi pubblici organizzati dai PT e dalla piattaforma. Include data, organizzatore, mappa, nome evento e partecipanti.

---

## Struttura Database

### Nuova Tabella: `event_participants`

Traccia chi partecipa agli eventi pubblici:

```sql
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'registered', -- 'registered', 'cancelled', 'attended'
  UNIQUE(event_id, user_id)
);

-- RLS
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own registrations"
  ON public.event_participants FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view event participants"
  ON public.event_participants FOR SELECT
  USING (true);

CREATE POLICY "Event creators can view participants"
  ON public.event_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM calendar_events 
    WHERE id = event_id AND creator_user_id = auth.uid()
  ));
```

---

## Dati Seed: 4 Eventi Pubblici

| Evento | Tipo | Città | Data | Organizzatore | Coordinate GPS |
|--------|------|-------|------|---------------|----------------|
| CrossFit Day | Raduno | Brescia | +7 giorni | PT Marco | 45.5416° N, 10.2118° E |
| Cena Fit | Evento | Milano | +14 giorni | PT Giulia | 45.4642° N, 9.1900° E |
| Yoga al Parco | Raduno | Roma | +10 giorni | PT Luca | 41.9028° N, 12.4964° E |
| Gara Corsa 5K | Gara | Torino | +21 giorni | PT Elena | 45.0703° N, 7.6869° E |

Ogni evento avrà anche 3-8 partecipanti simulati.

---

## UI: Sezione Eventi per Atleti Collegati

```text
+------------------------------------------+
| ← Scopri                                 |
+------------------------------------------+
| [🎉] Sei collegato a un PT!              |
|     Esplora eventi della community       |
+------------------------------------------+

| PROSSIMI EVENTI                          |
+------------------------------------------+
| 📍 CrossFit Day Brescia                  |
| 🗓️ Sabato 2 Feb • 09:00-14:00            |
| 👤 Organizzato da Marco Rossi            |
| 👥 12 partecipanti                       |
| [📍 Mini mappa Google Maps]              |
| [Partecipa]                              |
+------------------------------------------+
| 📍 Cena Fit Milano                       |
| 🗓️ Venerdì 8 Feb • 20:00-23:00           |
| 👤 Organizzato da Giulia Bianchi         |
| 👥 8 partecipanti                        |
| [📍 Mini mappa Google Maps]              |
| [Partecipa]                              |
+------------------------------------------+
```

---

## Componente EventCard

Ogni card evento mostrerà:

1. **Header colorato** con icona tipo evento (🏃‍♂️ gara, 🧘 raduno, 🍽️ evento)
2. **Titolo evento**
3. **Data e orario** formattati in italiano
4. **Location** con nome testuale
5. **Organizzatore** (nome + avatar del PT)
6. **Contatore partecipanti** 
7. **Mini mappa** statica Google Maps (Static Map API)
8. **Bottone "Partecipa"** / "Già iscritto"

### Mappa Statica

```typescript
const getStaticMapUrl = (lat: number, lng: number) => 
  `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=300x150&maptype=roadmap&markers=color:0xD4FF00%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
```

---

## Icone per Tipo Evento

| Tipo | Icona | Colore |
|------|-------|--------|
| `raduno` | Users | Lime |
| `evento` | PartyPopper | Viola |
| `gara` | Trophy | Arancione |
| `altro` | Calendar | Blu |

---

## Modifiche ai File

| File | Modifiche |
|------|-----------|
| `supabase/migrations/new` | Crea tabella `event_participants` |
| `supabase/functions/seed-platform-data/index.ts` | Aggiunge 4 eventi pubblici con coordinate GPS + partecipanti simulati |
| `src/pages/atleta/AtletaDiscoverPage.tsx` | Modifica il blocco `isConnected` per mostrare sezione Eventi invece del messaggio attuale |

---

## Flusso Utente

1. Atleta collegato visita `/app/discover`
2. Invece del messaggio "Sei già collegato", vede la lista eventi
3. Clicca su un evento → Vede dettagli con mappa
4. Clicca "Partecipa" → Si registra all'evento
5. Può annullare la partecipazione

---

## Tipi TypeScript

```typescript
interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: 'raduno' | 'evento' | 'gara' | 'altro';
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_public: boolean;
  pt_user_id: string;
  organizer: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  participant_count: number;
  is_registered: boolean;
}
```

---

## Query Eventi Pubblici

```typescript
const { data: events } = await supabase
  .from('calendar_events')
  .select(`
    *,
    profiles:pt_user_id (first_name, last_name, avatar_url),
    event_participants (id)
  `)
  .eq('is_public', true)
  .eq('is_cancelled', false)
  .gte('start_datetime', new Date().toISOString())
  .order('start_datetime', { ascending: true });
```

---

## Risultato Atteso

- Atleti collegati vedono eventi pubblici invece del messaggio di blocco
- Ogni evento mostra mappa statica con marker
- Organizzatore visibile con avatar
- Contatore partecipanti in tempo reale
- Possibilità di registrarsi/annullare
- 4 eventi demo con dati realistici italiani
