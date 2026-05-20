## Obiettivo

Correggere due problemi di rendering del protocollo SUPERSET nel builder PT, senza toccare DB, RLS, auth, sidebar, altri protocolli o lato atleta.

## Problema 1 — Layout SupersetEditor / cestino esercizio interno tagliato

File: `src/components/pt/protocols/SupersetEditor.tsx`

Nella sezione "Esercizi del Superset" (linee ~260-345), ogni riga usa `grid grid-cols-12 gap-2` con il cestino interno in `col-span-1`. Su molte viewport `col-span-1` (≈8% della riga) è troppo stretto e il bottone (`h-8 w-8`) viene compresso, tagliato o difficile da cliccare; inoltre Reps/Kg restano stretti.

Interventi:

1. Sostituire il grid `cols-12` con un layout responsive più chiaro:
   - Desktop (`md:`): `flex items-end gap-2` con
     - Esercizio: `flex-1 min-w-0`
     - Reps: `w-20`
     - Kg: `w-24`
     - Cestino: `w-9 shrink-0` (bottone `h-9 w-9`, mai compresso)
   - Mobile: layout a wrap
     - Esercizio: full width
     - Reps + Kg: due colonne (`grid grid-cols-2 gap-2`)
     - Cestino: pulsante destructive "ghost" allineato a destra subito sotto, sempre visibile e cliccabile (`h-9 w-9`, non `h-8 w-8 p-0` stretto)
2. Note: rimangono `full width` sotto la riga, invariate nel comportamento.
3. Container esterno della riga (`rounded-md border border-dashed bg-background p-2`): lasciare invariato ma assicurare `min-w-0` sui figli flex per evitare overflow del nome esercizio lungo nel combobox.

## Problema 2 — Cestino principale della card "scompare" con SUPERSET

File: `src/components/pt/TemplateExerciseBuilder.tsx`

Nell'intervento precedente l'header dell'esercizio (linea 554) era stato reso `sticky top-2 z-20 bg-card …`. La `Card` genitore ha però `overflow-hidden` (linea 535): in questo contesto lo sticky non si comporta come previsto e l'header (con select protocollo + info + sposta + **cestino principale**) può apparire visivamente fuori posto o coperto, dando l'impressione che il cestino manchi quando si scrolla con SUPERSET attivo. Anche le icone restano in `gap-1` molto stretto e su viewport medie possono sembrare nascoste accanto allo `Select w-[140px]`.

Interventi:

1. Rimuovere lo `sticky top-2 z-20 bg-card py-1 -mx-1 px-1 rounded-md` dall'header (riga 554) e tornare a un header in flusso normale:
   `flex items-start justify-between gap-2`. L'header così rimane sempre presente sopra il body, indipendentemente dal protocollo (incluso SUPERSET), ed è ben visibile senza dipendere da uno scroll-container che non c'è.
2. Aumentare `gap-1` → `gap-2` nel gruppo destro per evitare che i 4 controlli (Select, info, "Sposta in…", cestino) appaiano accavallati.
3. Verificare che `shrink-0` resti su tutto il gruppo destro e che `min-w-0` rimanga sul gruppo sinistro (nome esercizio), così il nome lungo non spinge fuori il cestino.
4. Nessuna modifica alla `Select` protocollo né al branch SUPERSET (linee 899-916): `SupersetEditor` continua a montarsi nel body sotto l'header, mai al posto dell'header.
5. Cestino principale (linee 621-628): continua a usare `removeExerciseMutation.mutate(te.id)`, identica a tutti gli altri protocolli. Nessuna modifica funzionale.

## Disambiguazione cestini (nessuna modifica logica, solo conferma)

- Cestino principale card (header) → `removeExerciseMutation.mutate(te.id)` — elimina l'esercizio principale dal template.
- Cestino riga esercizio interna al SupersetEditor → `removeExercise(eIdx)` interno al componente — rimuove solo l'esercizio interno (`exercises[eIdx]`) e sincronizza `set_data`.
- Cestino colonna Set nella tabella set → `removeSuperset(cIdx)` — decrementa `supersets_count` e rimuove la colonna.

Nessuna delle tre funzioni viene modificata.

## File modificati

- `src/components/pt/protocols/SupersetEditor.tsx` — layout riga esercizio interna (problema 1).
- `src/components/pt/TemplateExerciseBuilder.tsx` — rimozione `sticky` e ritocco gap dell'header card (problema 2).

## File NON toccati

DB, migration, RLS, auth, sidebar, archivio esercizi, lato atleta, altri protocolli (SET, EMOM, AMRAP, TOP_SET_BACKOFF, RAMPING), logica esecuzione workout, `protocol_params` (salvo gli aggiornamenti già esistenti quando si elimina un esercizio interno Superset).

## QA

1. Selezionare SUPERSET → header card visibile con: nome, select protocollo, info, "Sposta in…", **cestino principale**.
2. Cliccare cestino principale → l'intero esercizio principale viene rimosso (stessa mutation degli altri protocolli).
3. Aggiungere più esercizi interni → ogni riga mostra Esercizio / Reps / Kg / Cestino senza taglio; Note full width sotto.
4. Cliccare cestino di una riga interna → rimuove solo quella riga interna; `set_data` e numero esercizi restano coerenti.
5. Cliccare cestino sotto colonna Set → rimuove solo quel set/superset.
6. Cambiare protocollo da SUPERSET a SET / EMOM / AMRAP → editor Superset sparisce, header con cestino principale resta funzionante.
7. Test responsive: viewport ~375px (mobile) e ~1280px (desktop) → cestino interno mai tagliato.
