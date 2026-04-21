

## Piano: sistema preferiti esercizi PT (Archivio → Preferiti → Builder)

### Obiettivo
Separare nettamente:
- **Archivio Esercizi** (admin) → catalogo completo, sola consultazione per il PT.
- **Tab "Esercizi"** (in `/pt/workouts`) → solo preferiti del PT.
- **Builder schede** → seleziona solo dai preferiti del PT.

Una sola sorgente dati (`exercises`), nessuna duplicazione. La selezione preferiti vive in una tabella ponte.

---

### Stato attuale (analisi)
- ✅ Archivio Esercizi (`PTExercisesArchivePage`) già esiste come read-only.
- ❌ Tab "Esercizi" in `PTWorkoutsPage` mostra **tutti** gli esercizi pubblici + propri (riga 145-148).
- ❌ Builder (`TemplateExerciseBuilder` riga 126-130) pesca da tutti gli esercizi pubblici, non dai preferiti.
- ❌ Manca tabella `pt_favorite_exercises`.
- ❌ Manca azione "Aggiungi ai preferiti" nel dialog dettaglio dell'archivio.

---

### Parte 1 — Migration database

**Nuova tabella `pt_favorite_exercises`** (tabella ponte molti-a-molti):
```sql
CREATE TABLE public.pt_favorite_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id uuid NOT NULL,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id, exercise_id)
);

ALTER TABLE public.pt_favorite_exercises ENABLE ROW LEVEL SECURITY;

-- PT gestisce solo i propri preferiti
CREATE POLICY "PT can view own favorites"
  ON public.pt_favorite_exercises FOR SELECT
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "PT can add own favorites"
  ON public.pt_favorite_exercises FOR INSERT
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "PT can remove own favorites"
  ON public.pt_favorite_exercises FOR DELETE
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Admins can view all favorites"
  ON public.pt_favorite_exercises FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_pt_favorite_exercises_pt_user ON public.pt_favorite_exercises(pt_user_id);
CREATE INDEX idx_pt_favorite_exercises_exercise ON public.pt_favorite_exercises(exercise_id);
```

**Migrazione dati esistenti** (regola "una sola sorgente"):
- Tutti gli esercizi `exercises` con `created_by = NULL` o `is_public = true` restano nell'**archivio**: nessuno spostamento fisico necessario perché l'archivio già li mostra.
- Esercizi creati dai PT (`created_by = <pt_id>`, `is_public = false`): li **promuoviamo nell'archivio** rendendoli pubblici e contemporaneamente li **aggiungiamo ai preferiti del PT che li ha creati**, così non perdono accesso operativo.
  ```sql
  -- Auto-favorite: ogni PT ottiene come preferiti gli esercizi che aveva creato
  INSERT INTO public.pt_favorite_exercises (pt_user_id, exercise_id)
  SELECT created_by, id FROM public.exercises 
  WHERE created_by IS NOT NULL
  ON CONFLICT DO NOTHING;
  
  -- Promuovi gli esercizi privati nell'archivio (solo se non già pubblici)
  UPDATE public.exercises SET is_public = true 
  WHERE created_by IS NOT NULL AND is_public = false;
  ```
- Inoltre, ogni esercizio già usato in `template_exercises` di un PT viene aggiunto ai preferiti di quel PT (così le schede esistenti continuano a funzionare e gli esercizi compaiono nel suo tab):
  ```sql
  INSERT INTO public.pt_favorite_exercises (pt_user_id, exercise_id)
  SELECT DISTINCT wt.pt_user_id, te.exercise_id
  FROM public.template_exercises te
  JOIN public.workout_templates wt ON wt.id = te.template_id
  WHERE wt.pt_user_id IS NOT NULL
  ON CONFLICT DO NOTHING;
  ```

**Cleanup automatico**: il `ON DELETE CASCADE` su `exercise_id` garantisce che, quando admin elimina un esercizio, sparisce dai preferiti di tutti i PT.

---

### Parte 2 — Hook condiviso `usePTFavoriteExercises`

Nuovo file `src/hooks/usePTFavoriteExercises.tsx`:
- `useFavoriteIds()` → `Set<string>` con gli `exercise_id` preferiti del PT loggato (cache react-query).
- `useFavoriteExercises()` → lista completa degli esercizi preferiti (join `exercises` via `.in('id', favIds)`).
- `useToggleFavorite()` → mutation che fa insert/delete e invalida cache `pt-favorite-exercises`, `pt-exercises-tab`, `template-exercises-library`.

---

### Parte 3 — Archivio Esercizi: bottone "Preferito"

**`src/components/exercises/ExerciseDetailDialog.tsx`**:
- Aggiungere prop opzionale `showFavoriteToggle?: boolean` (default `true` per il PT, `false` per admin).
- Bottone in alto a destra: ⭐ "Aggiungi ai preferiti" / "Rimuovi dai preferiti" (toggle).
- Stato pulled-in da `useFavoriteIds()`, action via `useToggleFavorite()`.
- Toast di conferma ("Aggiunto ai tuoi esercizi" / "Rimosso dai preferiti").

**`src/pages/pt/PTExercisesArchivePage.tsx`**:
- Aggiungere icona ⭐ piena/vuota in tabella per riga (colonna "Preferito"): cliccabile inline (toggle senza aprire il dialog).
- Indicatore visivo immediato: riga con bordo lime se preferito.

---

### Parte 4 — Tab "Esercizi" in `/pt/workouts`: solo preferiti

**`src/pages/pt/PTWorkoutsPage.tsx`** (riga 140-162):
- Sostituire `useQuery({ queryKey: ['pt-exercises'] ... })` con `useFavoriteExercises()`.
- Rimuovere il toggle "Tutti / Mio / Pubblici" (`exerciseVisibility`) — non serve più, sono tutti preferiti.
- Header del tab: "Esercizi (X)" dove X = numero preferiti.
- Sotto-testo: "I tuoi esercizi preferiti, pronti da usare nelle schede."
- Pulsante in alto a destra: link **"Sfoglia Archivio →"** che porta a `/pt/exercises`.
- Per ogni riga: bottone "Rimuovi dai preferiti" (icona ⭐ piena, click = rimuove).
- **Nessun bottone "Crea esercizio" nel tab** — la creazione è solo admin (rimuoviamo `CreateExerciseDialog` da questa tab; il file resta per eventuali admin futuri).
- Rimuovere `deleteExerciseMutation` dal tab (azione admin-only).

**Empty state** (zero preferiti):
```
┌────────────────────────────────────────────┐
│           ⭐                                │
│   Nessun esercizio preferito                │
│                                             │
│   Vai nell'Archivio Esercizi e aggiungi    │
│   i tuoi preferiti per usarli nelle schede │
│                                             │
│       [ Vai all'Archivio ]                  │
└────────────────────────────────────────────┘
```

---

### Parte 5 — Builder scheda: solo preferiti

**`src/components/pt/TemplateExerciseBuilder.tsx`** (riga 122-135):
- Modificare query `exercises-library` → carica solo gli esercizi preferiti del PT:
  ```ts
  const { data: favIds = new Set() } = useFavoriteIds();
  const { data: exercises = [] } = useQuery({
    queryKey: ['template-exercises-library', user?.id],
    queryFn: async () => {
      const ids = Array.from(favIds);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('exercises').select('*')
        .in('id', ids)
        .order('name');
      if (error) throw error;
      return data as Exercise[];
    },
    enabled: !!user?.id && favIds.size > 0,
  });
  ```
- Nel popover "Aggiungi esercizio" (Command palette):
  - Se `exercises.length === 0` → empty state con CTA: *"Non hai ancora esercizi preferiti. Vai nell'Archivio per aggiungerne."* + link `/pt/exercises`.
  - Altrimenti lista filtrabile come oggi.

---

### Parte 6 — Aggiornamenti collaterali

**`src/components/pt/CreateExerciseDialog.tsx`**: questo dialog era usato dal PT per creare esercizi privati. Lo manteniamo nel codice ma:
- Rimuoviamo ogni punto d'ingresso dal PT (rimosso da `PTWorkoutsPage` tab Esercizi).
- Resta disponibile in `AdminExercisesPage` (già lo è).

**`src/pages/admin/AdminExercisesPage.tsx`** — quando un admin elimina un esercizio:
- Già coperto: `ON DELETE CASCADE` su `pt_favorite_exercises.exercise_id` rimuove automaticamente dai preferiti.
- Aggiungere check pre-delete: se l'esercizio è usato in `template_exercises` o `workout_exercises`, mostrare warning prima di eliminare ("Questo esercizio è usato in N schede e M workout. Eliminandolo verrà rimosso ovunque.").

---

### Parte 7 — File modificati / creati

| File | Tipo | Modifica |
|---|---|---|
| Nuova migration | **nuovo** | Tabella `pt_favorite_exercises` + RLS + indici + data migration auto-favorite |
| `src/hooks/usePTFavoriteExercises.tsx` | **nuovo** | Hook condiviso (read favIds, list, toggle) |
| `src/components/exercises/ExerciseDetailDialog.tsx` | edit | Aggiunge bottone toggle preferito |
| `src/pages/pt/PTExercisesArchivePage.tsx` | edit | Colonna ⭐ inline + integrazione toggle |
| `src/pages/pt/PTWorkoutsPage.tsx` | edit | Tab Esercizi → solo preferiti, empty state, link archivio, rimozione CRUD |
| `src/components/pt/TemplateExerciseBuilder.tsx` | edit | Library del builder → solo preferiti, empty state nel popover |
| `src/pages/admin/AdminExercisesPage.tsx` | edit | Warning pre-delete con conteggio uso |

---

### Parte 8 — Validazioni / edge case

| Caso | Comportamento |
|---|---|
| PT senza preferiti | Tab "Esercizi" → empty state con CTA verso archivio. Builder popover → stesso empty state. |
| Admin elimina esercizio | CASCADE rimuove da tutti i preferiti. Warning preventivo se usato in schede. |
| PT clicca preferito già presente | Toggle off (rimuove). Idempotente. |
| Migrazione: PT con esercizi privati | Promossi nell'archivio + auto-aggiunti ai suoi preferiti → zero perdita. |
| Migrazione: esercizi già in schede esistenti | Auto-aggiunti ai preferiti del PT proprietario della scheda → schede continuano a funzionare. |
| Race condition toggle | Mutation react-query con optimistic update; rollback su errore. |

---

### Checklist test
1. Login PT → `/pt/workouts` tab Esercizi → vedo solo i miei preferiti (post-migration: ho già quelli che usavo).
2. Vado in `/pt/exercises` (Archivio) → vedo tutti gli 83 esercizi → clicco ⭐ su uno nuovo → toast "Aggiunto".
3. Torno a `/pt/workouts` → tab Esercizi → l'esercizio appena scelto è presente.
4. Apro una scheda → "Aggiungi esercizio" → popover mostra solo i preferiti.
5. Tolgo il preferito → sparisce sia dal tab che dal popover del builder; resta nelle schede già salvate (foreign key `template_exercises.exercise_id` resta valida).
6. PT senza preferiti (utente nuovo) → vedo empty state con CTA "Vai all'Archivio".
7. Admin elimina un esercizio usato → conferma con conteggio → CASCADE pulisce preferiti.
8. RLS test: PT prova a leggere preferiti di un altro PT → bloccato.

