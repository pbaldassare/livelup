// =====================================================
// ATHLETE NAME UTILS
// Builds athlete display name with email fallback.
// =====================================================

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = value.trim();
  return t ? t : null;
}

export function getAthleteDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null | undefined,
  fallback: string = 'Atleta',
): string {
  const f = clean(firstName);
  const l = clean(lastName);
  const full = [f, l].filter(Boolean).join(' ');
  if (full) return full;
  const e = clean(email);
  if (e) return e;
  return fallback;
}

export function getAthleteInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null | undefined,
  fallback: string = 'A',
): string {
  const f = clean(firstName);
  const l = clean(lastName);
  const parts = [f, l].filter(Boolean) as string[];
  if (parts.length > 0) {
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }
  const e = clean(email);
  if (e) return e[0].toUpperCase();
  return fallback;
}
