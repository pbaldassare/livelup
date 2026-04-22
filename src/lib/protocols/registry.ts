// =====================================================
// PROTOCOL REGISTRY
// Type-safe registry for workout protocols (blocks)
// Add a new protocol = add an entry here. No hardcoding in components.
// =====================================================

import type { LucideIcon } from 'lucide-react';
import { Layers, TrendingUp, ArrowUp, Timer, Infinity as InfinityIcon, Repeat2, BarChart3, Skull, Zap } from 'lucide-react';

export type ProtocolType = 'SET' | 'TOP_SET_BACKOFF' | 'RAMPING' | 'EMOM' | 'AMRAP' | 'SUPERSET' | 'LADDER' | 'DEAD_LADDER' | 'TABATA';

export type EmomMode = 'single' | 'alternating' | 'ladder';
export type TabataMode = 'single' | 'alternating';

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
  // SUPERSET
  paired_exercise_id?: string | null;
  internal_rest_seconds?: number | null;
  external_rest_seconds?: number | null;
  // LADDER
  ladder_steps?: number[] | null;
  step_rest_seconds?: number | null;
  set_rest_seconds?: number | null;
  // DEAD_LADDER
  start_reps?: number | null;
  // TABATA
  work_seconds?: number | null;
  // (rest_seconds, rounds, mode, note già presenti sopra — TABATA li riusa)
};

export type ParamFieldType = 'number' | 'text' | 'select' | 'exercise_select' | 'number_list';

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
    label: 'AMRAP',
    athleteLabel: 'Round a tempo',
    icon: InfinityIcon,
    description:
      'Completa il maggior numero di round possibile entro il tempo stabilito. Conta ogni round completato.',
    defaultParams: { duration_minutes: 10, reps: 10, note: '' },
    paramFields: [
      { key: 'duration_minutes', label: 'Durata (minuti)', type: 'number', min: 1, placeholder: '10' },
      { key: 'reps', label: 'Ripetizioni per esercizio', type: 'number', min: 1, placeholder: '10' },
      { key: 'note', label: 'Note (opzionali)', type: 'text', placeholder: 'Es. 10 squat + 10 push-up + 10 sit-up', hint: 'Indicazioni libere o lista esercizi del round' },
    ],
    executionMode: 'amrap',
    sections: {
      coachSets: [
        'Tempo totale (in minuti)',
        'Lista esercizi del round con relative ripetizioni',
        'Note libere (opzionali)',
      ],
      athleteDoes: [
        'Esegue il circuito di esercizi del round',
        'Ripete il ciclo continuamente',
        'Tocca "Round completato" al termine di ogni giro',
        'Si ferma quando il tempo finisce',
      ],
      systemTracks: [
        'Numero totale di round completati',
        'Reps totali eseguite',
        'Durata effettiva dell\'allenamento',
      ],
      example: [
        'AMRAP 10 minuti',
        '10 squat + 10 push-up + 10 sit-up',
        '→ obiettivo: completare più round possibile',
      ],
    },
  },
  SUPERSET: {
    type: 'SUPERSET',
    label: 'Superset',
    athleteLabel: 'Esercizi accoppiati',
    icon: Repeat2,
    description:
      'Accoppia due esercizi (idealmente antagonisti) per ottimizzare i tempi senza ridurre la performance. Alterna A e B con recupero breve interno e recupero completo tra i superset.',
    defaultParams: {
      paired_exercise_id: null,
      sets: 4,
      reps: 10,
      internal_rest_seconds: 30,
      external_rest_seconds: 90,
      note: '',
    },
    paramFields: [
      { key: 'paired_exercise_id', label: 'Esercizio B (accoppiato)', type: 'exercise_select', placeholder: 'Seleziona un esercizio…', hint: 'L\'esercizio corrente è A. Scegli B tra i tuoi esercizi.' },
      { key: 'sets', label: 'Serie (superset)', type: 'number', min: 1, placeholder: '4' },
      { key: 'reps', label: 'Ripetizioni per esercizio', type: 'number', min: 1, placeholder: '10' },
      { key: 'internal_rest_seconds', label: 'Recupero A → B (s)', type: 'number', min: 0, step: 5, placeholder: '30' },
      { key: 'external_rest_seconds', label: 'Recupero tra superset (s)', type: 'number', min: 0, step: 15, placeholder: '90' },
      { key: 'note', label: 'Note (opzionali)', type: 'text', placeholder: 'Es. tecnica, focus o tempo di esecuzione', hint: 'Indicazioni libere per l\'atleta' },
    ],
    executionMode: 'standard',
    sections: {
      coachSets: [
        'Esercizio A (corrente) e Esercizio B (antagonista)',
        'Numero di superset (serie)',
        'Ripetizioni per ciascun esercizio',
        'Recupero interno (tra A e B)',
        'Recupero esterno (tra i superset)',
        'Note libere',
      ],
      athleteDoes: [
        'Esegue l\'esercizio A',
        'Pausa breve (recupero interno)',
        'Esegue l\'esercizio B',
        'Recupero completo (recupero esterno)',
        'Ripete il ciclo per il numero di superset previsti',
      ],
      systemTracks: [
        'Reps e carico per l\'esercizio A',
        'Reps e carico per l\'esercizio B',
        'Numero di superset completati',
      ],
      example: [
        'Superset 4×',
        'A: Panca piana — 10 reps',
        'B: Rematore — 10 reps',
        '30s tra A e B • 90s tra i superset',
      ],
    },
  },
  LADDER: {
    type: 'LADDER',
    label: 'Ladder',
    athleteLabel: 'Scala progressiva',
    icon: BarChart3,
    description:
      'Esegui le ripetizioni seguendo la scala indicata (es. 1, 2, 3), riposando pochi secondi tra uno scalino e l\'altro. Una "serie" = completare l\'intera scala una volta.',
    defaultParams: {
      ladder_steps: [1, 2, 3],
      sets: 3,
      step_rest_seconds: 20,
      set_rest_seconds: 90,
      note: '',
    },
    paramFields: [
      { key: 'ladder_steps', label: 'Scala ripetizioni', type: 'number_list', placeholder: 'Es. 1,2,3 oppure 2,4,6,8', hint: 'Inserisci i valori separati da virgola. Ogni numero è uno scalino.' },
      { key: 'sets', label: 'Serie (scale complete)', type: 'number', min: 1, placeholder: '3' },
      { key: 'step_rest_seconds', label: 'Recupero tra scalini (s)', type: 'number', min: 0, step: 5, placeholder: '20' },
      { key: 'set_rest_seconds', label: 'Recupero tra serie (s)', type: 'number', min: 0, step: 15, placeholder: '90' },
      { key: 'note', label: 'Note (opzionali)', type: 'text', placeholder: 'Es. focus tecnica o variazione carico', hint: 'Indicazioni libere per l\'atleta' },
    ],
    executionMode: 'standard',
    sections: {
      coachSets: [
        'Esercizio',
        'Scala di ripetizioni (es. 1-2-3 oppure 2-4-6-8)',
        'Numero di serie (scale complete)',
        'Recupero tra scalini',
        'Recupero tra serie',
        'Note libere (opzionali)',
      ],
      athleteDoes: [
        'Esegue lo scalino corrente con le reps indicate',
        'Recupera brevemente (recupero tra scalini)',
        'Passa allo scalino successivo',
        'Completa tutta la scala = 1 serie',
        'Recupero completo tra le serie',
        'Ripete per il numero di serie previste',
      ],
      systemTracks: [
        'Scalini completati per serie',
        'Numero di serie completate',
        'Eventuale carico utilizzato',
      ],
      example: [
        'Ladder 3 serie',
        'Scala: 1-2-3 pull-up',
        '→ (1 + 2 + 3) reps = 1 serie',
        '→ ripetere 3 volte',
      ],
    },
  },
  DEAD_LADDER: {
    type: 'DEAD_LADDER',
    label: 'Dead Ladder',
    athleteLabel: 'Scala a cedimento',
    icon: Skull,
    description:
      'Come il Ladder ma senza scala predefinita: continua ad aumentare le ripetizioni finché non riesci a chiudere lo scalino. Il punto di cedimento rappresenta il risultato della serie.',
    defaultParams: {
      start_reps: 1,
      sets: 3,
      step_rest_seconds: 20,
      set_rest_seconds: 90,
      note: '',
    },
    paramFields: [
      { key: 'sets', label: 'Serie', type: 'number', min: 1, placeholder: '3' },
      { key: 'start_reps', label: 'Scalino iniziale (reps)', type: 'number', min: 1, placeholder: '1', hint: 'Numero di reps del primo scalino' },
      { key: 'step_rest_seconds', label: 'Recupero tra scalini (s)', type: 'number', min: 0, step: 5, placeholder: '20' },
      { key: 'set_rest_seconds', label: 'Recupero tra serie (s)', type: 'number', min: 0, step: 15, placeholder: '90' },
      { key: 'note', label: 'Note (opzionali)', type: 'text', placeholder: 'Es. focus tecnica o stop a un tetto', hint: 'Indicazioni libere per l\'atleta' },
    ],
    executionMode: 'standard',
    sections: {
      coachSets: [
        'Esercizio',
        'Numero di serie',
        'Scalino iniziale (default: 1 rep)',
        'Recupero tra scalini',
        'Recupero tra serie',
        'Note libere (opzionali)',
      ],
      athleteDoes: [
        'Esegue lo scalino corrente',
        'Aumenta le reps di +1 ad ogni step successivo',
        'Recupera brevemente tra gli scalini',
        'Continua finché riesce a completare lo scalino',
        'Quando non riesce tocca "KO" e termina la serie',
        'Recupero completo prima della serie successiva',
      ],
      systemTracks: [
        'Scalino massimo raggiunto per ogni serie',
        'Reps totali eseguite nella serie',
        'Progressione nel tempo (confronto sessioni)',
      ],
      example: [
        'Serie 1: 1 → 2 → 3 → 4 → KO a 5',
        '→ massimo raggiunto: 4 reps',
        'Serie 2: 1 → 2 → 3 → KO a 4',
        '→ massimo raggiunto: 3 reps',
      ],
    },
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
      if (p.duration_minutes) return `AMRAP ${p.duration_minutes}'`;
      if (p.duration_seconds) {
        const m = Math.floor(p.duration_seconds / 60);
        const s = p.duration_seconds % 60;
        return `AMRAP ${m}:${s.toString().padStart(2, '0')}`;
      }
      return 'AMRAP';
    case 'SUPERSET':
      if (p.sets && p.reps) return `Superset ${p.sets} × ${p.reps}`;
      return 'Superset';
    case 'LADDER': {
      const steps = Array.isArray(p.ladder_steps) ? p.ladder_steps : [];
      const stepsStr = steps.length ? steps.join('-') : '—';
      const sets = p.sets ?? 1;
      return `Ladder ${sets}× (${stepsStr})`;
    }
    case 'DEAD_LADDER': {
      const sets = p.sets ?? 1;
      const start = p.start_reps ?? 1;
      return `Dead Ladder ${sets}× (start ${start})`;
    }
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
      if (p.duration_minutes)
        return `Più round possibili in ${p.duration_minutes} minuti`;
      if (p.duration_seconds) {
        const m = Math.floor(p.duration_seconds / 60);
        const s = p.duration_seconds % 60;
        return `Più giri possibili in ${m}:${s.toString().padStart(2, '0')}`;
      }
      return 'Più giri possibili';
    case 'SUPERSET':
      if (p.sets && p.reps)
        return `${p.sets} superset × ${p.reps} ripetizioni`;
      return 'Esercizi accoppiati';
    case 'LADDER': {
      const steps = Array.isArray(p.ladder_steps) ? p.ladder_steps : [];
      const sets = p.sets ?? 1;
      if (steps.length) return `${sets} scale di ${steps.join('-')} ripetizioni`;
      return 'Scala progressiva';
    }
    case 'DEAD_LADDER': {
      const sets = p.sets ?? 1;
      return `${sets} scale a cedimento`;
    }
    default:
      return '';
  }
}
