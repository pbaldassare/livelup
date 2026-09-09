import { describe, expect, it } from 'vitest';
import { buildPublicEventInsert } from '@/lib/api/publicEvents';

const base = {
  creatorUserId: 'user-1',
  title: 'Calisthenics Day',
  description: null,
  eventTypeId: null,
  startDatetime: '2026-09-10T08:00:00.000Z',
  endDatetime: '2026-09-10T10:00:00.000Z',
  location: 'Parco',
  locationLat: 45.5,
  locationLng: 10.2,
  visibility: 'public',
  isClosedNumber: false,
  maxParticipants: null,
  coverImageUrl: null,
};

describe('buildPublicEventInsert', () => {
  it('per il PT collega pt_user_id al creatore', () => {
    const row = buildPublicEventInsert({ ...base, creatorKind: 'pt' });
    expect(row.pt_user_id).toBe('user-1');
    expect(row.atleta_user_id).toBeNull();
    expect(row.is_public).toBe(true);
    expect(row.category).toBe('evento');
  });

  it('per l’atleta lascia pt_user_id vuoto (non entra nel calendario PT)', () => {
    const row = buildPublicEventInsert({ ...base, creatorKind: 'atleta' });
    expect(row.pt_user_id).toBeNull();
    expect(row.creator_user_id).toBe('user-1');
    expect(row.category).toBe('evento');
  });

  it('l’atleta non può usare connected_only: ricade su public', () => {
    const row = buildPublicEventInsert({
      ...base,
      creatorKind: 'atleta',
      visibility: 'connected_only',
    });
    expect(row.visibility).toBe('public');
  });
});
