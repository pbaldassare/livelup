## Obiettivo
Correggere solo il rendering del protocollo SUPERSET nel builder PT, mantenendo invariata la logica esistente e senza toccare database, auth, sidebar, lato atleta o altri protocolli.

## Principio guida
Il cestino principale della card esiste già nel DOM anche con `protocol_type === "SUPERSET"` (riga 621–628 di `TemplateExerciseBuilder.tsx`, stesso `removeExerciseMutation` degli altri protocolli). Quindi il fix è di **layout/visibilità**, non di nuovi pulsanti.

- Non duplicare il cestino.
- Non creare una nuova funzione di eliminazione.
- Non creare un pulsante separato solo per Superset.
- Riutilizzare l’header e il cestino esistenti, risolvendo cosa li nasconde.

## Intervento

1. **Header card esercizio — visibilità del cestino esistente** (`src/components/pt/TemplateExerciseBuilder.tsx`)
   - Verificare e correggere nell’ordine i possibili colpevoli del clipping/coverage:
     - `overflow-hidden` sulla `Card` esterna che taglia elementi del gruppo azioni
     - larghezza del gruppo azioni a destra non garantita (manca `shrink-0` o ha gap insufficiente)
     - select protocollo troppo largo (`w-[140px]`) che spinge fuori cestino su viewport stretti
     - elementi del body SupersetEditor che invadono visivamente l’header (es. residui di posizionamento)
     - `min-w-0` mancante sul blocco titolo a sinistra, che fa traboccare nome esercizio e schiaccia le azioni
   - Mantenere l’header **identico per tutti i protocolli**: nome, categoria/muscoli, select protocollo, info, “Sposta in…”, cestino principale rosso.
   - Il cestino principale rimane lo stesso bottone già esistente, con la stessa `removeExerciseMutation`.

2. **Layout stabile delle righe interne del Superset** (`src/components/pt/protocols/SupersetEditor.tsx`)
   - Riga desktop con struttura non comprimibile:
     - esercizio flessibile con `min-w-0`
     - reps a larghezza fissa
     - kg a larghezza fissa
     - cestino interno con `shrink-0`, mai tagliato
   - Note su seconda riga full width.
   - Mobile: cestino sempre visibile e cliccabile, senza `absolute`, senza wrapper con `overflow-hidden`.

3. **Contenimento del SupersetEditor dentro la card**
   - Evitare overflow orizzontale del body.
   - Tenere `overflow-x-auto` solo sulla tabella set, dove serve.
   - Il body non deve mai coprire o spingere l’header.

## Vincoli rispettati
- Nessun nuovo protocollo.
- Nessuna nuova logica/mutation.
- Nessun cestino duplicato o alternativo per il SUPERSET.
- Nessuna modifica a: database/RLS, auth, sidebar, lato atleta, altri protocolli.
- Restano invariate: numero esercizi, numero superset, recuperi, aggiunta/rimozione esercizi interni, tabella set, `+ Set`, cestino colonne, salvataggio `protocol_params` e `set_data`.

## File coinvolti
- `src/components/pt/TemplateExerciseBuilder.tsx` (header card, wrapper, gruppo azioni)
- `src/components/pt/protocols/SupersetEditor.tsx` (righe interne e overflow)

## QA
1. **SET**: cestino principale visibile e funzionante.
2. **SUPERSET**: stesso header, **stesso** cestino principale visibile in alto a destra, che chiama la **stessa** mutation e cancella l’intera card.
3. **Esercizi interni**: ogni riga mostra il cestino interno completo, elimina solo la riga.
4. **Tabella set**: `+ Set` e cestini colonna funzionanti.
5. **Responsive**: a ~375px e ~1280px nessun elemento esce dalla card, nessun cestino tagliato.
6. **DOM check**: confermare che nel ramo SUPERSET il bottone cestino principale è lo stesso nodo già presente per gli altri protocolli (nessun duplicato).