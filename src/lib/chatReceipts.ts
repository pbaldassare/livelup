export function ownMessageReceiptLabel(isRead: boolean): string {
  return isRead ? 'Letto' : 'Inviato';
}

export const TYPING_IDLE_MS = 2000;

export function scheduleTypingSignal(
  hasText: boolean,
  send: (typing: boolean) => void,
  timer: { current: ReturnType<typeof setTimeout> | null },
  idleMs = TYPING_IDLE_MS,
): void {
  if (timer.current) {
    clearTimeout(timer.current);
    timer.current = null;
  }
  if (!hasText) {
    send(false);
    return;
  }
  send(true);
  timer.current = setTimeout(() => {
    timer.current = null;
    send(false);
  }, idleMs);
}
