// =====================================================
// Tipologie scheda: libera / propedeutica / progressiva
// Regole condivise fra PT (creazione/assegnazione) e Atleta (esecuzione).
// =====================================================

export type TemplateKind = 'libera' | 'propedeutica' | 'progressiva';

export const TEMPLATE_KINDS: TemplateKind[] = ['libera', 'propedeutica', 'progressiva'];

export const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  libera: 'Libera',
  propedeutica: 'Propedeutica',
  progressiva: 'Progressiva',
};

export const TEMPLATE_KIND_DESCRIPTION: Record<TemplateKind, string> = {
  libera:
    'L\'atleta può riordinare gli esercizi ed eseguirli nell\'ordine che preferisce.',
  propedeutica:
    'Ordine consigliato dal Coach. Puoi passare all\'esercizio successivo anche se non hai completato tutti i set.',
  progressiva:
    'Sequenza progressiva: completa tutti i set di un esercizio prima di passare al successivo.',
};

export const TEMPLATE_KIND_BADGE_CLASS: Record<TemplateKind, string> = {
  libera: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  propedeutica: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  progressiva: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
};

export function normalizeTemplateKind(value: unknown): TemplateKind {
  if (typeof value === 'string' && (TEMPLATE_KINDS as string[]).includes(value)) {
    return value as TemplateKind;
  }
  return 'libera';
}

export const DEFAULT_TEMPLATE_KIND: TemplateKind = 'libera';

/** L'atleta può riordinare gli esercizi solo sulle schede libere. */
export function canAthleteReorder(kind: TemplateKind | string | null | undefined): boolean {
  return normalizeTemplateKind(kind) === 'libera';
}

/** Su schede progressive tutti i set di un esercizio vanno completati prima del prossimo. */
export function requiresFullExerciseCompletion(
  kind: TemplateKind | string | null | undefined,
): boolean {
  return normalizeTemplateKind(kind) === 'progressiva';
}
