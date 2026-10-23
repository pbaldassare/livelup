import { describe, expect, it, vi } from 'vitest';
import { ownMessageReceiptLabel, scheduleTypingSignal } from '@/lib/chatReceipts';

describe('ownMessageReceiptLabel', () => {
  it('shows Inviato until the other party reads', () => {
    expect(ownMessageReceiptLabel(false)).toBe('Inviato');
    expect(ownMessageReceiptLabel(true)).toBe('Letto');
  });
});

describe('scheduleTypingSignal', () => {
  it('sends true then false after idle, and false immediately when empty', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const timer: { current: ReturnType<typeof setTimeout> | null } = { current: null };

    scheduleTypingSignal(true, send, timer, 2000);
    expect(send).toHaveBeenLastCalledWith(true);

    vi.advanceTimersByTime(2000);
    expect(send).toHaveBeenLastCalledWith(false);

    scheduleTypingSignal(false, send, timer, 2000);
    expect(send).toHaveBeenLastCalledWith(false);
    vi.useRealTimers();
  });
});
