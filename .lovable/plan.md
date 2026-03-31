

## Piano: Collegare atleta1 a pt2 con dati completi

### Cosa fare
Aggiornare la edge function `seed-platform-data` per creare la connessione atleta1↔pt2 (oltre a quelle esistenti), assegnare workout da pt2, simulare una chat, e aggiungere contatti. Poi inserire i dati nel DB tramite la insert tool.

### Dati da inserire (via insert tool SQL)

**1. Connessione atleta1 ↔ pt2**
- Inserire in `pt_atleta_connections`: `pt_user_id = pt2.user_id`, `atleta_user_id = atleta1.user_id`, `status = 'active'`
- Il trigger `enforce_single_pt_connection` terminerà automaticamente la connessione con pt1
- Aggiornare `atleta_profiles.status = 'collegato'` per atleta1

**2. Contatti (profiles)**
- Aggiornare `profiles` di atleta1 (Luca Ferrari): `phone = '+39 333 1234567'`
- Aggiornare `profiles` di pt2: `phone = '+39 347 9876543'`

**3. Workout da pt2 ad atleta1 (3 workout)**
- "Forza Base - Settimana 1" (completato, 5gg fa)
- "Upper Body Power" (completato, 2gg fa)  
- "Lower Body & Core" (attivo, schedulato domani)
- Ogni workout con 4-5 esercizi dalla libreria esistente

**4. Chat simulata pt2 ↔ atleta1 (10 messaggi)**
- Creare chat in `chats`
- Inserire 10 messaggi alternati (pt e atleta) con contenuto realistico e timestamp progressivi

### Aggiornare seed function
**`supabase/functions/seed-platform-data/index.ts`**:
- Aggiungere connessione `pt2Id ↔ atleta1Id` nell'array connections
- Aggiungere workout atleta1↔pt2 nell'array workouts
- Aggiungere chat pair `pt2Id ↔ atleta1Id` con 10 messaggi
- Aggiungere update dei numeri di telefono nei profiles

### Esecuzione
Usare la insert tool per eseguire le INSERT/UPDATE SQL direttamente, così i dati sono subito disponibili senza dover rieseguire il seed.

