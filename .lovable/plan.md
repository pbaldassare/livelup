
# Piano: Pagina Preferenze Notifiche (Solo Permessi)

## Problema Identificato
La pagina `/app/notifications` attualmente mostra la lista delle notifiche, ma l'utente vuole che mostri solo le **impostazioni e permessi** per le notifiche. La lista notifiche rimarrà solo nel dropdown dell'header.

---

## Nuova Struttura Pagina

```text
+------------------------------------------+
| ← Notifiche                              |
+------------------------------------------+
| PUSH                                     |
+------------------------------------------+
| [🔔] Notifiche Push           [switch]  |
|     Ricevi notifiche anche ad app chiusa |
+------------------------------------------+
| (Se denied)                              |
| ⚠️ Permesso negato. Modifica le          |
|    impostazioni del browser.             |
+------------------------------------------+

| CATEGORIE                                |
+------------------------------------------+
| [💬] Messaggi                  [switch]  |
|     Nuovi messaggi dal tuo PT            |
+------------------------------------------+
| [🏋️] Workout                   [switch]  |
|     Nuovi allenamenti assegnati          |
+------------------------------------------+
| [🤝] Connessioni               [switch]  |
|     Richieste e aggiornamenti            |
+------------------------------------------+
| [💳] Abbonamenti               [switch]  |
|     Rinnovi e nuovi piani                |
+------------------------------------------+
| [⭐] Recensioni                [switch]  |
|     Risposte alle tue recensioni         |
+------------------------------------------+
| [🏆] Badge                     [switch]  |
|     Traguardi e obiettivi                |
+------------------------------------------+
| [📅] Promemoria                [switch]  |
|     Eventi e reminder                    |
+------------------------------------------+
```

---

## Categorie Notifiche

| Categoria | Tipi inclusi | Icona | Colore |
|-----------|--------------|-------|--------|
| Messaggi | `message` | MessageSquare | Blu |
| Workout | `workout`, `workout_assigned`, `workout_completed` | Dumbbell | Lime |
| Connessioni | `connection`, `connection_*` | UserPlus | Verde |
| Abbonamenti | `subscription_*`, `renewal_*` | CreditCard | Viola |
| Acquisti | `package_purchase_*`, `payment` | ShoppingBag | Arancione |
| Recensioni | `review`, `review_response` | Star | Rosa |
| Badge | `badge`, `achievement` | Award | Giallo |
| Calendario | `event`, `reminder` | Calendar | Ciano |

---

## Implementazione Preferenze

Le preferenze verranno salvate nella tabella `profiles` in un nuovo campo JSON `notification_preferences`:

```json
{
  "messages": true,
  "workouts": true,
  "connections": true,
  "subscriptions": true,
  "purchases": true,
  "reviews": true,
  "badges": true,
  "calendar": true
}
```

---

## Migrazione Database

Aggiungere colonna `notification_preferences` alla tabella profiles:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences jsonb 
DEFAULT '{"messages":true,"workouts":true,"connections":true,"subscriptions":true,"purchases":true,"reviews":true,"badges":true,"calendar":true}'::jsonb;
```

---

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/pages/atleta/AtletaNotificationsPage.tsx` | Riscrivere completamente: rimuovere lista notifiche, aggiungere toggle permessi per push e categorie |
| Migrazione DB | Aggiungere campo `notification_preferences` |

---

## Dettaglio UI

### Sezione Push
- Toggle principale per push notifications (usa `PushNotificationToggle` esistente ma integrato nel layout card)
- Stato permesso browser visibile
- Messaggio di errore se denied

### Sezione Categorie
- Card con lista di toggle
- Ogni toggle ha:
  - Icona colorata (coerente con colori notifica)
  - Nome categoria
  - Descrizione breve
  - Switch on/off
- Modifiche salvate automaticamente con debounce

### Stile
- Tema scuro coerente (`bg-app-background`, `bg-app-card`, etc.)
- Icone con colori distintivi per categoria
- Switch con accent lime quando attivo

---

## Codice Componente

```typescript
// Categorie definite
const NOTIFICATION_CATEGORIES = [
  {
    key: 'messages',
    label: 'Messaggi',
    description: 'Nuovi messaggi dal tuo PT',
    icon: MessageSquare,
    colorClass: 'text-blue-400 bg-blue-400/10'
  },
  {
    key: 'workouts',
    label: 'Workout',
    description: 'Nuovi allenamenti assegnati',
    icon: Dumbbell,
    colorClass: 'text-app-accent bg-app-accent/10'
  },
  // ... altre categorie
];

// Stato preferenze
const [preferences, setPreferences] = useState({
  messages: true,
  workouts: true,
  connections: true,
  subscriptions: true,
  purchases: true,
  reviews: true,
  badges: true,
  calendar: true
});

// Toggle singola categoria
const handleToggle = (key: string) => {
  const updated = { ...preferences, [key]: !preferences[key] };
  setPreferences(updated);
  savePreferences(updated);
};
```

---

## Flusso Salvataggio

1. Utente toggle una categoria
2. Stato locale aggiornato immediatamente
3. Debounce 500ms per evitare salvataggi multipli
4. Update su `profiles.notification_preferences`
5. Toast success se salvato

---

## Risultato Atteso

- La pagina `/app/notifications` mostra SOLO le impostazioni permessi
- Toggle master per push notifications con stato browser
- Toggle per ogni categoria di notifica
- Preferenze salvate nel profilo
- La lista notifiche rimane nel dropdown header
- UI coerente con tema scuro lime

---

## Note Tecniche

- Le preferenze potrebbero essere usate lato edge function per filtrare quali notifiche push inviare
- Per ora salviamo le preferenze come riferimento futuro
- Il toggle push principale usa il hook `usePushNotifications` esistente
