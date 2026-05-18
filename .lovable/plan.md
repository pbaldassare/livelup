
# SUPERSET — editor strutturato (PT) + esecuzione atleta set-based

Trasformare SUPERSET in un protocollo strutturato lato editor PT, allineato per pattern a EMOM/AMRAP ma **senza** round, **senza** circuiti, **senza** blocchi. È una **sequenza di esercizi ripetuta N superset volte**, gestita internamente come protocollo **set-based**: la tabella set è la fonte di verità dell'esecuzione atleta.

Modifiche limitate a editor PT + helper + esecuzione atleta del solo SUPERSET. **Nessun cambio** a DB / RLS / auth / sidebar / archivio esercizi globale / migration / altri protocolli (EMOM, AMRAP, SET, TOP_SET_BACKOFF, RAMPING, LADDER, DEAD_LADDER, TABATA, HIIT, RXT, RUNNING_TOTAL).

## 1. Schema `protocol_params` SUPERSET (in memoria)

Nessun nuovo campo DB — riuso del JSON `protocol_params` esistente.

```
{
  exercises_count: number,              // sempre === exercises.length
  supersets_count: number,              // === set_data[*].sets.length
  rest_between_supersets: number,       // secondi
  rest_between_exercises_enabled: boolean,
  rest_between_exercises: number | null, // valido solo se enabled

  // CONFIG: visualizzazione lista + default editor
  exercises: [
    {
      id: string,
      exercise_id?: string,
      name: string,
      reps: number,
      weight: number | null,
      notes: string                     // note specifiche per QUESTO esercizio nel superset
    }
  ],

  // RUNTIME — fonte di verità dell'esecuzione atleta
  set_data: [
    {
      exercise_id?: string,
      exercise_name: string,
      sets: [
        { set_number: number, reps: number, weight: number | null, rest_seconds: number }
      ]
    }
  ]
  // legacy preservati ma non più usati:
  //   paired_exercise_id, sets, reps, internal_rest_seconds, external_rest_seconds, note
}
```

Mapping atleta:
- `set_data[r]` = riga dell'esercizio `exercises[r]`.
- `set_data[r].sets[c]` = cella usata dall'atleta al superset numero `c + 1`. Cioè **`Set 1` = `Superset 1`**, `Set 2` = `Superset 2`, ecc.

## 2. Invarianti (mai disallineamenti)

Gestiti centralmente in `commit()` dell'editor:

- `exercises_count === exercises.length` sempre.
  - patch su `exercises_count` → `exercises = syncExercisesCount(exercises, count)`.
  - patch su `exercises` (add / trash / edit) → `exercises_count = exercises.length`.
- `set_data.length === exercises_count`, e per ogni riga `sets.length === supersets_count`.
  - patch su `exercises` o `exercises_count` → `set_data = syncSetData(set_data, exercises, supersets_count, defaults)` (resize righe, preserva celle).
  - patch su `supersets_count` → `syncSetData` (resize colonne).
- Ogni `set_data[r].sets[c].set_number === c + 1` (riallineato dopo ogni resize).
- `Math.max(1, …)` ovunque (min 1 esercizio, min 1 superset).
- `rest_between_exercises_enabled = false` → `rest_between_exercises = null` (in memoria; alla riattivazione default 30 o ultimo valore noto).

## 3. Helper `src/lib/protocols/superset.ts` (nuovo)

Mirror di `amrap.ts`:

- Types `SupersetExercise`, `SupersetParams`, `SupersetSetRow`, `SupersetSetCell`.
- `makeSupersetExercise(partial?)`: `id=uid('ss_ex')`, `name=''`, `reps=10`, `weight=null`, `notes=''`.
- `syncExercisesCount(list, count)`: append vuoti / slice. Min 1.
- `syncSetData(set_data, exercises, supersets_count, defaults)`:
  - Allinea **righe** a `exercises` per indice (preserva celle dell'esercizio se è ancora presente, altrimenti nuova riga vuota basata sui valori dell'esercizio).
  - Allinea **colonne** a `supersets_count`: append celle nuove con `reps/weight` dall'esercizio sopra e `rest_seconds = rest_between_supersets`; tronca le eccedenti.
  - Riallinea sempre `set_number = index + 1`.
  - **Non sovrascrive** mai celle già personalizzate dal PT.
- `propagateGeneralChange(...)` (helper interno): aggiorna in `set_data` solo le celle che combaciano col vecchio default (reps / weight / rest_seconds).
- `normalizeSupersetParams(raw)` — pura, in memoria, mai persistita:
  - Default base se mancano campi: `exercises_count=2`, `supersets_count=3`, `rest_between_supersets=90`, `rest_between_exercises_enabled=true`, `rest_between_exercises=30`.
  - **Migrazione legacy**: se trova `paired_exercise_id` o `internal_rest_seconds` / `external_rest_seconds` / `sets`, costruisce in memoria 2 esercizi (corrente + B se risolvibile, altrimenti placeholder), `supersets_count = raw.sets ?? 3`, `rest_between_supersets = raw.external_rest_seconds ?? 90`, `rest_between_exercises = raw.internal_rest_seconds ?? 30`, `rest_between_exercises_enabled = true`, `reps = raw.reps ?? 10`. Costruisce inoltre `set_data` consistente.
  - Forza sempre tutti gli invarianti §2 prima del return.

Nessuna mutate, nessun side-effect, mai persistito al mount.

## 4. Nuovo componente `src/components/pt/protocols/SupersetEditor.tsx`

Pattern visivo di `AmrapEditor`. **Mai usare** le parole "round", "circuito", "blocco" nei label/hint/note.

Sezioni:

### A — Dati generali (grid 2 colonne, header)
- `Numero esercizi` (number, min 1).
- `Numero superset` (number, min 1).
- `Recupero tra superset (s)` (number, min 0, step 5).
- `Recupero tra esercizi`: `Switch` (default ON).
- `Tempo recupero tra esercizi (s)` (number, min 0, step 5) → visibile **solo** se lo switch è ON.

### B — Lista esercizi del Superset
Per riga `i` (`exercises[i]`), grid responsive simile ad AMRAP, con riga aggiuntiva sotto per le note:

- `ExerciseCombobox` (popover + Command, identico a quello di AMRAP / EMOM). Popolato da `exerciseOptions` = `allTemplateExerciseOptions` (vedi §6). Selezione → scrive `name` + `exercise_id`. Fallback per esercizi legacy con solo `name`.
- `Reps` (number, min 1).
- `Kg` (number, min 0, step 0.5, vuoto = `null`).
- `Note` (Input) — mappato su `exercises[i].notes`, full-width sotto la riga.
- bottone trash a destra: rimuove la riga, `commit` riallinea `exercises_count` e `set_data`. Disabilitato se `length <= 1`.

In fondo: `+ Aggiungi esercizio` → pusha vuoto, riallinea.

### C — Tabella set finale (fonte di verità runtime)
Sotto la lista, una tabella editabile (`Table`/`TableBody`/`TableHead` da `@/components/ui/table`):

- Header: 1ª colonna `Esercizio`, poi `Set 1 … Set N` (N = `supersets_count`). Tooltip/hint nell'header colonna: "Set X = Superset X".
- Per ogni esercizio in `exercises[]` una riga; cella nome esercizio read-only.
- Ogni cella di set espone tre input compatti su una micro-grid: `reps`, `kg`, `rec (s)` mappati su `set_data[r].sets[c]`.
- Modifiche manuali in tabella restano persistenti — nessuna ri-derivazione dai valori sopra al re-render.

### D — Footer informativo (testo neutro, niente "round/circuito/blocco")
> "Durante l'esecuzione i valori reali (reps, kg, recupero) sono quelli della tabella. La colonna Set X corrisponde al Superset X. L'atleta eseguirà la sequenza di esercizi e la ripeterà per il numero di superset impostato. Tra un esercizio e l'altro applica il recupero esercizi (se attivo); al termine della sequenza applica il recupero tra superset, tranne dopo l'ultimo."

### Props
```
{
  value: SupersetParams,
  onChange: (next: SupersetParams) => void,
  exerciseOptions?: { id: string; name: string }[],
}
```

### `commit(base, patch, onChange)` — regole
Applica nell'ordine:
1. Merge `{...base, ...patch}`.
2. Se patch contiene `exercises_count` (senza `exercises`) → `exercises = syncExercisesCount(...)`.
3. Se patch contiene `exercises` → `exercises_count = exercises.length`.
4. Se patch contiene uno tra `exercises`, `exercises_count`, `supersets_count` → `set_data = syncSetData(...)`.
5. Se patch su `exercises[i].reps`/`weight`: propaga ai soli celle in `set_data[i].sets[*]` che hanno il **vecchio** valore (celle personalizzate restano intatte).
6. Se patch su `rest_between_supersets`: propaga alle celle con `rest_seconds === oldDefault`.
7. Se patch su `rest_between_exercises_enabled === false` → azzera `rest_between_exercises`.

Tutte le scritture passano da `onChange`. Nessuna scrittura al mount.

## 5. Wiring in `TemplateExerciseBuilder.tsx`

Subito dopo l'early-return AMRAP (~riga 847), aggiungere:

```tsx
if (ptype === 'SUPERSET') {
  const supersetValue = normalizeSupersetParams(params as Record<string, unknown>);
  return (
    <SupersetEditor
      value={supersetValue}
      exerciseOptions={allTemplateExerciseOptions}
      onChange={(next) => updateProtocolParamMutation.mutate({
        id: te.id,
        params: next as unknown as ProtocolParams,
      })}
    />
  );
}
```

Rimuovere il banner-nota SUPERSET esistente (righe 970–976) — ridondante con la nuova UI dedicata. Nessun altro ramo del file viene toccato.

Aggiornamento minimo a `ProtocolParams` in `registry.ts`: aggiungere campi opzionali `supersets_count?`, `rest_between_supersets?`, `rest_between_exercises_enabled?`, `rest_between_exercises?`, `set_data?` ed estendere l'item `exercises` con `notes?: string`. **Nessun cambio a `SUPERSET.defaultParams`** per non innescare save automatici: i nuovi default vengono dal `normalizeSupersetParams` lato editor.

## 6. Fonte dati combobox esercizio

Riusa **lo stesso `allTemplateExerciseOptions`** già fetchato per EMOM/AMRAP (`template-exercise-options` query, righe ~191 di `TemplateExerciseBuilder.tsx`): query su `template_exercises` filtrata per `template_id`, deduplicata per nome.

- **NON** archivio globale, **NON** mock, **NON** filtro per `block_id`.
- Aggiungendo esercizi nel tab "Esercizi", l'invalidate di React Query esistente aggiorna il combobox senza refresh manuale.

## 7. Compatibilità legacy

- Superset esistenti (schema con `paired_exercise_id` + `sets` + `internal/external_rest_seconds`) → `normalizeSupersetParams` produce in memoria 2 esercizi + N superset + `set_data` consistente. Il PT vede l'editor pieno e può completarlo.
- Nessuna mutate al mount: i nuovi default restano in memoria finché il PT non clicca / modifica.
- Campi legacy nel JSON restano innocui dopo la prima save esplicita.

## 8. Esecuzione lato atleta — set-based

Solo per `protocol_type === 'SUPERSET'`. **`set_data` è la fonte di verità.** I valori `exercises[*].reps`/`weight` NON vengono usati a runtime se `set_data` esiste: servono solo come default editor.

```
p = normalizeSupersetParams(params)  // garantisce set_data popolato

for c in 0..p.supersets_count - 1:            // colonna = superset corrente
  for r in 0..p.exercises_count - 1:          // riga = esercizio corrente
    cell = p.set_data[r].sets[c]              // ← FONTE DI VERITÀ
    show exercise p.exercises[r].name
         with reps = cell.reps,
              weight = cell.weight,
              notes = p.exercises[r].notes
    if p.rest_between_exercises_enabled and r < p.exercises_count - 1:
       show rest = p.rest_between_exercises
  if c < p.supersets_count - 1:
     show rest = p.rest_between_supersets     // mai dopo l'ultimo superset
```

Esempio (`supersets_count=3`, `exercises_count=2`):
- Superset 1: esercizio 1 con `set_data[0].sets[0]` → rec esercizi → esercizio 2 con `set_data[1].sets[0]` → rec superset.
- Superset 2: `set_data[0].sets[1]`, `set_data[1].sets[1]` → rec superset.
- Superset 3: `set_data[0].sets[2]`, `set_data[1].sets[2]` → fine.

State machine: `{ supersetIdx, exerciseIdx, phase: 'work' | 'rest_ex' | 'rest_set' }`. Stesso pattern già usato per EMOM/AMRAP, isolato al solo Superset.

UI atleta: niente "round / circuito / blocco". Etichette: "Superset X di N", "Esercizio Y di M", "Recupero esercizio", "Recupero tra superset".

Tracking eseguito: i log salvati lato atleta usano i valori di `set_data[r].sets[c]` come prescritti, e i valori effettivi inseriti dall'atleta (reps/kg) come actual.

## 9. File toccati

- `src/lib/protocols/registry.ts` — solo aggiunta tipi opzionali in `ProtocolParams` + `notes?: string` sull'item `exercises`. Nessun cambio a `SUPERSET.defaultParams`.
- `src/lib/protocols/superset.ts` — nuovo helper.
- `src/components/pt/protocols/SupersetEditor.tsx` — nuovo componente editor.
- `src/components/pt/TemplateExerciseBuilder.tsx` — early-return dedicato SUPERSET; rimozione banner-nota SUPERSET ridondante.
- `src/components/app/GuidedWorkoutFlow.tsx` — branch esecuzione SUPERSET set-based §8.

## 10. File / aree NON toccate

`amrap.ts`, `emom.ts`, `AmrapEditor.tsx`, `EmomBlocksEditor.tsx`, `setsData.ts`, gli altri protocolli (SET, TOP_SET_BACKOFF, RAMPING, EMOM, AMRAP, LADDER, DEAD_LADDER, TABATA, HIIT, RXT, RUNNING_TOTAL), `workout_logs`, DB / migration / RLS / auth / sidebar / archivio esercizi globale / `ProtocolsTab` info popover.
