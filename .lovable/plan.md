

# Piano: Sostituzione Terminologia "Crossfit → Calisthenics" e "Workout → Attività"

## Analisi della Situazione

### Occorrenze Trovate
| Termine | Occorrenze | File Coinvolti |
|---------|------------|----------------|
| `crossfit` | 58 | 6 file |
| `workout` | 2,474 | 55 file |
| `Workout` | 734 | 25 file |

### Criticità Importante

La parola **"workout"** è usata in DUE contesti diversi:

1. **Contesto TECNICO (NON sostituibile):**
   - Nomi tabelle database: `workouts`, `workout_exercises`, `workout_logs`, `workout_templates`
   - Funzioni PostgreSQL: `get_weekly_workout_stats`, `count_completed_workouts`
   - Enum: `workout_status`
   - Foreign keys e relazioni
   - Query Supabase nel codice

2. **Contesto UI (Sostituibile):**
   - Label visibili all'utente
   - Titoli di pagina
   - Commenti nel codice
   - Placeholder e messaggi

**Rinominare le tabelle del database richiederebbe:**
- Nuove migrazioni per creare tabelle con nuovo nome
- Migrazioni dati
- Aggiornamento di tutte le policy RLS
- Aggiornamento di tutte le funzioni PostgreSQL
- Rigenerazione dei tipi TypeScript

---

## Proposta: Approccio Graduale e Sicuro

### Fase 1: Sostituzioni Sicure (Testo UI)
Sostituire solo i testi visibili all'utente senza toccare i nomi tecnici.

#### 1.1 Crossfit → Calisthenics (6 file)

| File | Azione |
|------|--------|
| `src/pages/public/PTDiscoveryPage.tsx` | Cambia `'Crossfit'` in `'Calisthenics'` nell'array SPECIALIZATIONS |
| `src/pages/atleta/AtletaDiscoverPage.tsx` | Cambia `'Crossfit'` in `'Calisthenics'` nell'array SPECIALIZATIONS |
| `src/pages/admin/AdminPTsPage.tsx` | Cambia `'Crossfit'` in `'Calisthenics'` in SPECIALIZATION_SUGGESTIONS |
| `src/components/pt/CreatePublicEventDialog.tsx` | Cambia placeholder `"CrossFit Day Brescia"` |
| `supabase/functions/seed-test-users/index.ts` | Aggiorna dati demo (bio, specializations, certifications) |
| `supabase/functions/seed-platform-data/index.ts` | Aggiorna eventi demo e descrizioni |

#### 1.2 Workout → Attività (Solo Testi UI)

| File | Tipo Modifica |
|------|---------------|
| `src/pages/atleta/AtletaAppHome.tsx` | Commenti, label "Nessun allenamento" già OK |
| `src/components/app/WorkoutCard.tsx` | Solo commenti (il componente resta `WorkoutCard`) |
| `src/components/app/ActivityHistory.tsx` | Commenti e messaggi vuoti |
| Vari file | Titoli sezioni, messaggi utente |

**NOTA:** I nomi dei componenti React (WorkoutCard, ecc.) resteranno invariati per evitare refactoring massivo.

---

### Fase 2: Mappatura Completa Sostituzioni Testi

```text
PRIMA                              →  DOPO
─────────────────────────────────────────────────────
"CrossFit"                         → "Calisthenics"
"Crossfit"                         → "Calisthenics"
"CROSSFIT"                         → "CALISTHENICS"

"Il tuo workout"                   → "La tua attività"
"Workout di oggi"                  → "Attività di oggi"
"Nessun workout"                   → "Nessuna attività"
"workout completati"               → "attività completate"
"Prossimi workout"                 → "Prossime attività"
"Vedi tutti gli allenamenti"       → (resta così, già OK)

// Già in italiano quindi OK:
"Allenamento", "allenamenti"       → (nessuna modifica)
```

---

### Fase 3: File da Modificare (Dettaglio)

```text
┌─────────────────────────────────────────────────────────────────┐
│ CROSSFIT → CALISTHENICS                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. src/pages/public/PTDiscoveryPage.tsx         riga 61         │
│ 2. src/pages/atleta/AtletaDiscoverPage.tsx      riga 49         │
│ 3. src/pages/admin/AdminPTsPage.tsx             riga 114        │
│ 4. src/components/pt/CreatePublicEventDialog.tsx riga 162       │
│ 5. supabase/functions/seed-test-users/index.ts  righe 51-53     │
│ 6. supabase/functions/seed-platform-data/index.ts (multipli)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ WORKOUT → ATTIVITÀ (Solo label UI, non nomi tecnici)            │
├─────────────────────────────────────────────────────────────────┤
│ Commenti e label visibili in:                                   │
│ - src/pages/atleta/AtletaWorkoutPage.tsx                        │
│ - src/pages/atleta/AtletaWorkoutDetailPage.tsx                  │
│ - src/pages/pt/PTWorkoutsPage.tsx                               │
│ - src/pages/pt/PTAppWorkoutsPage.tsx                            │
│ - src/components/app/WorkoutCard.tsx (solo commenti)            │
│ - src/components/app/WorkoutTimer.tsx (solo commenti)           │
│ - src/components/skeletons/index.ts                             │
│ - src/hooks/useAtletaStatus.tsx                                 │
│ - src/lib/api/workouts.ts (solo commenti)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cosa NON Verrà Modificato (Sicurezza)

I seguenti elementi resteranno invariati per evitare problemi:

1. **Database:**
   - Tabelle: `workouts`, `workout_exercises`, `workout_logs`, `workout_templates`
   - Funzioni: `get_weekly_workout_stats`, `count_completed_workouts`
   - Enum: `workout_status`

2. **Tipi TypeScript:**
   - `src/integrations/supabase/types.ts` (generato automaticamente)

3. **Nomi Componenti React:**
   - `WorkoutCard`, `WorkoutTimer`, `WorkoutCardSkeleton`
   - Rinominarli richiederebbe aggiornare tutti gli import

4. **Nomi Route:**
   - `/app/workout/:id` resterà invariato
   - `/pt/workouts` resterà invariato

---

## Riepilogo Operazioni

| Categoria | Azione | File Stimati |
|-----------|--------|--------------|
| Crossfit → Calisthenics | Sostituzione diretta | 6 file |
| Workout → Attività (UI) | Solo testi visibili | ~15 file |
| Commenti codice | Aggiornamento descrizioni | ~10 file |
| **Totale modifiche** | | **~25-30 file** |

---

## Nota Importante

Se in futuro vuoi rinominare anche le tabelle del database da `workouts` a `activities`, sarà necessario:
1. Creare nuove migrazioni
2. Trasferire i dati
3. Aggiornare tutte le policy RLS
4. Rigenerare i tipi TypeScript
5. Aggiornare tutto il codice frontend

Questo è un refactoring più invasivo che consiglio di fare in un secondo momento, quando l'app sarà più stabile.

