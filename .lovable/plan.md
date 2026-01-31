
# Piano: Rimozione riferimenti "fitness" dai testi UI

## Analisi delle Occorrenze

### Da MODIFICARE (Testi Visibili UI)

| File | Riga | Testo Attuale | Sostituzione |
|------|------|---------------|--------------|
| `src/pages/public/LandingPage.tsx` | 88 | "La piattaforma fitness che sostituisce" | "La piattaforma per PT e atleti che sostituisce" |
| `src/pages/public/LandingPage.tsx` | 247 | "Pronto a rivoluzionare il tuo fitness business?" | "Pronto a rivoluzionare il tuo business?" |
| `src/pages/auth/AuthPage.tsx` | 130 | "La tua piattaforma fitness" | "La tua piattaforma per allenarti" |
| `src/pages/atleta/AtletaOnboardingPage.tsx` | 46 | "Nuovo al fitness o tornato da una pausa lunga" | "Nuovo all'allenamento o tornato da una pausa lunga" |
| `src/pages/atleta/AtletaOnboardingPage.tsx` | 222 | "Seleziona uno o più obiettivi fitness" | "Seleziona uno o più obiettivi" |
| `src/pages/atleta/AtletaAppHome.tsx` | 176 | "Inizia il tuo percorso fitness con un coach professionista" | "Inizia il tuo percorso con un coach professionista" |
| `src/pages/admin/AdminAthletesPage.tsx` | 351 | "Livello Fitness" | "Livello" |
| `src/pages/admin/AdminPTsPage.tsx` | 126 | "'Senior Fitness'" | "'Over 60'" |

### Da MODIFICARE (Seed Data - dati demo)

| File | Contesto | Modifica |
|------|----------|----------|
| `seed-platform-data/index.ts` | riga 113 | "percorso fitness" → "percorso di allenamento" |
| `seed-platform-data/index.ts` | riga 121 | "Intro Fitness" → "Intro Allenamento" |
| `seed-platform-data/index.ts` | riga 262 | "Test di fitness e mobilità" → "Test iniziale e mobilità" |
| `seed-platform-data/index.ts` | riga 481 | "community fitness" → "community sportiva" |
| `seed-platform-data/index.ts` | riga 617 | "percorso fitness" → "percorso di allenamento" |

---

### Da NON MODIFICARE (Nomi Tecnici Database)

Questi elementi restano invariati per evitare problemi di sistema:

- Campo database: `fitness_level` (in `atleta_profiles`)
- Enum: `fitness_level` (principiante, intermedio, avanzato, agonista)
- Variabili JavaScript: `FITNESS_LEVELS`, `fitness_level`
- File tipi: `src/integrations/supabase/types.ts`
- File tipi locali: `src/types/database.ts`

---

## Riepilogo Modifiche

| Categoria | File | Modifiche |
|-----------|------|-----------|
| Landing Page | 1 | 2 testi |
| Auth Page | 1 | 1 testo |
| Atleta Pages | 2 | 3 testi |
| Admin Pages | 2 | 2 testi |
| Seed Data | 1 | 5 descrizioni |
| **Totale** | **7 file** | **~13 modifiche** |

---

## Dettaglio Sostituzioni

### LandingPage.tsx

```text
PRIMA:  "La piattaforma fitness che sostituisce"
DOPO:   "La piattaforma per PT e atleti che sostituisce"

PRIMA:  "Pronto a rivoluzionare il tuo fitness business?"
DOPO:   "Pronto a rivoluzionare il tuo business?"
```

### AuthPage.tsx

```text
PRIMA:  "La tua piattaforma fitness"
DOPO:   "La tua piattaforma per allenarti"
```

### AtletaOnboardingPage.tsx

```text
PRIMA:  "Nuovo al fitness o tornato da una pausa lunga"
DOPO:   "Nuovo all'allenamento o tornato da una pausa lunga"

PRIMA:  "Seleziona uno o più obiettivi fitness"
DOPO:   "Seleziona uno o più obiettivi"
```

### AtletaAppHome.tsx

```text
PRIMA:  "Inizia il tuo percorso fitness con un coach professionista"
DOPO:   "Inizia il tuo percorso con un coach professionista"
```

### AdminAthletesPage.tsx

```text
PRIMA:  <Label>Livello Fitness</Label>
DOPO:   <Label>Livello</Label>
```

### AdminPTsPage.tsx

```text
PRIMA:  'Senior Fitness'
DOPO:   'Over 60'
```

### seed-platform-data/index.ts

```text
"5 sessioni per iniziare il tuo percorso fitness"
→ "5 sessioni per iniziare il tuo percorso di allenamento"

"Intro Fitness"
→ "Intro Allenamento"

"Test di fitness e mobilità"
→ "Test iniziale e mobilità"

"Serata speciale per la community fitness!"
→ "Serata speciale per la community sportiva!"

"Inizio del mio percorso fitness!"
→ "Inizio del mio percorso di allenamento!"
```

---

## Nota sulla Sicurezza

I nomi dei campi database (`fitness_level`) e gli enum resteranno invariati. Modificarli richiederebbe:
- Nuove migrazioni SQL
- Aggiornamento policy RLS
- Rigenerazione tipi TypeScript
- Potenziali problemi di compatibilità

Questa è un'operazione sicura che tocca solo i testi visibili all'utente.
