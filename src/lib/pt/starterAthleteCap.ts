export const STARTER_MAX_ATHLETES = 100;

export function starterIncludedLabel() {
  return `fino a ${STARTER_MAX_ATHLETES} atleti`;
}

export function starterPlanHint() {
  return `Il piano Starter è già incluso, ${starterIncludedLabel()}.`;
}

export function starterActivatesHint() {
  return `Ricarica la pagina: il piano Starter (${starterIncludedLabel()}) si attiva da solo.`;
}
