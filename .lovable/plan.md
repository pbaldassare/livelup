

## Il tour guidato e' gia' implementato

Il sistema tour di Livellapp e' gia' **identico a Cibarius HACCP**:

- **AppTourContext.tsx** — 3 tour definiti (Atleta 16 step, PT 14 step, Admin 8 step) con navigazione tra pagine, scroll, auto-advance e countdown
- **AppTour.tsx** — overlay SVG con spotlight, cursore animato, tooltip con pause/play, progress bar
- **AppTourPrompt.tsx** — dialog "Benvenuto su Livellapp!" con opzione "Non mostrare piu'" 
- **MobileNav.tsx** — tutti i `data-tour` attribute sono presenti (nav-home, nav-discover, nav-workout, etc.)
- Tutte le pagine app hanno i `data-tour` attribute corrispondenti agli step del tour
- TourProvider, AppTour e AppTourPrompt sono renderizzati in `App.tsx`

### Perche' non lo vedi

Il prompt del tour appare **solo la prima volta** che entri nell'app. Se lo hai gia' saltato o fatto, il flag `livellapp_tour_done` in localStorage impedisce che si ripresenti.

### Cosa posso fare

1. **Resettare il tour** — Aggiungere un pulsante "Rifai il tour" nella pagina Settings/Profile che cancella il flag localStorage e rilancia il tour
2. **Forzare il tour per test** — Rimuovere manualmente `livellapp_tour_done` dal localStorage del browser (DevTools > Application > Local Storage > cancella la chiave)

Vuoi che aggiunga il pulsante "Rifai il tour" nelle pagine profilo/settings, oppure c'e' qualcos'altro che non funziona nel tour?

