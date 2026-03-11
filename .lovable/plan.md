

# Analisi: Esecuzione Workout Live — Stato Attuale

## Già Implementato

Dopo la revisione del codice, il **Punto 5 è già stato implementato** nella sessione precedente. Ecco cosa è già presente:

### `AtletaWorkoutDetailPage.tsx` (666 righe)
- **Resume da log precedenti**: Query `workout-logs` + `useEffect` che ripopola `completedSets` dai log esistenti
- **Schermata pre-workout**: Mostra badge "Hai progressi salvati" e bottone "Riprendi Allenamento"
- **Timer elapsed**: Contatore tempo totale durante l'allenamento
- **Navigazione esercizi**: Animazioni framer-motion, progress bar segmentata
- **Schermata riepilogo post-workout**: Trophy, griglia stats (durata, set, reps, volume), rating 1-5 stelle, textarea note, bottone "Salva e chiudi"
- **Mutation di completamento**: Update su `workouts` con `status: 'completato'`, `completed_at`, `rating`, `notes_atleta`

### `SetTracker.tsx` (230 righe)
- **Input RPE**: Scala 6-10 con labels (Facile → Massimale)
- **Input reps e peso**: Incremento/decremento con bottoni +/−
- **Indicatori set**: Bottoni circolari con stato completato/attivo
- **Log persistenza**: `logSetMutation` con upsert (delete + insert)

### `WorkoutTimer.tsx` (185 righe)
- Timer circolare SVG con prep time e play/pause

## Miglioramenti Possibili

Ci sono alcune ottimizzazioni che si possono fare per rendere il flusso più robusto:

1. **Pre-fill peso/reps dal log precedente**: Quando si riprende un workout, il `SetTracker` non pre-popola i valori di peso e reps dell'ultimo set completato. Attualmente partono sempre da 0.

2. **Calcolo stats dal resume**: `totalVolume`, `totalReps`, `totalSetsCompleted` partono da 0 anche quando si riprende. I log precedenti non vengono sommati nelle stats della summary.

3. **ShowDetails auto-open**: Il pannello dettagli (reps/peso/RPE) parte chiuso — potrebbe essere meglio aprirlo di default per un'esperienza più immediata.

4. **Skip al primo esercizio non completato**: Al resume, l'atleta parte sempre dall'esercizio 0 anche se i primi sono già completati.

## Piano di Implementazione

### Modifiche a `SetTracker.tsx`
- Accettare prop `initialReps` e `initialWeight` dall'ultimo log
- Default `showDetails = true` per mostrare subito gli input
- Pre-fill reps con `prescribedReps` (parsed) se non ci sono log precedenti

### Modifiche a `AtletaWorkoutDetailPage.tsx`
- Al resume, calcolare `totalVolume/totalReps/totalSetsCompleted` dai log esistenti
- Posizionare `currentExerciseIndex` al primo esercizio non completamente loggato
- Passare `initialWeight`/`initialReps` al SetTracker dal log precedente dello stesso esercizio
- Posizionare `currentSet` al primo set non completato dell'esercizio corrente

Queste sono ottimizzazioni di UX, non nuove feature. Il flusso base funziona già end-to-end.

