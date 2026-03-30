

## Piano: Gestione Libreria Esercizi lato Admin

### Situazione attuale
La tabella `exercises` esiste già con campi: name, description, video_url, image_url, category, muscle_groups, difficulty_level, instructions, is_public, created_by. Gli esercizi con `is_public = true` o `created_by = null` sono visibili a tutti i PT nel TemplateExerciseBuilder. Attualmente solo i PT possono creare esercizi (privati). Manca una pagina admin per gestire la libreria globale.

### Cosa fare

**1. Nuova pagina `src/pages/admin/AdminExercisesPage.tsx`**
- Tabella con tutti gli esercizi della piattaforma (filtrabili per categoria)
- Per ogni esercizio: nome, categoria, gruppi muscolari, video (link YouTube), stato attivo
- Azioni: Aggiungi, Modifica, Elimina
- Dialog per creare/modificare con campi: nome, descrizione, categoria, gruppi muscolari, livello difficoltà, video URL, immagine URL, istruzioni
- Gli esercizi creati dall'admin avranno `is_public = true` e `created_by = null`

**2. Aggiungere RLS policy per admin su `exercises`**
- Migration: aggiungere policy "Admins can manage all exercises" (ALL) per admin
- Attualmente manca — l'admin non può fare CRUD sulla tabella exercises

**3. Sidebar + Routing**
- Aggiungere voce "Esercizi" con icona `Dumbbell` nella sidebar admin (`AdminLayout.tsx`)
- Aggiungere rotta `/admin/exercises` in `App.tsx`

**4. Seed esercizi esistenti**
- Gli esercizi sono già stati seedati dalla edge function `seed-platform-data`. Non serve nuovo seed.

### File coinvolti
- **Migration SQL** — RLS policy admin su `exercises`
- **`src/pages/admin/AdminExercisesPage.tsx`** — nuova pagina CRUD
- **`src/components/layouts/AdminLayout.tsx`** — voce sidebar
- **`src/App.tsx`** — rotta

