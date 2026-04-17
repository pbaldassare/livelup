

## Piano: Flusso allenamento guidato continuo (Atleta)

### Obiettivo
Trasformare l'esecuzione dell'allenamento in un flusso a stati (`ready → input → rest → next`) all'interno di **una sola vista dinamica**, senza navigazione tra schermate.

### Analisi rapida
Devo prima ispezionare:
- `AtletaWorkoutDetailPage.tsx` (vista esecuzione attuale)
- `SetTracker.tsx` + `WorkoutTimer.tsx` (componenti esistenti da riutilizzare/sostituire)
- `workouts.ts` API e schema `workout_logs` / `workout_exercises` (campi: `set_number`, `reps_completed`, `weight_used`, `duration_seconds`, `rpe`, `notes`)

Verifica memoria: c'è già `workout-execution-system` con timer/sets/RPE. Ricostruisco il flusso UX sopra le stesse API senza migrazioni DB.

### Architettura

**Nuovo componente unico**: `src/components/app/GuidedWorkoutFlow.tsx`

State machine locale (useReducer):
```text
ready  ──[Inizia serie]──▶  input
input  ──[Completa]──▶ save ──▶  rest
rest   ──[timer end / skip]──▶  next
next   ──┬─ altre serie ─▶ ready (set+1)
         ├─ altri esercizi ─▶ ready (esercizio+1, set 1)
         └─ fine ─▶ completato
```

### Componenti UI per stato

1. **READY**: nome esercizio, note, badge `serie X/Y`, target reps/peso/tempo, recupero previsto. CTA grande: **"Inizia serie"**.
2. **INPUT**: form compatto con 2 campi (`kg` + `reps` *oppure* `secondi` se cardio/isometrico). CTA: **"Completa serie"**.
3. **REST**: timer circolare animato grande e centrale + barra progresso. Pulsanti `-15s` / `+15s` per modifica live (no reset). CTA secondaria piccola: **"Salta recupero"**. Auto-advance a fine timer.
4. **NEXT** (transizione 600ms): micro-animazione "Serie completata" / "Esercizio completato" → switch automatico.

### Logica salvataggio

Al `Completa serie`:
```ts
await supabase.from('workout_logs').insert({
  workout_exercise_id, set_number,
  reps_completed, weight_used, duration_seconds,
  is_completed: true,
  notes: `rest_actual:${restActualSec}` // recupero reale
});
```
Al primo set del primo esercizio → update workout `status='in_corso'`.
All'ultimo set dell'ultimo esercizio → `status='completato'`, `completed_at=now()`.

### Azioni extra (sempre visibili come barra inferiore minimale)

- **"+ Serie extra"**: visibile solo in stato `next` di fine esercizio. Aggiunge un set virtuale all'array locale.
- **"Salta esercizio"**: sempre disponibile, marca tutti i set rimanenti dell'esercizio come skipped (in `notes`) e passa al prossimo.

### Modifiche file

| File | Azione |
|---|---|
| `src/components/app/GuidedWorkoutFlow.tsx` | **Nuovo** – stato machine + UI dinamica |
| `src/pages/atleta/AtletaWorkoutDetailPage.tsx` | Sostituisce SetTracker con `<GuidedWorkoutFlow workout={...} />` |
| `src/components/app/WorkoutTimer.tsx` | Riutilizzato per il timer di rest (con +/-15s live) |

### Vincoli rispettati
- 1 sola CTA principale per stato
- 0 schermate vuote (sempre c'è qualcosa da fare o vedere)
- Timer parte automaticamente, autoadvance al termine
- Nessun bottone "vai avanti": progressione implicita
- Recupero reale tracciato in `workout_logs.notes`

### Risultato
L'atleta apre l'allenamento e segue un binario: tap "Inizia" → inserisce → vede recupero che parte da solo → si ritrova nel set successivo. Mai una decisione di navigazione.

