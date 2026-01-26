
# Piano: Centrare Orizzontalmente il Dialog "Crea Nuovo Template"

## Problema Identificato

Dalla screenshot il dialog appare spostato verso destra invece che centrato rispetto alla pagina. Questo accade perche le classi custom aggiunte al `DialogContent` non includono esplicitamente il centraggio orizzontale (`left-[50%] translate-x-[-50%]`).

Il componente base `dialog.tsx` ha gia queste classi, ma aggiungendo `translate-y-[-50%]` senza `translate-x-[-50%]` potrebbe causare conflitti nel merge delle classi Tailwind.

## Soluzione

Aggiungere esplicitamente le classi per il centraggio orizzontale nel `DialogContent` di `PTWorkoutsPage.tsx`:

```text
DA:
className="max-w-xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] top-[50%] translate-y-[-50%] overflow-hidden flex flex-col"

A:
className="max-w-xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 overflow-hidden flex flex-col"
```

## Dettaglio Tecnico

| Proprieta | Valore Precedente | Nuovo Valore | Motivo |
|-----------|-------------------|--------------|--------|
| left | (implicito dal base) | left-[50%] | Posizione orizzontale a meta viewport |
| translate-x | (mancante) | -translate-x-1/2 | Sposta indietro del 50% della larghezza del dialog |
| translate-y | translate-y-[-50%] | -translate-y-1/2 | Sintassi Tailwind piu pulita (equivalente) |

## File da Modificare

- `src/pages/pt/PTWorkoutsPage.tsx` (linea 306)

## Risultato Atteso

Il dialog apparira perfettamente centrato sia orizzontalmente che verticalmente rispetto al viewport, indipendentemente dalla larghezza della sidebar o dell'area di contenuto.
