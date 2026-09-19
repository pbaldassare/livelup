import { describe, expect, it } from 'vitest';
import {
  CATALOG_DRIVE_VIDEO_BASE,
  DEFAULT_EXERCISE_VIDEO_URL,
  catalogDriveVideoUrl,
  isPublicCatalogExerciseName,
  resolveCatalogDriveVideoUrl,
  resolveExerciseVideoUrl,
} from '@/lib/exerciseMedia';

const PLANCHE_ID = '29386bea-53e7-419a-be37-58ccfcf0202a';

describe('exerciseMedia', () => {
  it('recognizes public catalog names', () => {
    expect(isPublicCatalogExerciseName('Planche · Shoulder Planche Advanced')).toBe(true);
    expect(isPublicCatalogExerciseName('SHOULDER PLANCHE ADVANCED')).toBe(false);
    expect(isPublicCatalogExerciseName('')).toBe(false);
  });

  it('builds the Drive storage URL for a catalog id', () => {
    expect(catalogDriveVideoUrl(PLANCHE_ID)).toBe(
      `${CATALOG_DRIVE_VIDEO_BASE}/${PLANCHE_ID}/demo.mp4`,
    );
  });

  it('resolves catalog MP4 when video_url is empty', () => {
    expect(
      resolveExerciseVideoUrl(null, {
        allowDefault: false,
        exerciseId: PLANCHE_ID,
        exerciseName: 'Planche · Shoulder Planche Advanced',
      }),
    ).toBe(`${CATALOG_DRIVE_VIDEO_BASE}/${PLANCHE_ID}/demo.mp4`);
  });

  it('keeps an explicit video_url', () => {
    expect(
      resolveExerciseVideoUrl('https://youtu.be/abc', {
        exerciseId: PLANCHE_ID,
        exerciseName: 'Planche · Shoulder Planche Advanced',
      }),
    ).toBe('https://youtu.be/abc');
  });

  it('does not invent a Drive URL for private ALL-CAPS rows', () => {
    expect(
      resolveCatalogDriveVideoUrl(PLANCHE_ID, 'BAND PLANCHE FULL'),
    ).toBeUndefined();
    expect(
      resolveExerciseVideoUrl(null, {
        allowDefault: false,
        exerciseId: PLANCHE_ID,
        exerciseName: 'BAND PLANCHE FULL',
      }),
    ).toBeUndefined();
  });

  it('falls back to the default YouTube only when allowed', () => {
    expect(resolveExerciseVideoUrl(null)).toBe(DEFAULT_EXERCISE_VIDEO_URL);
    expect(resolveExerciseVideoUrl(null, { allowDefault: false })).toBeUndefined();
  });
});
