

# Piano: PT Mobile Workout Assignment + Atleta Storico Completati

## Analisi

### PT Mobile — Assegnazione Workout
- `PTAppWorkoutsPage.tsx` mostra solo schede esistenti e un CTA "vai alla dashboard web" per creare nuove schede
- `AssignWorkoutDialog.tsx` è già un componente completo e funzionante (seleziona atleta, template/custom, date, note)
- Basta aggiungere un bottone "Assegna" nell'header della pagina PT mobile e aprire il dialog esistente

### Atleta — Storico Completati
- `AtletaWorkoutPage.tsx` ha già un tab "Completati" (riga 179-223) che mostra i workout completati con data e dettagli
- Questo è già funzionante: filtra per `status === 'completato'` e li rende cliccabili con link al dettaglio

**Risultato:** Solo la parte PT richiede modifiche. Il tab "Completati" atleta è già implementato.

## Modifiche

### 1. `src/pages/pt/PTAppWorkoutsPage.tsx`
- Importare `AssignWorkoutDialog`
- Aggiungere stato `showAssignDialog`
- Aggiungere bottone "Assegna" (icona `Plus`) nell'header accanto al titolo
- Rimuovere il CTA "vai alla dashboard web" in fondo alla pagina (o ridurlo a link secondario)
- Rendere il dialog modale accessibile da mobile

Questo è l'unico file da modificare. Il `AssignWorkoutDialog` funziona già perfettamente in contesto mobile grazie al suo CSS responsive (`max-w-lg w-[calc(100%-2rem)]`).

