
# Piano: Completamento Dati Piattaforma + Fix Video Player

## Problema
Dalle screenshot emergono due problemi principali:
1. **Video esercizi neri** - Il player usa `<video>` ma i link sono YouTube (non supportato)
2. **Milestones a zero** - Nessun workout completato nel database, tutti in stato "attivo"

Inoltre ci sono 5 esercizi base senza video/immagini (Trazioni, Push-up, Plank, Corsa, Burpees).

---

## Parte 1: Fix Video Player per YouTube

### Problema Tecnico
Il componente `ExerciseVideoPlayer` usa:
```jsx
<video src={videoUrl} /> // Non funziona con YouTube!
```

### Soluzione
Modificare il componente per:
1. Rilevare se l'URL e YouTube
2. Usare iframe con URL embed per YouTube
3. Mostrare immagine come fallback se disponibile
4. Usare thumbnail YouTube automatica

```text
URL YouTube: https://www.youtube.com/watch?v=ABC123
     |
     v
Estrai video ID: ABC123
     |
     v
Thumbnail: https://img.youtube.com/vi/ABC123/maxresdefault.jpg
Embed: https://www.youtube.com/embed/ABC123?autoplay=1&mute=1&loop=1
```

### File da Modificare
- `src/components/app/ExerciseVideoPlayer.tsx`

---

## Parte 2: Aggiornamento Seed Database

### Aggiornare Edge Function per:

#### A) Completare esercizi base (aggiungere video/immagini)
- Trazioni: video e immagine
- Push-up: video e immagine  
- Plank: video e immagine
- Corsa: video e immagine
- Burpees: video e immagine (duplicato)

#### B) Creare workout completati
- Atleta1: 4 workout (2 completati, 2 attivi)
- Atleta2: 2 workout completati
- Atleta3: 2 workout attivi

#### C) Aggiungere dati mancanti
- Eventi calendario (8 eventi)
- Notifiche (10 notifiche)
- Badge assegnati agli atleti
- Progress tracking con dati reali

### File da Modificare
- `supabase/functions/seed-platform-data/index.ts`

---

## Dettaglio Tecnico

### ExerciseVideoPlayer Aggiornato

```typescript
// Helper per estrarre video ID da YouTube
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\/]+)/
  );
  return match ? match[1] : null;
}

// Nel componente
const youtubeId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
const thumbnailUrl = youtubeId 
  ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
  : imageUrl;

// Render
{youtubeId ? (
  <img 
    src={thumbnailUrl}
    alt={exerciseName}
    className="absolute inset-0 w-full h-full object-cover"
  />
) : videoUrl ? (
  <video src={videoUrl} ... />
) : ...}
```

### Dati Seed Aggiuntivi

```typescript
// 1. Update esercizi base
await supabaseAdmin.from('exercises')
  .update({ 
    video_url: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    image_url: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400'
  })
  .eq('name', 'Trazioni');

// 2. Workout completati
const workoutsCompleted = [
  { 
    title: 'Upper Body Power',
    status: 'completato',
    completed_at: subDays(new Date(), 3).toISOString(),
    atleta_user_id: atleta1Id,
    pt_user_id: pt1Id,
  },
  // ... altri
];

// 3. Calendar events
const events = [
  {
    title: 'Allenamento con Marco',
    event_type: 'allenamento',
    start_datetime: addDays(new Date(), 1),
    pt_user_id: pt1Id,
    atleta_user_id: atleta1Id,
    creator_user_id: pt1Id,
  },
  // ... altri
];

// 4. Notifiche
const notifications = [
  {
    user_id: atleta1Id,
    type: 'workout',
    title: 'Nuovo allenamento disponibile!',
    body: 'Il tuo PT ha preparato una nuova scheda',
    action_url: '/app/workout',
  },
  // ... altre
];
```

---

## Flusso Esecuzione

```text
1. Fix ExerciseVideoPlayer
   |
   v
2. Aggiorna seed-platform-data
   |
   v  
3. Deploy edge function
   |
   v
4. Esegui seed
   |
   v
5. Verifica:
   - Video mostrano thumbnail YouTube
   - Milestones mostrano numeri reali
   - Calendario ha eventi
   - Notifiche presenti
```

---

## Criteri di Accettazione

1. Gli esercizi con video YouTube mostrano la thumbnail invece di schermo nero
2. Tutti i 49 esercizi hanno video_url e image_url popolati
3. Almeno 4 workout sono in stato "completato"
4. Le milestone nella pagina profilo atleta mostrano valori > 0
5. Il calendario ha eventi schedulati per la settimana
6. L'atleta ha notifiche da visualizzare

---

## File da Creare/Modificare

| File | Azione |
|------|--------|
| `src/components/app/ExerciseVideoPlayer.tsx` | Modifica - supporto YouTube |
| `supabase/functions/seed-platform-data/index.ts` | Modifica - dati aggiuntivi |
