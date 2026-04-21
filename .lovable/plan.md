

## Piano: nuova sezione "Archivio Esercizi" (Admin CRUD + PT read-only)

### Obiettivo
Introdurre una sezione globale **Archivio Esercizi** accessibile sia ad Admin (full CRUD) che a PT (sola lettura/consultazione). L'archivio è il catalogo unico ufficiale, separato logicamente dal builder schede: il PT può consultarlo per ispirazione, ma per costruire schede continua a usare la libreria esistente nel builder (regola: l'archivio NON è un picker per le schede).

---

### Stato attuale (riuso)
- ✅ Tabella `exercises` (DB) con tutti i campi necessari: `name`, `description`, `instructions`, `video_url`, `image_url`, `difficulty_level`, `is_public`, `created_by`.
- ✅ RLS già corrette: PT può SELECT su esercizi pubblici, solo admin può INSERT/UPDATE/DELETE quelli globali.
- ✅ `AdminExercisesPage` esiste già con CRUD completo → la rinominiamo "Archivio Esercizi" e la rendiamo sorgente unica anche per il PT.
- ❌ Manca: voce sidebar PT, route `/pt/exercises`, pagina PT read-only, componente di dettaglio esercizio condiviso.

---

### Modifiche

**1. Nuovo file `src/pages/pt/PTExercisesArchivePage.tsx`** (read-only per PT)
- Stesso layout della pagina admin ma senza CTA "Aggiungi" / azioni "Modifica" / "Elimina".
- Header: titolo "Archivio Esercizi", sottotitolo "Catalogo ufficiale della piattaforma — consultazione".
- Filtri: ricerca testo, filtro **Difficoltà** (Principiante/Intermedio/Avanzato/tutte), filtro **Categoria**, filtro **Gruppo muscolare**.
- Lista a card/tabella: nome, badge difficoltà colorato, badge categoria, preview muscoli, icona 🎬 se ha video, click → apre dettaglio.
- Banner informativo in cima (sfumatura tenue): "L'archivio è solo consultazione. Per costruire schede usa il builder Allenamenti."
- Query: legge da `exercises` con `is_public=true OR created_by IS NULL` (libreria globale ufficiale).

**2. Nuovo componente `src/components/exercises/ExerciseDetailDialog.tsx`** (riuso Admin + PT)
- Dialog read-only che mostra: nome grande, badge difficoltà + categoria, gruppi muscolari, **descrizione esecuzione** (campo `instructions` — obbligatorio), **descrizione/consigli aggiuntivi** (campo `description` — opzionale), player video (se `video_url` presente, riusa `ExerciseVideoPlayer` con thumbnail YouTube + iframe), eventuale immagine.
- Usato sia dalla pagina admin (link "Anteprima" accanto a "Modifica") sia dalla pagina PT (click su riga).

**3. `src/pages/admin/AdminExercisesPage.tsx`** (refactor leggero)
- Rinominare titolo: "Libreria Esercizi" → **"Archivio Esercizi"**.
- Rendere campo **Istruzioni** obbligatorio nel form (validazione client + label con `*`).
- Aggiungere validazione zod-like inline: nome (1–120 char), istruzioni (1–4000 char), `difficulty_level` ∈ `['principiante','intermedio','avanzato']`, `video_url` opzionale ma se presente deve iniziare per `http`.
- Aggiungere bottone "Anteprima" (icona `Eye`) sulla riga, apre `ExerciseDetailDialog`.
- Rimuovere `'agonista'` dalle opzioni difficoltà (non richiesto dalla nuova spec; lasciato in DB enum per retro-compat ma non selezionabile).
- Quando admin crea/aggiorna, forzare `is_public=true` e `created_by=null` (esercizio ufficiale di archivio).

**4. `src/components/layouts/PTDashboardLayout.tsx`** — sidebar PT
- Aggiungere nuova voce dopo "Allenamenti":
  ```ts
  { label: 'Archivio Esercizi', href: '/pt/exercises', icon: Library }
  ```
  (icona `Library` da `lucide-react`).

**5. `src/components/layouts/AdminLayout.tsx`** — sidebar Admin
- Rinominare voce esistente `'Esercizi'` → **`'Archivio Esercizi'`** (stessa route `/admin/exercises`, icona `Library`).

**6. `src/App.tsx`** — routing
- Aggiungere import `PTExercisesArchivePage` e route protetta:
  ```tsx
  <Route path="/pt/exercises" element={
    <PTDashboardRoute>
      <PTDashboardLayout>
        <PTExercisesArchivePage />
      </PTDashboardLayout>
    </PTDashboardRoute>
  } />
  ```

---

### Regole confermate (regola fondamentale)
- L'**archivio NON è un picker** per le schede. Nel builder schede (`TemplateExerciseBuilder`) resta il selettore esistente che pesca da `exercises` (globali + privati del PT). L'archivio è solo lettura/consultazione.
- Nessun concetto di "preferiti" introdotto in questo step (deferito): se il PT vuole "salvare" un esercizio dell'archivio, lo aggiunge dal builder come fa oggi. Il punto della separazione richiesta è chiarezza concettuale tra **catalogo ufficiale** (qui) e **uso operativo nel builder**.

---

### Validazioni form (Admin)
| Campo | Regola |
|---|---|
| `name` | obbligatorio, 1–120 char |
| `instructions` (descrizione esecuzione) | **obbligatorio**, 1–4000 char |
| `difficulty_level` | obbligatorio, uno di principiante/intermedio/avanzato |
| `description` (consigli) | opzionale, max 2000 char |
| `video_url` | opzionale, se presente deve iniziare per `http://` o `https://` |

Errori mostrati come `toast.error` con messaggio localizzato.

---

### File modificati / creati
| File | Tipo |
|---|---|
| `src/pages/pt/PTExercisesArchivePage.tsx` | **nuovo** — pagina read-only PT |
| `src/components/exercises/ExerciseDetailDialog.tsx` | **nuovo** — dialog dettaglio condiviso |
| `src/pages/admin/AdminExercisesPage.tsx` | refactor: titolo, validazioni, bottone Anteprima, `is_public=true` forzato |
| `src/components/layouts/PTDashboardLayout.tsx` | aggiunta voce sidebar |
| `src/components/layouts/AdminLayout.tsx` | rename voce sidebar |
| `src/App.tsx` | nuova route `/pt/exercises` |

---

### Checklist test
1. Login Admin → sidebar mostra "Archivio Esercizi" → apro pagina, vedo CRUD completo.
2. Creo esercizio senza istruzioni → toast errore "Le istruzioni sono obbligatorie".
3. Creo esercizio valido → appare in lista, `is_public=true`, `created_by=null` (verificato via DB).
4. Click "Anteprima" → si apre `ExerciseDetailDialog` con video YouTube embed funzionante.
5. Modifico esercizio → salvataggio ok, lista aggiornata.
6. Elimino esercizio → conferma + rimosso.
7. Login PT → sidebar mostra nuova voce "Archivio Esercizi" → apro `/pt/exercises`.
8. PT vede tutti gli 83 esercizi globali, NON vede bottoni Aggiungi/Modifica/Elimina.
9. PT filtra per difficoltà = Avanzato → lista filtrata correttamente.
10. PT cerca "panca" → match per nome.
11. PT clicca riga → si apre dettaglio con video, istruzioni, consigli.
12. PT va su `/pt/workouts` → builder schede continua a funzionare come prima (nessuna regressione).
13. Tentativo PT di chiamare direttamente API update su esercizio globale → bloccato da RLS (verificato).

