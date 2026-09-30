/**
 * Engagement atleti lato PT ("poco attivi").
 * Unica fonte per il conteggio dell'avviso in Home e per il filtro
 * della lista atleti (?filtro=poco-attivi), così i numeri coincidono sempre.
 */

export const INACTIVE_DAYS_THRESHOLD = 7;

export const ATHLETES_FILTER_PARAM = 'filtro';
export const LOW_ENGAGEMENT_FILTER_VALUE = 'poco-attivi';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isLowEngagement(
  params: { isPtActive: boolean; lastActivityAt: string | null | undefined },
  now: number = Date.now(),
): boolean {
  if (!params.isPtActive) return false;
  const ts = params.lastActivityAt ? new Date(params.lastActivityAt).getTime() : 0;
  if (!ts || Number.isNaN(ts)) return true;
  return ts < now - INACTIVE_DAYS_THRESHOLD * DAY_MS;
}

export function getLowEngagementAthleteIds(
  athletes: { user_id: string; low_engagement: boolean }[],
): string[] {
  return athletes.filter((a) => a.low_engagement).map((a) => a.user_id);
}

export function isLowEngagementFilter(searchParams: URLSearchParams): boolean {
  return searchParams.get(ATHLETES_FILTER_PARAM) === LOW_ENGAGEMENT_FILTER_VALUE;
}

export function lowEngagementAthletesUrl(athletesRoute: string): string {
  const sep = athletesRoute.includes('?') ? '&' : '?';
  return `${athletesRoute}${sep}${ATHLETES_FILTER_PARAM}=${LOW_ENGAGEMENT_FILTER_VALUE}`;
}

export function filterByLowEngagement<T extends { atleta_user_id: string }>(
  rows: T[],
  lowEngagementIds: ReadonlySet<string>,
): T[] {
  return rows.filter((r) => lowEngagementIds.has(r.atleta_user_id));
}
