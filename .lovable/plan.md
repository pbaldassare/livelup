
# Piano: Sistema Abbonamenti - Funzionalita Complete

## Panoramica

Implementazione di tre funzionalita chiave per completare il sistema abbonamenti PT-Atleta:

1. **Decremento automatico sessioni**: Quando un atleta completa un workout, le sessioni rimanenti nel suo abbonamento PT vengono decrementate
2. **Gestione abbonamenti lato PT**: Dashboard per visualizzare chi ha acquistato pacchetti, sessioni rimanenti e scadenze
3. **Visualizzazione pacchetti lato atleta**: Nella pagina del PT connesso, mostrare i pacchetti disponibili con CTA per richiedere l'acquisto

---

## Parte 1: Decremento Automatico Sessioni

### 1.1 Logica di Business

Quando un atleta completa un workout:
- Verificare se ha un abbonamento attivo con il PT che ha creato il workout
- Se l'abbonamento e a sessioni (`package_type = 'sessioni'`), incrementare `sessions_used`
- Se `sessions_used >= sessions_total`, aggiornare lo status a `completato`

### 1.2 Implementazione Database - Trigger

Creare un trigger PostgreSQL che si attiva quando un workout viene completato:

```sql
CREATE OR REPLACE FUNCTION public.decrement_subscription_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  -- Solo se il workout e stato completato (status cambia a 'completato')
  IF NEW.status = 'completato' AND (OLD.status IS NULL OR OLD.status != 'completato') THEN
    -- Trova abbonamento attivo a sessioni per questa coppia atleta-PT
    SELECT * INTO subscription_record
    FROM public.atleta_pt_subscriptions
    WHERE atleta_user_id = NEW.atleta_user_id
      AND pt_user_id = NEW.pt_user_id
      AND status = 'attivo'
      AND sessions_total IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- Incrementa sessioni usate
      UPDATE public.atleta_pt_subscriptions
      SET 
        sessions_used = COALESCE(sessions_used, 0) + 1,
        status = CASE 
          WHEN COALESCE(sessions_used, 0) + 1 >= sessions_total THEN 'completato'::pt_subscription_status
          ELSE status
        END,
        updated_at = now()
      WHERE id = subscription_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workout_completed
  AFTER UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_subscription_session();
```

### 1.3 File da Modificare
- `supabase/migrations/xxx_workout_session_decrement.sql` (nuovo)

---

## Parte 2: Gestione Abbonamenti Lato PT

### 2.1 Nuovo Tab in PTAthletesPage

Aggiungere un nuovo tab "Abbonamenti" nella pagina atleti del PT che mostra:
- Lista atleti con abbonamenti attivi
- Nome pacchetto acquistato
- Tipo (sessioni/temporale)
- Sessioni rimanenti (per pacchetti a sessioni)
- Data scadenza (per abbonamenti temporali)
- Stato abbonamento
- Azioni: estendi, aggiungi sessioni bonus

### 2.2 Query Abbonamenti

```typescript
const { data: subscriptions } = useQuery({
  queryKey: ['pt-athlete-subscriptions', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('atleta_pt_subscriptions')
      .select(`
        *,
        pt_packages (name, package_type, sessions_count, duration_days),
        profiles:atleta_user_id (first_name, last_name, avatar_url, email)
      `)
      .eq('pt_user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
});
```

### 2.3 UI Components

**Tabella Abbonamenti:**
| Atleta | Pacchetto | Tipo | Sessioni | Scadenza | Stato | Azioni |
|--------|-----------|------|----------|----------|-------|--------|
| Avatar + Nome | Nome pkg | Badge | 5/10 | 15/02/2026 | Attivo | Estendi |

**Azioni disponibili:**
- "Aggiungi sessioni" (solo per pacchetti a sessioni)
- "Estendi scadenza" (solo per abbonamenti temporali)
- "Segna come completato"
- "Annulla abbonamento"

### 2.4 File da Modificare
- `src/pages/pt/PTAthletesPage.tsx` - Aggiungere tab Abbonamenti
- `src/components/pt/AthleteSubscriptionsTab.tsx` (nuovo) - Componente tab

---

## Parte 3: Visualizzazione Pacchetti Lato Atleta

### 3.1 Sezione Pacchetti in AtletaPTProfilePage

Aggiungere una nuova Card dopo le recensioni che mostra:
- Lista pacchetti attivi offerti dal PT
- Per ogni pacchetto: nome, descrizione, prezzo, features
- Badge "In evidenza" per pacchetti consigliati
- Pulsante "Richiedi Acquisto"

### 3.2 Query Pacchetti PT

```typescript
const { data: packages } = useQuery({
  queryKey: ['pt-packages-public', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('pt_packages')
      .select('*')
      .eq('pt_user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  enabled: !!userId && isConnectedToThisPT, // Solo se connesso
});
```

### 3.3 Componente PackageCard

```text
+----------------------------------+
| [In Evidenza]                    |
| Percorso Trasformazione      EUR |
| 10 sessioni                  150 |
|----------------------------------|
| Include chat, video call         |
| Max 3 workout/settimana          |
|----------------------------------|
| [Richiedi Acquisto]              |
+----------------------------------+
```

### 3.4 Richiesta Acquisto

Per ora, il pulsante "Richiedi Acquisto":
1. Crea una notifica al PT
2. Mostra toast di conferma all'atleta
3. (Futuro: integrazione Stripe)

```typescript
const requestPurchaseMutation = useMutation({
  mutationFn: async (packageId: string) => {
    await supabase.from('notifications').insert({
      user_id: ptUserId,
      type: 'package_purchase_request',
      title: 'Richiesta acquisto pacchetto',
      body: `Un atleta vuole acquistare un pacchetto`,
      data: { package_id: packageId, atleta_user_id: user?.id },
      action_url: '/pt/athletes?tab=subscriptions'
    });
  },
  onSuccess: () => {
    toast.success('Richiesta inviata al tuo PT!');
  }
});
```

### 3.5 Visualizzazione Abbonamento Attivo

Se l'atleta ha gia un abbonamento attivo con questo PT, mostrare:
- Banner con dettagli abbonamento corrente
- Sessioni rimanenti o data scadenza
- Progress bar per sessioni

### 3.6 File da Modificare
- `src/pages/atleta/AtletaPTProfilePage.tsx` - Aggiungere sezione pacchetti
- `src/components/atleta/PTPackagesSection.tsx` (nuovo) - Componente sezione pacchetti

---

## File da Creare/Modificare

### Database (Migration)
1. `supabase/migrations/xxx_workout_session_trigger.sql` - Trigger decremento sessioni

### Frontend
1. `src/pages/pt/PTAthletesPage.tsx` - Aggiungere tab Abbonamenti
2. `src/components/pt/AthleteSubscriptionsTab.tsx` (nuovo) - Tab gestione abbonamenti
3. `src/pages/atleta/AtletaPTProfilePage.tsx` - Aggiungere sezione pacchetti
4. `src/components/atleta/PTPackagesSection.tsx` (nuovo) - Sezione pacchetti

---

## Dettaglio Tecnico

### Struttura AthleteSubscriptionsTab

```typescript
interface AthleteSubscription {
  id: string;
  atleta_user_id: string;
  status: 'attivo' | 'completato' | 'scaduto' | 'cancellato';
  sessions_total: number | null;
  sessions_used: number | null;
  expires_at: string | null;
  started_at: string;
  pt_packages: {
    name: string;
    package_type: string;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  } | null;
}
```

### Struttura PTPackagesSection

```typescript
interface PTPackageProps {
  ptUserId: string;
  isConnected: boolean;
}

// Mostra solo se connesso, altrimenti CTA per connettersi prima
```

---

## Flusso Utente Completo

```text
1. PT crea pacchetti (PTSettingsPage -> PTPackagesManager)
                    |
                    v
2. Atleta si connette e vede pacchetti (AtletaPTProfilePage -> PTPackagesSection)
                    |
                    v
3. Atleta richiede acquisto -> Notifica al PT
                    |
                    v
4. PT conferma e crea abbonamento (PTAthletesPage -> AthleteSubscriptionsTab)
                    |
                    v
5. Atleta completa workout -> Trigger decrementa sessioni
                    |
                    v
6. PT monitora progressi (PTAthletesPage -> AthleteSubscriptionsTab)
```

---

## Criteri di Accettazione

1. Quando un atleta completa un workout, le sessioni del suo abbonamento vengono decrementate automaticamente
2. Il PT puo vedere tutti gli abbonamenti dei propri atleti con sessioni rimanenti e scadenze
3. Il PT puo aggiungere sessioni bonus o estendere scadenze
4. L'atleta connesso vede i pacchetti del proprio PT
5. L'atleta puo richiedere l'acquisto di un pacchetto (notifica al PT)
6. L'atleta vede il proprio abbonamento attivo con sessioni rimanenti
7. RLS protegge i dati: PT vede solo i propri abbonamenti, atleta vede solo i propri

