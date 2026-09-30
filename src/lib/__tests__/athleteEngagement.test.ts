import { describe, expect, it } from 'vitest';
import {
  INACTIVE_DAYS_THRESHOLD,
  filterByLowEngagement,
  getLowEngagementAthleteIds,
  isLowEngagement,
  isLowEngagementFilter,
  lowEngagementAthletesUrl,
} from '@/lib/pt/athleteEngagement';

const NOW = new Date('2026-09-30T12:00:00Z').getTime();
const daysAgo = (d: number) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();

describe('isLowEngagement', () => {
  it('flags PT-active athletes with no activity in the threshold window', () => {
    expect(isLowEngagement({ isPtActive: true, lastActivityAt: daysAgo(INACTIVE_DAYS_THRESHOLD + 1) }, NOW)).toBe(true);
    expect(isLowEngagement({ isPtActive: true, lastActivityAt: null }, NOW)).toBe(true);
    expect(isLowEngagement({ isPtActive: true, lastActivityAt: 'not-a-date' }, NOW)).toBe(true);
  });

  it('does not flag recent activity or PT-disabled athletes', () => {
    expect(isLowEngagement({ isPtActive: true, lastActivityAt: daysAgo(2) }, NOW)).toBe(false);
    expect(isLowEngagement({ isPtActive: false, lastActivityAt: null }, NOW)).toBe(false);
  });
});

describe('low engagement filter', () => {
  const athletes = [
    { user_id: 'a', low_engagement: true },
    { user_id: 'b', low_engagement: false },
    { user_id: 'c', low_engagement: true },
  ];

  it('filters the athletes list to exactly the ids counted in the alert', () => {
    const ids = getLowEngagementAthleteIds(athletes);
    const rows = [
      { atleta_user_id: 'a' },
      { atleta_user_id: 'b' },
      { atleta_user_id: 'c' },
      { atleta_user_id: 'd' },
    ];
    const filtered = filterByLowEngagement(rows, new Set(ids));
    expect(filtered.map((r) => r.atleta_user_id)).toEqual(['a', 'c']);
    expect(filtered).toHaveLength(ids.length);
  });

  it('builds and parses the ?filtro=poco-attivi URL', () => {
    const url = lowEngagementAthletesUrl('/pt/app/athletes');
    expect(url).toBe('/pt/app/athletes?filtro=poco-attivi');
    expect(lowEngagementAthletesUrl('/pt/athletes?tab=active')).toBe('/pt/athletes?tab=active&filtro=poco-attivi');
    expect(isLowEngagementFilter(new URLSearchParams(url.split('?')[1]))).toBe(true);
    expect(isLowEngagementFilter(new URLSearchParams('tab=pending'))).toBe(false);
  });
});
