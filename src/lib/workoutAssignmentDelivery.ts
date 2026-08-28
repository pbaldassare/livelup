export type AssignmentDelivery = 'schedule' | 'assign';

/** Con "Assegna subito" si attiva solo la prima sessione; le altre restano programmate. */
export function firstCreatedWorkoutToActivate(
  delivery: AssignmentDelivery,
  createdIds: string[],
): string | null {
  if (delivery !== 'assign' || createdIds.length === 0) return null;
  return createdIds[0];
}
