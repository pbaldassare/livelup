

## Analisi e Piano

### Problema 1: "3 PT scritti ma ne vedo solo 1"
Dalla dashboard: **Personal Trainers: 3** (totale) e **PT Attivi: 1** (approvati). Questo significa che 2 PT hanno uno stato diverso da "attivo" (es. `registrato` o `in_attesa_approvazione`). La pagina PT con filtro "Tutti" dovrebbe mostrarli tutti e 3. Possibili cause:
- **RLS**: le policy admin sembrano corrette (`is_admin` + `has_role` con SECURITY DEFINER). Potrebbe però esserci un conflitto tra la policy SELECT e la policy ALL che causa problemi. Soluzione: verificare e consolidare le policy.
- **Filtro URL**: se l'URL ha un parametro `?status=attivo`, mostra solo 1.

**Azione**: Aggiungere una migration che dropppa le policy SELECT duplicate su `pt_profiles` e `profiles` (la policy ALL le copre già), evitando conflitti. Inoltre nel codice assicurarsi che il filtro di default sia sempre "Tutti".

### Problema 2: "La gestione atleti non serve come admin"
Hai ragione: gli atleti sono gestiti dai rispettivi PT, non dall'admin. L'admin deve poter vedere una panoramica (numeri) ma non serve una pagina dedicata per CRUD atleti. La pagina `/admin/athletes` attuale con creazione/eliminazione atleti è ridondante.

**Azione**: Rimuovere la voce "Atleti" dalla sidebar admin e la rotta `/admin/athletes`. Mantenere i KPI atleti nella dashboard come numeri di overview.

### Riepilogo modifiche

1. **Migration SQL** — Rimuovere policy SELECT duplicate su `pt_profiles` e `profiles` per evitare conflitti RLS
2. **`AdminLayout.tsx`** — Rimuovere la voce "Atleti" dalla sidebar
3. **`App.tsx`** — Rimuovere la rotta `/admin/athletes` e relative importazioni
4. **`AdminDashboard.tsx`** — Mantenere i KPI atleti come overview (nessuna modifica)
5. Opzionalmente eliminare `AdminAthletesPage.tsx` e `AdminAthleteDetailPage.tsx`

### File coinvolti
- Migration SQL (fix RLS)
- `src/components/layouts/AdminLayout.tsx`
- `src/App.tsx`
- Eliminazione `src/pages/admin/AdminAthletesPage.tsx`
- Eliminazione `src/pages/admin/AdminAthleteDetailPage.tsx`

