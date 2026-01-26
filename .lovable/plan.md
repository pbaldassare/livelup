
# Piano: Fix Build Error + Popolamento Dati Completo

## Panoramica

Il piano si divide in due parti:
1. **Fix del build error PWA** - Il bundle è troppo grande (2.18 MB) per il precache limit di default
2. **Popolamento dati massivo** - Creare un seed completo per rendere la piattaforma viva

---

## Parte 1: Fix Build Error PWA

### Problema
Il file JS principale supera il limite di 2 MiB per il precache di Workbox:
```
assets/index-C-YbA1kf.js is 2.18 MB, and won't be precached.
```

### Soluzione
Configurare `maximumFileSizeToCacheInBytes` nel vite.config.ts:

```typescript
workbox: {
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB
  globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
  // ... rest of config
}
```

### File da Modificare
- `vite.config.ts` - Aggiungere limite file size

---

## Parte 2: Popolamento Dati Database

Creare una nuova Edge Function `seed-platform-data` che popola la piattaforma con dati realistici.

### 2.1 Dati da Creare

#### PT Packages (9 pacchetti - 3 per ogni PT)
Ogni PT avrà 3 pacchetti:
- Pacchetto Base (5 sessioni, EUR 80)
- Pacchetto Standard (10 sessioni, EUR 150)
- Pacchetto Premium (abbonamento mensile, EUR 200)

#### Abbonamenti Atleta-PT (3 abbonamenti)
- Atleta1 ha abbonamento attivo con PT1 (10 sessioni, 3 usate)
- Atleta2 ha abbonamento scaduto con PT2
- Atleta3 ha abbonamento trial con PT1

#### Workout Assegnati (10 workout)
- 4 workout per Atleta1 (2 completati, 2 attivi)
- 2 workout per Atleta2 (pending connection)
- 2 workout per Atleta3

#### Workout Exercises (per ogni workout)
- Copiare esercizi dai template ai workout

#### Chat e Messaggi
- Chat tra PT1 e Atleta1 (15 messaggi)
- Chat tra PT2 e Atleta2 (5 messaggi)
- Conversazioni realistiche su allenamenti

#### Recensioni PT (6 recensioni)
- 3 recensioni per PT1 (4-5 stelle)
- 2 recensioni per PT2 (4-5 stelle)
- 1 recensione per PT3 (5 stelle)

#### Eventi Calendario (8 eventi)
- Allenamenti schedulati per la settimana
- Un evento "raduno" pubblico
- Sessioni di valutazione

#### Progress Tracking Atleta (20 entries)
- 10 entries per Atleta1 (ultimi 30 giorni)
- 5 entries per Atleta2
- 5 entries per Atleta3
- Peso, misure, mood, energia, sonno

#### Badges Aggiuntivi (6 nuovi badges)
- workout_streak_30 (30 giorni consecutivi)
- goal_achieved (obiettivo raggiunto)
- first_review (prima recensione)
- weight_loss_5 (5kg persi)
- perfect_form (tecnica perfetta)
- early_bird (allenamento mattutino)

#### Notifiche (10 notifiche)
- Notifiche workout
- Notifiche messaggi
- Notifiche badge ottenuti

### 2.2 Fix Template Ownership
Aggiornare i template esistenti per assegnarli ai PT reali:
- Template 1-4 -> PT1 (Marco Rossi)
- Template 5-7 -> PT2 (Laura Bianchi)
- Template 8-10 -> PT3 (Giuseppe Verdi)

---

## Struttura Edge Function

```typescript
// supabase/functions/seed-platform-data/index.ts

Deno.serve(async (req) => {
  // 1. Get existing user IDs from profiles
  // 2. Fix template ownership
  // 3. Create PT packages
  // 4. Create subscriptions
  // 5. Create more connections (atleta3 -> pt1)
  // 6. Create workouts with exercises
  // 7. Create chats and messages
  // 8. Create reviews
  // 9. Create calendar events
  // 10. Create progress tracking data
  // 11. Create additional badges
  // 12. Create notifications
  
  return Response.json({ success: true, data: {...} })
})
```

---

## File da Creare/Modificare

### Fix Build
1. `vite.config.ts` - Aumentare limite PWA

### Edge Function
1. `supabase/functions/seed-platform-data/index.ts` - Nuovo seed completo

---

## Dati Esempio

### PT Package
```json
{
  "pt_user_id": "...",
  "name": "Percorso Trasformazione",
  "package_type": "sessioni",
  "sessions_count": 10,
  "price": 150,
  "description": "10 sessioni personalizzate per raggiungere i tuoi obiettivi",
  "includes_chat": true,
  "includes_video_calls": false,
  "is_active": true,
  "is_featured": true
}
```

### Chat Message
```json
{
  "chat_id": "...",
  "sender_user_id": "...",
  "content": "Ciao! Pronto per l'allenamento di oggi?",
  "is_read": true
}
```

### Progress Entry
```json
{
  "atleta_user_id": "...",
  "tracked_date": "2026-01-20",
  "weight_kg": 75.5,
  "energy_level": 4,
  "mood_level": 5,
  "sleep_hours": 7.5,
  "sleep_quality": 4,
  "notes": "Mi sento in forma oggi!"
}
```

### Review
```json
{
  "pt_user_id": "...",
  "atleta_user_id": "...",
  "rating": 5,
  "comment": "Marco è un trainer eccezionale! Mi ha aiutato a raggiungere i miei obiettivi in modo professionale e motivante.",
  "is_verified": true,
  "is_visible": true
}
```

---

## Esecuzione

Dopo il deploy della Edge Function, verrà chiamata una volta per popolare tutti i dati. La funzione è idempotente - controlla se i dati esistono prima di inserirli.

---

## Risultato Finale

Dopo l'esecuzione:
- 3 PT con 3 pacchetti ciascuno
- 3 atleti con abbonamenti, workout e progressi
- Chat attive con messaggi reali
- Recensioni visibili sui profili PT
- Calendario con eventi schedulati
- Dashboard analytics con dati reali
- 10 badges totali per gamification

---

## Criteri di Accettazione

1. Il build completa senza errori PWA
2. Ogni PT ha almeno 3 pacchetti visibili
3. Atleta1 vede il suo abbonamento attivo con sessioni rimanenti
4. Le chat mostrano conversazioni reali
5. I profili PT mostrano recensioni con rating
6. Il calendario mostra eventi futuri
7. La sezione progressi mostra grafici con dati
8. Le analytics PT/Admin mostrano revenue e trend
