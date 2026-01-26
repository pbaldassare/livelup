
# Piano: Campo Tempo, Miglioramento UI e Popolamento Dati Demo

## Problemi Identificati

### 1. Campo Tempo Mancante
La colonna `tempo` esiste gia in `template_exercises` (es. "3-1-2-0" per eccentrica-pausa-concentrica-pausa) ma non viene mostrata nell'interfaccia del builder.

### 2. Popup Mal Posizionato
Il dialog "Crea Nuovo Template" viene visualizzato con posizionamento non ottimale su schermi piccoli. Dalla screenshot si nota che il dialog e centrato ma potrebbe beneficiare di miglior responsive design.

### 3. Dati Demo Mancanti
- 0 Template creati dal PT test
- 0 Workouts assegnati agli atleti
- Nessuna simulazione completa per testare il flusso atleta

---

## Implementazione

### Fase 1: Aggiunta Campo Tempo nel Builder

**File da modificare:** `src/components/pt/TemplateExerciseBuilder.tsx`

Aggiungere input per il campo tempo con formato standard (es. 3-1-2-0):

```text
+-------------------+
| Tempo (cadenza)   |
| [3]-[1]-[2]-[0]   |
| Ecc-Pausa-Conc-Pau|
+-------------------+
```

Il campo verra salvato come stringa "3-1-2-0" nella colonna esistente `template_exercises.tempo`.

### Fase 2: Miglioramento UI Dialog

**File da modificare:** `src/pages/pt/PTWorkoutsPage.tsx`

- Aumentare larghezza DialogContent: `max-w-lg` → `max-w-xl`
- Aggiungere ScrollArea per contenuto lungo
- Migliorare spaziatura e padding
- Aggiungere step wizard per creazione guidata (opzionale)

### Fase 3: Popolamento Dati Demo

Creare script di seed tramite Edge Function o query dirette per:

1. **Esercizi completi**: Verificare che tutti i 49 esercizi abbiano video_url e image_url validi

2. **Template Demo con Esercizi**:
   - Full Body Principiante (gia esiste con 5 esercizi)
   - Push Day Intermedio (gia esiste)
   - Pull Day Intermedio (gia esiste)
   - HIIT Cardio Blast (gia esiste)

3. **Workout Assegnati a Atleti Demo**:
   - Creare 2-3 workout per atleti demo
   - Copiare esercizi da template a workout_exercises
   - Status: uno "attivo", uno "completato"

4. **Utenti Demo**:
   - Verificare esistenza PT demo e Atleta demo
   - Creare connessione PT-Atleta se mancante

### Fase 4: Visualizzazione Tempo nell'App Atleta

**File da modificare:** `src/pages/atleta/AtletaWorkoutDetailPage.tsx`

Mostrare il tempo di esecuzione per ogni esercizio:
- Nella lista pre-workout: badge con tempo
- Durante esecuzione: timer visivo con cadenza

---

## Struttura Campo Tempo

```text
TEMPO: X-Y-W-Z
X = Secondi fase eccentrica (discesa/allungamento)
Y = Secondi pausa in posizione allungata
W = Secondi fase concentrica (risalita/contrazione)
Z = Secondi pausa in posizione contratta

Esempio: 3-1-2-0
- 3 secondi per scendere
- 1 secondo pausa in basso
- 2 secondi per risalire
- 0 secondi pausa in alto
```

---

## Query Seed per Dati Demo

### Verificare/Creare Connessione PT-Atleta
```sql
-- Cercare PT e Atleta esistenti
SELECT ur.user_id, ur.role, p.first_name, p.last_name 
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
WHERE ur.role IN ('pt', 'atleta')
LIMIT 5;

-- Creare connessione se mancante
INSERT INTO pt_atleta_connections (pt_user_id, atleta_user_id, status, requested_by)
VALUES ($pt_id, $atleta_id, 'active', $pt_id)
ON CONFLICT DO NOTHING;
```

### Creare Workout Assegnato
```sql
-- Inserire workout
INSERT INTO workouts (atleta_user_id, pt_user_id, template_id, title, description, status, scheduled_date)
SELECT 
  $atleta_id,
  $pt_id,
  id,
  title,
  description,
  'attivo',
  CURRENT_DATE + 1
FROM workout_templates
WHERE title = 'Full Body Principiante';

-- Copiare esercizi
INSERT INTO workout_exercises (workout_id, exercise_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, rest_seconds, notes)
SELECT 
  $workout_id,
  exercise_id,
  order_index,
  sets,
  reps_min,
  reps_max,
  rest_seconds,
  notes
FROM template_exercises
WHERE template_id = $template_id;
```

---

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `src/components/pt/TemplateExerciseBuilder.tsx` | + Campo tempo (4 input per cadenza) |
| `src/pages/pt/PTWorkoutsPage.tsx` | Miglioramento layout dialog |
| `src/pages/atleta/AtletaWorkoutDetailPage.tsx` | Visualizzazione tempo esercizio |
| Database seed | Workout assegnati + connessioni demo |

---

## UI Campo Tempo nel Builder

```text
+-----------------------------------------------+
| Tempo (cadenza movimento)                      |
| +-----+   +-----+   +-----+   +-----+         |
| |  3  | - |  1  | - |  2  | - |  0  |         |
| +-----+   +-----+   +-----+   +-----+         |
| Ecc.    Pausa     Conc.     Pausa             |
+-----------------------------------------------+
```

Ogni input e un numero (0-9), salvato come stringa "3-1-2-0".

---

## Ordine di Implementazione

1. Campo tempo nel TemplateExerciseBuilder
2. Miglioramento layout dialog creazione template
3. Popolamento dati demo (workout assegnati)
4. Visualizzazione tempo nell'app atleta
5. Test flusso completo PT → Atleta
