
# Modifica: "Workout" → "Attività" nella Navbar

## Cambiamento Richiesto
Sostituire la label "Workout" con "Attività" nella barra di navigazione in basso dell'app atleta.

## File da Modificare

| File | Riga | Modifica |
|------|------|----------|
| `src/components/layouts/AppLayout.tsx` | 59 | `label: 'Workout'` → `label: 'Attività'` |
| `src/components/app/MobileNav.tsx` | 24 | `label: 'Workout'` → `label: 'Attività'` |

## Dettaglio Tecnico

### AppLayout.tsx (riga 59)
```tsx
// Da:
{ label: 'Workout', href: '/app/workout', icon: Dumbbell },

// A:
{ label: 'Attività', href: '/app/workout', icon: Dumbbell },
```

### MobileNav.tsx (riga 24)
```tsx
// Da:
{ icon: Dumbbell, label: 'Workout', path: '/app/workout' },

// A:
{ icon: Dumbbell, label: 'Attività', path: '/app/workout' },
```

## Note
- Il percorso URL resta `/app/workout` (identificatori tecnici non cambiano)
- Solo la label visibile all'utente viene modificata
- Coerente con la terminologia del progetto che preferisce "Attività" a "Workout"
