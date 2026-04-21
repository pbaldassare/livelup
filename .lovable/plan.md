

## Diagnosi: gli esercizi sono nel DB ma il tab "Esercizi" mostra 0

### Cosa ho verificato
1. **Database**: ci sono **83 esercizi pubblici** (`is_public=true`, `created_by=NULL`) → i dati esistono ✅
2. **RLS policy SELECT**: `is_public = true OR created_by IS NULL` → consente la lettura ✅
3. **Query in `PTWorkoutsPage.tsx`** (riga 145-149): legge correttamente con `or('is_public.eq.true,created_by.eq.${user.id}')` → restituisce tutti gli 83 esercizi ✅
4. **Bug nella UI** (riga 156 e 714):
   ```ts
   const myExercises = exercises.filter(e => e.created_by === user?.id);
   ```
   Il tab "Esercizi" e la lista mostrata sotto usano `myExercises`, che filtra **solo gli esercizi creati dal PT loggato**. Siccome i 83 esercizi seedati hanno `created_by = NULL` (libreria globale), vengono **esclusi** → il PT vede `Esercizi (0)`.

### Causa
Il tab è stato pensato per mostrare **solo la libreria privata del PT**, mentre l'utente si aspetta di vedere anche tutta la libreria globale (gli esercizi seedati dall'admin/sistema, che sono pubblici).

---

## Soluzione

Allineare il tab "Esercizi" alla stessa fonte usata dal builder scheda (libreria unificata), come da memoria `exercise-management-architecture` (PT vede globali pubblici + propri privati).

### Modifiche

**File: `src/pages/pt/PTWorkoutsPage.tsx`**

1. Rimuovere il filtro restrittivo `myExercises`. Mostrare tutti gli `exercises` (pubblici + propri).
2. Aggiungere un **toggle/filtro** in cima alla lista del tab Esercizi:
   - "Tutti" (default) → mostra pubblici + privati
   - "Solo i miei" → mostra solo `created_by === user.id`
   - "Pubblici" → mostra solo `is_public === true`
3. Aggiornare il counter del tab: `Esercizi ({exercises.length})` invece di `myExercises.length`.
4. Per ogni esercizio mostrare un piccolo badge "Globale" (se `created_by === null`) o "Mio" (se `created_by === user.id`), così il PT capisce la provenienza.
5. Per gli esercizi **globali** disabilitare i pulsanti "Modifica" / "Elimina" (il PT non può toccarli — solo l'admin può); restano abilitati solo per quelli "Mio".

### Risultato atteso
- Il tab "Esercizi" mostra subito tutti gli 83 esercizi seedati + eventuali esercizi propri.
- Stessa lista visibile nel builder "Crea Scheda" (coerenza già garantita lato query).
- Il PT può comunque distinguere e filtrare i suoi.

### File modificato
- `src/pages/pt/PTWorkoutsPage.tsx` (rimozione filtro, aggiunta toggle, badge provenienza, gating azioni edit/delete sui globali)

