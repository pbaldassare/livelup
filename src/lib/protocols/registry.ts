// =====================================================
// PROTOCOL REGISTRY
// Type-safe registry for workout protocols (blocks)
// Add a new protocol = add an entry here. No hardcoding in components.
// =====================================================

import type { LucideIcon } from 'lucide-react';
import { Layers, TrendingUp, ArrowUp, Timer, Infinity as InfinityIcon } from 'lucide-react';

export type ProtocolType = 'SET' | 'TOP_SET_BACKOFF' | 'RAMPING' | 'EMOM' | 'AMRAP';

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
};

export type ParamFieldType = 'number' | 'text';

export type ParamField = {
  key: string; // dot-path inside params, es. "sets" or "top_set.reps"
  label: string;
  type: ParamFieldType;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
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
    athleteLabel: 'Serie principale + supporto',
    icon: TrendingUp,
    description:
      'Top Set + Back Off: una serie pesante "Top Set" alla massima intensità prevista, seguita da serie più leggere "Back Off" (con riduzione % del carico) per accumulare volume di qualità.',
    defaultParams: {
      rest_seconds: 120,
      top_set: { reps: 3, rpe: 9 },
      back_off: { sets: 3, drop_pct: 10 },
    },
    paramFields: [
      { key: 'top_set.reps', label: 'Reps Top Set', type: 'number', min: 1, placeholder: '3' },
      { key: 'top_set.rpe', label: 'RPE Top Set', type: 'number', min: 1, max: 10, placeholder: '9' },
      { key: 'back_off.sets', label: 'Serie Back Off', type: 'number', min: 1, placeholder: '3' },
      { key: 'back_off.drop_pct', label: 'Calo % Back Off', type: 'number', min: 1, max: 90, placeholder: '10' },
      { key: 'rest_seconds', label: 'Recupero (s)', type: 'number', min: 0, step: 15, placeholder: '120' },
    ],
    executionMode: 'standard',
  },
  RAMPING: {
    type: 'RAMPING',
    label: 'Ramping',
    athleteLabel: 'Salita progressiva',
    icon: ArrowUp,
    description:
      'Ramping: serie a salire, aumentando il carico (o l\'intensità) di serie in serie fino a raggiungere la serie più impegnativa pianificata. Ottimo per attivare e arrivare pronti al carico target.',
    defaultParams: { sets: 5, reps: 3, rest_seconds: 90 },
    paramFields: [
      { key: 'sets', label: 'Serie totali', type: 'number', min: 2, placeholder: '5' },
      { key: 'reps', label: 'Ripetizioni per serie', type: 'number', min: 1, placeholder: '3' },
      { key: 'rest_seconds', label: 'Recupero (s)', type: 'number', min: 0, step: 15, placeholder: '90' },
    ],
    executionMode: 'standard',
  },
  EMOM: {
    type: 'EMOM',
    label: 'EMOM (Every Minute On the Minute)',
    athleteLabel: 'Ogni minuto al minuto',
    icon: Timer,
    description:
      'EMOM: a ogni minuto esegui il numero di ripetizioni previste; il tempo che avanza è il tuo recupero. Si ripete per N round totali. Ottimo per condizionamento e densità di lavoro.',
    defaultParams: { rounds: 10, interval_seconds: 60, reps: 5 },
    paramFields: [
      { key: 'rounds', label: 'Round totali', type: 'number', min: 1, placeholder: '10' },
      { key: 'interval_seconds', label: 'Durata intervallo (s)', type: 'number', min: 10, step: 5, placeholder: '60' },
      { key: 'reps', label: 'Reps per round', type: 'number', min: 1, placeholder: '5' },
    ],
    executionMode: 'rounds',
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
    case 'TOP_SET_BACKOFF':
      return `Top set + ${p.back_off?.sets ?? 3} back off`;
    case 'RAMPING':
      if (p.sets && p.reps) return `${p.sets} a salire × ${p.reps}`;
      return 'Salita progressiva';
    case 'EMOM':
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
    case 'TOP_SET_BACKOFF':
      return `Serie principale + ${p.back_off?.sets ?? 3} serie di supporto`;
    case 'RAMPING':
      if (p.sets && p.reps) return `${p.sets} serie a salire × ${p.reps}`;
      return 'Serie a salire';
    case 'EMOM':
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
