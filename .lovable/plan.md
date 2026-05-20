## Obiettivo

Trasformare i protocolli esistenti **HIIT** e **TABATA** in protocolli multi-esercizio a tempo, **condividendo esattamente lo stesso editor, la stessa struttura dati e la stessa normalizzazione**. L'unica differenza tra HIIT e TABATA in questo step è il titolo/nome visualizzato. Nessun nuovo protocollo, nessuna modifica a DB/RLS/auth/sidebar/altri protocolli/lato atleta.

## Cosa cambia

### 1. Nuovo modulo dati condiviso `src/lib/protocols/timedRounds.ts`

Type e helper UNICI per HIIT e TABATA:

```ts
type TimedRoundsExercise = {
  id: string;                // uuid locale riga
  exercise_id?: string;      // id esercizio del template, se selezionato
  name: string;              // nome (sempre presente, fallback per legacy)
  notes?: string;
};

type TimedRoundsParams = {
  exercises_count: number;
  exercise_duration_seconds: number;
  rest_between_exercises_seconds: number;
  rest_between_rounds_seconds: number;
  rounds: number;
  exercises: TimedRoundsExercise[];
};
```

Helper:
- `makeTimedRoundsExercise()` — crea riga vuota con uuid.
- `syncExercisesCount(list, n)` — porta `exercises.length === n` (aggiunge righe vuote o taglia).
- `normalizeTimedRoundsParams(raw)` — **unica** funzione, usata sia per HIIT che TABATA. Normalizza in memoria i legacy (`work_seconds`, `rest_seconds`, `rounds`, `intervals_total`, eventuale `mode`) verso il nuovo schema, con fallback:
  - `exercises_count = 1`
  - `exercise_duration_seconds = 40`
  - `rest_between_exercises_seconds = 20`
  - `rest_between_rounds_seconds = 60`
  - `rounds = 4`
  - `exercises = [makeTimedRoundsExercise()]` se mancante
- Nessuna scrittura DB automatica al mount: il commit avviene solo su modifica del PT.

### 2. Nuovo editor condiviso `src/components/pt/protocols/TimedRoundsEditor.tsx`

**Un solo componente** usato sia per HIIT che per TABATA.

Props:
```ts
{
  value: TimedRoundsParams;
  onChange: (next: TimedRoundsParams) => void;
  exerciseOptions: { id: string; name: string }[]; // = allTemplateExerciseOptions
  title?: string; // "HIIT" | "TABATA" — unica differenza
}
```

UI:
- **Dati generali** (griglia responsive): Numero esercizi, Durata esercizio (s), Recupero tra esercizi (s), Recupero tra round (s), Numero round.
  - Modificare "Numero esercizi" chiama `syncExercisesCount`.
- **Lista esercizi interni**:
  - Per ogni riga: combobox Popover+Command (stesso pattern di `SupersetEditor`) alimentato da `exerciseOptions`, campo note opzionale, cestino (disabilitato se `exercises_count === 1`).
  - Quando il PT seleziona un esercizio dal dropdown, salvare **sempre sia `exercise_id` sia `name`**. Se `exercise_id` non è disponibile (input libero/legacy), salvare almeno `name` per garantire la leggibilità.
  - Pulsante "+ Aggiungi esercizio" in fondo (incrementa `exercises_count` e aggiunge una riga).
- **NIENTE** reps, kg, set, tabella set.
- Eliminare un esercizio decrementa `exercises_count`; non si scende mai sotto 1.

### 3. Wiring in `TemplateExerciseBuilder.tsx`

- Importare `TimedRoundsEditor` e `normalizeTimedRoundsParams`.
- **Un singolo branch** condiviso HIIT/TABATA, prima del fallback generico:
  ```tsx
  if (ptype === 'HIIT' || ptype === 'TABATA') {
    const v = normalizeTimedRoundsParams(params);
    return (
      <TimedRoundsEditor
        value={v}
        title={ptype}  // "HIIT" oppure "TABATA"
        exerciseOptions={allTemplateExerciseOptions}
        onChange={(next) => updateProtocolParamMutation.mutate({
          id: te.id, params: next as unknown as ProtocolParams,
        })}
      />
    );
  }
  ```
- Rimuovere i blocchi note `ptype === 'TABATA'` e `ptype === 'HIIT'` (righe 1053–1066) perché il rendering è ora gestito dall'editor dedicato.
- `allTemplateExerciseOptions` è già la sorgente del tab "Esercizi" del template corrente (React Query già reattiva → nessun refresh manuale).

### 4. `src/lib/protocols/registry.ts`

- Aggiornare `defaultParams` di HIIT e TABATA al nuovo schema condiviso:
  ```ts
  { exercises_count: 1, exercise_duration_seconds: 40,
    rest_between_exercises_seconds: 20, rest_between_rounds_seconds: 60,
    rounds: 4, exercises: [{ id: <uuid>, name: '' }] }
  ```
- Svuotare i `paramFields` di HIIT e TABATA per evitare campi duplicati nel fallback generico (non vengono più renderizzati grazie al branch dedicato).
- Aggiornare `summarize`/preview (righe ~828 e ~896) per leggere il nuovo schema in modo difensivo (fallback ai vecchi campi se presenti, coerente con la normalizzazione in memoria).
- Aggiornare leggermente i testi di `sections` per riflettere il nuovo modello.

### 5. Cosa NON si tocca

- Database, migration, RLS, auth, sidebar, archivio esercizi globale.
- Protocolli SET, SUPERSET, EMOM, AMRAP, TOP_SET_BACKOFF, RAMPING, LADDER, DEAD_LADDER, RXT, RUNNING_TOTAL.
- Lato atleta (player/timer HIIT/TABATA): la normalizzazione in memoria garantisce che il rendering atleta legacy continui a funzionare leggendo i campi vecchi.

## File modificati / creati

- **Nuovo:** `src/lib/protocols/timedRounds.ts`
- **Nuovo:** `src/components/pt/protocols/TimedRoundsEditor.tsx`
- **Modificato:** `src/components/pt/TemplateExerciseBuilder.tsx` (import + branch unico HIIT/TABATA + rimozione note inline)
- **Modificato:** `src/lib/protocols/registry.ts` (defaultParams, paramFields, summarize/preview per HIIT e TABATA)

## QA

1. Aprire un template, aggiungere esercizio, scegliere HIIT → compare editor con dati generali + 1 riga esercizio.
2. Cambiare "Numero esercizi" a 3 → 3 righe; ridurre a 2 → 2 righe.
3. Cliccare "+ Aggiungi esercizio" → aggiunge riga, counter sale.
4. Cestino su riga → rimuove e decrementa; con 1 sola riga il cestino è disabilitato.
5. Dropdown esercizi mostra tutti gli esercizi del template corrente; aggiungendone uno nel tab "Esercizi" compare nel dropdown senza refresh manuale.
6. Selezionando un esercizio dal dropdown → in `protocol_params.exercises[i]` sono salvati sia `exercise_id` sia `name`.
7. Cambiando protocollo da HIIT a TABATA → stesso editor, stessi dati, solo titolo diverso.
8. Aprire un HIIT/TABATA legacy → si vede l'editor con valori normalizzati; nessuna scrittura finché il PT non modifica nulla.
9. SET, SUPERSET, EMOM, AMRAP e gli altri protocolli restano invariati.
