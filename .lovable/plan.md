# Piano

## Obiettivo
Ripristinare il comportamento corretto del protocollo `SUPERSET` lato PT, in modo che:
- il selettore protocollo resti sempre visibile e cliccabile
- il cestino principale della card esercizio resti sempre visibile e cliccabile
- sotto l’header venga montato il `SupersetEditor` corretto
- nel `SupersetEditor` compaiano `Numero superset`, tabella set, `+ Set` e cestino colonne
- sia sempre possibile cambiare protocollo da `SUPERSET` a un altro

## Cosa modificherò

### 1. Header stabile della card esercizio in `TemplateExerciseBuilder.tsx`
Manterrò l’header della card come blocco sempre renderizzato, con questi elementi sempre presenti e cliccabili anche quando `protocol_type === 'SUPERSET'`:
- nome esercizio
- select protocollo
- info protocollo (popover)
- azioni (es. “Sposta in…”)
- cestino principale esercizio (in alto a destra della card)

Il cestino principale è quello che elimina l’intero esercizio dal template, e deve continuare a usare la stessa mutation `removeExerciseMutation` già utilizzata dagli altri protocolli — senza alcuna logica alternativa per SUPERSET.

Il body della card resterà separato dall’header e conterrà solo il rendering condizionale dell’editor:
- `SET` → `SetsTable`
- `TOP_SET_BACKOFF` → editor dedicato esistente
- `EMOM` / `AMRAP` → editor dedicati esistenti
- `SUPERSET` → `SupersetEditor`
- altri → paramFields generici

Il `SupersetEditor` non dovrà mai coprire, sostituire o disabilitare il cestino principale né gli altri controlli dell’header. Se necessario per evitare che vengano coperti durante lo scroll, applicherò una correzione di layout minima al wrapper dell’header (es. sticky/z-index/background), senza spostare logica negli editor figli.

### 2. Blindare il ramo `SUPERSET`
- Verificherò che il confronto usi sempre `SUPERSET` esatto.
- Verificherò che il branch custom `SUPERSET` venga valutato prima del fallback generico `paramFields`.
- Confermerò che venga usato l’import corretto di `SupersetEditor`, senza UI legacy o banner sostitutivi.
- Garantirò che `SupersetEditor` venga montato nel body della card, non come `return` che rimpiazza l’intera card/header.

### 3. Garantire i dati attesi in `SupersetEditor.tsx`
- Terrò il binding su `protocol_params.set_data` come fonte di verità della tabella set.
- Verificherò che restino visibili e funzionanti:
  - input `Numero superset`
  - tabella con colonne `Set 1`, `Set 2`, `Set 3`...
  - pulsante `+ Set` in alto a destra
  - cestino sotto ogni colonna set
- Verificherò che le azioni aggiornino correttamente `supersets_count` senza alterare il numero esercizi.

### 4. Hardening della normalizzazione SUPERSET
- Se necessario, rafforzerò la normalizzazione in memoria per garantire sempre:
  - `supersets_count >= 1`
  - `exercises_count >= 1`
  - `exercises` presente
  - `set_data` presente e coerente con righe/colonne
- Nessun salvataggio automatico al mount.
- Preserverò i dati già inseriti quando si aggiungono/rimuovono colonne o si cambia il numero di superset.

### 5. QA mirata nel preview
Test obbligatori:
1. Selezione `SUPERSET`:
   - select protocollo visibile e cliccabile
   - cestino principale esercizio visibile e cliccabile in alto a destra
   - compare `Numero superset`
   - compare tabella set
   - compare `+ Set`
2. Click sul cestino principale con SUPERSET attivo:
   - l’intero esercizio viene eliminato dal template
   - usa la stessa mutation `removeExerciseMutation` degli altri protocolli
3. Click su `+ Set`:
   - `Numero superset` aumenta
   - la tabella aggiunge una colonna
4. Modifica manuale di `Numero superset`:
   - la tabella si riallinea
5. Cambio protocollo:
   - `SUPERSET → SET`
   - `SUPERSET → EMOM`
   - `SUPERSET → AMRAP`
   - `SUPERSET → TOP_SET_BACKOFF`
   l’editor Superset scompare e compare l’editor corretto.

## Dettagli tecnici
- File principali:
  - `src/components/pt/TemplateExerciseBuilder.tsx`
  - `src/components/pt/protocols/SupersetEditor.tsx`
- File di supporto solo se necessario alla coerenza dati:
  - `src/lib/protocols/superset.ts`
- Nessuna modifica a: database, RLS, auth, sidebar, lato atleta, altri protocolli (`EMOM`, `AMRAP`, `SET`, `TOP_SET_BACKOFF`, `RAMPING`).

## Nota
Dall’analisi attuale, `SupersetEditor` è già importato e include già `Numero superset`, `+ Set` e cestino colonne; il fix si concentrerà sul montaggio del ramo `SUPERSET` nel body e sulla stabilità dell’header (incluso il cestino principale), con hardening minimo dei dati solo se serve.