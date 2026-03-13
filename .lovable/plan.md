

# Piano: Collegamento diretto al tab "Richieste" nella pagina Atleti

## Stato attuale

Tutto esiste già:
- **Sidebar**: voce "Atleti" → `/pt/athletes` → `PTAthletesPage.tsx`
- **PTAthletesPage**: ha già il tab "Richieste" con lista pendenti, accetta/rifiuta, notifiche, filtro per PT loggato
- **Tabella**: `pt_atleta_connections` con status `pending`/`active`/`rejected`/`terminated`
- **RLS**: corretto, filtra per `pt_user_id = auth.uid()`
- **Hook**: `usePTConnectionRequests` già funzionante
- **Componente**: `PTConnectionRequests` già completo con avatar, data, livello, obiettivi, accetta/rifiuta

Non serve creare nulla di nuovo. Serve solo permettere la navigazione diretta al tab "Richieste".

## Unica modifica necessaria

**File: `src/pages/pt/PTAthletesPage.tsx`**

Leggere un query parameter `?tab=pending` dall'URL e usarlo come valore iniziale del tab attivo. Così da qualsiasi punto dell'app si può navigare a `/pt/athletes?tab=pending` per aprire direttamente il tab Richieste.

```tsx
// Aggiungere useSearchParams
const [searchParams] = useSearchParams();
const initialTab = searchParams.get('tab') || 'active';
const [activeTab, setActiveTab] = useState(initialTab);
```

**File: `src/pages/pt/PTDashboard.tsx`**

Le KPICard "Richieste Pendenti" e la sezione richieste devono navigare a `/pt/athletes?tab=pending` invece di `/pt/athletes`.

Nessuna nuova pagina, nessuna nuova tabella, nessuna nuova logica.

