import { describe, expect, it } from 'vitest';
import {
  buildCatalogInstructions,
  isPlaceholderCatalogInstructions,
  resolveExerciseInstructions,
} from '@/lib/exerciseInstructions';

describe('exerciseInstructions', () => {
  it('detects the Drive seed placeholder', () => {
    expect(
      isPlaceholderCatalogInstructions(
        'Esegui Back lever · Skin The Cat con controllo, scapole attive e core chiuso. Progressione della famiglia Back lever. Video dimostrativo in arrivo.',
      ),
    ).toBe(true);
    expect(isPlaceholderCatalogInstructions('Spalle chiuse, bacino in retroversione.')).toBe(false);
  });

  it('writes two technique lines and drops the coming-soon copy', () => {
    const text = buildCatalogInstructions('Back lever · Skin The Cat', 'Back lever');
    const lines = text.split('\n');
    expect(lines).toHaveLength(2);
    expect(text).not.toMatch(/in arrivo/i);
    expect(lines[0]).toMatch(/sbarra/i);
    expect(lines[1]).toMatch(/ritorno|spalle/i);
  });

  it('adds variant cues for catalog progressions', () => {
    const text = buildCatalogInstructions('Planche · Shoulder Planche Advanced', 'Planche');
    expect(text.split('\n')).toHaveLength(2);
    expect(text).toMatch(/spalle/i);
    expect(text).not.toMatch(/Video dimostrativo/i);
  });

  it('replaces placeholder instructions but keeps custom ones', () => {
    expect(
      resolveExerciseInstructions(
        'Core · Plank',
        'Core',
        'Esegui Core · Plank con controllo, scapole attive e core chiuso. Progressione della famiglia Core. Video dimostrativo in arrivo.',
      ),
    ).toMatch(/plank|linea|bacino/i);
    expect(
      resolveExerciseInstructions('Core · Plank', 'Core', 'Tieni il corpo in linea 30 secondi.'),
    ).toBe('Tieni il corpo in linea 30 secondi.');
  });
});
