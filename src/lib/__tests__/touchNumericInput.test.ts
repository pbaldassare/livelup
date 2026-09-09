import { describe, expect, it } from 'vitest';
import {
  commitPositiveInt,
  formatCommittedInt,
  sanitizeIntegerInput,
  stepPositiveInt,
} from '@/lib/touchNumericInput';

describe('touchNumericInput', () => {
  it('strips non-digits while typing', () => {
    expect(sanitizeIntegerInput('11')).toBe('11');
    expect(sanitizeIntegerInput('1a1')).toBe('11');
    expect(sanitizeIntegerInput('')).toBe('');
  });

  it('keeps empty as fallback only on commit', () => {
    expect(commitPositiveInt('', 1, 1)).toBe(1);
    expect(commitPositiveInt('8', 1, 1)).toBe(8);
    expect(commitPositiveInt('0', 1, 1)).toBe(1);
  });

  it('allows zero when min is 0', () => {
    expect(commitPositiveInt('0', 1, 0)).toBe(0);
    expect(commitPositiveInt('', 0, 0)).toBe(0);
    expect(stepPositiveInt(0, -1, 0)).toBe(0);
  });

  it('clamps to max when provided', () => {
    expect(commitPositiveInt('99', 1, 1, 10)).toBe(10);
    expect(stepPositiveInt(10, 1, 1, 10)).toBe(10);
  });

  it('steps without going below min', () => {
    expect(stepPositiveInt(11, -1, 1)).toBe(10);
    expect(stepPositiveInt(1, -1, 1)).toBe(1);
    expect(stepPositiveInt(null, 1, 1)).toBe(2);
  });

  it('formats committed values', () => {
    expect(formatCommittedInt(11)).toBe('11');
    expect(formatCommittedInt(null)).toBe('');
  });
});
