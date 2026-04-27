# Redesign Creazione Programmi (UX) + Verifica Vista Atleta

## Obiettivo
Trasformare la creazione di un Programma da un singolo dialog "tutto in una pagina" a un **wizard guidato a step** con planner visivo settimanale, mantenendo **invariata** la logica esistente di salvataggio, rotazione ricorrente, day-by-day, assegnazione e rolling.

## Vincoli (NON toccare)
- Logica `assignRecurringProgram` / `assignDayByDayProgram` in `src/lib/api/programs.ts`
- Logica `rollProgramAssignment`, `generateRotationWorkouts`, `computeActiveDates`
- Schema DB (`workout_programs`, `program_schedules`, `program_assignments`)
- Builder schede (`workout_templates`) e protocolli
- Assegnazioni esistenti già attive

Il refactor è **puramente UX**: stesso payload finale verso `createProgram` / `updateProgram` / `replaceProgramSchedules`.

---

## PARTE A — Wizard Creazione Programma

Refactor `src/components/pt/ProgramFormDialog.tsx` da form lineare a wizard 5-step con barra di progresso in alto, stato locale, pulsanti `Indietro / Continua`. Submit finale solo nello step ultimo.

### Step 1 — Dati Programma
Card "premium": nome, obiettivo (descrizione), durata settimane, livello atleta (nuovo campo UI mappato su `description` o aggiunto a `notes`, senza nuove colonne DB), note coach.
- **Frequenza settimanale**: chiesta qui solo come hint visivo; il valore reale `frequency_per_week` viene determinato in Step 3 (= `activeDays.length` per ricorrente, `dayByDayEntries.length` per day-by-day) — comportamento attuale mantenuto.

### Step 2 — Modalità (UI only, logica invariata)
Due card grandi con icona, titolo, descrizione lunga, esempio d'uso, tooltip help (`?`). Stato selezionato evidenziato con bordo primary + check. Nessun cambio a `mode: 'recurring' | 'day_by_day'`.

### Step 3 — Costruzione Settimane (Planner)
**Vista calendario settimanale** invece della lista piatta attuale.

**Ricorrente**:
- Toggle giorni settimana (Lun-Dom) come oggi
- Lista "Schede in rotazione" mostrata come **cards orizzontali drag-and-drop** (riuso `@hello-pangea/dnd` già usato in `TemplateExerciseBuilder.tsx`) per riordinare la sequenza A→B→C
- Selezione scheda da libreria template tramite Combobox (riuso `MultiSelectSearch` o `Command`)
- Anteprima rotazione live (già presente, da spostare qui)
- Bottone "Crea scheda rapida" che apre `CreateExerciseDialog` esistente o linka a `/pt/workouts` (no builder duplicato)

**Day by Day**:
- Vista a **griglia settimane** (Settimana 1, 2, 3…) basata su `durationWeeks`
- Ogni settimana ha 7 slot giornalieri; ogni slot accetta una scheda via drag o select
- Mantiene `day_offset` come oggi (offset 0 = giorno 1)
- Azione "Duplica settimana" (copia tutte le entry di una settimana incrementando `day_offset` di +7)

### Step 4 — Timeline Roadmap (preview)
Visualizzazione read-only riassuntiva: timeline orizzontale con badge "Settimana 1 · Push / Pull / Legs", "Settimana 2 · …" generata leggendo gli schedules creati allo Step 3. Nessuna azione, solo conferma visiva.

### Step 5 — Riepilogo & Salva
Riassunto compatto + CTA `Crea programma` (o `Salva modifiche` in edit). Mantiene il warning attuale per programmi con assegnazioni attive.

### Note implementative wizard
- Stato locale: `currentStep: 1..5`, validazioni per step prima di abilitare `Continua`
- Animazione step transitions con Framer Motion (già usato nel progetto)
- In modalità `edit`, apertura diretta su Step 3 con possibilità di tornare indietro
- Persistenza dialog: `max-w-3xl` invece di `2xl`, layout grid per planner

---

## PARTE B — Sezione "Progressioni" (nuova, opzionale)

**Decisione**: implementata come **UI placeholder** dentro lo Step 3 (tab secondaria "Progressioni") con preset selezionabili (`volume_progressivo`, `carico_progressivo`, `deload`, `personalizzato`). Per non toccare DB, il preset scelto viene salvato dentro `notes` come prefisso strutturato (es. `[progression:deload]\n…note utente`). La rotazione esistente non viene alterata.

Se in futuro servirà logica reale di progressione → migrazione dedicata. Per ora è metadata visivo.

---

## PARTE C — UI Programmi (Tab riorganizzata)

Refactor `src/components/pt/ProgramsTab.tsx` e creazione di una pagina dettaglio (riuso del Card esistente, no nuova route obbligatoria) con tab interne:
- **Overview**: nome, obiettivo, badge durata/freq, stato assegnazioni
- **Settimane**: timeline visiva (leggera, senza editing — l'edit avviene riaprendo il wizard)
- **Progressioni**: lettura del preset salvato in `notes`
- **Assegnazione**: shortcut per aprire `AssignProgramDialog` esistente

Stile: card più alte, icone più grandi, gradient accent coerente con `bg-app-accent` (lime LIVEL APP), meno tabellare.

---

## PARTE D — Verifica & Miglioramento Vista Atleta

File: `src/pages/atleta/AtletaProgrammaPage.tsx` (già esistente, già funzionante).

Verifica end-to-end (read-only):
1. `getAtletaActiveProgram` legge correttamente `program_assignments` + `workout_programs` + `workouts` → OK già implementato
2. Settimane raggruppate via `differenceInCalendarWeeks` → OK
3. Ordine schede e ricorrenze → garantite dalla logica server invariata
4. Esecuzione: link a `/app/workout/:id` → OK

Miglioramenti UI (additivi, no breaking):
- **Card "Programma in corso"** in alto con: % completamento (`completati / totali`), prossima sessione, settimana corrente vs totale
- Badge "Settimana N di M" per ogni gruppo
- Highlight della sessione di oggi
- Stato "Programma completato" quando 100%

Nessuna modifica a `AtletaSchedaPage` (è già un redirect a `/app/programma`) né al workout flow.

---

## File toccati

**Modifiche**:
- `src/components/pt/ProgramFormDialog.tsx` → wizard a step (refactor profondo, stessa API output)
- `src/components/pt/ProgramsTab.tsx` → card più visuali + tab interne overview/settimane/progressioni/assegnazione
- `src/pages/atleta/AtletaProgrammaPage.tsx` → header con progresso programma, card "prossima sessione"

**Nuovi**:
- `src/components/pt/program-wizard/Step1Info.tsx`
- `src/components/pt/program-wizard/Step2Mode.tsx`
- `src/components/pt/program-wizard/Step3Planner.tsx` (con sub-componenti Recurring + DayByDay)
- `src/components/pt/program-wizard/Step4Timeline.tsx`
- `src/components/pt/program-wizard/Step5Review.tsx`
- `src/components/pt/program-wizard/WizardProgress.tsx`
- `src/components/pt/program-wizard/ScheduleSelector.tsx` (combobox riuso template)

**Invariati (verificati)**:
- `src/lib/api/programs.ts` — zero modifiche alla logica
- DB schema, RLS, migrations — nessuna nuova migrazione
- `AssignProgramDialog`, `rollProgramAssignment`, builder schede

---

## Dettagli tecnici

- Wizard state gestito con `useReducer` per chiarezza (action: `NEXT`, `PREV`, `SET_FIELD`, `LOAD_EXISTING`)
- Drag & drop con `@hello-pangea/dnd` (già installato)
- Animazioni step con `framer-motion` (già installato)
- `frequency_per_week` continua a essere derivato (no input diretto)
- Salvataggio finale invariato: stessa chiamata a `createProgram` / `updateProgram` + `replaceProgramSchedules` con stesso payload

---

## Cosa NON viene fatto (esplicitamente)
- Nessun nuovo builder esercizi
- Nessuna modifica a logica rotazione / day-by-day / rolling
- Nessuna nuova tabella DB né nuove colonne
- Nessun cambiamento alle assegnazioni esistenti
- Nessuna modifica al workout execution flow atleta

Il piano è UX-first con verifica del flusso atleta esistente.
