

## Piano: vista esercizi atleta — implementazione + correzioni

### Stato di partenza
La lista esercizi pre-workout in `AtletaWorkoutDetailPage.tsx` esiste ma le righe **non sono cliccabili** e il componente `AtletaExerciseDetailSheet.tsx` **non è ancora stato creato**. Implemento ora la versione completa con tutte le correzioni richieste in un'unica passata.

---

### Modifiche

**1. Nuovo file `src/components/app/AtletaExerciseDetailSheet.tsx`**

Sheet a tutto schermo (`Sheet` shadcn, `side="bottom"`, `h-[92dvh]`).

Struttura:
- **Header sticky**: back, nome esercizio, bottone "Cambia" (disabled, placeholder).
- **Tabs**: `Animazione` (default) / `Muscoli` / `Tutorial` (gli ultimi due placeholder "In arrivo").
- **Media**:
  - Se `video_url` YouTube → **thumbnail cliccabile** (riuso `getYouTubeVideoId` + `hqdefault.jpg`) con overlay Play. Click → apre `Dialog` shadcn con iframe embed.
  - Else if `image_url` → immagine grande (aspect 16/10).
  - Else → placeholder con icona Dumbbell.
- **Riga durata o reps** (mai entrambi):
  - `prescribed_duration_seconds > 0` → "Durata · mm:ss"
  - altrimenti → "Reps · ×N" (range se presente).
- **Istruzioni**: `instructions` con `whitespace-pre-line`.
- **Area di focus**: badge per ogni `muscle_groups[]`.
- **Sezione Set** (compatibile protocolli futuri):
  - Funzione helper interna `buildSets(exercise)` che costruisce `Array<{n, reps, weight, rest}>` — oggi tutti i set ereditano gli stessi `prescribed_reps_min/max`, `prescribed_weight`, `rest_seconds`. Struttura preparata per leggere in futuro un eventuale `sets_data` per-set senza cambiare la UI.
  - Render verticale: una card per Set 1..N con `Reps`, `Kg`, `Recupero` (omette i campi nulli, niente layout rigido SET-only).
  - Set già loggato (presente in `completedSetsForEx`) → check + opacità 60%.
- **Footer sticky** con due bottoni:
  - **`Inizia esercizio`** → vedi punto 3.
  - **`Segna come completato`** → vedi punto 4.

Props:
```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: WorkoutExercise | null;
  completedSetsForEx: number[];
  status: 'not_started' | 'in_progress' | 'completed';
  onStart: () => void;
  onMarkAllCompleted: () => Promise<void>;
}
```

---

**2. `src/pages/atleta/AtletaWorkoutDetailPage.tsx`**

**a) Aggiunta `muscle_groups` alla select**:
```ts
exercises:exercise_id (name, category, video_url, image_url, instructions, muscle_groups)
```
ed estensione del tipo `WorkoutExercise.exercises`.

**b) Logica stato per esercizio (PARTE 1)** — helper memoizzato:
```ts
function getExerciseStatus(ex, logCount) {
  if (logCount === 0) return 'not_started';
  if (logCount < ex.prescribed_sets) return 'in_progress';
  return 'completed';
}
```

**c) Lista cliccabile (sostituisce `motion.div` righe 587-613)**:
- Wrapping `<button>` su tutta la riga → `setSelectedExercise(ex)` + `setSheetOpen(true)`.
- Layout: thumbnail 56×56 (image_url o icona) a sinistra, nome + una sola tra `Durata mm:ss` o `× reps`, indicatore stato a destra.
- Stati visivi:
  - `not_started` → bordo neutro `border-app-border`.
  - `in_progress` → `border-app-accent` + dot lime pulsante.
  - `completed` → `opacity-60` + `CheckCircle2` lime.
- Divider sottile tra le righe.

**d) FIX "Inizia esercizio" (PARTE 2)** — handler `handleStartFromSheet(ex)`:
```ts
const idx = exercises.findIndex(e => e.id === ex.id);
setCurrentExerciseIndex(idx);
const completedForEx = completedSets[ex.id] || [];
const firstIncomplete = Array.from({length: ex.prescribed_sets}, (_, i) => i+1)
  .find(s => !completedForEx.includes(s)) || 1;
setCurrentSet(firstIncomplete);

if (!isWorkoutStarted) {
  setIsWorkoutStarted(true);
  if (workout?.status !== 'in_corso') {
    await supabase.from('workouts').update({status: 'in_corso'})
      .eq('id', workoutId).in('status', ['attivo', 'in_sospeso']);
    queryClient.invalidateQueries({queryKey: ['atleta-focus-workout']});
  }
}
// Se già iniziato: NON tocca status né isWorkoutStarted, aggiorna solo index/set
setSheetOpen(false);
```

**e) FIX "Segna come completato" (PARTE 3)** — handler `handleMarkAllCompleted(ex)`:
- Se `status === 'not_started'` → mostra `AlertDialog` di conferma "Vuoi segnare questo esercizio come completato?". Solo dopo OK procede.
- Se `status === 'in_progress'` → procede senza conferma.
- Se `status === 'completed'` → bottone disabilitato.

Implementazione (no duplicati):
```ts
const completedForEx = completedSets[ex.id] || [];
const missing = Array.from({length: ex.prescribed_sets}, (_, i) => i+1)
  .filter(s => !completedForEx.includes(s));

for (const s of missing) {
  await logSetMutation.mutateAsync({
    workoutExerciseId: ex.id,
    setNumber: s,
    repsCompleted: ex.prescribed_reps_min ?? ex.prescribed_reps_max ?? 0,
    weightUsed: ex.prescribed_weight ?? undefined,
  });
}

setCompletedSets(prev => ({
  ...prev,
  [ex.id]: [...completedForEx, ...missing].sort((a,b) => a-b)
}));
queryClient.invalidateQueries({queryKey: ['workout-logs', workoutId]});
toast.success('Esercizio completato');
setSheetOpen(false);
```

`logSetMutation` esistente fa già delete-then-insert sul `(workout_exercise_id, set_number)` → idempotente, nessun rischio di duplicati anche in edge case.

**f) Stato locale aggiunto**:
```ts
const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);
const [sheetOpen, setSheetOpen] = useState(false);
const [confirmMarkOpen, setConfirmMarkOpen] = useState(false);
```

**g) Render `<AtletaExerciseDetailSheet>` + `<AlertDialog>` di conferma** in fondo al ramo pre-workout.

---

### Cosa NON tocchiamo
- `GuidedWorkoutFlow.tsx`, schema DB, registry protocolli, builder PT, tab Protocolli, `AtletaEserciziPage`.
- Logica `logSetMutation`, `completeWorkoutMutation`, summary post-workout.

---

### File modificati / creati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/app/AtletaExerciseDetailSheet.tsx` | **nuovo** | Sheet dettaglio: header, media (thumbnail YT cliccabile + Dialog video), tabs, durata/reps, istruzioni, badge muscoli, set verticali compatibili futuri protocolli, footer azioni |
| `src/pages/atleta/AtletaWorkoutDetailPage.tsx` | edit | `muscle_groups` in select; lista righe cliccabili con 3 stati; handler `handleStartFromSheet` (preserva flow se già iniziato); handler `handleMarkAllCompleted` con conferma se non iniziato e solo set mancanti se in corso; AlertDialog conferma; integrazione Sheet |

---

### Checklist test
1. Lista esercizi: ogni riga mostra thumbnail + nome + (durata XOR reps) + indicatore stato.
2. Stati corretti: 0 log = neutro; 1..N-1 log = bordo lime + dot; N log = check + opacità 60%.
3. Click riga → si apre lo Sheet a tutto schermo.
4. Video YouTube: thumbnail visibile, click → Dialog con iframe; senza video → immagine; senza nulla → placeholder.
5. Set verticali: Set 1..N con reps/kg/recupero; set già loggati con check.
6. **Inizia esercizio** quando workout NON iniziato → status DB → `in_corso`, parte guided flow su quell'esercizio dal primo set incompleto.
7. **Inizia esercizio** quando workout GIÀ iniziato → cambia solo `currentExerciseIndex`/`currentSet`, nessun update DB, `isWorkoutStarted` resta true.
8. **Segna come completato** su esercizio non iniziato → AlertDialog di conferma; OK → tutti i set loggati.
9. **Segna come completato** su esercizio in corso → nessuna conferma; loggati SOLO i set mancanti, nessun duplicato.
10. **Segna come completato** su esercizio completato → bottone disabilitato.
11. Riapertura pagina → stati persistono coerenti con `existingLogs`.
12. Nessuna regressione su `GuidedWorkoutFlow`, summary, builder PT, tab Protocolli.

