## Obiettivo

Aggiungere un player atleta dedicato e condiviso per HIIT e TABATA, basato sui nuovi `protocol_params` (TimedRounds). Stessa identica logica per i due protocolli, unica differenza il titolo. Nessun nuovo protocollo, nessuna modifica a DB/RLS/auth/sidebar/builder PT/altri protocolli.

## Logica di esecuzione

Per round `r` di `R` con esercizi `E1…En`:

```text
work E1 → rest_ex → work E2 → rest_ex → … → work En
                                              ├─ r < R → rest_round → round r+1 (E1)
                                              └─ r = R → fine (auto-advance workout)
```

Se `rest_between_exercises_seconds === 0` o `rest_between_rounds_seconds === 0` la relativa fase è saltata.

## File nuovi / modificati

### 1. Nuovo: `src/components/app/AtletaTimedRoundsPlayer.tsx`

Player UNICO per HIIT e TABATA, modellato 1:1 su `AtletaEmomPlayer` (stesso dark theme + lime).

Props:
```ts
{
  protocolLabel: 'HIIT' | 'TABATA';   // unica differenza visibile
  exerciseName: string;                // fallback se un item non ha name
  protocolParams: Record<string, unknown> | null | undefined;
  onFinished: (summary: {
    roundsCompleted: number;
    totalDurationSeconds: number;
  }) => void;
}
```

Stato interno:
```ts
type Phase = 'work' | 'rest_between_exercises' | 'rest_between_rounds';
{ phase, round, exerciseIndex, secondsLeft, isRunning, hasStarted }
```

**Niente stato `finished` visibile**. Quando l'ultimo work dell'ultimo round termina (o viene saltato), si chiama `onFinished` **una sola volta** e basta — il branch del `GuidedWorkoutFlow` smonta il player e fa avanzare il workout. L'utente NON deve cliccare nessun bottone per uscire.

Timer robusto (uguale a EMOM ma timestamp-based per evitare drift in background):
- `phaseStartedAt` (ms) + `phaseDuration` (s); ad ogni tick (250ms) `secondsLeft = phaseDuration - floor((now - phaseStartedAt)/1000)`.
- Un singolo `setInterval` con cleanup completo nel return dell'effect.
- `isCompletingRef = useRef(false)` per garantire **un solo `onFinished`** anche se l'utente preme "Salta fase" più volte velocemente sull'ultima fase, o se l'effetto di transizione fire due volte.
- `accumulatedSecondsRef` aggiornato solo quando una fase **work** finisce o viene saltata, per il totale durata salvato nel log.

Funzione `advancePhase()` (unica via di transizione, chiamata sia dal tick a 0 sia da "Salta fase"):
- `work`:
  - se `exerciseIndex < n-1`: → `rest_between_exercises` (skip se 0).
  - altrimenti se `round < R`: → `rest_between_rounds` (skip se 0).
  - altrimenti: **`finish()`** → set `isCompletingRef`, stop timer, chiama `onFinished({ roundsCompleted: R, totalDurationSeconds })` una sola volta.
- `rest_between_exercises` → `work` con `exerciseIndex + 1`.
- `rest_between_rounds` → `work` con `round + 1`, `exerciseIndex = 0`.

Controlli (solo questi, come EMOM):
- **Inizia HIIT/TABATA** (prima dello start).
- **Pausa / Riprendi**.
- **Salta fase** (SkipForward); sull'ultima fase porta direttamente a `finish()` e quindi a `onFinished`.

Nessun bottone "Termina", nessuna schermata di "Protocollo completato" interna al player: l'auto-advance è gestito fuori.

UI (dark theme atleta, lime accents — coerente con EMOM):
- Header: `HIIT` o `TABATA`, `Round r di R`, `Esercizio i di n`.
- Cerchio timer grande (stesso SVG di EMOM), tabular-nums.
- Card con nome esercizio corrente; nelle fasi di rest mostra "Prossimo: <nome>" o "Prossimo round x di R".
- Etichetta fase: `Lavoro` / `Recupero` / `Recupero round` / `Pronto` / `In pausa`.

### 2. Modificato: `src/components/app/GuidedWorkoutFlow.tsx`

Aggiungo un branch dedicato subito dopo quello EMOM (linee ~385–469), prima del rendering set-based generico. Il blocco `onFinished` è una copia 1:1 di quello EMOM, così l'avanzamento è identico:

```tsx
if (currentExercise.protocol_type === 'HIIT' || currentExercise.protocol_type === 'TABATA') {
  return (
    <div className="min-h-[calc(100dvh-0px)] bg-app-background flex flex-col">
      {/* stessa top progress bar di EMOM */}
      <AtletaTimedRoundsPlayer
        key={currentExercise.id}
        protocolLabel={currentExercise.protocol_type as 'HIIT' | 'TABATA'}
        exerciseName={currentExercise.exercises.name}
        protocolParams={currentExercise.protocol_params ?? null}
        onFinished={async ({ roundsCompleted, totalDurationSeconds }) => {
          // 1) salva log UNA volta
          try {
            await saveSet.mutateAsync({
              workoutExerciseId: currentExercise.id,
              setNumber: 1,
              reps: roundsCompleted,
              durationSeconds: totalDurationSeconds,
              weight: 0,
              restPlanned: 0,
            });
          } catch (e: any) { toast.error(e?.message || 'Errore salvataggio'); }

          // 2) auto-advance IDENTICO a EMOM (single-log)
          const isLastExercise = state.exerciseIndex >= exercises.length - 1;
          if (isLastExercise) { dispatch({ type: 'FINISH' }); return; }
          let nextIdx = state.exerciseIndex + 1;
          while (nextIdx < exercises.length && state.skipped[exercises[nextIdx].id]) nextIdx++;
          if (nextIdx >= exercises.length) { dispatch({ type: 'FINISH' }); return; }
          dispatch({
            type: 'GOTO_NEXT',
            payload: {
              exerciseIndex: nextIdx,
              setNumber: 1,
              flow: 'ready',
              transitionMessage: 'Prossimo esercizio',
            },
          });
        }}
      />
    </div>
  );
}
```

Risultato: a fine protocollo il player viene smontato dal cambio di `currentExercise` (o dal `FINISH`); l'atleta non vede mai una schermata finale "premi per continuare", esattamente come EMOM.

### 3. Riuso esistente

- `normalizeTimedRoundsParams` (già in `src/lib/protocols/timedRounds.ts`): fallback `40 / 20 / 60 / 4` e almeno 1 esercizio per i record legacy.
- `saveSet.mutateAsync` già usato dal flow EMOM.
- `dispatch GOTO_NEXT` / `FINISH` del reducer esistente — nessuna nuova action.

## Garanzie "single-fire"

| Rischio | Mitigazione |
|---|---|
| Doppio `onFinished` da React StrictMode o re-render | `isCompletingRef.current` settato prima della chiamata; controllato all'ingresso di `finish()`. |
| Salva log duplicato | `saveSet.mutateAsync` chiamato solo dentro `onFinished` del flow, che è invocato una sola volta dal player. |
| Doppio `dispatch` di avanzamento | Stesso `onFinished` esegue una sola sequenza salva→dispatch (await sulla mutation poi una sola dispatch). |
| Tick a 0 + click "Salta fase" simultanei sull'ultima fase | `advancePhase()` legge `isCompletingRef`; se true esce subito senza re-chiamare `finish()`. |
| App in background | Timer timestamp-based: al primo tick di ritorno recupera lo stato reale e, se la fase è scaduta, esegue `advancePhase()` una sola volta. |

## Cosa NON si tocca

- DB, migration, RLS, auth, sidebar.
- Builder PT (TimedRoundsEditor invariato).
- Protocolli SET, SUPERSET, EMOM, AMRAP, TOP_SET_BACKOFF, RAMPING, LADDER, DEAD_LADDER, RXT, RUNNING_TOTAL.
- Reducer `GuidedWorkoutFlow` (uso le action esistenti).

## QA

1. **HIIT 3 × 3 round** (40/20/60): A→rest→B→rest→C → rest_round → … ; dopo l'ultimo C del round 3 → log + auto-advance, nessuna schermata "finished".
2. **TABATA 2 × 4 round** (20/10/60): stesso comportamento, solo titolo "TABATA".
3. **HIIT come ultimo esercizio** → log salvato, `FINISH` chiamato, workout terminato senza interazione.
4. **HIIT intermedio** → log salvato, `GOTO_NEXT` al prossimo esercizio set-based.
5. **Pausa/Riprendi**: nessun drift, nessun doppio tick.
6. **Salta fase ripetuto sull'ultima fase**: log salvato 1 volta, dispatch chiamato 1 volta.
7. **`rest_between_exercises = 0`** o **`rest_between_rounds = 0`**: fase saltata.
8. **HIIT/TABATA legacy senza `exercises`**: normalizer crea fallback, player parte usando `exerciseName`.

## File toccati

- **Nuovo:** `src/components/app/AtletaTimedRoundsPlayer.tsx`
- **Modificato:** `src/components/app/GuidedWorkoutFlow.tsx` (un solo branch HIIT/TABATA dopo EMOM)
