// =====================================================
// PT ASSISTANT — stato form editabile + payload da form
// =====================================================

import {
  getDefaultParamsForProtocol,
  getProtocolDef,
  type ProtocolType,
} from '@/lib/protocols/registry';
import type {
  CreateIntent,
  CreatePayload,
  ExerciseCreatePayload,
  PreviewField,
  ProgramCreatePayload,
  ProtocolCreatePayload,
  TemplateCreatePayload,
} from '@/lib/ptAssistantCreateParse';
import type { PTCatalog } from '@/lib/api/ptCatalog';

export type ExerciseFormState = {
  name: string;
  category: string;
  muscleGroups: string[];
  difficultyLevel: string;
  description: string;
  instructions: string;
  videoUrl: string;
  equipment: string;
  isPublic: boolean;
};

export type TemplateFormState = {
  title: string;
  estimatedDuration: number;
  difficultyLevel: string;
  muscleGroups: string[];
  category: string;
  description: string;
  tags: string;
  exerciseIds: string[];
};

export type ProtocolFormState = {
  templateId: string;
  exerciseId: string;
  protocolType: ProtocolType;
  sets: number;
  repsMin: number;
  repsMax: number | null;
  restSeconds: number;
  weight: number | null;
  durationMinutes: number | null;
  notes: string;
  tempo: string;
};

export type ProgramFormState = {
  name: string;
  durationWeeks: number;
  activeDays: number[];
  mode: 'recurring' | 'day_by_day';
  templateIds: string[];
  description: string;
  notes: string;
};

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab', 7: 'Dom',
};

export const CATEGORIES = [
  'Forza', 'Cardio', 'Mobilità', 'Funzionale', 'Calisthenics',
  'Kettlebell', 'Stretching', 'Posturale', 'Pilates', 'Yoga', 'HIIT', 'Altro',
];

export const MUSCLE_GROUPS = [
  'Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti',
  'Quadricipiti', 'Femorali', 'Glutei', 'Polpacci', 'Addominali',
  'Core', 'Full Body', 'Avambracci', 'Trapezio',
];

export const INTENT_LABELS: Record<CreateIntent, string> = {
  exercise: 'Esercizio',
  template: 'Scheda',
  protocol: 'Protocollo',
  program: 'Programma',
};

export const NL_STARTERS: Record<CreateIntent, string> = {
  exercise: 'Crea esercizio ',
  template: 'Crea scheda ',
  protocol: 'Su scheda ',
  program: 'Crea programma ',
};

export function defaultExerciseForm(): ExerciseFormState {
  return {
    name: '', category: '', muscleGroups: [], difficultyLevel: 'nessuno',
    description: '', instructions: '', videoUrl: '', equipment: '', isPublic: false,
  };
}

export function defaultTemplateForm(): TemplateFormState {
  return {
    title: '', estimatedDuration: 60, difficultyLevel: 'nessuno', muscleGroups: [],
    category: '', description: '', tags: '', exerciseIds: [],
  };
}

export function defaultProtocolForm(): ProtocolFormState {
  return {
    templateId: '', exerciseId: '', protocolType: 'SET',
    sets: 3, repsMin: 10, repsMax: null, restSeconds: 60,
    weight: null, durationMinutes: null, notes: '', tempo: '',
  };
}

export function defaultProgramForm(): ProgramFormState {
  return {
    name: '', durationWeeks: 4, activeDays: [1, 3, 5], mode: 'recurring',
    templateIds: [], description: '', notes: '',
  };
}

function pf(key: string, label: string, value: unknown, required: boolean): PreviewField {
  const empty = value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0);
  return {
    key,
    label,
    displayValue: empty ? '—' : Array.isArray(value) ? value.join(', ') : String(value),
    source: 'default',
    required,
  };
}

export function previewFromExercise(f: ExerciseFormState): PreviewField[] {
  return [
    pf('name', 'Nome', f.name, true),
    pf('category', 'Categoria', f.category, true),
    pf('muscleGroups', 'Gruppi muscolari', f.muscleGroups, false),
    pf('difficultyLevel', 'Difficoltà', f.difficultyLevel === 'nessuno' ? 'Non specificato' : f.difficultyLevel, false),
    pf('description', 'Descrizione', f.description, false),
    pf('instructions', 'Istruzioni', f.instructions, false),
    pf('videoUrl', 'Video URL', f.videoUrl, false),
    pf('equipment', 'Attrezzatura', f.equipment, false),
    pf('isPublic', 'Pubblico', f.isPublic ? 'Sì' : 'No', false),
  ];
}

export function previewFromTemplate(f: TemplateFormState, catalog: PTCatalog): PreviewField[] {
  return [
    pf('title', 'Titolo', f.title, true),
    pf('estimatedDuration', 'Durata (min)', f.estimatedDuration, false),
    pf('difficultyLevel', 'Livello', f.difficultyLevel === 'nessuno' ? 'Non specificato' : f.difficultyLevel, false),
    pf('muscleGroups', 'Gruppi muscolari', f.muscleGroups, false),
    pf('category', 'Categoria', f.category, false),
    pf('description', 'Descrizione', f.description, false),
    pf('tags', 'Tag', f.tags, false),
    pf('exercises', 'Esercizi inclusi', f.exerciseIds.map((id) => catalog.exercises.find((e) => e.id === id)?.name ?? id), false),
  ];
}

export function previewFromProtocol(f: ProtocolFormState, catalog: PTCatalog): PreviewField[] {
  const tpl = catalog.templates.find((t) => t.id === f.templateId);
  const ex = catalog.exercises.find((e) => e.id === f.exerciseId);
  return [
    pf('template', 'Scheda', tpl?.title, true),
    pf('exercise', 'Esercizio', ex?.name, true),
    pf('protocolType', 'Protocollo', getProtocolDef(f.protocolType).label, true),
    pf('sets', 'Serie', f.sets, false),
    pf('reps', 'Ripetizioni', f.repsMax ? `${f.repsMin}–${f.repsMax}` : f.repsMin, false),
    pf('restSeconds', 'Recupero (s)', f.restSeconds, false),
    pf('weight', 'Carico (kg)', f.weight, false),
    pf('duration', 'Durata (min)', f.durationMinutes, false),
    pf('notes', 'Note', f.notes, false),
    pf('tempo', 'Tempo', f.tempo, false),
  ];
}

export function previewFromProgram(f: ProgramFormState, catalog: PTCatalog): PreviewField[] {
  return [
    pf('name', 'Nome', f.name, true),
    pf('durationWeeks', 'Durata (sett.)', f.durationWeeks, false),
    pf('activeDays', 'Giorni attivi', f.activeDays.map((d) => WEEKDAY_LABELS[d]).join(', '), true),
    pf('mode', 'Modalità', f.mode === 'day_by_day' ? 'Giorno per giorno' : 'Ricorrente', false),
    pf('templates', 'Sequenza schede', f.templateIds.map((id) => catalog.templates.find((t) => t.id === id)?.title ?? id).join(' → '), true),
    pf('description', 'Descrizione', f.description, false),
    pf('notes', 'Note', f.notes, false),
  ];
}

export function buildPayloadFromExercise(f: ExerciseFormState): ExerciseCreatePayload | null {
  if (!f.name.trim() || !f.category) return null;
  return {
    intent: 'exercise',
    name: f.name.trim(),
    category: f.category,
    muscleGroups: f.muscleGroups,
    difficultyLevel: f.difficultyLevel,
    description: f.description.trim() || null,
    instructions: f.instructions.trim() || null,
    videoUrl: f.videoUrl.trim() || null,
    equipment: f.equipment.trim() ? f.equipment.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : null,
    isPublic: f.isPublic,
  };
}

export function buildPayloadFromTemplate(f: TemplateFormState): TemplateCreatePayload | null {
  if (!f.title.trim()) return null;
  return {
    intent: 'template',
    title: f.title.trim(),
    description: f.description.trim() || null,
    difficultyLevel: f.difficultyLevel,
    estimatedDuration: f.estimatedDuration,
    muscleGroups: f.muscleGroups,
    category: f.category.trim() || null,
    tags: f.tags.trim() ? f.tags.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : null,
    exerciseIds: f.exerciseIds,
  };
}

export function buildPayloadFromProtocol(f: ProtocolFormState, catalog: PTCatalog): ProtocolCreatePayload | null {
  if (!f.templateId || !f.exerciseId) return null;
  const tpl = catalog.templates.find((t) => t.id === f.templateId);
  const ex = catalog.exercises.find((e) => e.id === f.exerciseId);
  const protocolParams: Record<string, unknown> = {
    ...getDefaultParamsForProtocol(f.protocolType),
    sets: f.sets,
    reps: f.repsMin,
    rest_seconds: f.restSeconds,
    ...(f.weight != null ? { weight: f.weight } : {}),
    ...(f.durationMinutes != null ? { duration_minutes: f.durationMinutes } : {}),
  };
  return {
    intent: 'protocol',
    templateId: f.templateId,
    templateTitle: tpl?.title ?? '',
    exerciseId: f.exerciseId,
    exerciseName: ex?.name ?? '',
    protocolType: f.protocolType,
    sets: f.sets,
    repsMin: f.repsMin,
    repsMax: f.repsMax,
    restSeconds: f.restSeconds,
    notes: f.notes.trim() || null,
    tempo: f.tempo.trim() || null,
    prescribedDurationSeconds: null,
    protocolParams,
  };
}

export function buildPayloadFromProgram(f: ProgramFormState, catalog: PTCatalog): ProgramCreatePayload | null {
  if (!f.name.trim() || f.templateIds.length === 0 || f.activeDays.length === 0) return null;
  return {
    intent: 'program',
    name: f.name.trim(),
    description: f.description.trim() || null,
    notes: f.notes.trim() || null,
    durationWeeks: f.durationWeeks,
    activeDays: f.activeDays,
    mode: f.mode,
    templateIds: f.templateIds,
    templateTitles: f.templateIds.map((id) => catalog.templates.find((t) => t.id === id)?.title ?? id),
  };
}

export function buildPayload(
  intent: CreateIntent,
  forms: {
    exercise: ExerciseFormState;
    template: TemplateFormState;
    protocol: ProtocolFormState;
    program: ProgramFormState;
  },
  catalog: PTCatalog,
): CreatePayload | null {
  switch (intent) {
    case 'exercise': return buildPayloadFromExercise(forms.exercise);
    case 'template': return buildPayloadFromTemplate(forms.template);
    case 'protocol': return buildPayloadFromProtocol(forms.protocol, catalog);
    case 'program': return buildPayloadFromProgram(forms.program, catalog);
  }
}

export function applyParsedPayload(
  intent: CreateIntent,
  forms: {
    exercise: ExerciseFormState;
    template: TemplateFormState;
    protocol: ProtocolFormState;
    program: ProgramFormState;
  },
  payload: CreatePayload | null,
  locked: Set<string>,
) {
  if (!payload || payload.intent !== intent) return forms;

  if (payload.intent === 'exercise') {
    const p = payload;
    return {
      ...forms,
      exercise: {
        name: locked.has('name') ? forms.exercise.name : p.name,
        category: locked.has('category') ? forms.exercise.category : p.category,
        muscleGroups: locked.has('muscleGroups') ? forms.exercise.muscleGroups : p.muscleGroups,
        difficultyLevel: locked.has('difficultyLevel') ? forms.exercise.difficultyLevel : p.difficultyLevel,
        description: locked.has('description') ? forms.exercise.description : (p.description ?? ''),
        instructions: locked.has('instructions') ? forms.exercise.instructions : (p.instructions ?? ''),
        videoUrl: locked.has('videoUrl') ? forms.exercise.videoUrl : (p.videoUrl ?? ''),
        equipment: locked.has('equipment') ? forms.exercise.equipment : (p.equipment?.join(', ') ?? ''),
        isPublic: locked.has('isPublic') ? forms.exercise.isPublic : p.isPublic,
      },
    };
  }

  if (payload.intent === 'template') {
    const p = payload;
    return {
      ...forms,
      template: {
        title: locked.has('title') ? forms.template.title : p.title,
        estimatedDuration: locked.has('estimatedDuration') ? forms.template.estimatedDuration : p.estimatedDuration,
        difficultyLevel: locked.has('difficultyLevel') ? forms.template.difficultyLevel : p.difficultyLevel,
        muscleGroups: locked.has('muscleGroups') ? forms.template.muscleGroups : p.muscleGroups,
        category: locked.has('category') ? forms.template.category : (p.category ?? ''),
        description: locked.has('description') ? forms.template.description : (p.description ?? ''),
        tags: locked.has('tags') ? forms.template.tags : (p.tags?.join(', ') ?? ''),
        exerciseIds: locked.has('exerciseIds') ? forms.template.exerciseIds : p.exerciseIds,
      },
    };
  }

  if (payload.intent === 'protocol') {
    const p = payload;
    const params = p.protocolParams as Record<string, unknown>;
    return {
      ...forms,
      protocol: {
        templateId: locked.has('templateId') ? forms.protocol.templateId : p.templateId,
        exerciseId: locked.has('exerciseId') ? forms.protocol.exerciseId : p.exerciseId,
        protocolType: locked.has('protocolType') ? forms.protocol.protocolType : p.protocolType,
        sets: locked.has('sets') ? forms.protocol.sets : p.sets,
        repsMin: locked.has('repsMin') ? forms.protocol.repsMin : p.repsMin,
        repsMax: locked.has('repsMax') ? forms.protocol.repsMax : p.repsMax,
        restSeconds: locked.has('restSeconds') ? forms.protocol.restSeconds : p.restSeconds,
        weight: locked.has('weight') ? forms.protocol.weight : (params.weight as number | null) ?? null,
        durationMinutes: locked.has('durationMinutes') ? forms.protocol.durationMinutes : (params.duration_minutes as number | null) ?? null,
        notes: locked.has('notes') ? forms.protocol.notes : (p.notes ?? ''),
        tempo: locked.has('tempo') ? forms.protocol.tempo : (p.tempo ?? ''),
      },
    };
  }

  const p = payload;
  return {
    ...forms,
    program: {
      name: locked.has('name') ? forms.program.name : p.name,
      durationWeeks: locked.has('durationWeeks') ? forms.program.durationWeeks : p.durationWeeks,
      activeDays: locked.has('activeDays') ? forms.program.activeDays : p.activeDays,
      mode: locked.has('mode') ? forms.program.mode : p.mode,
      templateIds: locked.has('templateIds') ? forms.program.templateIds : p.templateIds,
      description: locked.has('description') ? forms.program.description : (p.description ?? ''),
      notes: locked.has('notes') ? forms.program.notes : (p.notes ?? ''),
    },
  };
}
