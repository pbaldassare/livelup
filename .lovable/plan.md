# AMRAP — editor strutturato (PT)

Trasformare AMRAP in un protocollo strutturato lato editor PT, allineato per pattern a EMOM ma con logica più semplice: un solo timer globale, nessun round/blocco, una lista piatta di esercizi che l'atleta esegue in loop.

Modifiche limitate a editor PT + helper. **Nessun cambio** a DB / RLS / auth / sidebar / migration / altri protocolli (EMOM, SET, TOP_SET_BACKOFF, RAMPING, …) / esecuzione lato atleta.

## 1. Nuovo schema `protocol_params` per AMRAP

Solo a livello logico — usa il JSON già esistente `protocol_params`, nessun nuovo campo DB.

```
{
  duration_seconds: number,    // timer globale
  exercises_count: number,     // sempre === exercises.length
  exercises: [
    {
      id: string,              // uid client
      exercise_id?: string,    // riferimento esercizio del template
      name: string,
      reps: number,
      weight: number | null
    }
  ],
  // legacy preservati ma non più usati: duration_minutes, reps, note
}
```

## 2. Invariante `exercises_count === exercises.length`

`exercises_count` è solo una scorciatoia di input per creare/rimuovere righe in batch. La fonte di verità operativa è `exercises[]`. Le due cose devono restare sempre allineate, gestito centralmente da `commit()` nell'editor:

- patch su `exercises_count` (input header) → `exercises = syncExercisesCount(exercises, exercises_count)`.
- patch su `exercises` (add riga, trash riga, edit cella) → forza `exercises_count = exercises.length` nello stesso `onChange`.
- mai stato in cui `exercises_count = 4` e solo 3 righe visibili: il bottone trash decrementa il count, il bottone "+ Aggiungi" lo incrementa, sempre derivato da `length`.
- `Math.max(1, …)` ovunque: minimo 1 riga, mai 0.

## 3. Helper `src/lib/protocols/amrap.ts` (nuovo)

Mirror minimo di `emom.ts`:

- `AmrapExercise`, `AmrapParams` types.
- `makeAmrapExercise(partial?)`: nuovo esercizio vuoto con `uid('amrap_ex')`, `name=''`, `reps=10`, `weight=null`.
- `syncExercisesCount(list, count)`: append vuoti se cresce, slice se cala. Min 1.
- `normalizeAmrapParams(raw)`: pura, in memoria, mai persistita:
  - `duration_seconds`: number > 0 oppure `duration_minutes × 60` se presente, altrimenti `600`.
  - `exercises`: se manca / non array / vuoto → `[makeAmrapExercise({ reps: raw.reps ?? 10 })]`. Mappa ogni elemento a forma stabile (`id`, `exercise_id?`, `name`, `reps`, `weight`).
  - `exercises_count`: se number > 0 lo applica + `syncExercisesCount`, altrimenti `exercises.length`. Sempre riallineato a `exercises.length` finale.

Nessuna mutate, nessun side-effect.

## 4. Nuovo componente `src/components/pt/protocols/AmrapEditor.tsx`

Stesso stile visivo di `EmomBlocksEditor`, più piatto:

- **Header parametri globali**:
  - `Durata totale (secondi)` — input number, min 1, step 30.
  - `Numero esercizi` — input number, min 1. Etichetta che chiarisce "sincronizzato con la lista sotto".
- **Lista esercizi**: per riga `i`
  - col 1: `ExerciseCombobox` (popover + Command identico a EMOM, popolato da `exerciseOptions`). Selezione → scrive `name` e `exercise_id`.
  - col 2: input `Reps` (number, min 1).
  - col 3: input `Kg` (number, min 0, step 0.5, vuoto = `null`).
  - bottone trash a destra: rimuove la riga, `commit` riallinea `exercises_count = nuova lunghezza`.
- Bottone `+ Aggiungi esercizio` in fondo: pusha vuoto, `commit` riallinea `exercises_count`.

Props:
```
{
  value: AmrapParams,
  onChange: (next: AmrapParams) => void,
  exerciseOptions?: { id: string; name: string }[],
}
```

Helper interno `commit(base, patch, onChange)` analogo a EMOM:
- patch con `exercises_count` (e non `exercises`) → `syncExercisesCount`.
- patch con `exercises` → forza `exercises_count = merged.exercises.length`.

Tutte le scritture passano da `onChange` esplicito. Nessuna scrittura al mount.

## 5. Wiring in `TemplateExerciseBuilder.tsx`

Aggiungere un early-return dedicato accanto a quello EMOM (~riga 805), nel ramo "Protocolli non-set-based":

```tsx
if (ptype === 'AMRAP') {
  const amrapValue = normalizeAmrapParams(params as Record<string, unknown>);
  return (
    <AmrapEditor
      value={amrapValue}
      exerciseOptions={allTemplateExerciseOptions}
      onChange={(next) => updateProtocolParamMutation.mutate({
        id: te.id,
        params: next as unknown as ProtocolParams,
      })}
    />
  );
}
```

Rimuovere il banner-nota AMRAP esistente (~riga 949) perché ridondante con la nuova UI dedicata. Nessun altro ramo del file viene toccato.

Aggiornamento minimo a `ProtocolParams` in `registry.ts`: aggiungere campi opzionali `duration_seconds?: number | null`, `exercises_count?: number | null`, `exercises?: Array<{id; exercise_id?; name; reps; weight}> | null`. Nessuna modifica ai `defaultParams` AMRAP per non innescare save automatici — i nuovi default vengono dal `normalizeAmrapParams` a livello editor.

## 6. ExerciseCombobox — fonte dati

Usa **lo stesso `allTemplateExerciseOptions`** già fetchato per EMOM (riga 191 di `TemplateExerciseBuilder.tsx`): query su `template_exercises` filtrata per `template_id`, deduplicata per nome. Esattamente "tutti gli esercizi del tab Esercizi del workout corrente", indipendenti da `block_id` / circuito. Quando il PT aggiunge un esercizio nel tab, React Query lo invalida → il combobox si aggiorna senza refresh manuale.

Nessuna fetch all'archivio globale. Nessun mock.

## 7. Compatibilità legacy

- AMRAP esistenti con solo `duration_minutes` + `reps` + `note` → `normalizeAmrapParams` produce in memoria un `duration_seconds = duration_minutes × 60`, un esercizio singolo con `reps = reps`, `name=''`. Il PT vede l'editor pieno e può completarlo.
- Nessuna mutate al mount: i nuovi default restano in memoria finché il PT non clicca/modifica esplicitamente.
- Campi legacy (`duration_minutes`, `reps`, `note`) NON vengono cancellati; alla prima save esplicita lo schema diventa quello nuovo, ma i campi legacy nel JSON restano innocui.

## 8. Esecuzione lato atleta

**Non toccata in questo task.** L'atleta continua a vedere AMRAP come ora. Il setup strutturato è funzionale alla futura UI atleta.

## File toccati

- `src/lib/protocols/registry.ts` — solo aggiunta tipi opzionali in `ProtocolParams` (no cambi a `defaultParams` AMRAP).
- `src/lib/protocols/amrap.ts` — nuovo helper (`AmrapParams`, `normalizeAmrapParams`, `makeAmrapExercise`, `syncExercisesCount`).
- `src/components/pt/protocols/AmrapEditor.tsx` — nuovo componente editor.
- `src/components/pt/TemplateExerciseBuilder.tsx` — early-return dedicato per AMRAP nel ramo non-set-based; rimozione del banner-nota AMRAP redundante.

## File / aree NON toccate

`emom.ts`, `EmomBlocksEditor.tsx`, `setsData.ts`, altri protocolli (SET, TOP_SET_BACKOFF, RAMPING, EMOM, SUPERSET, LADDER, DEAD_LADDER, TABATA, HIIT, RXT, RUNNING_TOTAL), `workout_logs`, esecuzione atleta (`GuidedWorkoutFlow`, sheet, ecc.), DB / migration / RLS / auth / sidebar / `ProtocolsTab` info popover.
