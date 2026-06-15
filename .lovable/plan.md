Implementerò una correzione mirata sul flusso Documenti della scheda atleta PT.

## Cosa sistemare
1. **Upload documenti**
   - Rendere chiaro quando l’upload è in corso e quando fallisce.
   - Verificare che il file venga salvato nel bucket privato `athlete-documents` e che la riga venga creata in `athlete_documents`.
   - Se l’upload file riesce ma l’inserimento DB fallisce, pulire il file già caricato per evitare documenti “fantasma”.

2. **Modifica documenti**
   - Aggiungere il pulsante **Modifica** su ogni documento nella tab PT.
   - Permettere di modificare: titolo, tipo documento, data emissione, scadenza, note.
   - Permettere opzionalmente di sostituire il file allegato.
   - Salvare via `UPDATE` su `athlete_documents` rispettando le policy esistenti.

3. **Coerenza UI / blocchi**
   - Se la connessione atleta non è attiva o il tab è in sola lettura, disabilitare upload, modifica ed eliminazione.
   - Mostrare un messaggio esplicito quando le azioni sono bloccate.
   - Aggiornare subito la lista dopo upload/modifica/eliminazione e mantenere il realtime già presente.

4. **Apertura file**
   - Migliorare feedback su “Apri” se il file non esiste o la signed URL fallisce.

## File coinvolti
- `src/components/pt/athlete-detail/DocumentsTab.tsx`
- Eventuale piccola migration solo se dai controlli emerge che manca il bucket o una policy storage/update necessaria.

## Verifica
- Test manuale su `/pt/athletes/:id?tab=documents`:
  - carica documento con file;
  - modifica metadati/scadenza;
  - sostituisce file;
  - apre il documento;
  - elimina documento;
  - controlla che la tab non resti vuota dopo refresh/realtime.