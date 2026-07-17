// =====================================================
// Tipologie scheda: libera / propedeutica / progressiva
// Regole condivise fra PT (creazione/assegnazione) e Atleta (esecuzione).
// Valori DB in inglese/snake, label UI in italiano.
// =====================================================

export const TEMPLATE_KINDS = ['libera', 'propedeutica', 'progressiva'] as const;

export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const DEFAULT_TEMPLATE_KIND: TemplateKind = 'libera';

export const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  libera: 'Libera',
  propedeutica: 'Propedeutica',
  progressiva: 'Progressiva',
};

export const TEMPLATE_KIND_DESCRIPTION: Record<TemplateKind, string> = {
  libera:
    "L'atleta puo riordinare gli esercizi liberi prima di iniziare e avanzare anche senza completare tutto al 100%. I circuiti restano fissi.",
  propedeutica:
    "Ordine esercizi del PT fisso. L'atleta puo avanzare anche con reps o esercizi incompleti (anche nei circuiti).",
  progressiva:
    'Ordine fisso. Per passare al successivo deve completare al 100% quello precedente (reps prescritte incluse). Il recupero si puo saltare.',
};

export const TEMPLATE_KIND_BADGE_CLASS: Record<TemplateKind, string> = {
  libera: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  propedeutica: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  progressiva: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
};

export const TEMPLATE_KIND_META: Record<
  TemplateKind,
  { label: string; short: string; description: string }
> = {
  libera: { label: 'Libera', short: 'Libera', description: TEMPLATE_KIND_DESCRIPTION.libera },
  propedeutica: {
    label: 'Propedeutica',
    short: 'Propedeutica',
    description: TEMPLATE_KIND_DESCRIPTION.propedeutica,
  },
  progressiva: {
    label: 'Progressiva',
    short: 'Progressiva',
    description: TEMPLATE_KIND_DESCRIPTION.progressiva,
  },
};

export function isTemplateKind(value: unknown): value is TemplateKind {
  return typeof value === 'string' && (TEMPLATE_KINDS as readonly string[]).includes(value);
}

export function normalizeTemplateKind(value: unknown): TemplateKind {
  return isTemplateKind(value) ? value : DEFAULT_TEMPLATE_KIND;
}

export function templateKindLabel(kind: string | null | undefined): string {
  return TEMPLATE_KIND_LABEL[normalizeTemplateKind(kind)];
}

/** Solo scheda libera: l'atleta puo riordinare gli esercizi liberi. */
export function allowsAthleteReorder(kind: TemplateKind | string | null | undefined): boolean {
  return normalizeTemplateKind(kind) === 'libera';
}

/** Alias storico di allowsAthleteReorder, mantenuto per compatibilita. */
export const canAthleteReorder = allowsAthleteReorder;

/**
 * Libera + propedeutica: si puo avanzare senza finire reps/esercizio/circuito al 100%.
 * Progressiva: no.
 */
export function allowsSoftContinue(kind: string | null | undefined): boolean {
  const k = normalizeTemplateKind(kind);
  return k === 'libera' || k === 'propedeutica';
}

/**
 * Progressiva: per avanzare serve completare al 100% l'esercizio/blocco precedente
 * (tutte le serie con almeno le reps prescritte). Il recupero si puo sempre saltare.
 */
export function requiresFullCompletion(kind: TemplateKind | string | null | undefined): boolean {
  return normalizeTemplateKind(kind) === 'progressiva';
}

/** Alias storico di requiresFullCompletion, mantenuto per compatibilita. */
export const requiresFullExerciseCompletion = requiresFullCompletion;
