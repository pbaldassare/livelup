

## Analisi

Devo capire come funziona oggi `updateProgram` e la rigenerazione/rolling. Verifico i file chiave.
<lov-tool-use name="code--view" data="{\"file_path\": \"src/lib/api/programs.ts\"}">
</lov-tool-use>

Ho visto in precedenza la struttura. Riepilogo i punti critici:

- `updateProgram` esiste ma probabilmente sostituisce `program_schedules` interamente (DELETE+INSERT) e non protegge nulla.
- `rollProgramAssignment` rigenera settimane future leggendo `program_schedules` correnti — questo è OK (i workouts già creati restano), ma serve garantire che NON sovrascriva date già occupate.
- `current_index` rischia di andare fuori range se il numero di schede cala dopo una modifica.
- Manca filtro "data >= oggi AND status NOT IN (completato, in_corso)" sulla rigenerazione.

## Piano: Modifica sicura di un Programma assegnato

### Principio cardine
Le modifiche al programma toccano SOLO la configurazione (`workout_programs` + `program_schedules`). I record in `workouts` già esistenti non vengono mai toccati. Le rigenerazioni future leggono la nuova configurazione e usano la regola di skip-on-collision già esistente.

### Modifiche file

**1. `src/lib/api/programs.ts` — `updateProgram`**

Refactor della funzione per essere safe:
- Aggiorna i campi del programma (`name`, `description`, `mode`, `duration_weeks`, `frequency_per_week`, `active_days`, ecc.) sempre.
- Per `program_schedules`: invece di DELETE+INSERT cieco, faccio un **diff intelligente**:
  - schedules esistenti con stesso `id` → UPDATE solo dei campi cambiati
  - nuovi schedules (senza id) → INSERT
  - schedules rimossi → DELETE solo dal record di configurazione (non tocca workouts già generati)
- Restituisco il programma aggiornato + lista `assignment_ids` impattati.

**2. `src/lib/api/programs.ts` — Nuova funzione `realignAssignmentsAfterUpdate(programId)`**

Per ogni `program_assignment` attivo collegato a quel programma:
- Rilegge `program_schedules` aggiornati e calcola il nuovo `total_templates`.
- Riallinea `current_index`: `new_index = current_index % new_total` (clamp a 0 se 0 schede — bloccato a monte).
- Aggiorna `active_days` se modificato a livello di programma E l'assignment usa ancora i default (campo `active_days` mai customizzato). Decisione: per sicurezza NON propago automaticamente `active_days` agli assignment esistenti — restano come scelti al momento dell'assegnazione. Solo `current_index` viene clamped.

**3. `src/lib/api/programs.ts` — Hardening `rollProgramAssignment` e `assignRecurringProgram`**

Aggiungere controllo esplicito sulla collisione: prima di INSERT in `workouts`, query su:
```ts
.from('workouts')
.select('id, status')
.eq('atleta_user_id', ...)
.eq('scheduled_date', date)
```
Se esiste un workout per quella data (qualunque status) → **skip** (mai sovrascrivere). L'index della rotazione avanza comunque per mantenere continuità (logica già presente, da confermare).

Nota: la regola "data >= oggi AND status NOT IN (completato, in_corso) → modificabile" non si applica alla **generazione** (che già non tocca i record esistenti), ma servirebbe solo se in futuro si aggiunge un'opzione "rigenera anche i futuri". Per ora la mettiamo come **regola di sola lettura/visualizzazione**, non di azione automatica.

**4. `src/components/pt/ProgramFormDialog.tsx` — UX in modalità "edit"**

- Quando il dialog è aperto su un programma esistente che ha almeno 1 `program_assignment` attivo:
  - Mostro `Alert` informativo in cima:
    > ⚠️ Questo programma è assegnato a N atleta/i. Le modifiche si applicheranno **solo agli allenamenti futuri**. Lo storico resta invariato.
  - Mostro count assegnazioni attive.
- Validazioni rinforzate:
  - Non permetto di salvare con 0 schede se ci sono assegnazioni attive (bloccare).
  - Avviso prima del submit se cambia `mode`, `duration_weeks`, o numero schede.
- Conservo gli `id` degli `program_schedules` esistenti nel form state per permettere il diff lato API.

**5. Edge case e controlli espliciti**

- Programma con 0 schede su salvataggio → bloccato (sia create che update).
- Cambio mode (`recurring` ↔ `day_by_day`) su programma assegnato → mostro warning forte ("Cambierà la logica di generazione futura").
- Riallineamento `current_index`: se `new_total < current_index`, applico `% new_total`.
- I workout già su DB con riferimento a un template rimosso dal programma restano validi (non c'è FK cascade verso `program_schedules`).

### Schema DB
**Nessuna migrazione necessaria.** L'attuale schema (`workouts` indipendente da `program_schedules`, `current_index` su `program_assignments`) supporta già tutto.

### File modificati
- `src/lib/api/programs.ts` — `updateProgram` con diff, nuova `realignAssignmentsAfterUpdate`, hardening collision-skip in `rollProgramAssignment` / `assignRecurringProgram` / `assignDayByDayProgram`.
- `src/components/pt/ProgramFormDialog.tsx` — Alert "modifiche solo future", count assegnazioni attive, validazione 0 schede, warning su cambio mode/duration.

### Checklist test manuale
1. Modifico nome/descrizione programma → workouts esistenti invariati ✓
2. Aggiungo scheda D al programma → la rigenerazione settimanale successiva la include nella rotazione, passato invariato ✓
3. Rimuovo scheda C → workouts già generati con C restano, futuri usano solo A,B ✓
4. Cambio ordine A,B,C → C,A,B → solo nuove generazioni rispettano nuovo ordine ✓
5. Programma con `current_index = 4` e poi rimuovo schede portandole a 3 → index riallineato a `4 % 3 = 1` ✓
6. Modifico `active_days` → assegnazioni esistenti mantengono i loro `active_days` originali (nessun side-effect inatteso sul calendario atleta) ✓
7. Provo a salvare programma con 0 schede e atleti assegnati → bloccato con errore chiaro ✓
8. Atleta con workout `in_corso` o `completato` → invariato in ogni scenario ✓

