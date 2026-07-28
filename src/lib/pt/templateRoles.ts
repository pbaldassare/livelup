// =====================================================
// Ruolo template: scheda principale vs riscaldamento / defaticamento
// =====================================================

export const TEMPLATE_ROLES = ['main', 'warmup', 'cooldown'] as const;

export type TemplateRole = (typeof TEMPLATE_ROLES)[number];

export const WORKOUT_PHASES = ['warmup', 'main', 'cooldown'] as const;

export type WorkoutPhase = (typeof WORKOUT_PHASES)[number];

export const TEMPLATE_ROLE_LABEL: Record<TemplateRole, string> = {
  main: 'Scheda',
  warmup: 'Riscaldamento',
  cooldown: 'Defaticamento',
};

export const WORKOUT_PHASE_LABEL: Record<WorkoutPhase, string> = {
  warmup: 'Riscaldamento',
  main: 'Allenamento',
  cooldown: 'Defaticamento',
};

export function isTemplateRole(value: unknown): value is TemplateRole {
  return typeof value === 'string' && (TEMPLATE_ROLES as readonly string[]).includes(value);
}

export function normalizeTemplateRole(value: unknown): TemplateRole {
  return isTemplateRole(value) ? value : 'main';
}

export function isWorkoutPhase(value: unknown): value is WorkoutPhase {
  return typeof value === 'string' && (WORKOUT_PHASES as readonly string[]).includes(value);
}

export function normalizeWorkoutPhase(value: unknown): WorkoutPhase {
  return isWorkoutPhase(value) ? value : 'main';
}

/** Warmup/cooldown sono extra: non entrano nel riepilogo sessione. */
export function isSummaryPhase(phase: WorkoutPhase | string | null | undefined): boolean {
  return normalizeWorkoutPhase(phase) === 'main';
}
