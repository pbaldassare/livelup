## Obiettivo

Estendere il protocollo **EMOM** già esistente per supportare una struttura a **blocchi** con esercizi multipli per blocco, mantenendo la compatibilità con gli EMOM già salvati. Nessun nuovo protocollo viene creato — `protocol_type = 'EMOM'` resta invariato. Cambia solo la **forma di `protocol_params`** e l'editor mostrato al PT.

## Stato attuale (riepilogo dell'analisi)

- Il protocollo EMOM è definito in `src/lib/protocols/registry.ts` con `paramFields` generici (durata, reps, mode, ladder).
- L'editor PT (`src/components/pt/TemplateExerciseBuilder.tsx`, righe ~750-840) renderizza automaticamente questi campi e li salva in `protocol_params` (JSONB).
- Il flusso atleta (`GuidedWorkoutFlow.tsx`, `SetTracker.tsx`) gestisce solo i protocolli SET; per EMOM mostra una nota informativa generica. Non c'è ancora una logica di esecuzione "minuto-per-minuto" nel player atleta — quindi l'estensione è puramente lato dati + editor PT, senza rompere alcun runtime esistente.
- Il campo `mode = 'alternating'` esiste già nel registry ma non era mai stato implementato come UI a blocchi.

## Nuova forma di `protocol_params` per EMOM

```text
{
  duration_minutes: number,   // (già esistente — rinominabile concettualmente in "durata round")
  rounds: number,             // NUOVO — numero totale di round (default = duration_minutes)
  mode: 'single' | 'alternating' | 'ladder',  // invariato
  ladder?: string,            // invariato
  blocks: [                   // NUOVO — array di blocchi
    {
      id: string,             // uuid locale per il drag/key
      label?: string,         // es. "Blocco A"
      exercises: [
        {
          id: string,
          name: string,         // nome esercizio (testo libero)
          measure: 'reps' | 'time',  // tipo
          value: number,             // numero reps oppure secondi
          progression: 'fixed' | 'ladder'  // modalità (fisso / ladder)
        }
      ]
    }
  ]
}
```

I blocchi si alternano in loop sui round: round 1 → blocco 0, round 2 → blocco 1, … round N → blocco (N-1) % blocks.length.

## Compatibilità EMOM esistenti

Al caricamento, normalizzare i params in una funzione helper `normalizeEmomParams(params)`:

- se `blocks` esiste e non è vuoto → usa così com'è.
- altrimenti → genera **un solo blocco** con **un solo esercizio** ricavato dai vecchi campi:
  - `name` = nome dell'esercizio del template (oppure stringa vuota se non disponibile in quel contesto)
  - `measure = 'reps'`, `value = params.reps ?? 10`
  - `progression = params.mode === 'ladder' ? 'ladder' : 'fixed'`
- se `rounds` mancante → `rounds = duration_minutes` (1 round = 1 minuto, comportamento storico).

Questo garantisce che gli EMOM già salvati funzionino e si possano riaprire/modificare senza perdita di dati.

## Modifiche richieste (file)

### 1. `src/lib/protocols/registry.ts`

- Aggiornare il tipo `ProtocolParams` aggiungendo i campi opzionali `rounds`, `blocks` (con i sotto-tipi `EmomBlock` ed `EmomBlockExercise`).
- Aggiungere `defaultParams.blocks` con un blocco vuoto di esempio e `rounds: 10`.
- Mantenere i `paramFields` esistenti per non rompere il render generico, ma aggiungere un nuovo tipo di field `'emom_blocks'` (oppure marcare EMOM con un flag `customEditor: true`) così che l'editor PT sappia di mostrare il componente dedicato al posto della form lineare.
- Aggiornare le `sections` (descrizione protocollo) per riflettere la nuova logica a blocchi alternati in loop.

### 2. Nuovo componente `src/components/pt/protocols/EmomBlocksEditor.tsx`

Editor dedicato per la struttura a blocchi:

- Header con i parametri base: numero round, durata round (secondi/minuti), numero blocchi (calcolato da `blocks.length`, con pulsanti `+ Aggiungi blocco` / `Rimuovi`).
- Per ogni blocco una card collassabile:
  - label opzionale del blocco (auto: "Blocco A", "Blocco B", …)
  - lista esercizi con: nome, select tipo (reps/tempo), input valore, select modalità (fisso/ladder), pulsante elimina
  - pulsante `+ Aggiungi esercizio`
- Anteprima testuale dell'alternanza: `Round 1 → Blocco A • Round 2 → Blocco B • Round 3 → Blocco A …`
- Tutte le modifiche chiamano `onChange(nextParams)` che a sua volta usa la mutation `updateProtocolParamMutation` già esistente nel builder.

### 3. `src/components/pt/TemplateExerciseBuilder.tsx`

- Nel blocco che renderizza i `paramFields` (~righe 750-825), aggiungere un branch: se `ptype === 'EMOM'`, montare `<EmomBlocksEditor params={normalizeEmomParams(params)} onChange={…} />` al posto della griglia di input generica.
- Sostituire la nota informativa esistente per EMOM (riga 834) con una nota aggiornata che spiega l'alternanza dei blocchi.
- Nessuna modifica agli altri protocolli.

### 4. Helper `src/lib/protocols/emom.ts` (nuovo)

- `normalizeEmomParams(params, fallbackName?)` → restituisce sempre la forma nuova con `blocks[]` garantito.
- `getBlockForRound(blocks, roundIndex)` → ritorna `blocks[roundIndex % blocks.length]` (utile in futuro per il player atleta).
- Tipi esportati `EmomBlock`, `EmomBlockExercise`, `EmomMeasure`, `EmomProgression`.

### 5. Player atleta

Nessuna modifica obbligatoria in questo task. Il `GuidedWorkoutFlow` oggi non esegue EMOM minuto-per-minuto, quindi non c'è nulla da rompere. La struttura a blocchi è già pronta per essere consumata quando verrà implementato il player EMOM dedicato (basterà chiamare `normalizeEmomParams` e iterare con `getBlockForRound`).

## Cosa NON viene toccato

- Nessuna modifica al DB (`protocol_params` è già JSONB, accetta la nuova forma).
- Nessuna modifica agli altri protocolli (SET, AMRAP, SUPERSET, LADDER, …).
- Nessuna modifica al wizard programmi, alle modalità Day by Day / Ricorrente, alle assegnazioni esistenti, all'autenticazione o alle RLS.
- Nessuna modifica all'UI generale del builder, solo al pannello parametri quando il protocollo selezionato è EMOM.

## Risultato atteso

Il PT, selezionando EMOM su un esercizio di un template, vedrà un editor dedicato che gli permette di definire round, durata round e una lista di blocchi, ciascuno con i propri esercizi (nome, reps/tempo, valore, fisso/ladder). Gli EMOM creati prima di questa modifica continueranno a funzionare e a essere modificabili (appariranno come 1 blocco / 1 esercizio precompilato dai vecchi campi).
