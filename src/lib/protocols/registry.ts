// =====================================================
// PROTOCOL REGISTRY
// Type-safe registry for workout protocols (blocks)
// Add a new protocol = add an entry here. No hardcoding in components.
// =====================================================

import type { LucideIcon } from 'lucide-react';
import { Layers, TrendingUp, ArrowUp, Timer, Infinity as InfinityIcon } from 'lucide-react';

export type ProtocolType = 'SET' | 'TOP_SET_BACKOFF' | 'RAMPING' | 'EMOM' | 'AMRAP';

export type EmomMode = 'single' | 'alternating' | 'ladder';

export type ProtocolParams = {
  sets?: number | null;
  reps?: number | null;
  rest_seconds?: number | null;
  weight?: number | null;
  duration_seconds?: number | null;
  rounds?: number | null;
  interval_seconds?: number | null;
  top_set?: { reps?: number; rpe?: number } | null;
  back_off?: { sets?: number; drop_pct?: number } | null;
  // Top Set + Back Off (schema piatto)
  top_sets?: number | null;
  top_reps?: number | null;
  top_rest?: number | null;
  backoff_enabled?: boolean | null;
  backoff_sets?: number | null;
  backoff_reps?: number | null;
  backoff_percentage?: number | null;
  // Ramping
  note?: string | null;
  // EMOM
  duration_minutes?: number | null;
  mode?: EmomMode | null;
  ladder?: string | null;
};

export type ParamFieldType = 'number' | 'text' | 'select';

export type ParamField = {
  key: string; // dot-path inside params, es. "sets" or "top_set.reps"
  label: string;
  type: ParamFieldType;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  options?: { value: string; label: string }[]; // per type: 'select'
  showWhen?: (params: ProtocolParams) => boolean; // visibilità condizionale
};

export type ProtocolSection = {
  coachSets: string[];
  athleteDoes: string[];
  systemTracks: string[];
  example: string[];
};

export type ProtocolDefinition = {
  type: ProtocolType;
  label: string; // PT-facing technical label
  athleteLabel: string; // soft label shown to atleta
  icon: LucideIcon;
  description: string; // for ⓘ popover (descrizione base, breve)
  defaultParams: ProtocolParams;
  paramFields: ParamField[];
  executionMode: 'standard' | 'rounds' | 'amrap'; // hint for atleta UI
  sections?: ProtocolSection; // dettaglio esteso per tab Protocolli
};

export const PROTOCOL_REGISTRY: Record<ProtocolType, ProtocolDefinition> = {
  SET: {
    type: 'SET',
    label: 'Set standard',
    athleteLabel: 'Serie e ripetizioni',
    icon: Layers,
    description:
      'Esercizio singolo con serie e ripetizioni (o secondi) fisse. Ogni serie ha il proprio tempo di recupero.',
    defaultParams: { sets: 3, reps: 10, duration_seconds: null, rest_seconds: 60, weight: null },
    paramFields: [
      { key: 'sets', label: 'Serie', type: 'number', min: 1, placeholder: '3' },
      { key: 'reps', label: 'Ripetizioni', type: 'number', min: 1, placeholder: '10', hint: 'Lascia vuoto se usi il tempo' },
      { key: 'duration_seconds', label: 'Tempo (s)', type: 'number', min: 1, step: 5, placeholder: '30', hint: 'Lascia vuoto se usi le reps' },
      { key: 'weight', label: 'Carico (kg)', type: 'number', min: 0, step: 0.5, placeholder: '—', hint: 'Opzionale' },
      { key: 'rest_seconds', label: 'Recupero (s)', type: 'number', min: 0, step: 15, placeholder: '60' },
    ],
    executionMode: 'standard',
    sections: {
      coachSets: [
        'Esercizio',
        'Numero di serie',
        'Ripetizioni o secondi di tenuta',
        'Carico (kg) se applicabile',
        'Tempo di recupero tra le serie',
        'Note libere',
      ],
      athleteDoes: [
        'Inserisce il dato tracciato (kg / reps / secondi)',
        'Avvia il timer del recupero al termine di ogni serie',
        'Prosegue fino al completamento delle serie previste',
      ],
      systemTracks: [
        'Carico, reps e recupero per ogni serie',
        'Storico delle progressioni nel tempo',
      ],
      example: [
        'Panca piana',
        '4 serie',
        '10 ripetizioni',
        '60 kg',
        '90 secondi recupero',
      ],
    },
  },
  TOP_SET_BACKOFF: {
    type: 'TOP_SET_BACKOFF',
    label: 'Top Set + Back Off',
    athleteLabel: 'Serie principale + scarico',
    icon: TrendingUp,
    description:
      'Serie principale ad alta intensità seguita da serie di scarico a carico ridotto per completare il lavoro.',
    defaultParams: {
      top_sets: 1,
      top_reps: 5,
      top_rest: 120,
      backoff_enabled: true,
      backoff_sets: 3,
      backoff_reps: 8,
      backoff_percentage: 20,
    },
    paramFields: [
      { key: 'top_sets', label: 'Serie Top Set', type: 'number', min: 1, placeholder: '1' },
      { key: 'top_reps', label: 'Reps Top Set', type: 'number', min: 1, placeholder: '5' },
      { key: 'top_rest', label: 'Recupero (s)', type: 'number', min: 0, step: 15, placeholder: '120' },
      { key: 'backoff_sets', label: 'Serie Back Off', type: 'number', min: 1, placeholder: '3' },
      { key: 'backoff_reps', label: 'Reps Back Off', type: 'number', min: 1, placeholder: '8' },
      { key: 'backoff_percentage', label: '% riduzione carico', type: 'number', min: 1, max: 90, placeholder: '20' },
    ],
    executionMode: 'standard',
    sections: {
      coachSets: [
        'Esercizio',
        'Numero serie Top Set',
        'Ripetizioni Top Set',
        'Carico (kg)',
        'Tempo di recupero',
        'Attivazione Back Off (Sì / No)',
        'Se Sì: serie, reps, % riduzione carico',
        'Note libere (opzionali)',
      ],
      athleteDoes: [
        'Inserisce kg / reps / secondi',
        'Conferma il dato',
        'Avvia il timer del recupero',
        'Completa le serie Top Set previste',
        'Esegue il Back Off con carico ridotto',
      ],
      systemTracks: [
        'Carico massimo del Top Set',
        'Dati di esecuzione (reps, kg, recupero)',
        'Progressione nel tempo',
      ],
      example: [
        'Squat',
        'Top Set: 1 × 5 @ 100 kg',
        'Back Off: 3 × 8 @ 80 kg (-20%)',
      ],
    },
  },
  RAMPING: {
    type: 'RAMPING',
    label: 'Ramping',
    athleteLabel: 'Carico progressivo',
    icon: ArrowUp,
    description:
      'Trova il peso più alto con cui riesci ad eseguire le ripetizioni indicate. Ad ogni serie aumenta il carico mantenendo le stesse ripetizioni.',
    defaultParams: { reps: 5, rest_seconds: 120, note: '' },
    paramFields: [
      { key: 'reps', label: 'Ripetizioni per serie', type: 'number', min: 1, placeholder: '5' },
      { key: 'rest_seconds', label: 'Recupero (s)', type: 'number', min: 0, step: 15, placeholder: '120' },
      { key: 'note', label: 'Note (opzionali)', type: 'text', placeholder: 'Es. parti da 40 kg, sali di 5 kg', hint: 'Indicazioni libere per l\'atleta' },
    ],
    executionMode: 'standard',
    sections: {
      coachSets: [
        'Esercizio',
        'Numero di ripetizioni per serie',
        'Tempo di recupero',
        'Note libere (es. "parti da 40 kg, sali di 5 kg, max 5 scalini")',
      ],
      athleteDoes: [
        'Inserisce il carico del set',
        'Tocca "RAMP" per aggiungere una nuova serie con carico maggiore',
        'Avvia il recupero e ripete',
        'Quando non riesce a completare tocca "KO" e termina il ramping',
      ],
      systemTracks: [
        'Ultimo set completato prima del KO',
        'Carico massimo raggiunto nella sessione',
        'Progressione del massimale nel tempo',
      ],
      example: [
        'Panca piana — 5 reps per serie',
        'Set 1: 5 × 40 kg',
        'Set 2: 5 × 45 kg',
        'Set 3: 5 × 50 kg',
        'Set 4: 5 × 55 kg → KO',
        'Record sessione = 55 kg',
      ],
    },
  },
  EMOM: {
    type: 'EMOM',
    label: 'EMOM',
    athleteLabel: 'Allenamento a tempo',
    icon: Timer,
    description:
      'Ogni minuto esegui il blocco di esercizi indicato. Il tempo che avanza nel minuto è il tuo recupero, prima che inizi il minuto successivo.',
    defaultParams: { duration_minutes: 10, reps: 10, mode: 'single', ladder: null },
    paramFields: [
      { key: 'duration_minutes', label: 'Durata (minuti)', type: 'number', min: 1, placeholder: '10' },
      { key: 'reps', label: 'Ripetizioni per minuto', type: 'number', min: 1, placeholder: '10' },
      {
        key: 'mode',
        label: 'Modalità',
        type: 'select',
        options: [
          { value: 'single', label: 'Singolo (stesso esercizio)' },
          { value: 'alternating', label: 'Alternato (blocchi alternati)' },
          { value: 'ladder', label: 'Ladder (variazione reps)' },
        ],
      },
      {
        key: 'ladder',
        label: 'Schema ladder',
        type: 'text',
        placeholder: 'Es. 5-7-9-11 oppure +1 rep per minuto',
        hint: 'Variazione reps per minuto',
        showWhen: (p) => p.mode === 'ladder',
      },
    ],
    executionMode: 'rounds',
    sections: {
      coachSets: [
        'Esercizio (o blocco di esercizi)',
        'Durata totale in minuti',
        'Ripetizioni per minuto',
        'Modalità: round singolo, blocchi alternati o ladder',
        'Schema ladder (opzionale, se modalità = ladder)',
      ],
      athleteDoes: [
        'Esegue le ripetizioni nel minuto corrente',
        'Usa il tempo restante del minuto per recuperare',
        'Passa automaticamente al minuto successivo allo scadere',
        'Continua fino al termine della durata totale',
      ],
      systemTracks: [
        'Numero di round completati',
        'Reps eseguite per round',
        'Durata totale della sessione',
      ],
      example: [
        'EMOM 10 minuti',
        '10 squat ogni minuto',
        '→ 10 round totali',
      ],
    },
  },
  AMRAP: {
    type: 'AMRAP',
    label: 'AMRAP (As Many Rounds As Possible)',
    athleteLabel: 'Più giri possibili',
    icon: InfinityIcon,
    description:
      'AMRAP: completa più giri/ripetizioni possibili nel tempo a disposizione. Lavoro continuo, intensità auto-regolata. Ottimo per metcon e capacità di lavoro.',
    defaultParams: { duration_seconds: 600 },
    paramFields: [
      { key: 'duration_seconds', label: 'Durata totale (s)', type: 'number', min: 30, step: 30, placeholder: '600' },
    ],
    executionMode: 'amrap',
  },
};

export const PROTOCOL_LIST: ProtocolDefinition[] = Object.values(PROTOCOL_REGISTRY);

export function getProtocolDef(type: ProtocolType): ProtocolDefinition {
  return PROTOCOL_REGISTRY[type] ?? PROTOCOL_REGISTRY.SET;
}

// helpers per leggere/scrivere chiavi annidate (es. "top_set.reps")
export function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

export function setNested<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const keys = path.split('.');
  const next = { ...(obj || {}) } as any;
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cursor[k] = { ...(cursor[k] || {}) };
    cursor = cursor[k];
  }
  cursor[keys[keys.length - 1]] = value;
  return next as T;
}

// Restituisce i defaultParams per un dato protocollo (clonati)
export function getDefaultParamsForProtocol(type: ProtocolType): ProtocolParams {
  const def = getProtocolDef(type);
  return JSON.parse(JSON.stringify(def.defaultParams || {}));
}

// Riassunto compatto del protocollo a livello esercizio (per builder PT e atleta)
export function describeExerciseProtocol(
  type: ProtocolType,
  params: ProtocolParams | null | undefined,
  setsCount?: number | null,
): string {
  const p = params || {};
  switch (type) {
    case 'SET':
      if (setsCount && setsCount > 0) return `${setsCount} set`;
      if (p.sets && p.reps) return `${p.sets} × ${p.reps}`;
      return 'Set';
    case 'TOP_SET_BACKOFF': {
      const boSets = p.backoff_sets ?? p.back_off?.sets ?? 3;
      const enabled = p.backoff_enabled !== false;
      return enabled ? `Top set + ${boSets} back off` : 'Top set';
    }
    case 'RAMPING':
      if (p.reps) return `Ramping × ${p.reps} reps`;
      return 'Ramping';
    case 'EMOM':
      if (p.duration_minutes && p.reps) return `EMOM ${p.duration_minutes}'×${p.reps} reps`;
      if (p.duration_minutes) return `EMOM ${p.duration_minutes}'`;
      if (p.rounds && p.interval_seconds) return `EMOM ${p.rounds}×${p.interval_seconds}s`;
      return 'EMOM';
    case 'AMRAP':
      if (p.duration_seconds) {
        const m = Math.floor(p.duration_seconds / 60);
        const s = p.duration_seconds % 60;
        return `AMRAP ${m}:${s.toString().padStart(2, '0')}`;
      }
      return 'AMRAP';
  }
}

// Soft summary mostrato all'atleta (non espone il "tipo tecnico")
export function describeBlockForAthlete(type: ProtocolType, params: ProtocolParams | null | undefined): string {
  const p = params || {};
  switch (type) {
    case 'SET':
      if (p.sets && p.reps) return `${p.sets} serie × ${p.reps} ripetizioni`;
      return 'Serie e ripetizioni';
    case 'TOP_SET_BACKOFF': {
      const boSets = p.backoff_sets ?? p.back_off?.sets ?? 3;
      const enabled = p.backoff_enabled !== false;
      return enabled ? `Serie principale + ${boSets} serie di scarico` : 'Serie principale';
    }
    case 'RAMPING':
      if (p.reps) return `Carico progressivo × ${p.reps} ripetizioni`;
      return 'Carico progressivo';
    case 'EMOM':
      if (p.duration_minutes && p.reps)
        return `${p.duration_minutes} minuti, ${p.reps} ripetizioni al minuto`;
      if (p.duration_minutes) return `${p.duration_minutes} minuti a tempo`;
      if (p.rounds && p.interval_seconds)
        return `${p.rounds} round, ogni ${p.interval_seconds}s`;
      return 'Round a tempo';
    case 'AMRAP':
      if (p.duration_seconds) {
        const m = Math.floor(p.duration_seconds / 60);
        const s = p.duration_seconds % 60;
        return `Più giri possibili in ${m}:${s.toString().padStart(2, '0')}`;
      }
      return 'Più giri possibili';
    default:
      return '';
  }
}
