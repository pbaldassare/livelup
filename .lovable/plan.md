## Problema

Sulla pagina `/pt/athletes` cliccando un atleta si apre solo il **DetailSheet laterale** (visibile nello screenshot) con Contatti / Statistiche / Messaggio / Assegna Scheda. **Non c'è nessun ingresso** alla scheda atleta completa `/pt/athletes/:atletaId`, che invece contiene già le tab:

- Anagrafica (modifica dati)
- Progressi (grafico peso + rilevazioni + foto)
- Storico allenamenti (`PTAthleteHistoryTab` → `WorkoutHistoryList` realtime)
- Note PT (private/condivise)
- Documenti & Scadenze (`DocumentsTab` con upload/modifica)
- Allena ora / Badge

Risultato percepito dal PT: "non vedo niente — storico, modifiche documenti, ecc.". I componenti esistono già, manca solo la **navigazione**.

## Cosa cambia (solo presentation layer — niente DB, niente nuove feature)

1. **`src/pages/pt/PTAthletesPage.tsx`**
   - Click sulla riga della tabella (stato `active`/`terminated`) → naviga a `/pt/athletes/:atletaId` invece di aprire il quick sheet. Per lo stato `pending` resta il flusso attuale (Accetta / Rifiuta inline + sheet).
   - Pulsante "Eye" nella colonna Azioni → naviga a `/pt/athletes/:atletaId`.
   - Pulsante "Dumbbell" (Assegna) → naviga a `/pt/athletes/:atletaId?tab=overview` e apre il dialog assegnazione (parametro letto dalla detail page).
   - `DetailSheet` viene mantenuto **solo per le richieste pending**: il quick view ha senso lì per accettare/rifiutare al volo.

2. **`src/pages/pt/PTAthleteDetailPage.tsx`**
   - Legge `?tab=` da `useSearchParams` e lo passa come `value` controllato al componente `Tabs` (con `onValueChange` che aggiorna l'URL). Default: `overview`.
   - Legge `?assign=1` per aprire automaticamente `AssignWorkoutDialog` quando arriva dal pulsante "Assegna" della lista.
   - Aggiunge un breadcrumb/CTA "Torna alla lista" già presente (nessun cambio funzionale).

3. **Nessuna modifica a**: schema DB, RLS, componenti tab esistenti (`PTNotesTab`, `DocumentsTab`, `ProgressTab`, `PTAthleteHistoryTab`), realtime, `AtletaDocumentsPage`, `AtletaSharedPTNotes`.

## Verifica manuale dopo l'implementazione

1. `/pt/athletes` → click su una riga atleta attivo → si apre `/pt/athletes/<id>` con tutte le tab visibili.
2. Tab **Storico** → mostra workout completati (con realtime già attivo).
3. Tab **Documenti** → upload, modifica scadenza, eliminazione funzionanti (RLS già OK).
4. Tab **Note PT** → creazione/condivisione/eliminazione note funzionanti.
5. Tab **Progressi** → grafico peso + nuova rilevazione.
6. Click su una richiesta **pending** → continua ad aprire il DetailSheet con Accetta/Rifiuta.

## Note tecniche

- Solo 2 file toccati, ~40 righe modificate in totale.
- Nessuna nuova query, nessuna nuova migration, nessun nuovo componente.
- Reuse al 100% della scheda atleta esistente.