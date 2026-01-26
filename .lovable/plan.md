
# Piano: Espansione Tipi di Notifiche

## Problema Identificato
Dalla screenshot e dall'analisi del codice, emergono due problemi:

1. **Mapping incompleto**: La pagina notifiche gestisce solo 4 tipi (`message`, `workout`, `badge`, `connection`) ma nel sistema esistono molti più tipi
2. **Tutte le notifiche mostrano lo stesso titolo** ("Nuovo messaggio") perché non sono mappati correttamente i tipi esistenti

## Tipi di Notifiche Esistenti nel Sistema

Analizzando il codice, questi sono i tipi creati:

| Tipo | Creato da | Descrizione |
|------|-----------|-------------|
| `message` | Trigger DB | Nuovo messaggio chat |
| `connection` | Trigger DB | Cambio stato connessione |
| `connection_request` | AtletaPTProfilePage | Richiesta connessione inviata |
| `connection_accepted` | usePTConnectionRequests | Richiesta accettata |
| `workout` | (generico) | Allenamenti |
| `workout_assigned` | AssignWorkoutDialog | Nuovo allenamento assegnato |
| `subscription_created` | CreateSubscriptionDialog | Abbonamento attivato |
| `renewal_approved` | AthleteSubscriptionsTab | Rinnovo approvato |
| `package_purchase_request` | PTPackagesSection | Richiesta acquisto pacchetto |
| `review` | PTReviewForm | Nuova recensione ricevuta |
| `review_response` | PTReviewsManager | Risposta a recensione |
| `badge` | (generico) | Badge guadagnato |
| `achievement` | (generico) | Traguardo raggiunto |

---

## Soluzione

### Espansione Mapping Icone

Aggiungere tutti i tipi mancanti:

```typescript
const getNotificationIcon = (type: string) => {
  switch (type) {
    // Messaggi
    case 'message':
      return MessageSquare;
    
    // Workout
    case 'workout':
    case 'workout_assigned':
    case 'workout_completed':
      return Dumbbell;
    
    // Connessioni
    case 'connection':
    case 'connection_request':
    case 'connection_accepted':
    case 'connection_rejected':
      return UserPlus;
    
    // Abbonamenti
    case 'subscription_created':
    case 'renewal_approved':
    case 'renewal_requested':
    case 'subscription_expiring':
      return CreditCard;
    
    // Acquisti
    case 'package_purchase_request':
    case 'payment':
      return ShoppingBag;
    
    // Recensioni
    case 'review':
    case 'review_response':
      return Star;
    
    // Badge/Achievement
    case 'badge':
    case 'achievement':
      return Award;
    
    // Calendario
    case 'event':
    case 'reminder':
      return Calendar;
    
    default:
      return Bell;
  }
};
```

### Espansione Mapping Colori

Definire colori distintivi per ogni categoria:

```typescript
const getNotificationColor = (type: string) => {
  switch (type) {
    // Messaggi - Blu
    case 'message':
      return 'text-blue-400 bg-blue-400/10';
    
    // Workout - Lime (accent)
    case 'workout':
    case 'workout_assigned':
    case 'workout_completed':
      return 'text-app-accent bg-app-accent/10';
    
    // Connessioni - Verde
    case 'connection':
    case 'connection_request':
    case 'connection_accepted':
      return 'text-green-400 bg-green-400/10';
    
    // Connessione rifiutata - Rosso
    case 'connection_rejected':
      return 'text-red-400 bg-red-400/10';
    
    // Abbonamenti - Viola
    case 'subscription_created':
    case 'renewal_approved':
    case 'renewal_requested':
    case 'subscription_expiring':
      return 'text-purple-400 bg-purple-400/10';
    
    // Pagamenti/Acquisti - Arancione
    case 'package_purchase_request':
    case 'payment':
      return 'text-orange-400 bg-orange-400/10';
    
    // Recensioni - Rosa
    case 'review':
    case 'review_response':
      return 'text-pink-400 bg-pink-400/10';
    
    // Badge - Giallo/Oro
    case 'badge':
    case 'achievement':
      return 'text-yellow-400 bg-yellow-400/10';
    
    // Calendario - Ciano
    case 'event':
    case 'reminder':
      return 'text-cyan-400 bg-cyan-400/10';
    
    default:
      return 'text-app-muted-foreground bg-app-muted';
  }
};
```

---

## Visualizzazione Finale

```text
+------------------------------------------+
|  ← Notifiche                   Segna tutte|
|    7 non lette                            |
+------------------------------------------+
| [💬] Nuovo messaggio              •  🗑️  |  <- Blu
|     Ti aspetto domani alle 10             |
|     circa 4 ore fa                        |
+------------------------------------------+
| [🏋️] Nuovo allenamento!           •  🗑️  |  <- Lime
|     Il tuo PT ti ha assegnato...          |
|     circa 4 ore fa                        |
+------------------------------------------+
| [🤝] Richiesta accettata! 🎉     •  🗑️  |  <- Verde
|     Marco ha accettato la richiesta       |
|     circa 5 ore fa                        |
+------------------------------------------+
| [💳] Nuovo abbonamento attivato! •  🗑️  |  <- Viola
|     Il tuo PT ha attivato...              |
|     ieri                                  |
+------------------------------------------+
| [⭐] Nuova recensione ricevuta!   •  🗑️  |  <- Rosa
|     Hai ricevuto una recensione 5 stelle  |
|     2 giorni fa                           |
+------------------------------------------+
| [🏆] Badge guadagnato!            •  🗑️  |  <- Giallo
|     Hai completato 10 workout             |
|     3 giorni fa                           |
+------------------------------------------+
```

---

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/pages/atleta/AtletaNotificationsPage.tsx` | Espandere `getNotificationIcon` e `getNotificationColor` con tutti i tipi, aggiungere nuove icone (CreditCard, Star, Calendar, ShoppingBag) |

---

## Import Aggiuntivi

```typescript
import { 
  ArrowLeft,
  Bell,
  MessageSquare,
  Dumbbell,
  Award,
  UserPlus,
  CheckCheck,
  Trash2,
  // Nuovi import
  CreditCard,
  Star,
  Calendar,
  ShoppingBag,
  UserX  // per connection_rejected
} from 'lucide-react';
```

---

## Risultato Atteso

- Ogni tipo di notifica avrà un'icona distintiva
- Colori differenziati per categoria (messaggi blu, workout lime, connessioni verde, abbonamenti viola, etc.)
- Migliore identificabilità visiva dei diversi tipi di notifica
- Sistema pronto per futuri tipi di notifica

