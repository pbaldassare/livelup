
# Piano: Rinnovo Automatico Abbonamenti + Geolocalizzazione con Maps API

## Panoramica

Implementazione di due funzionalità:
1. **Sistema di rinnovo automatico abbonamenti** con conferma atleta e notifica al PT
2. **Integrazione geolocalizzazione con Google Maps API** per PT nelle impostazioni profilo

---

## Parte 1: Sistema Rinnovo Automatico Abbonamenti

### 1.1 Flusso di Rinnovo

```text
Abbonamento in scadenza
        |
        v
7 giorni prima --> Notifica automatica all'atleta
        |
        v
Atleta riceve banner "Rinnova abbonamento"
        |
        v
    [ Rinnova ] --> Crea richiesta di rinnovo
        |
        v
PT riceve notifica --> [ Conferma ] / [ Rifiuta ]
        |
        v
Se conferma: nuovo abbonamento creato + notifica atleta
```

### 1.2 Nuove Colonne Database

Aggiungere alla tabella `atleta_pt_subscriptions`:
- `renewal_requested_at`: timestamp della richiesta di rinnovo
- `renewal_status`: enum ('pending', 'approved', 'rejected', null)
- `auto_renew`: boolean per abilitare rinnovo automatico (default false)

```sql
ALTER TABLE public.atleta_pt_subscriptions
  ADD COLUMN renewal_requested_at TIMESTAMPTZ,
  ADD COLUMN renewal_status TEXT CHECK (renewal_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN auto_renew BOOLEAN DEFAULT false;
```

### 1.3 Componente Atleta: Banner Rinnovo

Aggiornare `AtletaSubscriptionHistory.tsx`:
- Mostrare banner quando abbonamento scade entro 7 giorni
- Mostrare avviso quando sessioni rimanenti sono <= 2
- Pulsante "Richiedi Rinnovo" che invia notifica al PT

```typescript
// Logica per mostrare il banner
const isExpiringSoon = sub.expires_at && 
  differenceInDays(new Date(sub.expires_at), new Date()) <= 7;
const isSessionsLow = sub.sessions_total && 
  (sub.sessions_total - (sub.sessions_used || 0)) <= 2;
```

### 1.4 Componente PT: Gestione Richieste Rinnovo

Aggiornare `AthleteSubscriptionsTab.tsx`:
- Mostrare badge "Richiesta rinnovo" sugli abbonamenti con richiesta pendente
- Pulsanti "Conferma" / "Rifiuta" per gestire la richiesta
- Conferma crea nuovo abbonamento automaticamente

### 1.5 Mutation Richiesta Rinnovo (Atleta)

```typescript
const requestRenewalMutation = useMutation({
  mutationFn: async (subscriptionId: string) => {
    // Aggiorna abbonamento con richiesta
    await supabase.from('atleta_pt_subscriptions')
      .update({ 
        renewal_requested_at: new Date().toISOString(),
        renewal_status: 'pending'
      })
      .eq('id', subscriptionId);
    
    // Invia notifica al PT
    await supabase.from('notifications').insert({
      user_id: subscription.pt_user_id,
      type: 'renewal_request',
      title: 'Richiesta rinnovo abbonamento',
      body: `Un atleta ha richiesto il rinnovo del pacchetto`,
      data: { subscription_id: subscriptionId },
      action_url: '/pt/app/athletes?tab=subscriptions'
    });
  }
});
```

### 1.6 Mutation Approvazione Rinnovo (PT)

```typescript
const approveRenewalMutation = useMutation({
  mutationFn: async ({ subscriptionId, originalSub }) => {
    // Marca vecchio abbonamento come completato
    await supabase.from('atleta_pt_subscriptions')
      .update({ 
        status: 'completato',
        renewal_status: 'approved'
      })
      .eq('id', subscriptionId);
    
    // Crea nuovo abbonamento identico
    const newExpiry = addDays(new Date(), originalSub.duration_days || 30);
    await supabase.from('atleta_pt_subscriptions').insert({
      atleta_user_id: originalSub.atleta_user_id,
      pt_user_id: originalSub.pt_user_id,
      package_id: originalSub.package_id,
      status: 'attivo',
      sessions_total: originalSub.sessions_total,
      sessions_used: 0,
      expires_at: newExpiry,
      started_at: new Date(),
      price_paid: originalSub.price_paid,
      currency: originalSub.currency,
    });
    
    // Notifica atleta
    await supabase.from('notifications').insert({
      user_id: originalSub.atleta_user_id,
      type: 'renewal_approved',
      title: 'Rinnovo approvato!',
      body: 'Il tuo abbonamento e stato rinnovato con successo',
      action_url: '/app/subscription'
    });
  }
});
```

---

## Parte 2: Geolocalizzazione con Google Maps API per PT

### 2.1 Dove Integrare

Nella pagina `PTSettingsPage.tsx`, sezione "Localita", aggiungere:
- Pulsante "Usa la mia posizione" con icona GPS
- Integrazione con `PlacesAutocomplete` gia esistente
- Salvataggio automatico di `location_lat` e `location_lng`

### 2.2 Modifica PTSettingsPage.tsx

Aggiungere nella sezione Localita:

```typescript
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';

// Stato per loading geolocation
const [isLocating, setIsLocating] = useState(false);

// Funzione per richiedere posizione GPS
const requestLocation = () => {
  if (!navigator.geolocation) {
    toast.error('Geolocalizzazione non supportata');
    return;
  }

  setIsLocating(true);
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding per ottenere citta
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        const city = data.results[0].address_components.find(
          c => c.types.includes('locality')
        )?.long_name;
        const country = data.results[0].address_components.find(
          c => c.types.includes('country')
        )?.long_name;
        
        setFormData({
          ...formData,
          location_city: city || '',
          location_country: country || '',
          location_lat: latitude,
          location_lng: longitude,
        });
      }
      
      setIsLocating(false);
      toast.success('Posizione aggiornata');
    },
    () => {
      setIsLocating(false);
      toast.error('Impossibile ottenere la posizione');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};
```

### 2.3 UI Sezione Localita Aggiornata

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MapPin className="h-5 w-5" />
      Localita
    </CardTitle>
    <CardDescription>
      Dove operi - gli atleti potranno trovarti piu facilmente
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Pulsante GPS */}
    <Button
      variant="outline"
      onClick={requestLocation}
      disabled={isLocating}
      className="w-full"
    >
      {isLocating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Navigation className="h-4 w-4 mr-2" />
      )}
      Usa la mia posizione
    </Button>
    
    <div className="text-center text-sm text-muted-foreground">oppure</div>
    
    {/* Autocomplete citta */}
    <div className="space-y-2">
      <Label>Cerca citta</Label>
      <PlacesAutocomplete
        value={formData.location_city || ''}
        onChange={(value) => setFormData({ ...formData, location_city: value })}
        onPlaceSelect={(place) => {
          setFormData({
            ...formData,
            location_city: place.name,
            location_lat: place.geometry.location.lat,
            location_lng: place.geometry.location.lng,
          });
        }}
        placeholder="Cerca la tua citta..."
      />
    </div>
    
    {/* Campi manuali (readonly se GPS usato) */}
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="city">Citta</Label>
        <Input
          id="city"
          value={formData.location_city || ''}
          onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Paese</Label>
        <Input
          id="country"
          value={formData.location_country || ''}
          onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
        />
      </div>
    </div>
    
    {/* Indicatore coordinate salvate */}
    {formData.location_lat && formData.location_lng && (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
        <MapPin className="h-4 w-4 text-green-500" />
        Coordinate GPS salvate
      </div>
    )}
  </CardContent>
</Card>
```

### 2.4 Aggiornare formData per includere lat/lng

```typescript
interface PTProfile {
  // ... existing fields
  location_lat: number | null;
  location_lng: number | null;
}
```

---

## File da Creare/Modificare

### Database (Migration)
1. `supabase/migrations/xxx_subscription_renewal.sql` - Nuove colonne per rinnovo

### Frontend
1. `src/components/atleta/AtletaSubscriptionHistory.tsx` - Banner rinnovo + richiesta
2. `src/components/pt/AthleteSubscriptionsTab.tsx` - Gestione richieste rinnovo
3. `src/pages/pt/PTSettingsPage.tsx` - Integrazione GPS + PlacesAutocomplete

---

## Dettaglio Tecnico

### Banner Rinnovo Atleta

```typescript
// Condizioni per mostrare il banner
const showRenewalBanner = (sub) => {
  if (sub.status !== 'attivo') return false;
  
  // Sessioni basse
  if (sub.sessions_total) {
    const remaining = sub.sessions_total - (sub.sessions_used || 0);
    if (remaining <= 2) return true;
  }
  
  // Scadenza vicina
  if (sub.expires_at) {
    const daysLeft = differenceInDays(new Date(sub.expires_at), new Date());
    if (daysLeft <= 7 && daysLeft >= 0) return true;
  }
  
  return false;
};
```

### Gestione Rinnovo PT

```typescript
// Badge per richieste pendenti
{sub.renewal_status === 'pending' && (
  <Badge className="bg-orange-500/20 text-orange-400">
    <Clock className="h-3 w-3 mr-1" />
    Richiesta rinnovo
  </Badge>
)}

// Azioni rinnovo
{sub.renewal_status === 'pending' && (
  <div className="flex gap-2">
    <Button size="sm" onClick={() => approveRenewal(sub)}>
      <Check className="h-4 w-4 mr-1" />
      Approva
    </Button>
    <Button size="sm" variant="outline" onClick={() => rejectRenewal(sub.id)}>
      <X className="h-4 w-4 mr-1" />
      Rifiuta
    </Button>
  </div>
)}
```

---

## Flusso Completo

```text
                    RINNOVO ABBONAMENTI
                    ===================

  [Atleta Dashboard]              [PT Dashboard]
        |                               |
        v                               |
  Vede banner                           |
  "2 sessioni rimaste"                  |
        |                               |
        v                               |
  Click "Rinnova"                       |
        |                               |
        +------- Notifica ------------>-+
                                        |
                                        v
                                  Vede richiesta
                                  con badge arancione
                                        |
                                        v
                                  Click "Approva"
                                        |
        +<------ Notifica -------------+
        |                               |
        v                               v
  Riceve conferma              Nuovo abbonamento creato
  "Rinnovo approvato!"         (stesso pacchetto, date nuove)


                    GEOLOCALIZZAZIONE PT
                    ====================

  [PT Settings]
        |
        v
  Click "Usa la mia posizione"
        |
        v
  Browser chiede permesso
        |
        v
  GPS acquisito
        |
        v
  Reverse geocoding Maps API
        |
        v
  Compila automaticamente:
  - location_city
  - location_country
  - location_lat
  - location_lng
        |
        v
  Click "Salva"
        |
        v
  PT ora visibile su mappa
  nella ricerca atleti
```

---

## Criteri di Accettazione

### Rinnovo Abbonamenti
1. L'atleta vede un banner quando le sessioni sono <= 2 o la scadenza e entro 7 giorni
2. L'atleta puo richiedere il rinnovo con un click
3. Il PT riceve una notifica per la richiesta
4. Il PT puo approvare o rifiutare la richiesta
5. L'approvazione crea automaticamente un nuovo abbonamento
6. L'atleta riceve notifica dell'esito

### Geolocalizzazione PT
1. Il PT puo usare "Usa la mia posizione" per rilevare GPS
2. Il sistema compila automaticamente citta e coordinate
3. Il PT puo anche cercare la citta con autocomplete
4. Le coordinate vengono salvate per la ricerca su mappa
5. L'atleta vede il PT sulla mappa nella pagina di scoperta
