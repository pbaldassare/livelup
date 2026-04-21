

## Piano: Circuiti opzionali + protocollo per esercizio

### Obiettivo
Cambiare la struttura logica della scheda da:
- **Prima:** Scheda → Blocchi (con protocollo) → Esercizi
- **Dopo:** Scheda → Esercizi (con protocollo proprio), opzionalmente raggruppati in **Circuiti**

Il protocollo non vive più sul contenitore, ma sull'esercizio. Il circuito è solo un raggruppamento visivo/logico.

---

### Parte 1 — Modello dati (migration)

**Tabelle modificate:**

1. **Nuova colonna `protocol_type`** su `template_exercises` e `workout_exercises`
   - `protocol_type text NOT NULL DEFAULT 'SET'`
   - Valori validi: `SET`, `TOP_SET_BACKOFF`, `RAMPING`, `EMOM`, `AMRAP`
   - Nuova colonna `protocol_params jsonb DEFAULT '{}'::jsonb` per parametri specifici (es. `{rounds: 10, interval_seconds: 60}` per EMOM)

2. **Rinominare semanticamente `template_blocks` → `template_circuits`** (e `workout_blocks` → `workout_circuits`)
   - Approccio sicuro: **NON rinominiamo la tabella** (per non rompere migration history e RLS). Aggiungiamo invece una colonna `is_circuit boolean DEFAULT true` e usiamo solo `name` (rimuoviamo dalla UI il riferimento al "tipo protocollo" del blocco).
   - In alternativa: creiamo una **VIEW** `template_circuits` che alias-a `template_blocks` per leggibilità. Decisione: manteniamo il nome tecnico `template_blocks` nel DB ma in tutto il codice e UI parliamo solo di "Circuito".
   - Le colonne `type` e `params` su `template_blocks` diventano legacy (lasciate per retro-compat, ignorate dalla nuova UI).

3. **`block_id` resta nullable** (già lo è) → `null` significa "esercizio fuori circuito".

**Migration data (retro-compat):**
- Per ogni `template_exercises` esistente con `block_id` valorizzato: copia `block.type` → `template_exercises.protocol_type` e `block.params` → `protocol_params`. Se l'esercizio ha già `sets_data`, mantieni i set; altrimenti restano i campi piatti.
- Per esercizi senza `block_id`: `protocol_type = 'SET'` (default).
- Stesso trattamento su `workout_exercises` ↔ `workout_blocks`.
- I "blocchi" vecchi vengono trattati come circuiti (renaming solo a livello UI). Quelli che contenevano un solo esercizio possono restare come circuito mono-esercizio (l'utente può eliminarli e l'esercizio diventa "fuori circuito").

---

### Parte 2 — Refactor componenti PT (builder)

**File rinominato concettualmente:** `TemplateBlockBuilder.tsx` → `TemplateStructureBuilder.tsx` (manteniamo il file, solo la UI cambia testo).

**Nuova struttura UI:**

```text
Esercizi della scheda                          [+ Aggiungi esercizio] [+ Aggiungi circuito]

┌─ Esercizi singoli (fuori circuito) ─────────┐
│ 🏋 Panca Piana   [SET ▾]                    │
│   Set: 4×8@60kg / 90s                       │
│ 🏋 Squat         [RAMPING ▾]                │
│   5 serie a salire × 3                      │
└─────────────────────────────────────────────┘

┌─ ⊙ Circuito A — "Finisher addome"  [✎][🗑] ─┐
│ 🏋 Plank         [SET ▾]  3×60s             │
│ 🏋 Crunch        [SET ▾]  3×15              │
│ [+ Aggiungi esercizio al circuito]          │
└─────────────────────────────────────────────┘
```

**Cambi chiave:**
1. **Rimosso il "picker tipo protocollo" sul blocco**: cliccando "+ Aggiungi circuito" si crea direttamente un circuito (nessuna scelta protocollo).
2. **Nuovo selettore protocollo per esercizio**: dropdown inline con icona accanto al nome (`SET`, `RAMPING`, `TOP_SET_BACKOFF`, `EMOM`, `AMRAP`). Default `SET`.
3. **Sezione "Esercizi singoli"** sempre presente in cima: contiene gli esercizi con `block_id = null`.
4. **Drag & drop esteso**: trascinare esercizi tra circuiti / fuori circuito (modifica `block_id` al drop).
5. **Tabella set orizzontale** (già implementata) resta visibile per protocolli `SET`/`RAMPING`/`TOP_SET_BACKOFF`. Per `EMOM`/`AMRAP` mostra invece i campi di `protocol_params` (rounds/interval/duration).

**Pulsanti:**
- `+ Aggiungi esercizio` → aggiunge fuori circuito (`block_id = null`)
- `+ Aggiungi circuito` → crea nuovo `template_blocks` con solo `name` ("Circuito A", "Circuito B"...)
- Su ogni circuito: rinomina inline, elimina (gli esercizi tornano fuori circuito, NON cancellati), `+ Aggiungi esercizio al circuito`.

---

### Parte 3 — File modificati

| File | Modifica |
|---|---|
| **Nuova migration** | aggiunge `protocol_type`, `protocol_params` a `template_exercises` e `workout_exercises`; popola valori da `template_blocks.type/params` per dati esistenti. |
| `src/lib/protocols/registry.ts` | aggiunge helper `getDefaultParamsForProtocol(type)` e `describeExerciseProtocol(type, params, sets_data)`. |
| `src/components/pt/TemplateBlockBuilder.tsx` | rinominato concettualmente in "Structure builder": rimuove picker protocollo nell'add, rinomina UI da "Blocchi" a "Circuiti", aggiunge sezione "Esercizi fuori circuito" sopra la lista, supporta drag&drop tra circuiti via DnD esteso (cross-droppable). |
| `src/components/pt/TemplateExerciseBuilder.tsx` | aggiunge dropdown `protocol_type` per esercizio + render condizionale dei parametri (tabella SET vs campi EMOM/AMRAP). Update mutation include `protocol_type`/`protocol_params`. |
| `src/lib/api/templateLoader.ts` | select include `protocol_type, protocol_params`; ritorna nel mapping degli exercises. |
| `src/lib/api/workouts.ts` | `createWorkout` copia `protocol_type` e `protocol_params` da template a workout. |
| `src/components/pt/AssignWorkoutDialog.tsx` | propaga `protocol_type`/`protocol_params` nell'assegnazione. |
| `src/pages/atleta/AtletaWorkoutDetailPage.tsx` | il render usa `protocol_type` dell'esercizio (non più del blocco) per scegliere come mostrarlo; raggruppamento per `block_id` resta come "circuito" (solo etichetta cambia). |
| `src/components/app/GuidedWorkoutFlow.tsx` + `SetTracker.tsx` | leggono `protocol_type` dall'esercizio (fallback `'SET'`); `sets_data` ha priorità per i protocolli set-based. |

---

### Parte 4 — Retro-compatibilità (regola d'oro)

1. **Schede esistenti**: la migration popola `protocol_type` su ogni esercizio leggendo dal blocco padre (o `'SET'` se orfano). Zero rotture.
2. **Blocchi con tipi avanzati esistenti** (es. `EMOM`): l'esercizio eredita `protocol_type='EMOM'` e i `protocol_params` dal blocco. La UI continua a mostrarli correttamente.
3. **Workout già assegnati**: stessa migration applicata a `workout_exercises`.
4. **Protocollo `SET` come default**: ogni nuovo esercizio nasce con `protocol_type='SET'` e `sets_data` generato dai default (3 set 10×_×60s).

---

### Parte 5 — Validazioni
- Esercizio senza `protocol_type` → fallback `'SET'` (nessun errore).
- Circuito vuoto → badge warning "Vuoto" (già esistente, etichetta rinominata).
- Esercizio con `protocol_type='SET'` e 0 set → warning "Imposta almeno 1 set".
- Esercizio con protocollo non-SET e parametri obbligatori vuoti → warning.

---

### Checklist test
1. Crea scheda → vedo sezione "Esercizi singoli" + bottoni "+ Esercizio" e "+ Circuito".
2. Aggiungo esercizio → finisce in "Esercizi singoli", protocollo SET di default.
3. Cambio protocollo a `RAMPING` da dropdown → tabella set si adatta.
4. Aggiungo Circuito A → appare card vuota con nome editabile.
5. Trascino esercizio dentro Circuito A → `block_id` aggiornato.
6. Trascino esercizio fuori dal circuito → `block_id = null`, torna in "Esercizi singoli".
7. Elimino Circuito A → gli esercizi al suo interno tornano fuori circuito (non cancellati).
8. Apro scheda VECCHIA con blocchi → vedo i blocchi come circuiti, ogni esercizio ha già il suo `protocol_type` ereditato.
9. Atleta esegue scheda nuova → vede circuiti come gruppi e ogni esercizio col suo protocollo.
10. Atleta esegue scheda vecchia → identico a oggi.

