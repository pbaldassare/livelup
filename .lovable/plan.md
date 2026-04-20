

## Piano: Riorganizzazione Atleta — "Esercizi" (operativa) + "Programma" (visione)

### Stato attuale
- `/app/esercizi` → mostra workout del giorno o prossimo, con tracking serie. **Va bene come base**, ma manca: priorità `in_corso` / `in_sospeso`, azioni "Completa" / "Salta", stato esercizio.
- `/app/scheda` → mostra dettaglio del singolo workout del giorno (PDF-like). **Da sostituire** con vista "Programma" (calendario completo del programma assegnato).
- Nav (`MobileNav.tsx`): voce "Scheda" → diventa **"Programma"**.
- Status DB workout: `attivo | completato | scaduto | in_corso | in_sospeso`. **Manca `saltato`** → riuso `in_sospeso` come "saltato" (decisione da confermare in implementazione, oppure aggiungiamo enum value).

### Decisione sullo status "saltato"
Aggiungo `'saltato'` all'enum `workout_status` via migration. Tre stati visivi finali per l'atleta: `completato`, `saltato`, `attivo/futuro`. `in_corso` e `in_sospeso` restano intermedi.

```text
Esercizi (azione)             Programma (visione)
─────────────────────         ───────────────────────
Solo workout di oggi          Tutti i workout del programma
o prossimo + tracking         assegnato attivo: lista calendario
+ azioni Completa/Salta       con stato per giornata
```

### Modifiche

**1. Migration DB**
- `ALTER TYPE workout_status ADD VALUE 'saltato';`

**2. `src/pages/atleta/AtletaEserciziPage.tsx` — refactor priorità + azioni**
- Query rivista con priorità chiara (1 sola query con OR + sort):
  1. `status = 'in_corso'` (qualsiasi data)
  2. `status = 'in_sospeso'` (qualsiasi data)
  3. `status = 'attivo'` AND `scheduled_date = oggi`
  4. `status = 'attivo'` AND `scheduled_date > oggi` (più vicino)
- Badge stato in alto (es. "In corso", "Da recuperare", "Oggi", "Prossimo: lun 22 apr").
- Aggiungo due bottoni in fondo:
  - **Completa** → `UPDATE workouts SET status='completato', completed_at=now()` + invalidate query + redirect/refresh
  - **Salta** → `UPDATE workouts SET status='saltato'` + conferma dialog + invalidate
- Conservo set tracker localStorage esistente.
- Empty state: "Nessun allenamento disponibile" con CTA discover.

**3. `src/pages/atleta/AtletaSchedaPage.tsx` → trasformata in `AtletaProgrammaPage.tsx`**
- Rinomino il file (creo nuovo + elimino vecchio mantenendo route alias).
- Header: nome programma + periodo + frequenza + giorni attivi.
- Body: lista cronologica di tutti i `workouts` del `program_assignment` attivo (filtro per `program_id` via assignment), raggruppati per settimana.
- Per ogni giornata mostro:
  - data + nome scheda
  - badge stato: `Completato` (verde), `Saltato` (grigio), `In corso` (giallo), `Futuro` (neutro)
- Card cliccabile → naviga a `/app/workout/:id` (dettaglio sola lettura, già esistente) o `/app/esercizi` se è il workout corrente.
- **Niente azioni di esecuzione qui** (no completa/salta da questa vista — solo visione).
- Empty state: "Nessun programma attivo" con CTA discover.

**4. Routing & Nav**
- `src/App.tsx`: rinomino route `/app/scheda` → `/app/programma` (mantengo redirect da `/app/scheda` per retrocompatibilità tour).
- `src/components/app/MobileNav.tsx`: voce "Scheda" → "Programma", icona `CalendarDays`, path `/app/programma`, tourId `nav-programma`.
- Aggiorno `AppTour.tsx` se referenzia `nav-scheda`.

**5. Query "programma attivo dell'atleta"** (nuova in `src/lib/api/programs.ts`)
```ts
export async function getAtletaActiveProgram(atletaUserId: string) {
  // 1. Ultimo program_assignment status='active' per l'atleta
  // 2. Join con workout_programs (nome, mode, duration_weeks, frequency, active_days)
  // 3. Lista workouts (status, scheduled_date, title) per quell'atleta+pt da start_date in poi
}
```

### File modificati/creati
- `supabase/migrations/<new>.sql` — aggiunge `'saltato'` a `workout_status`
- `src/pages/atleta/AtletaEserciziPage.tsx` — priorità query + azioni Completa/Salta
- `src/pages/atleta/AtletaProgrammaPage.tsx` — **nuovo** (rimpiazza AtletaSchedaPage logicamente)
- `src/pages/atleta/AtletaSchedaPage.tsx` — eliminato (o lasciato come stub redirect a `/app/programma`)
- `src/lib/api/programs.ts` — nuova `getAtletaActiveProgram`
- `src/App.tsx` — route aggiornata + redirect
- `src/components/app/MobileNav.tsx` — voce "Programma"
- `src/components/AppTour.tsx` — eventuale rename tourId

### Edge case
- Atleta senza programma → empty state in "Programma"
- Atleta con workout tutti completati → "Esercizi" mostra prossimo futuro o messaggio "Hai completato tutto"
- Più workout stessa data → priorità `in_corso > in_sospeso > attivo`, in caso di pari merito quello con `created_at` più recente
- Workout `scaduto` → mostrato in "Programma" come "Saltato" (visivamente)

### Checklist test
1. Apro `/app/esercizi` con workout `in_corso` → lo vedo prioritario
2. Apro `/app/esercizi` senza workout oggi → vedo prossimo futuro
3. Click "Completa" → status diventa `completato`, query invalidata, vedo prossimo
4. Click "Salta" → conferma → status `saltato`, vedo prossimo (rotazione invariata)
5. Apro `/app/programma` → vedo lista completa workout del programma con stati corretti
6. Atleta senza programma → empty state chiaro
7. Nav mostra "Programma" e "Esercizi" come voci distinte

