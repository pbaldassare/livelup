
# Piano: Funzionalita Mancanti Lato PT

## Analisi dello Stato Attuale

Ho esaminato tutte le pagine PT (dashboard web e PWA mobile) e ho identificato le seguenti lacune funzionali:

| Funzionalita | Stato Attuale | Priorita |
|--------------|---------------|----------|
| Creare Template con Esercizi | Solo metadata, nessun esercizio | Alta |
| Assegnare Scheda ad Atleta | Bottone non funzionante | Alta |
| Gestire Esercizi nei Template | Non implementato | Alta |
| Creare Evento con Atleta | Manca selezione atleta | Media |
| Visualizzare Dettaglio Atleta | Route mancante | Media |
| Gestire Disponibilita Oraria | Non implementato | Media |
| Invitare Atleta (via email/link) | Non implementato | Bassa |

---

## 1. Template con Esercizi (Priorita Alta)

### Problema
La pagina `PTWorkoutsPage.tsx` permette di creare solo i metadata del template (titolo, difficolta, durata) ma non consente di aggiungere esercizi al template.

### Soluzione
Creare un nuovo componente `TemplateExerciseBuilder` che permetta di:
- Cercare e filtrare esercizi dalla libreria (49 esercizi gia presenti)
- Aggiungere esercizi al template con: serie, ripetizioni min/max, recupero, note
- Riordinare esercizi tramite drag-and-drop
- Rimuovere esercizi

### Flusso Utente
```text
1. PT clicca "Nuovo Template"
2. Compila metadata (titolo, difficolta, categoria)
3. Passa a tab "Esercizi"
4. Cerca esercizio → Aggiunge al template
5. Configura serie/ripetizioni per ogni esercizio
6. Salva template completo
```

### File da creare/modificare
- `src/components/pt/TemplateExerciseBuilder.tsx` (nuovo)
- `src/pages/pt/PTWorkoutsPage.tsx` (modifica dialog)

---

## 2. Assegnare Scheda ad Atleta (Priorita Alta)

### Problema
Non esiste funzionalita per assegnare un template o creare una scheda personalizzata per un atleta collegato.

### Soluzione
Creare dialog `AssignWorkoutDialog` con:
- Selezione atleta collegato (dropdown con atleti attivi)
- Selezione template esistente OPPURE creazione scheda custom
- Data programmata e data scadenza
- Note per l'atleta

### Flusso DB
```text
1. Crea record in `workouts` con:
   - atleta_user_id
   - pt_user_id
   - template_id (opzionale)
   - status: 'attivo'
   - scheduled_date, due_date

2. Copia esercizi da template_exercises → workout_exercises
   (personalizzati se necessario)

3. Invia notifica all'atleta
```

### File da creare/modificare
- `src/components/pt/AssignWorkoutDialog.tsx` (nuovo)
- `src/pages/pt/PTWorkoutsPage.tsx` (integrazione)
- `src/pages/pt/PTAthletesPage.tsx` (bottone "Assegna Scheda" funzionante)

---

## 3. Dettaglio Template con Esercizi

### Problema
Click su template non mostra gli esercizi configurati.

### Soluzione
Creare pagina o sheet di dettaglio template:
- Lista esercizi ordinata con video/immagine
- Possibilita di modificare configurazione esercizi
- Preview di come apparira all'atleta

### File da creare
- `src/pages/pt/PTTemplateDetailPage.tsx` (nuovo)
- Aggiungere route `/pt/templates/:templateId`

---

## 4. Calendario con Atleta (Priorita Media)

### Problema
Creazione evento non permette di associare un atleta specifico.

### Soluzione
Modificare dialog creazione evento per:
- Aggiungere dropdown "Atleta" (lista atleti collegati)
- Popolare automaticamente il campo `atleta_user_id`
- Inviare notifica all'atleta quando evento creato

### File da modificare
- `src/pages/pt/PTCalendarPage.tsx`

---

## 5. Pagina Dettaglio Atleta (Priorita Media)

### Problema
La route `/pt/app/athlete/:atletaId` porta a una pagina non esistente.

### Soluzione
Creare pagina `PTAthleteDetailPage` con:
- Profilo atleta (dati anagrafici, obiettivi, livello)
- Storico allenamenti assegnati
- Progressi (peso, misure, se disponibili)
- Azioni rapide: Chat, Assegna Scheda, Crea Evento

### File da creare
- `src/pages/pt/PTAthleteDetailPage.tsx` (nuovo)
- Aggiornare routes in App.tsx

---

## 6. Gestione Disponibilita Oraria (Priorita Media)

### Problema
Il PT non puo gestire i suoi slot di disponibilita (tabella `pt_availability` esiste ma non e usata).

### Soluzione
Aggiungere sezione in `PTSettingsPage` o creare pagina dedicata:
- Griglia settimanale (lun-dom)
- Per ogni giorno: orari disponibili (slot da 30/60 min)
- Toggle disponibilita per slot

### File da creare/modificare
- `src/components/pt/PTAvailabilityManager.tsx` (nuovo)
- `src/pages/pt/PTSettingsPage.tsx` (integrazione)

---

## Schema Implementazione Progressiva

| Fase | Componente | Complessita |
|------|------------|-------------|
| 1 | TemplateExerciseBuilder (aggiungere esercizi a template) | Alta |
| 2 | AssignWorkoutDialog (assegnare scheda ad atleta) | Alta |
| 3 | PTCalendarPage con selezione atleta | Bassa |
| 4 | PTAthleteDetailPage | Media |
| 5 | PTTemplateDetailPage | Media |
| 6 | PTAvailabilityManager | Media |

---

## Dettaglio Tecnico: TemplateExerciseBuilder

```tsx
// Struttura del componente
<TemplateExerciseBuilder templateId={templateId}>
  {/* Ricerca esercizi */}
  <ExerciseSearch 
    onSelect={(exercise) => addExercise(exercise)}
    filters={{ category, muscleGroup, difficulty }}
  />
  
  {/* Lista esercizi aggiunti (ordinabile) */}
  <DraggableExerciseList exercises={templateExercises}>
    {(exercise, index) => (
      <ExerciseCard 
        exercise={exercise}
        sets={3} 
        repsMin={10} 
        repsMax={12}
        restSeconds={60}
        onUpdate={(config) => updateExercise(index, config)}
        onRemove={() => removeExercise(index)}
      />
    )}
  </DraggableExerciseList>
</TemplateExerciseBuilder>
```

---

## Dettaglio Tecnico: AssignWorkoutDialog

```tsx
// Campi del dialog
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Assegna Allenamento</DialogTitle>
    </DialogHeader>
    
    {/* Selezione atleta */}
    <Select label="Atleta" required>
      {connectedAthletes.map(athlete => (
        <SelectItem value={athlete.id}>
          {athlete.firstName} {athlete.lastName}
        </SelectItem>
      ))}
    </Select>
    
    {/* Selezione sorgente */}
    <RadioGroup>
      <RadioItem value="template">Usa Template Esistente</RadioItem>
      <RadioItem value="custom">Crea Scheda Personalizzata</RadioItem>
    </RadioGroup>
    
    {/* Se template */}
    <Select label="Template">
      {templates.map(t => <SelectItem value={t.id}>{t.title}</SelectItem>)}
    </Select>
    
    {/* Date */}
    <DatePicker label="Data Programmata" />
    <DatePicker label="Scadenza" />
    
    {/* Note */}
    <Textarea label="Note per l'atleta" />
    
    <DialogFooter>
      <Button onClick={handleAssign}>Assegna</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Query Necessarie

### Fetch atleti collegati (per dropdown)
```sql
SELECT 
  pac.atleta_user_id,
  p.first_name, p.last_name, p.avatar_url
FROM pt_atleta_connections pac
JOIN profiles p ON p.user_id = pac.atleta_user_id
WHERE pac.pt_user_id = $pt_user_id
  AND pac.status = 'active'
```

### Crea workout da template
```sql
-- 1. Insert workout
INSERT INTO workouts (atleta_user_id, pt_user_id, template_id, title, status, scheduled_date, due_date)
VALUES ($atleta_id, $pt_id, $template_id, $title, 'attivo', $scheduled, $due)
RETURNING id;

-- 2. Copia esercizi da template
INSERT INTO workout_exercises (workout_id, exercise_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, rest_seconds, notes)
SELECT $workout_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes
FROM template_exercises
WHERE template_id = $template_id;
```

---

## Riepilogo Files

**Nuovi file:**
- `src/components/pt/TemplateExerciseBuilder.tsx`
- `src/components/pt/AssignWorkoutDialog.tsx`
- `src/components/pt/ExerciseSearchCombobox.tsx`
- `src/pages/pt/PTAthleteDetailPage.tsx`
- `src/pages/pt/PTTemplateDetailPage.tsx`
- `src/components/pt/PTAvailabilityManager.tsx`

**File modificati:**
- `src/pages/pt/PTWorkoutsPage.tsx` (dialog con esercizi)
- `src/pages/pt/PTAthletesPage.tsx` (bottone assegna funzionante)
- `src/pages/pt/PTCalendarPage.tsx` (selezione atleta)
- `src/pages/pt/PTSettingsPage.tsx` (disponibilita)
- `src/App.tsx` (nuove routes)
