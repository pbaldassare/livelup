

# Piano: Collegare "Atleti" nella dashboard a `/pt/athletes`

## Analisi

- **Sidebar**: voce "Atleti" → `/pt/athletes` ✅ già presente
- **Dashboard**: ci sono 4 elementi "Atleti":
  1. **KPICard "I Miei Atleti"** (riga 158) — **nessun `onClick`** ❌
  2. **KPICard "Messaggi"** (riga 180) — non pertinente
  3. **KPICardColored "Crescita Atleti"** (riga 213) — **nessun `onClick`** ❌
  4. **KPICardColored "Atleti"** (riga 220) — **nessun `onClick`** ❌
  5. **Button "Gestisci Atleti"** (riga 336) — già collegato con `Link to="/pt/athletes"` ✅

## Modifiche necessarie

### 1. `src/pages/pt/PTDashboard.tsx`
- Aggiungere `onClick={() => navigate('/pt/athletes')}` alla KPICard "I Miei Atleti" (riga 158)

### 2. `src/components/dashboard/KPICard.tsx`
- Aggiungere prop `onClick` a `KPICardColoredProps` e gestirla nel componente (renderlo cliccabile con cursor-pointer)

### 3. `src/pages/pt/PTDashboard.tsx`
- Aggiungere `onClick={() => navigate('/pt/athletes')}` alle due KPICardColored "Crescita Atleti" e "Atleti"

La sidebar evidenzierà automaticamente la voce corretta grazie alla logica `isActiveRoute` già presente.

