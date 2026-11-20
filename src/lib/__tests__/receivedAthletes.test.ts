import { describe, expect, it } from 'vitest';
import { filterReceivedAthletesStillCeded } from '@/lib/pt/receivedAthletes';
import { starterIncludedLabel, STARTER_MAX_ATHLETES } from '@/lib/pt/starterAthleteCap';

describe('filterReceivedAthletesStillCeded', () => {
  it('keeps the latest inbound transfer when there is no recall', () => {
    const kept = filterReceivedAthletesStillCeded(
      [
        { atleta_user_id: 'a1', completed_at: '2026-01-01T10:00:00Z', id: 'old' },
        { atleta_user_id: 'a1', completed_at: '2026-02-01T10:00:00Z', id: 'new' },
      ],
      [],
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe('new');
  });

  it('drops an athlete after a later recall', () => {
    const kept = filterReceivedAthletesStillCeded(
      [{ atleta_user_id: 'a1', completed_at: '2026-02-01T10:00:00Z', id: 'in' }],
      [{ atleta_user_id: 'a1', completed_at: '2026-03-01T10:00:00Z' }],
    );
    expect(kept).toEqual([]);
  });

  it('keeps an athlete if they were ceded again after a recall', () => {
    const kept = filterReceivedAthletesStillCeded(
      [{ atleta_user_id: 'a1', completed_at: '2026-04-01T10:00:00Z', id: 'again' }],
      [{ atleta_user_id: 'a1', completed_at: '2026-03-01T10:00:00Z' }],
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe('again');
  });
});

describe('starter athlete cap', () => {
  it('is temporarily 100', () => {
    expect(STARTER_MAX_ATHLETES).toBe(100);
    expect(starterIncludedLabel()).toBe('fino a 100 atleti');
  });
});
