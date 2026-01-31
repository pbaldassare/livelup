# Piano: Sostituzione Terminologia - COMPLETATO ✅

## Riepilogo Modifiche Eseguite

### Crossfit → Calisthenics (6 file) ✅

| File | Modifica |
|------|----------|
| `src/pages/public/PTDiscoveryPage.tsx` | ✅ Rimosso 'Crossfit' da SPECIALIZATIONS |
| `src/pages/atleta/AtletaDiscoverPage.tsx` | ✅ Sostituito 'Crossfit' con 'Calisthenics' |
| `src/pages/admin/AdminPTsPage.tsx` | ✅ Sostituito in SPECIALIZATION_SUGGESTIONS |
| `src/components/pt/CreatePublicEventDialog.tsx` | ✅ Placeholder aggiornato a "Calisthenics Day Brescia" |
| `supabase/functions/seed-test-users/index.ts` | ✅ Aggiornati dati demo PT2 |
| `supabase/functions/seed-platform-data/index.ts` | ✅ Evento pubblico rinominato |

### Note

I testi UI con "Workout" sono già in italiano ("allenamento", "allenamenti") nei file frontend, quindi non erano necessarie ulteriori modifiche per la seconda parte del piano.

---

## Cosa NON è stato modificato (Sicurezza)

I seguenti elementi tecnici rimangono invariati:
- Tabelle DB: `workouts`, `workout_exercises`, `workout_logs`, `workout_templates`
- Funzioni PostgreSQL
- Enum: `workout_status`
- Nomi componenti React
- Route URL
