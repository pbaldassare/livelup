

## Piano: Aggiungere protocollo HIIT e fix visibilità

### Obiettivo
Aggiungere il protocollo **HIIT** (intervalli flessibili, distinto da Tabata) e correggere il testo obsoleto nella tab Protocolli che ancora dice che solo SET è disponibile.

---

### File da modificare

#### 1. `src/lib/protocols/registry.ts`

**Aggiungere a `ProtocolType`** (riga 10):
```typescript
export type ProtocolType = 'SET' | 'TOP_SET_BACKOFF' | 'RAMPING' | 'EMOM' | 'AMRAP' | 'SUPERSET' | 'LADDER' | 'DEAD_LADDER' | 'TABATA' | 'HIIT';
```

**Aggiungere import** (riga 8):
```typescript
import { Layers, TrendingUp, ArrowUp, Timer, Infinity as InfinityIcon, Repeat2, BarChart3, Skull, Zap, Flame } from 'lucide-react';
```

**Aggiungere definizione HIIT a `PROTOCOL_REGISTRY`** (dopo TABATA, prima della chiusura `};`):
```typescript
HIIT: {
  type: 'HIIT',
  label: 'HIIT',
  athleteLabel: 'Intervalli flessibili',
  icon: Flame,
  description:
    'Circuito a tempo con numero preciso di intervalli totali e tempi lavoro/pausa configurabili. Gli esercizi vengono eseguiti a rotazione per il numero totale di intervalli indicato. A differenza della Tabata canonica (20"/20" × 8 round), HIIT offre intervalli liberi e durata personalizzabile.',
  defaultParams: {
    work_seconds: 40,
    rest_seconds: 20,
    intervals_total: 12,
    note: '',
  },
  paramFields: [
    { key: 'work_seconds', label: 'Lavoro (s)', type: 'number', min: 1, step: 5, placeholder: '40' },
    { key: 'rest_seconds', label: 'Riposo (s)', type: 'number', min: 0, step: 5, placeholder: '20' },
    { key: 'intervals_total', label: 'Intervalli totali', type: 'number', min: 1, placeholder: '12' },
    { key: 'note', label: 'Note (opzionali)', type: 'text', placeholder: 'Es. focus tecnica o rotazione esercizi', hint: 'Indicazioni libere per l\'atleta' },
  ],
  executionMode: 'rounds',
  sections: {
    coachSets: [
      'Lista esercizi in rotazione',
      'Secondi di lavoro',
      'Secondi di pausa',
      'Numero totale intervalli',
      'Note libere (opzionali)',
    ],
    athleteDoes: [
      'Esegue l\'esercizio corrente durante la fase di lavoro',
      'Recupera durante la fase di riposo',
      'Segue la rotazione automatica degli esercizi',
      'Completa tutti gli intervalli previsti',
    ],
    systemTracks: [
      'Intervalli completati',
      'Intervalli totali eseguiti',
      'Eventuali note finali',
    ],
    example: [
      'HIIT 12 intervalli',
      '40" lavoro / 20" pausa',
      'Rotazione: Sit-up → Push-up → Squat',
    ],
  },
},
```

**Aggiungere case HIIT in `describeExerciseProtocol`** (dopo TABATA, prima del default):
```typescript
case 'HIIT': {
  const intervals = p.intervals_total ?? 12;
  const work = p.work_seconds ?? 40;
  const rest = p.rest_seconds ?? 20;
  return `HIIT ${intervals}× (${work}"W/${rest}"R)`;
}
```

**Aggiungere case HIIT in `describeBlockForAthlete`** (dopo TABATA, prima del default):
```typescript
case 'HIIT': {
  const intervals = p.intervals_total ?? 12;
  const work = p.work_seconds ?? 40;
  const rest = p.rest_seconds ?? 20;
  return `${intervals} intervalli ${work}" lavoro / ${rest}" riposo`;
}
```

---

#### 2. `src/components/pt/ProtocolsTab.tsx`

**Aggiornare il testo del banner informativo** (righe 164-171):
```typescript
<p className="text-sm text-muted-foreground">
  SET resta il default, ma il Coach può selezionare protocolli avanzati come
  Top Set + Back Off, Ramping, EMOM, AMRAP, Superset, Ladder, Dead Ladder, Tabata e HIIT.
</p>
```

**Aggiungere HIIT a `VISIBLE_PROTOCOLS`** (riga 13):
```typescript
const VISIBLE_PROTOCOLS: ProtocolType[] = ['SET', 'TOP_SET_BACKOFF', 'RAMPING', 'EMOM', 'AMRAP', 'SUPERSET', 'LADDER', 'DEAD_LADDER', 'TABATA', 'HIIT'];
```

---

### Comportamento atteso

1. **Registry**: HIIT è definito con parametri `work_seconds`, `rest_seconds`, `intervals_total`, `note`
2. **ProtocolsTab**: HIIT visibile nella lista protocolli disponibili, banner informativo aggiornato
3. **TemplateExerciseBuilder**: HIIT automaticamente disponibile nel dropdown protocollo tramite `PROTOCOL_LIST`, parametri renderizzati dinamicamente, nessuna `SetsTable` (time-based), banner informativo mostrato

---

### Controlli

- HIIT visibile in `/pt/workouts` tab Protocolli
- HIIT selezionabile nel builder esercizi
- Parametri corretti: lavoro (s), riposo (s), intervalli totali
- Dati salvati correttamente in `protocol_type` e `protocol_params`
- Nessuna regressione su altri protocolli
- Distinzione chiara da Tabata (intervalli liberi vs round canonici)

