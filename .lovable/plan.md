

# Piano: Bloccare lo scroll orizzontale nelle pagine PT

## Problema
Le pagine Atleti e Allenamenti permettono lo scroll orizzontale dell'intera pagina. Lo scroll orizzontale locale (es. carousel atleti attivi, template) deve rimanere funzionante.

## Soluzione

**File: `src/components/layouts/PTDashboardLayout.tsx`**

Aggiungere `overflow-x-hidden` al contenitore principale `<div className="md:pl-64">` (riga 216). Questo blocca lo scroll orizzontale a livello di pagina, ma i componenti interni con `overflow-x-auto` o `overflow-x-scroll` continuano a funzionare normalmente perché il CSS overflow si applica solo al livello diretto.

```tsx
// Riga 216: da
<div className="md:pl-64">
// a
<div className="md:pl-64 overflow-x-hidden">
```

Una sola riga modificata, nessun impatto sui carousel/slider locali.

