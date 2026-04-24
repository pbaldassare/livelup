Implementerò un redesign completo del popup dettaglio esercizio usato nel PT Archivio Esercizi, mantenendo la sorgente dati unica dagli esercizi Admin.

## Cosa verrà cambiato

### 1. Popup più ampio, centrato e premium
- Mantengo il centraggio forzato già standardizzato.
- Aumento la larghezza massima per farlo sembrare una vera scheda esercizio, non un popup database.
- Corpo scrollabile con header più ordinato e viewport-safe.
- Layout responsive: su desktop più ricco, su mobile in colonna.

### 2. Hero media protagonista
- In alto ci sarà un grande blocco media:
  - immagine grande con rounded large e object-cover se `image_url` esiste;
  - player video inline se `video_url` esiste, supportando YouTube, Vimeo e video caricati;
  - tab/switch “Immagine” / “Video” quando entrambi sono disponibili;
  - placeholder premium con icona e messaggio quando non esiste nessun media.

### 3. Header esercizio migliorato
- Nome esercizio grande e gerarchico.
- Badge per categoria, difficoltà e gruppi muscolari principali.
- Pulsante preferiti più evidente, con stato chiaro “Salvato” / “Aggiungi ai preferiti”.
- Aggiungo una quick action semplice per copiare il nome esercizio, se compatibile con il contesto.

### 4. Info rapide
- Nuova riga di mini-card/chips compatte con:
  - difficoltà;
  - categoria;
  - muscoli focus;
  - presenza immagine;
  - presenza video tutorial.

### 5. Contenuto riorganizzato in sezioni
Il contenuto verrà diviso in card chiare:
- “Tecnica esecuzione” da `instructions`;
- “Consigli del coach” da `description`;
- “Muscoli coinvolti” da `muscle_groups`;
- “Tutorial video” / “Media” quando presente;
- blocco informativo “Disponibile per essere aggiunto alle tue schede”.

### 6. Coerenza dati Admin → PT
Il popup continuerà a leggere gli stessi campi già popolati dall’Admin:
- `image_url`
- `video_url`
- `instructions`
- `description`
- `category`
- `difficulty_level`
- `muscle_groups`

Non verranno create duplicazioni e non sono previste migration.

## File previsti
- `src/components/exercises/ExerciseDetailDialog.tsx`

Questo componente è già usato anche da Admin e dalla tab Esercizi PT nei workout. Il redesign sarà pensato per migliorare soprattutto il lato PT, senza rompere le preview Admin esistenti.

## Verifica prevista
- Hero image corretta.
- Video YouTube/Vimeo/upload visibile e riproducibile.
- Switch immagine/video funzionante.
- Tutte le informazioni Admin visibili.
- Preferiti ancora funzionanti.
- Popup centrato e responsive.
- Nessuna regressione sull’Archivio Esercizi PT.