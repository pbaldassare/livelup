// =====================================================
// PT ASSISTANT — form assegnazione scheda / programma
// =====================================================

import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { PTCatalog } from '@/lib/api/ptCatalog';
import { generateAssignmentDates } from '@/lib/api/ptAssistantSave';
import type { PreviewField } from '@/lib/ptAssistantCreateParse';

export type AssignIntent = 'assign-scheda' | 'assign-program';

export type AssignSchedaFormState = {
  athleteId: string;
  templateId: string;
  startDate: string;
  endDate: string;
  activeDays: number[];
};

export type AssignProgramFormState = {
  athleteId: string;
  programId: string;
  startDate: string;
  activeDays: number[];
};

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab', 7: 'Dom',
};

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function weeksLaterIso(weeks: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function defaultAssignSchedaForm(): AssignSchedaFormState {
  return {
    athleteId: '',
    templateId: '',
    startDate: todayIso(),
    endDate: weeksLaterIso(8),
    activeDays: [1, 3, 5],
  };
}

export function defaultAssignProgramForm(): AssignProgramFormState {
  return {
    athleteId: '',
    programId: '',
    startDate: todayIso(),
    activeDays: [1, 3, 5],
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

function parseIsoDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getAssignSchedaDates(form: AssignSchedaFormState): Date[] {
  const start = parseIsoDate(form.startDate);
  if (!start) return [];
  const end = parseIsoDate(form.endDate);
  return generateAssignmentDates({
    startDate: start,
    endDate: end,
    activeDays: form.activeDays,
  });
}

export function previewFromAssignScheda(
  form: AssignSchedaFormState,
  catalog: PTCatalog,
  occupiedCount = 0,
): PreviewField[] {
  const athlete = catalog.athletes.find((a) => a.id === form.athleteId);
  const template = catalog.templates.find((t) => t.id === form.templateId);
  const dates = getAssignSchedaDates(form);
  const start = parseIsoDate(form.startDate);
  const end = parseIsoDate(form.endDate);

  let dateSummary = '—';
  if (dates.length > 0 && start) {
    const rangeEnd = end ?? dates[dates.length - 1];
    const daysLabel = form.activeDays.map((d) => WEEKDAY_LABELS[d]).join(', ') || '—';
    dateSummary = `${dates.length} allenamenti (${format(start, 'd MMM yyyy', { locale: it })} → ${format(rangeEnd, 'd MMM yyyy', { locale: it })}, ${daysLabel})`;
    if (occupiedCount > 0) {
      dateSummary += ` — ${occupiedCount} date già occupate`;
    }
    const toCreate = Math.max(0, dates.length - occupiedCount);
    dateSummary += ` → verranno creati ${toCreate} workout`;
  }

  return [
    pf('athlete', 'Atleta', athlete?.displayName, true),
    pf('template', 'Scheda', template?.title, true),
    pf('dates', 'Date', dateSummary, true),
  ];
}

export function previewFromAssignProgram(form: AssignProgramFormState, catalog: PTCatalog): PreviewField[] {
  const athlete = catalog.athletes.find((a) => a.id === form.athleteId);
  const program = catalog.programs.find((p) => p.id === form.programId);
  const start = parseIsoDate(form.startDate);
  const daysLabel = form.activeDays.map((d) => WEEKDAY_LABELS[d]).join(', ') || '—';

  return [
    pf('athlete', 'Atleta', athlete?.displayName, true),
    pf('program', 'Programma', program?.name, true),
    pf('startDate', 'Inizio', start ? format(start, 'd MMMM yyyy', { locale: it }) : '—', true),
    pf('activeDays', 'Giorni attivi', daysLabel, true),
    pf('templates', 'Schede nel programma',
      program?.schedules.map((s) => s.templateTitle).join(' → ') || '—',
      false,
    ),
  ];
}

export function isAssignSchedaReady(form: AssignSchedaFormState): boolean {
  return !!(form.athleteId && form.templateId && form.startDate && form.activeDays.length > 0);
}

export function isAssignProgramReady(form: AssignProgramFormState): boolean {
  return !!(form.athleteId && form.programId && form.startDate && form.activeDays.length > 0);
}
