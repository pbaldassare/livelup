

## Piano: Sistema Protocolli nelle Schede

### Analisi attuale
- `workout_templates` → `template_exercises` (esercizi piatti) → istanziati su `workouts` → `workout_exercises`.
- Il drag&drop esiste già in `TemplateExerciseBuilder.tsx` per esercizi.
- L'esecuzione atleta in `AtletaWorkoutDetailPage.tsx` itera su `workout_exercises` per `order_index`.
- L'assegnazione (in `programs.ts`/`workouts.ts`) duplica `template_exercises` → `workout_exercises`.

### Modello dati (introduzione blocchi)

Inserisco un livello intermedio "block/protocol" sia su template che su workout, mantenendo retrocompatibilità (esercizi senza block_id = blocco "SET" implicito).

**Migration nuove tabelle:**
- `template_blocks` (id, template_id FK, order_index, type ENUM, name, params JSONB, info_note, created_at)
- `workout_blocks` (id, workout_id FK, order_index, type, name, params JSONB, info_note, created_at)
- Aggiungo `block_id UUID NULL` a `template_exercises` e `workout_exercises` (FK con ON DELETE CASCADE verso il rispettivo `*_blocks`).
- Nuovo enum `protocol_type`: `SET | TOP_SET_BACKOFF | RAMPING | EMOM | AMRAP`.
- RLS clonate dalle tabelle parent (PT manage own, atleta view own).

**Schema `params` (JSONB unificato):**
```json
{ "sets": 3, "reps": 10, "rest_seconds": 60, "weight": null,
  "duration_seconds": null, "rounds": null, "interval_seconds": null,
  "top_set": { "reps": 3, "rpe": 9 }, "back_off": { "sets": 3, "drop_pct": 10 } }
```
Solo i campi rilevanti per ogni `type` vengono usati; struttura unica → estendibile senza refactor.

### Codice frontend

**1. Libreria protocolli — `src/lib/protocols/registry.ts` (nuovo)**
Registry centrale tipo-safe con: `type`, `label`, `icon`, `description` (per ⓘ), `defaultParams`, `paramFields[]` (lista campi da renderizzare), `executionMode` (per UI atleta).
Aggiungere nuovi protocolli = aggiungere voce nel registry. Niente hardcoding nei componenti.

**2. PT — `src/components/pt/TemplateBlockBuilder.tsx` (nuovo, sostituisce uso diretto di TemplateExerciseBuilder dentro `PTTemplateDetailPage`)**
- Lista verticale di blocchi (DnD con `@hello-pangea/dnd`).
- "Aggiungi protocollo" → popover/sheet con la libreria (cards dei 5 tipi, descrizione breve).
- Card blocco: header con nome tipo + icona ⓘ (Popover descrizione fissa dal registry) + actions (duplica, elimina, drag).
- Body: form parametri renderizzato dinamicamente dal `paramFields[]` del registry.
- All'interno: `TemplateExerciseBuilder` esistente riusato passando `blockId` come scope (filtro esercizi per `block_id`). Drag&drop esercizi dentro il blocco resta funzionante.
- Warning visivo se blocco senza esercizi.
- Duplica blocco → copia row + tutti i suoi `template_exercises`.

**3. Refactor minimale `TemplateExerciseBuilder.tsx`**
- Aggiungere prop `blockId: string` e usarla in INSERT + filtro query.
- Rimosso lo "scroll-area" globale dei 400px (ora ogni blocco gestisce i suoi esercizi).

**4. Aggiornamento `PTTemplateDetailPage.tsx`**
- Sostituire `<TemplateExerciseBuilder/>` con `<TemplateBlockBuilder templateId={..}/>`.

**5. Assegnazione workout — `src/lib/api/workouts.ts` + `programs.ts`**
- `createWorkoutFromTemplate(templateId, ...)`: 
  1. Legge `template_blocks` + `template_exercises` (con `block_id`).
  2. Inserisce `workout_blocks` mantenendo mapping `oldBlockId → newBlockId`.
  3. Inserisce `workout_exercises` con `block_id` rimappato.
- Path già esistente (`createWorkout` con array piatto) resta compatibile (esercizi senza block_id = legacy).

**6. Atleta — `AtletaWorkoutDetailPage.tsx`**
- Query: include `workout_blocks (*, workout_exercises(*, exercises(*)))`.
- Render: itera sui blocchi (in `order_index`), per ognuno mostra header semplice ("Blocco 1 — Set standard 4×10") **senza esporre il tipo tecnico**, poi gli esercizi del blocco.
- Per Fase 1 il flusso esecuzione resta lineare per esercizio (come oggi). Tutta la "decisione UI per tipo" passa da una funzione `renderBlockExecution(type, params)` con default = comportamento attuale. EMOM/AMRAP/RAMPING avranno solo etichette descrittive in Fase 1, logica avanzata in Fase 2.
- Esercizi orfani (senza block_id) raccolti in un blocco virtuale "Esercizi" in coda.

**7. Componente comune — `src/components/protocols/ProtocolInfoPopover.tsx` (nuovo)**
Icona ⓘ + popover con descrizione dal registry. Riutilizzato lato PT (config) e atleta (header blocco, opzionale).

### File creati/modificati
- **DB migration**: 2 tabelle, 2 colonne, 1 enum, RLS.
- `src/lib/protocols/registry.ts` (nuovo)
- `src/components/protocols/ProtocolInfoPopover.tsx` (nuovo)
- `src/components/pt/TemplateBlockBuilder.tsx` (nuovo)
- `src/components/pt/TemplateExerciseBuilder.tsx` (prop `blockId`)
- `src/pages/pt/PTTemplateDetailPage.tsx` (usa BlockBuilder)
- `src/lib/api/workouts.ts` (duplicazione blocchi+esercizi su create)
- `src/lib/api/programs.ts` (allineare assignWorkout/rotation per duplicare blocchi)
- `src/pages/atleta/AtletaWorkoutDetailPage.tsx` (render per blocco + fallback orfani)

### Edge case gestiti
- Blocco vuoto → badge warning lato PT, ma salvataggio consentito.
- Eliminazione blocco → cascade elimina i suoi esercizi (FK).
- Duplicazione blocco → copia params + tutti gli esercizi col nuovo `block_id`.
- Workout/template legacy (senza blocchi) → continuano a funzionare via fallback "blocco virtuale".
- Più protocolli misti in stessa scheda → ordinamento garantito da `order_index` su `*_blocks`.

### Checklist test
1. PT: aggiungo blocco SET + 3 esercizi → ordina/salva ok
2. PT: aggiungo blocco EMOM con `rounds=10, interval=60` → params salvati in JSONB
3. PT: clic ⓘ → popover descrizione corretta dal registry
4. PT: drag riordino blocchi e esercizi dentro blocchi → ok
5. PT: duplico blocco → nuovo blocco con stessi params + esercizi clonati
6. Assegno template a atleta → workout creato con `workout_blocks` + `workout_exercises` mappati
7. Atleta: vede blocchi in ordine, header descrittivo non tecnico, esegue normalmente
8. Template legacy (senza blocchi) → atleta vede gli esercizi in blocco virtuale, nessuna regressione

