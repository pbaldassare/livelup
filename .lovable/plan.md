

## Piano: creazione scheda guidata + protocollo SET con set eterogenei

### Obiettivo
Trasformare "Crea Scheda" in un flusso guidato a 2 step (dati generali → builder con blocco SET) e introdurre la gestione di **set eterogenei** (reps/kg/recupero diversi tra loro) visualizzati in tabella orizzontale, mantenendo la **piena retro-compatibilità** con le schede esistenti.

---

### Parte 1 — Estensione dati (migration)

**Tabelle modificate:**

1. `workout_templates` → nuova colonna:
   - `muscle_groups text[] not null default '{}'` (gruppi muscolari coinvolti)

2. `template_exercises` → nuova colonna:
   - `sets_data jsonb` (nullable) — array di set eterogenei: `[{ reps: 10, weight: 60, rest_seconds: 90 }, { reps: 8, weight: 70, rest_seconds: 120 }]`

3. `workout_exercises` (lato esecuzione atleta) → nuova colonna:
   - `sets_data jsonb` (nullable) — copiata dal template all'assegnazione

**Retro-compatibilità (regola d'oro):**
- Se `sets_data IS NULL` → la UI rigenera i set "virtuali" leggendo i campi piatti esistenti (`sets`, `reps_min`, `reps_max`, `rest_seconds`, `prescribed_duration_seconds`) come N set identici. Le schede vecchie continuano a funzionare senza migrazione di dati.
- Quando il PT modifica un set in tabella orizzontale → al primo `update` materializziamo `sets_data` nel DB e da quel punto in poi è la sorgente di verità.
- I campi piatti rimangono valorizzati con un riassunto (max sets, min/max reps) per le query esistenti che li usano (es. `AtletaAppHome` legge `prescribed_sets`).

---

### Parte 2 — Step iniziale "Crea Scheda" (dialog)

File: `src/pages/pt/PTWorkoutsPage.tsx` — dialog di creazione rifatto.

**Campi:**
- **Titolo scheda** (obbligatorio)
- **Gruppi muscolari coinvolti** (multi-select riutilizzando `MultiSelectSearch` esistente, opzioni: Petto, Schiena, Gambe, Spalle, Braccia, Core, Glutei, Addominali, Cardio, Full body)
- **Difficoltà** (Principiante / Intermedio / Avanzato)
- Descrizione (opzionale, collassata)

**CTA:** "Continua" (validazione: titolo non vuoto + almeno 1 gruppo muscolare + difficoltà selezionata)

Al submit:
1. Insert in `workout_templates` con `muscle_groups`
2. Insert blocco SET di default in `template_blocks` (già fatto oggi)
3. Redirect a `/pt/templates/:id` (già fatto oggi)

---

### Parte 3 — Builder set orizzontali (cuore del lavoro)

File: `src/components/pt/TemplateExerciseBuilder.tsx` — refactor della sezione esercizio.

**Nuova UI per ogni esercizio (sostituisce i 4 input "Serie / Reps Min / Reps Max / Recupero"):**

```text
Panca Piana                                              [+ Set] [🗑]
┌────────┬────────┬────────┬────────┬─────┐
│        │ Set 1  │ Set 2  │ Set 3  │  +  │
├────────┼────────┼────────┼────────┼─────┤
│ Reps   │  [10]  │  [8]   │  [6]   │     │
│ Kg     │  [60]  │  [70]  │  [80]  │     │
│ Rec(s) │  [90]  │  [120] │  [120] │     │
│        │   🗑   │   🗑   │   🗑   │     │
└────────┴────────┴────────┴────────┴─────┘
```

**Comportamento:**
- Layout: tabella con header verticale (Reps/Kg/Rec) e colonne orizzontali per ciascun set, scrollabile orizzontalmente su mobile (`overflow-x-auto`).
- "+ Set" duplica l'ultimo set (default 10/0/60 se vuoto).
- Cestino per colonna elimina il set; warning se 0 set rimanenti.
- Auto-derivazione: se `sets_data` nullo, al primo accesso lo generiamo on-the-fly da `sets` × `{reps: reps_min, weight: null, rest_seconds}` per la UI; salviamo solo al primo edit.
- Debounce 400ms su update per evitare spam DB durante la digitazione.

**Stato pulito:** la UI scarta i vecchi blocchi di controllo "Tempo (cadenza)" e "Note" rimangono ma collassati sotto un "Mostra avanzate" per non affollare.

---

### Parte 4 — Sincronizzazione blocco SET ↔ esercizi

Oggi il blocco SET ha params (`sets`, `reps`, `rest_seconds`, `weight`) che vengono **ereditati all'aggiunta di ogni esercizio**. Con i set eterogenei i params del blocco SET diventano solo un **template di default**:
- Quando aggiungo un esercizio al blocco SET → genero `sets_data` con N copie dei valori del blocco.
- I param fields del blocco SET nel `TemplateBlockBuilder` mostrano un disclaimer: *"Valori di default per i nuovi esercizi. Personalizza ogni set nell'esercizio."*

---

### Parte 5 — Lato esecuzione atleta (lettura)

File da aggiornare per leggere `sets_data` quando presente:
- `src/lib/api/workouts.ts` (`createWorkout`) → copia `sets_data` da template a workout.
- `src/lib/api/templateLoader.ts` → include `sets_data` nel select e nel mapping.
- `src/components/app/GuidedWorkoutFlow.tsx` e `SetTracker.tsx` → se `sets_data` presente, usa quei valori per generare gli `n` set da loggare; altrimenti fallback su `prescribed_sets` come oggi (zero rischio rotture).

---

### Parte 6 — Validazioni
- Scheda senza titolo → errore (già presente, esteso a muscle_groups).
- Esercizio con 0 set → badge warning "Imposta almeno 1 set".
- Blocco senza esercizi → badge warning "Vuoto" (già esistente).
- Set con reps E kg vuoti → badge warning "Set incompleto".

---

### File modificati
- **Migration nuova**: aggiunge `workout_templates.muscle_groups`, `template_exercises.sets_data`, `workout_exercises.sets_data`.
- `src/pages/pt/PTWorkoutsPage.tsx` — dialog step 1 con muscle_groups multi-select, validazione, insert con muscle_groups.
- `src/components/pt/TemplateExerciseBuilder.tsx` — nuova tabella set orizzontali, hook `useSetsData` con fallback retro-compat, mutation update/add/remove set.
- `src/components/pt/TemplateBlockBuilder.tsx` — disclaimer params SET, passa `defaultSetTemplate` al child.
- `src/components/pt/AssignWorkoutDialog.tsx` — propaga `sets_data` nell'assegnazione.
- `src/lib/api/templateLoader.ts` — select + mapping `sets_data`.
- `src/lib/api/workouts.ts` — `createWorkout` copia `sets_data`.
- `src/components/app/GuidedWorkoutFlow.tsx` + `src/components/app/SetTracker.tsx` — lettura `sets_data` con fallback.
- `src/pages/pt/PTTemplateDetailPage.tsx` — sidebar mostra muscle_groups come badge.

### Edge case gestiti
- Schede esistenti senza `muscle_groups` → array vuoto, badge "Non specificato" nella sidebar, nessuna rottura.
- Esercizi esistenti senza `sets_data` → UI deriva i set dai campi piatti, edit materializza `sets_data`.
- Workout già assegnati → continuano a girare sul vecchio schema; i nuovi assegnati ereditano `sets_data` se presente.
- Duplicazione blocco/scheda → copia anche `sets_data`.

### Checklist test
1. "Crea Scheda" → step 1 chiede titolo, gruppi muscolari, difficoltà → ok
2. Validazione: senza titolo o senza gruppi → blocco con messaggio
3. Builder si apre con Blocco 1 (SET) → ok
4. Aggiungo esercizio "Panca Piana" → vedo tabella set orizzontale con 4 set di default
5. Modifico Set 1: 10×60kg×90s, Set 2: 8×70×120s, Set 3: 6×80×120s → tutti diversi, salvati
6. Aggiungo Set 4 → duplica Set 3
7. Elimino Set 2 → restano 3 set
8. Apro una scheda VECCHIA → vedo tabella derivata, niente errori
9. Atleta esegue scheda nuova → SetTracker mostra 3 set con valori diversi
10. Atleta esegue scheda vecchia → comportamento identico a oggi
11. Stessa lista esercizi tra tab "Esercizi" e builder → ok (già unificata)
12. Duplicazione scheda copia anche `sets_data` → ok

