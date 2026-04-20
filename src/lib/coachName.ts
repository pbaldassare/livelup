// =====================================================
// COACH NAME UTILS
// Costruisce e valida il nome reale del Coach (PT)
// Esclude placeholder generici ("coach", "pt", ecc.)
// =====================================================

const PLACEHOLDER_VALUES = new Set([
  'coach',
  'pt',
  'personal trainer',
  'personaltrainer',
  'trainer',
  'user',
  'utente',
  'admin',
  'test',
  'n/a',
  'na',
  '-',
  '',
]);

/**
 * Sanitizza una singola parte del nome (first_name o last_name).
 * Restituisce null se è vuota, un placeholder o equivale al ruolo.
 */
function cleanPart(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/**
 * Costruisce il nome completo del Coach a partire da first_name e last_name.
 * Ritorna null se entrambi i campi mancano o contengono placeholder.
 */
export function buildCoachFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null {
  const f = cleanPart(firstName);
  const l = cleanPart(lastName);
  if (!f && !l) return null;
  return [f, l].filter(Boolean).join(' ');
}

/**
 * Wrapper safe per UI: ritorna nome reale o fallback descrittivo.
 * Logga warning su console se i dati sono incoerenti (account legacy).
 */
export function getCoachDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string = 'Coach assegnato',
): string {
  const real = buildCoachFullName(firstName, lastName);
  if (!real) {
    if (firstName || lastName) {
      console.warn('[CoachName] Dati Coach incoerenti (placeholder rilevato):', {
        firstName,
        lastName,
      });
    }
    return fallback;
  }
  return real;
}

/**
 * Iniziali corrette dal nome reale (es. "Mario Rossi" → "MR").
 * Se il nome non è valido ritorna il fallback (default "?").
 */
export function getCoachInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string = '?',
): string {
  const f = cleanPart(firstName);
  const l = cleanPart(lastName);
  const parts = [f, l].filter(Boolean) as string[];
  if (parts.length === 0) return fallback;
  return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}
