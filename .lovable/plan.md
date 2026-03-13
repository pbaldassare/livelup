

# Piano: Collegare "Appuntamenti" al Calendario

## Analisi

- **KPICard "Appuntamenti"** esiste in `PTDashboard.tsx` (riga 171) ma **non ha `onClick`**
- **Sezione "Prossimi appuntamenti"** (riga 279) ha già un link a `/pt/calendar` ✅
- **Route calendario**: `/pt/calendar` → `PTCalendarPage.tsx` ✅
- **Sidebar**: la voce "Calendario" (`/pt/calendar`) esiste già in `PTDashboardLayout.tsx` ✅
- Il componente `KPICard` supporta già la prop `onClick`

## Unica modifica necessaria

**File:** `src/pages/pt/PTDashboard.tsx`

Aggiungere `onClick={() => navigate('/pt/calendar')}` alla KPICard "Appuntamenti" (riga 171-177), usando `useNavigate` da react-router-dom (probabilmente già importato).

Questo è tutto. La sidebar e la sezione "Prossimi appuntamenti" funzionano già correttamente.

