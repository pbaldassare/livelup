

## Analisi

L'utente vuole introdurre **due modalità di creazione programma**:
- **Day by Day (manuale)**: assegnazione diretta scheda↔giorno dal calendario, nessuna rotazione
- **Ricorrente (automatica)**: usa la logica di rotazione già implementata (`current_index`, `active_days`)

Devo verificare lo stato attuale di `ProgramFormDialog`, `AssignProgramDialog`, `programs.ts` e la pagina calendario PT per capire dove integrare la modalità manuale.
<lov-tool-use id="toolu_vrtx_01VnvMzuas78tAk2eRH2A5xQ" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/pt/ProgramFormDialog.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016waVPcqbSaRQwDpxMqKjLa" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/pt/ProgramFormDialog.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_013NQ3JNrTvNPuy319A1sB1S" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/api/programs.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GVJAYvFskYmaym3T59HXDL" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/pt/PTCalendarPage.tsx\", \"lines\": \"1-100\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Hx597BPEQUxqGqVFDTwrsL" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/api/programs.ts\", \"lines\": \"500-533\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SGsCtGXQ7VFhRptExrzBFq" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/pt/AssignWorkoutDialog.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>
I have enough context. The Day-by-Day mode already maps to the existing `AssignWorkoutDialog` with frequency = "once" (single date assignment). The Recurring mode maps to the existing program rotation system. I need to add a mode selector at the start of `ProgramFormDialog` and adjust how Day-by-Day programs are stored/assigned.

<lov-plan>

## Piano: Programma con due modalità (Day by Day vs Ricorrente)

### Architettura

Sfrutto al massimo il sistema esistente (rotazione + `AssignWorkoutDialog`). Aggiungo un campo `mode` al programma per distinguere le due modalità, con UI condizionale.

```text
ProgramFormDialog
 ├─ STEP 1: Scelta modalità (Day by Day | Ricorrente)
 │
 ├─ MODE = "recurring"  →  UI attuale (durata, giorni attivi, schede in rotazione)
 │                          → assignProgramToAthlete() esistente (rotazione ciclica)
 │
 └─ MODE = "day_by_day" →  UI calendario:
                            - data inizio + durata (settimane)
                            - per ogni giornata cliccata, scheda specifica
                            - lista "giorno → scheda" modificabile
                            → nuova funzione assignDayByDayProgram()
                              che crea workouts puntuali senza rotazione
```

### Modifiche Database

Migration: aggiungo a `workout_programs`:
- `mode` TEXT NOT NULL DEFAULT 'recurring' — valori: `'recurring'` | `'day_by_day'`

Aggiungo a `program_schedules` (per modalità day_by_day, solo opzionale):
- `specific_date` DATE NULL — quando valorizzato, indica giorno fisso (ignora rotazione)
- `day_of_week` resta come fallback (già nullable)

In modalità `day_by_day`, ogni `program_schedule` rappresenta una coppia "data specifica → template". Niente rotazione, niente `current_index`.

### Modifiche file

**1. `supabase/migrations/<new>.sql`** (nuovo)
- ALTER TABLE per i campi sopra.

**2. `src/lib/api/programs.ts`**
- `WorkoutProgram` type: aggiungo `mode`.
- `ProgramScheduleInput`: aggiungo `specific_date?: string`.
- `createProgram`: accetta `mode`. Se `day_by_day`, salta validazione `activeDays` e accetta schedules con `specific_date`.
- Nuova funzione `assignDayByDayProgram({ ptUserId, atletaUserId, programId, startDate })`: 
  - crea record `program_assignments` (status active, no current_index meaningful)
  - itera `program_schedules` ordinati per `specific_date` (offset rispetto a startDate del programma originale, o data assoluta) e crea workouts puntuali (skip duplicati)
  - nessuna rotazione, no rolling
- `assignProgramToAthlete` (esistente) diventa wrapper che switcha sul `mode`.
- `rollProgramAssignment`: skip se mode = `day_by_day`.

**3. `src/components/pt/ProgramFormDialog.tsx`**
- Aggiungo state `mode: 'recurring' | 'day_by_day'`.
- Sopra il form attuale, sezione `RadioGroup` con due card:
  - "Ricorrente" (icona Repeat) — descrizione breve
  - "Day by Day" (icona Calendar) — descrizione breve
- Se `mode = recurring` → mostro UI esistente (giorni attivi + schede in rotazione + preview).
- Se `mode = day_by_day` → mostro:
  - data inizio (default oggi) + durata in settimane
  - lista "Giorno → Scheda" (offset in giorni dalla data di inizio)
  - bottone "+ Aggiungi giorno": apre selettore data + dropdown template
  - rimozione singola riga
  - nessuna preview rotazione
- Nel salvataggio, passo `mode` e adatto i payload `schedules`.
- Validazione: in day_by_day richiedo almeno 1 giornata.

**4. `src/components/pt/AssignProgramDialog.tsx`**
- Mostro badge "Modalità: Ricorrente / Day by Day" nel summary.
- Se `mode = day_by_day` → nascondo l'override di `active_days` e la preview rotazione (mostro invece elenco "giorni programmati").
- Chiamata API: il wrapper `assignProgramToAthlete` farà routing automatico.

**5. Caso speciale "frequenza > schede"** (solo modalità Ricorrente)
- In `ProgramFormDialog`, quando `activeDays.length > schedules.length`, mostro un alert `Card` informativo con `RadioGroup` 2 opzioni:
  - **Rotazione continua** (default, già implementata)
  - **Genera scheda aggiuntiva** (disabilitata/placeholder con tooltip "Disponibile prossimamente")
- Per ora persiste solo la scelta UI (campo `extra_template_strategy` opzionale, NON salvato in DB in questa iterazione — lasciato come state locale + nota visiva).

### Modalità Day by Day — flusso operativo

Il programma "Day by Day" è una **collezione di assegnazioni puntuali pre-confezionate**. Quando il PT lo assegna a un atleta:
- la data di inizio dell'assegnazione fa da "ancora" (offset 0)
- ogni `program_schedule.specific_date` è interpretata come offset in giorni dalla data di creazione del programma; in fase di assegnazione viene rimappata su `startDate + offset`.
- Alternative considerata: salvare l'offset (intero) invece di `specific_date`. **Scelgo offset_days** per chiarezza → aggiungo invece `day_offset INT` al posto di `specific_date`. Più pulito.

**Decisione finale schema:**
- `program_schedules.day_offset INT NULL` (nuovo) — solo per day_by_day
- `program_schedules.day_of_week INT` resta NOT NULL ma valorizzato a 1 come placeholder per day_by_day

### Edge case gestiti
- Programma senza schede → blocco submit (entrambe modalità)
- Day by Day con 0 giorni → blocco submit
- Ricorrente con `activeDays = []` → blocco submit
- Frequenza > schede → warning UI + opzioni
- Conflitto data esistente → skip silenzioso (logica già presente)

### Checklist test manuale
1. Creo programma "Ricorrente" 3 schede + 3 giorni → rotazione A→B→C corretta
2. Creo programma "Ricorrente" 3 schede + 4 giorni → vedo banner "frequenza > schede" con scelta
3. Creo programma "Day by Day" con 3 giornate diverse → assegno → vedo solo quei 3 workouts nelle date corrette
4. Day by Day NON ruota schede e NON genera ulteriori settimane
5. AssignProgramDialog mostra badge modalità corretto
6. Atleta vede schede corrette nelle date corrispondenti

