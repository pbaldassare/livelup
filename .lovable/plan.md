## Obiettivo

Riallineare l'editor EMOM lato PT alla nuova struttura richiesta:

- 3 dati **globali** in alto: **Numero round**, **Durata round**, **Numero blocchi**.
- Sotto, tanti riquadri "Blocco N" quanti `blocks_count`.
- Dentro ogni blocco: lista esercizi con **solo** dropdown esercizio (preso dall'intero tab "Esercizi" del workout) + **ripetizioni**.

Niente nuovo protocollo: si modifica solo l'EMOM esistente. Database, RLS e altri protocolli non vengono toccati.

## Vincoli obbligatori (presi dal messaggio utente)

1. **Parametri globali EMOM**: `rounds`, `round_duration`, `blocks_count` esistono **una sola volta** in `protocol_params` dell'esercizio EMOM (non per riga, non duplicati).
2. **`blocks_count` = fonte di verità**: sempre `blocks.length === blocks_count`. Aumento → append blocchi vuoti; diminuzione → tronca. Nessuno stato disallineato.
3. **Dropdown esercizi**: mostra **tutti** gli esercizi del workout/template corrente (non filtrati per `block_id`/circuito). Non usa l'archivio globale, mock o dati statici. Si aggiorna in tempo reale via React Query quando il PT aggiunge un esercizio nel tab "Esercizi".
4. **Normalizzazione senza scrittura automatica**: `normalizeEmomParams` è usata **solo in memoria** per rendering / compat legacy. **Nessun** save automatico al mount. Persist solo su azione esplicita del PT (cambio campo, add/remove blocco, add/remove esercizio, modifica reps, selezione esercizio).

## Modifiche

### 1. `src/lib/protocols/emom.ts`

Estendere il type e la normalizzazione:

```text
EmomBlockExercise = { id, exercise_id?, name, reps }
EmomBlock        = { id, label?, exercises: EmomBlockExercise[] }
EmomParams       = {
  rounds: number,
  round_duration: number,   // secondi
  blocks_count: number,
  blocks: EmomBlock[],
  // legacy retro-compat (ignorati in UI):
  duration_minutes?, mode?, ladder?, reps?
}
```

`normalizeEmomParams(params, fallbackName?)`:
- Solo trasformazione **pure** in memoria. Mai chiama Supabase, mai effetti collaterali.
- Se manca `round_duration` → derivalo da `duration_minutes * 60` (default 60s).
- Se mancano `blocks` → genera 1 blocco con 1 esercizio `{ name: fallbackName, reps: legacy.reps ?? 10 }`.
- Se i blocchi sono nel vecchio formato (`measure`/`value`/`progression`) → mappa a `{ name, reps: value }` (preserva nomi).
- `blocks_count` derivato da `blocks.length` quando assente, e **forzato uguale a `blocks.length`** dopo qualsiasi mutazione (helper `syncBlocksCount`).

### 2. `src/components/pt/protocols/EmomBlocksEditor.tsx` (riscrittura UI)

Header con i 3 input globali (uniche fonti per `protocol_params` a livello di protocollo):

- **Numero round** (number, min 1).
- **Durata round** (in secondi, min 10, step 5; etichetta che mostra anche conversione `1' 30"` se ≥ 60s).
- **Numero blocchi** (number, min 1, max 10): editabile.
  - Aumenta → append `makeEmomBlock()` finché `blocks.length === blocks_count`.
  - Diminuisce → tronca `blocks.slice(0, blocks_count)`.
  - Ogni `onChange` mantiene l'invariante `blocks.length === blocks_count` prima di chiamare `onChange(next)`.

Per ogni blocco:

- Header "Blocco N" con label opzionale modificabile.
- Lista esercizi a riga compatta: `[Combobox esercizio] [Reps] [🗑]`.
- Bottone "Aggiungi esercizio".
- Rimosse: collapsibili, anteprima "alternanza round → blocco", select tipo (reps/time), select modalità (fixed/ladder).

Per ogni esercizio:
- **ExerciseCombobox** (riusato): `options = exerciseOptions` passate dal builder. Allo `onSelect` salva sia `name` sia `exercise_id`. Mantiene il fallback "Personalizzato" per non rompere righe legacy senza match.
- **Ripetizioni**: input number, min 1.

Tutti gli `onChange` chiamano `onChange(next)` del parent (nessuna scrittura locale al DB): è il parent che persiste.

### 3. `src/components/pt/TemplateExerciseBuilder.tsx`

- Aggiungere una **query separata** per popolare le options EMOM con **tutti** gli esercizi del template (non filtrata per `block_id`):

```text
queryKey: ['template-exercise-options', templateId]
select: id, exercise_id, exercises(name)
where: template_id = templateId
```

- Derivare `exerciseOptions = data.map(r => ({ id: r.exercise_id, name: r.exercises.name })).filter(o => o.name)` con dedup case-insensitive.
- Passare `exerciseOptions` a `EmomBlocksEditor` solo per esercizi con `protocol_type === 'EMOM'`.
- Invalidate di questa query quando si aggiunge/rimuove un esercizio dal template (qualsiasi blocco) → dropdown live senza refresh.
- La persistenza usa la `updateProtocolParamMutation` esistente, invocata solo dagli `onChange` espliciti dell'editor (no auto-save al mount).

### 4. Salvataggio

Continuiamo a salvare in `template_exercises.protocol_params` come JSON. Cambia solo lo schema interno: chiavi `rounds`, `round_duration`, `blocks_count`, `blocks`. Nessuna migration DB.

## Cosa NON viene toccato

- DB, migration, RLS.
- Altri protocolli (SET, AMRAP, ecc.).
- Sidebar archivio esercizi globale.
- `AtletaEmomSummary` (lato atleta) — continua a leggere `blocks`/`rounds`/`round_duration` con fallback su `duration_minutes` già previsto in `normalizeEmomParams`.
- Esecuzione workout / timer.

## Compatibilità EMOM esistenti

- EMOM legacy (no `blocks`) → `normalizeEmomParams` produce in memoria 1 blocco / 1 esercizio. Nessuna scrittura finché il PT non modifica qualcosa.
- EMOM "intermedi" (con `measure`/`value`) → mappati in memoria a `{name, reps}` preservando i nomi. Salvataggio nel nuovo formato avviene solo al primo edit esplicito.
- Nessuna perdita dati; nessuna scrittura automatica.
