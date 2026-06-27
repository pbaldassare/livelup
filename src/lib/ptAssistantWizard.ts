// =====================================================
// PT ASSISTANT — definizione step wizard guidato
// =====================================================

import type { PTCatalog } from '@/lib/api/ptCatalog';
import type { CreateIntent } from '@/lib/ptAssistantCreateParse';
import { PROTOCOL_LIST } from '@/lib/protocols/registry';
import type { ProtocolType } from '@/lib/protocols/registry';
import {
  CATEGORIES,
  MUSCLE_GROUPS,
  type ExerciseFormState,
  type ProgramFormState,
  type ProtocolFormState,
  type TemplateFormState,
} from '@/lib/ptAssistantForm';
import type {
  AssignIntent,
  AssignProgramFormState,
  AssignSchedaFormState,
} from '@/lib/ptAssistantAssignForm';

export type WizardStepType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'weekdays'
  | 'catalog-multiselect'
  | 'template-sequence'
  | 'date';

export type WizardStep = {
  key: string;
  label: string;
  prompt: string;
  hint?: string;
  type: WizardStepType;
  required?: boolean;
  skipAllowed?: boolean;
  options?: { value: string; label: string }[];
  suffix?: string;
  catalogSource?: 'exercises' | 'templates' | 'athletes' | 'programs';
};

export type AssistantIntent = CreateIntent | AssignIntent;

export const FITNESS_LEVELS: { value: string; label: string }[] = [
  { value: 'nessuno', label: 'Non specificato' },
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
  { value: 'agonista', label: 'Agonista' },
];

export type WizardForms = {
  exercise: ExerciseFormState;
  template: TemplateFormState;
  protocol: ProtocolFormState;
  program: ProgramFormState;
  assignScheda: AssignSchedaFormState;
  assignProgram: AssignProgramFormState;
};

export function getWizardSteps(intent: AssistantIntent, catalog?: PTCatalog): WizardStep[] {
  if (intent === 'assign-scheda') return getAssignSchedaSteps(catalog);
  if (intent === 'assign-program') return getAssignProgramSteps(catalog);

  switch (intent) {
    case 'template':
      return [
        { key: 'title', label: 'Titolo', prompt: 'Come si chiama la scheda?', type: 'text', required: true },
        { key: 'estimatedDuration', label: 'Durata', prompt: 'Quanti minuti dura?', hint: 'Es. 45, 60, 90', type: 'number', suffix: 'min', skipAllowed: true },
        { key: 'difficultyLevel', label: 'Livello', prompt: 'A che livello è pensata?', type: 'select', options: FITNESS_LEVELS, skipAllowed: true },
        { key: 'muscleGroups', label: 'Gruppi muscolari', prompt: 'Quali gruppi muscolari coinvolge?', type: 'multiselect', options: MUSCLE_GROUPS.map((m) => ({ value: m, label: m })), skipAllowed: true },
        { key: 'category', label: 'Categoria', prompt: 'Che tipo di allenamento è?', type: 'select', options: CATEGORIES.map((c) => ({ value: c, label: c })), skipAllowed: true },
        { key: 'description', label: 'Descrizione', prompt: 'Vuoi aggiungere una descrizione?', type: 'textarea', skipAllowed: true },
        { key: 'tags', label: 'Tag', prompt: 'Tag separati da virgola (es. forza, ipertrofia)', type: 'text', skipAllowed: true },
        ...(catalog && catalog.exercises.length > 0
          ? [{
              key: 'exerciseIds',
              label: 'Esercizi',
              prompt: 'Quali esercizi includere nella scheda?',
              type: 'catalog-multiselect' as const,
              catalogSource: 'exercises' as const,
              skipAllowed: true,
            }]
          : []),
      ];

    case 'exercise':
      return [
        { key: 'name', label: 'Nome', prompt: 'Come si chiama l\'esercizio?', type: 'text', required: true },
        { key: 'category', label: 'Categoria', prompt: 'In quale categoria rientra?', type: 'select', options: CATEGORIES.map((c) => ({ value: c, label: c })), required: true },
        { key: 'muscleGroups', label: 'Gruppi muscolari', prompt: 'Quali muscoli coinvolge?', type: 'multiselect', options: MUSCLE_GROUPS.map((m) => ({ value: m, label: m })), skipAllowed: true },
        { key: 'difficultyLevel', label: 'Difficoltà', prompt: 'Che difficoltà ha?', type: 'select', options: FITNESS_LEVELS, skipAllowed: true },
        { key: 'description', label: 'Descrizione', prompt: 'Breve descrizione dell\'esercizio', type: 'textarea', skipAllowed: true },
        { key: 'instructions', label: 'Istruzioni', prompt: 'Come si esegue?', type: 'textarea', skipAllowed: true },
        { key: 'equipment', label: 'Attrezzatura', prompt: 'Che attrezzatura serve?', hint: 'Es. manubri, box, cavo', type: 'text', skipAllowed: true },
      ];

    case 'program':
      return [
        { key: 'name', label: 'Nome', prompt: 'Come si chiama il programma?', type: 'text', required: true },
        { key: 'durationWeeks', label: 'Durata', prompt: 'Per quante settimane dura?', type: 'number', suffix: 'sett.', skipAllowed: true },
        { key: 'activeDays', label: 'Giorni attivi', prompt: 'In quali giorni si allena?', type: 'weekdays', required: true },
        {
          key: 'templateIds',
          label: 'Schede',
          prompt: 'Quali schede compongono il programma?',
          hint: 'Aggiungi almeno una scheda in ordine',
          type: 'template-sequence',
          required: true,
          catalogSource: 'templates',
        },
        { key: 'description', label: 'Descrizione', prompt: 'Descrizione del programma', type: 'textarea', skipAllowed: true },
        { key: 'notes', label: 'Note', prompt: 'Note aggiuntive', type: 'textarea', skipAllowed: true },
      ];

    case 'protocol':
      return [
        {
          key: 'templateId',
          label: 'Scheda',
          prompt: 'Su quale scheda applicare il protocollo?',
          type: 'select',
          options: catalog?.templates.map((t) => ({ value: t.id, label: t.title })) ?? [],
          required: true,
        },
        {
          key: 'exerciseId',
          label: 'Esercizio',
          prompt: 'Su quale esercizio?',
          type: 'select',
          options: catalog?.exercises.map((e) => ({ value: e.id, label: e.name })) ?? [],
          required: true,
        },
        {
          key: 'protocolType',
          label: 'Tipo protocollo',
          prompt: 'Che tipo di protocollo vuoi usare?',
          type: 'select',
          options: PROTOCOL_LIST.map((p) => ({ value: p.type, label: p.label })),
          required: true,
        },
        { key: 'sets', label: 'Serie', prompt: 'Quante serie?', type: 'number', skipAllowed: true },
        { key: 'repsMin', label: 'Ripetizioni', prompt: 'Quante ripetizioni?', type: 'number', skipAllowed: true },
        { key: 'restSeconds', label: 'Recupero', prompt: 'Recupero tra le serie (secondi)', type: 'number', suffix: 's', skipAllowed: true },
        { key: 'notes', label: 'Note', prompt: 'Note sul protocollo', type: 'textarea', skipAllowed: true },
      ];
  }
}

function getAssignSchedaSteps(catalog?: PTCatalog): WizardStep[] {
  return [
    {
      key: 'athleteId',
      label: 'Atleta',
      prompt: 'A quale atleta?',
      type: 'select',
      options: catalog?.athletes.map((a) => ({ value: a.id, label: a.displayName })) ?? [],
      required: true,
      catalogSource: 'athletes',
    },
    {
      key: 'templateId',
      label: 'Scheda',
      prompt: 'Quale scheda?',
      type: 'select',
      options: catalog?.templates.map((t) => ({ value: t.id, label: t.title })) ?? [],
      required: true,
      catalogSource: 'templates',
    },
    { key: 'startDate', label: 'Data inizio', prompt: 'Da quando?', type: 'date', required: true },
    { key: 'endDate', label: 'Data fine', prompt: 'Fino a quando?', type: 'date', skipAllowed: true },
    { key: 'activeDays', label: 'Giorni attivi', prompt: 'In quali giorni?', type: 'weekdays', required: true },
  ];
}

function getAssignProgramSteps(catalog?: PTCatalog): WizardStep[] {
  return [
    {
      key: 'athleteId',
      label: 'Atleta',
      prompt: 'A quale atleta?',
      type: 'select',
      options: catalog?.athletes.map((a) => ({ value: a.id, label: a.displayName })) ?? [],
      required: true,
      catalogSource: 'athletes',
    },
    {
      key: 'programId',
      label: 'Programma',
      prompt: 'Quale programma?',
      type: 'select',
      options: catalog?.programs.map((p) => ({ value: p.id, label: p.name })) ?? [],
      required: true,
      catalogSource: 'programs',
    },
    { key: 'startDate', label: 'Data inizio', prompt: 'Da quando?', type: 'date', required: true },
    { key: 'activeDays', label: 'Giorni attivi', prompt: 'In quali giorni?', type: 'weekdays', required: true },
  ];
}

export function wizardGetValue(intent: AssistantIntent, key: string, forms: WizardForms): unknown {
  switch (intent) {
    case 'assign-scheda':
      return forms.assignScheda[key as keyof AssignSchedaFormState];
    case 'assign-program':
      return forms.assignProgram[key as keyof AssignProgramFormState];
    case 'exercise':
      return forms.exercise[key as keyof ExerciseFormState];
    case 'template':
      return forms.template[key as keyof TemplateFormState];
    case 'protocol':
      return forms.protocol[key as keyof ProtocolFormState];
    case 'program':
      return forms.program[key as keyof ProgramFormState];
  }
}

export function wizardIsStepValid(intent: AssistantIntent, step: WizardStep, forms: WizardForms): boolean {
  const v = wizardGetValue(intent, step.key, forms);
  if (!step.required) return true;
  if (step.type === 'multiselect' || step.type === 'catalog-multiselect') {
    return Array.isArray(v) && v.length > 0;
  }
  if (step.type === 'weekdays') {
    return Array.isArray(v) && v.length > 0;
  }
  if (step.type === 'template-sequence') {
    return Array.isArray(v) && v.length > 0;
  }
  if (step.type === 'number') {
    return typeof v === 'number' && !Number.isNaN(v);
  }
  if (step.type === 'date') {
    return typeof v === 'string' && v.trim().length > 0;
  }
  if (typeof v === 'string') return v.trim().length > 0;
  return v != null && v !== '';
}

export function wizardStepSummary(
  intent: AssistantIntent,
  step: WizardStep,
  forms: WizardForms,
  catalog?: PTCatalog,
): string | null {
  const v = wizardGetValue(intent, step.key, forms);
  if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return null;

  if (step.key === 'difficultyLevel' && typeof v === 'string') {
    return FITNESS_LEVELS.find((l) => l.value === v)?.label ?? v;
  }
  if (step.type === 'catalog-multiselect' && Array.isArray(v) && catalog) {
    return v.map((id) => catalog.exercises.find((e) => e.id === id)?.name ?? id).join(', ');
  }
  if (step.type === 'template-sequence' && Array.isArray(v) && catalog) {
    return v.map((id) => catalog.templates.find((t) => t.id === id)?.title ?? id).join(' → ');
  }
  if (step.type === 'weekdays' && Array.isArray(v)) {
    const labels: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab', 7: 'Dom' };
    return v.map((d) => labels[d as number]).join(', ');
  }
  if (step.key === 'athleteId' && catalog && typeof v === 'string') {
    return catalog.athletes.find((a) => a.id === v)?.displayName ?? null;
  }
  if (step.key === 'programId' && catalog && typeof v === 'string') {
    return catalog.programs.find((p) => p.id === v)?.name ?? null;
  }
  if (step.type === 'date' && typeof v === 'string' && v) {
    return v;
  }
  if (step.key === 'templateId' && catalog && typeof v === 'string') {
    return catalog.templates.find((t) => t.id === v)?.title ?? null;
  }
  if (step.key === 'exerciseId' && catalog && typeof v === 'string') {
    return catalog.exercises.find((e) => e.id === v)?.name ?? null;
  }
  if (step.key === 'protocolType' && typeof v === 'string') {
    return PROTOCOL_LIST.find((p) => p.type === v)?.label ?? v;
  }
  if (Array.isArray(v)) return v.join(', ');
  if (step.type === 'number' && step.suffix) return `${v} ${step.suffix}`;
  return String(v);
}

export type WizardPatch = Partial<{
  exercise: ExerciseFormState;
  template: TemplateFormState;
  protocol: ProtocolFormState;
  program: ProgramFormState;
  assignScheda: AssignSchedaFormState;
  assignProgram: AssignProgramFormState;
}>;

export function wizardApplyValue(
  intent: AssistantIntent,
  key: string,
  value: unknown,
  forms: WizardForms,
): WizardPatch {
  switch (intent) {
    case 'assign-scheda':
      return { assignScheda: { ...forms.assignScheda, [key]: value } as AssignSchedaFormState };
    case 'assign-program':
      return { assignProgram: { ...forms.assignProgram, [key]: value } as AssignProgramFormState };
    case 'exercise':
      return { exercise: { ...forms.exercise, [key]: value } as ExerciseFormState };
    case 'template':
      return { template: { ...forms.template, [key]: value } as TemplateFormState };
    case 'protocol':
      if (key === 'protocolType') {
        return { protocol: { ...forms.protocol, protocolType: value as ProtocolType } };
      }
      return { protocol: { ...forms.protocol, [key]: value } as ProtocolFormState };
    case 'program':
      return { program: { ...forms.program, [key]: value } as ProgramFormState };
  }
}

// ——— Frase inline (mad-libs) ———

export type SentencePart =
  | { kind: 'text'; value: string }
  | { kind: 'field'; key: string; layout?: 'inline' | 'block' }
  | { kind: 'break' };

export function getSentenceParts(intent: AssistantIntent, catalog?: PTCatalog): SentencePart[] {
  const hasExercises = catalog && catalog.exercises.length > 0;
  const f = (key: string, layout: 'inline' | 'block' = 'inline'): SentencePart => ({ kind: 'field', key, layout });

  switch (intent) {
    case 'assign-scheda':
      return [
        { kind: 'text', value: 'Assegno a' },
        f('athleteId'),
        { kind: 'text', value: 'la scheda' },
        f('templateId'),
        { kind: 'text', value: 'dal' },
        f('startDate'),
        { kind: 'text', value: 'al' },
        f('endDate'),
        { kind: 'break' },
        { kind: 'text', value: 'nei giorni' },
        f('activeDays', 'block'),
      ];

    case 'assign-program':
      return [
        { kind: 'text', value: 'Assegno a' },
        f('athleteId'),
        { kind: 'text', value: 'il programma' },
        f('programId'),
        { kind: 'text', value: 'con inizio' },
        f('startDate'),
        { kind: 'break' },
        { kind: 'text', value: 'giorni' },
        f('activeDays', 'block'),
      ];

    case 'template':
      return [
        { kind: 'text', value: 'Creo una scheda con titolo' },
        f('title'),
        { kind: 'text', value: ' di durata' },
        f('estimatedDuration'),
        { kind: 'text', value: ' minuti, livello' },
        f('difficultyLevel'),
        { kind: 'text', value: ', muscoli' },
        f('muscleGroups', 'block'),
        { kind: 'text', value: ', categoria' },
        f('category'),
        { kind: 'text', value: '.' },
        { kind: 'break' },
        { kind: 'text', value: 'Descrizione:' },
        f('description', 'block'),
        { kind: 'text', value: 'Tag:' },
        f('tags'),
        { kind: 'text', value: '.' },
        ...(hasExercises
          ? [
              { kind: 'break' as const },
              { kind: 'text' as const, value: 'Esercizi inclusi:' },
              f('exerciseIds', 'block'),
            ]
          : []),
      ];

    case 'exercise':
      return [
        { kind: 'text', value: 'Creo un esercizio chiamato' },
        f('name'),
        { kind: 'text', value: ', categoria' },
        f('category'),
        { kind: 'text', value: ', muscoli' },
        f('muscleGroups', 'block'),
        { kind: 'text', value: ', difficoltà' },
        f('difficultyLevel'),
        { kind: 'text', value: '.' },
        { kind: 'break' },
        { kind: 'text', value: 'Descrizione:' },
        f('description', 'block'),
        { kind: 'text', value: 'Istruzioni:' },
        f('instructions', 'block'),
        { kind: 'text', value: 'Attrezzatura:' },
        f('equipment'),
        { kind: 'text', value: '.' },
      ];

    case 'program':
      return [
        { kind: 'text', value: 'Creo un programma chiamato' },
        f('name'),
        { kind: 'text', value: ' della durata di' },
        f('durationWeeks'),
        { kind: 'text', value: ' settimane, con allenamenti' },
        f('activeDays', 'block'),
        { kind: 'text', value: '.' },
        { kind: 'break' },
        { kind: 'text', value: 'Sequenza schede:' },
        f('templateIds', 'block'),
        { kind: 'break' },
        { kind: 'text', value: 'Descrizione:' },
        f('description', 'block'),
        { kind: 'text', value: 'Note:' },
        f('notes', 'block'),
      ];

    case 'protocol':
      return [
        { kind: 'text', value: 'Su scheda' },
        f('templateId'),
        { kind: 'text', value: ', esercizio' },
        f('exerciseId'),
        { kind: 'text', value: ', applico protocollo' },
        f('protocolType'),
        { kind: 'text', value: ' con' },
        f('sets'),
        { kind: 'text', value: ' serie,' },
        f('repsMin'),
        { kind: 'text', value: ' ripetizioni, recupero' },
        f('restSeconds'),
        { kind: 'text', value: ' secondi.' },
        { kind: 'break' },
        { kind: 'text', value: 'Note:' },
        f('notes', 'block'),
      ];
  }
}

export function getStepByKey(intent: AssistantIntent, key: string, catalog?: PTCatalog): WizardStep | undefined {
  return getWizardSteps(intent, catalog).find((s) => s.key === key);
}
