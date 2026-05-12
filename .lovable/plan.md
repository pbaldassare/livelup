## Obiettivo

Lato atleta, quando l'esercizio ha `protocol_type === 'EMOM'`, sostituire il normale flusso "Ready → Input → Rest" con un **Player EMOM** dedicato che mostra un round alla volta, alternando i blocchi in loop secondo la formula `blocks[(round - 1) % blocks.length]`.

Nessun nuovo protocollo. Nessuna modifica al builder PT, al DB, all'auth o alle RLS.

## Modifiche

### 1. `src/pages/atleta/AtletaWorkoutDetailPage.tsx` — fetch dei params EMOM

La query `workout-detail` oggi non legge `protocol_type` / `protocol_params`. Aggiungerli al `select` di `workout_exercises`:

```text
workout_exercises (
  id, exercise_id, order_index, prescribed_sets,
  prescribed_reps_min, prescribed_reps_max, prescribed_weight,
  prescribed_duration_seconds, rest_seconds, notes, block_id,
  protocol_type, protocol_params,           // ← nuovi
  exercises:exercise_id (...)
)
```

Nessun'altra modifica alla pagina.

### 2. `src/components/app/GuidedWorkoutFlow.tsx` — branch EMOM

- Estendere `GWExercise` con `protocol_type?: string | null` e `protocol_params?: Record<string, unknown> | null`.
- Subito sotto l'header (top progress bar), prima del blocco `<AnimatePresence>` con i flow `ready/input/rest`, aggiungere:

```text
if (currentExercise.protocol_type === 'EMOM') {
  return <AtletaEmomPlayer
    exercise={currentExercise}
    onFinished={() => advance(true)}   // riusa la macchina di avanzamento esistente
  />;
}
```

- `advance(true)` è già la callback usata dal flow normale a fine esercizio: passa al prossimo esercizio o a `FINISH`. Riutilizzarla evita di rompere altro.
- Salvataggio log: quando l'EMOM termina, scrivere **un singolo `workout_logs`** (set 1, `is_completed: true`, reps = round completati, duration = `rounds * round_duration`) tramite la stessa `saveSet` mutation già presente. Così la logica di "resume" non si rompe e l'esercizio risulta completato negli storici.
- La top-bar progress per esercizio rimane visibile (mostra che siamo all'esercizio N/M); le metriche "Serie X/Y" vengono nascoste mentre EMOM è in corso (semplice condizione su `protocol_type`).

### 3. Nuovo componente `src/components/app/AtletaEmomPlayer.tsx`

Self-contained player a tutta area, dark theme, lime accents.

Stato locale:

- `round` (1..N).
- `secondsLeft` (decremento 1Hz quando `isRunning === true`).
- `isRunning` (boolean), `hasStarted` (per mostrare il pulsante Start iniziale).
- All'avvio: `normalizeEmomParams(exercise.protocol_params, exercise.exercises.name)`.

Logica:

- `currentBlock = emom.blocks[(round - 1) % emom.blocks.length]`.
- Tick: ogni secondo `secondsLeft -= 1`. Quando arriva a 0:
  - Se `round < emom.rounds` → `round += 1`; `secondsLeft = emom.round_duration`; resta in `running`.
  - Se `round === emom.rounds` → stop, chiama `onFinished()`.
- Pulsanti:
  - **Start** (visibile finché `!hasStarted`): avvia il timer.
  - **Pausa / Riprendi** (toggle di `isRunning`).
  - **Prossimo round** (skip): forza il passaggio al prossimo round (o `onFinished` se ultimo).

UI (dark theme atleta):

```text
┌────────────────────────────────────────┐
│ Round 1 di 9                           │
│                                        │
│            ┌──────────┐                │
│            │  00 : 50 │   timer grande │
│            └──────────┘                │
│                                        │
│   Blocco 1                             │
│   • Squat 5 ripetizioni                │
│   • Trazioni 5 ripetizioni             │
│                                        │
│   [Pausa]   [Prossimo round]           │
└────────────────────────────────────────┘
```

Dettagli stilistici:
- Card grande `rounded-3xl bg-app-card/60 border border-app-border/70 p-6`.
- Timer in `text-7xl font-black text-app-accent` con stroke ring (cerchio progress) facoltativo.
- Counter round: `text-sm uppercase tracking-wide text-app-muted-foreground`.
- Lista esercizi in stile `AtletaEmomSummary` (riuso visivo): pallino lime, nome bold, "5 ripetizioni" in muted. **Mai** "reps".
- Pulsanti full-width `rounded-full h-12`. Start/Resume = `bg-app-accent text-app-accent-foreground`. Pausa = `variant="outline"`. Prossimo round = `variant="secondary"`.
- Nessuna possibilità di modificare valori (atleta esegue, non edita).

Compatibilità EMOM legacy:
- `normalizeEmomParams` produce sempre almeno 1 blocco con 1 esercizio (prendendo `name = exercise.exercises.name` e `reps = legacy.reps ?? 10`).
- Se mancano `rounds` → fallback `10`. Se manca `round_duration` → fallback `60` (o `duration_minutes * 60`). Già gestito in `emom.ts`.

Accessibilità: `role="timer"` + `aria-live="polite"` per il countdown; pulsanti con `aria-label`.

### 4. Persistenza log a fine EMOM

Quando il player chiama `onFinished()`, prima di chiamare `advance(true)` `GuidedWorkoutFlow` esegue:

```text
saveSet.mutate({
  workoutExerciseId: currentExercise.id,
  setNumber: 1,
  reps: emom.rounds,                          // round completati
  durationSeconds: emom.rounds * emom.round_duration,
  weight: 0,
  restPlanned: 0,
});
```

Questo mantiene il comportamento di `existingLogs` per il resume: l'esercizio EMOM appare come completato e non viene riproposto a una sessione successiva.

## Cosa NON viene toccato

- DB / migration / RLS / auth.
- Altri protocolli (SET, AMRAP, TABATA, ecc.).
- Builder PT (`TemplateExerciseBuilder`, `EmomBlocksEditor`).
- `AtletaEmomSummary` (vista riassuntiva nel detail sheet) — resta com'è.
- Pagine PT, archivio esercizi, sidebar.

## Risultato atteso

1. Atleta apre l'allenamento → arriva all'esercizio EMOM.
2. Vede subito Round 1/N, timer pronto, blocco 1 con la sua lista esercizi/reps.
3. Tocca Start → countdown.
4. A fine timer passa automaticamente al round successivo, mostrando il blocco corrispondente (loop sui blocchi).
5. A fine ultimo round → log salvato → si passa al prossimo esercizio o termina l'allenamento.
6. Tutti i testi usano "ripetizioni", non "reps".
