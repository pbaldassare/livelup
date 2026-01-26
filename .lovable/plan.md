
# Piano: Fix Posizionamento Dialog "Crea Nuovo Template"

## Problema Identificato

Il dialog "Crea Nuovo Template" appare tagliato in basso perche il posizionamento predefinito di Radix Dialog (`top-[50%] translate-y-[-50%]`) su schermi piccoli causa overflow oltre il viewport.

## Soluzione

Modificare le classi CSS del `DialogContent` per:
1. Usare un posizionamento piu sicuro con margini rispetto ai bordi
2. Ridurre l'altezza massima per garantire visibilita completa
3. Aggiungere classi responsive per adattarsi a schermi di diverse dimensioni

## Modifiche Tecniche

**File:** `src/pages/pt/PTWorkoutsPage.tsx`

```tsx
// DA (linea 306):
<DialogContent className="max-w-xl max-h-[90vh]">

// A:
<DialogContent className="max-w-xl max-h-[85vh] top-[5%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
```

Oppure utilizzando l'approccio piu semplice con overflow-auto:

```tsx
<DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
```

## Dettaglio della Modifica

| Proprieta | Valore Attuale | Nuovo Valore | Motivo |
|-----------|----------------|--------------|--------|
| max-h | 90vh | 80vh | Lascia margine per header/footer browser |
| overflow-y | - | auto | Permette scroll interno se contenuto eccede |
| top (mobile) | 50% | 5% | Posiziona dialog in alto su mobile |

## File Modificato

- `src/pages/pt/PTWorkoutsPage.tsx` (linea 306)

