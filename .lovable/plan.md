## Analisi stato attuale

Solo 3 protocolli usano una tabella set: **SET**, **TOP_SET_BACKOFF**, **SUPERSET**. Tutti gli altri (EMOM, AMRAP, RAMPING, LADDER, DEAD_LADDER, TABATA, HIIT, RXT, RUNNING_TOTAL) sono solo parametri/timer/note — fuori scope.

Stato attuale di ciascuno:

| Protocollo | Cestino per colonna | "+ Set" | Sync bidirezionale | Modifiche manuali |
|---|---|---|---|---|
| SET standard | ✓ riga cestino sotto | ✓ ma in alto a destra, non a lato | ✓ (`summarizeSets` → `te.sets`) | ✓ |
| TOP_SET_BACKOFF | ✓ già implementato turno scorso | ✓ a lato ultima colonna | ✓ (`applyParamSync`) | ✓ (`weight_is_manual`) |
| SUPERSET | ✓ già implementato turno scorso | ✓ a lato ultima colonna | ✓ (`commit` + `syncSetData`) | ✓ |

**TOP_SET_BACKOFF e SUPERSET sono già conformi** alla specifica (modifiche fatte nel turno precedente).

**SET standard**: la logica funziona correttamente (add/remove → `te.sets` aggiornato via `summarizeSets`, modifiche manuali persistite, niente scritture al mount). L'unico scostamento dalla specifica è la **posizione del bottone "+ Set"**: oggi è in alto a destra sopra la tabella, mentre TOP_SET_BACKOFF/SUPERSET lo hanno **a lato dell'ultima colonna** dentro la testata.

Nota: il SET standard non mostra al PT un campo "Serie" sopra la tabella (il `paramFields` `sets` non viene renderizzato perché `if (ptype === 'SET')` ritorna direttamente `<SetsTable>`), quindi non c'è disallineamento "numero sopra ↔ tabella" da gestire — la tabella è l'unica fonte e `te.sets` viene riallineato sul salvataggio.

## Modifica proposta

Una sola micro-modifica UI in `src/components/pt/TemplateExerciseBuilder.tsx` nel componente `SetsTable` (righe ~1206-1224):

1. **Rimuovere** il bottone "+ Set" dall'intestazione superiore (la riga `<div className="flex items-center justify-between mb-2">` resta solo con l'etichetta "Set").
2. **Aggiungere** una `<th>` finale nell'`<thead>` contenente lo stesso bottone "+ Set" piccolo, identico per stile a quello di TOP_SET_BACKOFF/SUPERSET (`<Button variant="outline" size="sm" className="h-7 px-2 text-[11px]"><Plus className="h-3 w-3 mr-0.5" /> Set</Button>`).
3. **Aggiungere** una `<td />` vuota corrispondente in ognuna delle 4 righe `<tbody>` (Reps, Kg, Rec, riga cestini) per mantenere l'allineamento delle colonne.

Nessuna modifica a logica, handler (`addSet`, `removeSet`, `updateSet`), tipi, normalizzazione, o salvataggio. Nessun tocco a TOP_SET_BACKOFF, SUPERSET, altri protocolli, DB, RLS, auth, sidebar, archivio esercizi, lato atleta.

## QA dopo la modifica

- SET standard: "+ Set" appare a lato dell'ultima colonna, cestino sotto ogni colonna, `te.sets` resta sincronizzato, valori manuali preservati, non scende sotto 1 set.
- TOP_SET_BACKOFF: nessuna regressione (intoccato), kg auto/manuali corretti.
- SUPERSET: nessuna regressione (intoccato), numero esercizi invariato quando si aggiunge/rimuove un set.
