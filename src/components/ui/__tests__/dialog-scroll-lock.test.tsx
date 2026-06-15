import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// =====================================================
// Body scroll locking + scroll interno dei modali.
// Radix/Vaul applicano `pointer-events: none` o
// `overflow: hidden` sul <body> mentre un overlay è
// aperto. Verifichiamo che:
//  1) il body venga bloccato all'apertura
//  2) torni scrollabile alla chiusura
//  3) il contenuto del modale abbia overflow-y interno
//     (così contenuti lunghi scrollano dentro al popup
//     e non sotto)
// =====================================================

function LongContent() {
  return (
    <div data-testid="long">
      {Array.from({ length: 200 }).map((_, i) => (
        <p key={i}>riga {i}</p>
      ))}
    </div>
  );
}

function bodyLocked() {
  const style = document.body.getAttribute('style') ?? '';
  const computed = window.getComputedStyle(document.body);
  return (
    style.includes('pointer-events') ||
    style.includes('overflow') ||
    computed.pointerEvents === 'none' ||
    computed.overflow === 'hidden' ||
    document.body.hasAttribute('data-scroll-locked')
  );
}

afterEach(() => {
  cleanup();
  document.body.removeAttribute('style');
  document.body.removeAttribute('data-scroll-locked');
});

describe('Body scroll lock — Dialog', () => {
  it('blocca il body quando il Dialog è aperto e lo rilascia alla chiusura', () => {
    const { rerender } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock</DialogTitle>
          </DialogHeader>
          <LongContent />
        </DialogContent>
      </Dialog>,
    );
    expect(bodyLocked()).toBe(true);

    rerender(
      <Dialog open={false}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock</DialogTitle>
          </DialogHeader>
          <LongContent />
        </DialogContent>
      </Dialog>,
    );
    expect(bodyLocked()).toBe(false);
  });

  it('il contenuto del Dialog ha scroll interno (overflow-y-auto + max-h)', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dlg">
          <DialogHeader>
            <DialogTitle>Scroll</DialogTitle>
          </DialogHeader>
          <LongContent />
        </DialogContent>
      </Dialog>,
    );
    const node = screen.getByTestId('dlg');
    expect(node.className).toContain('overflow-y-auto');
    expect(node.className).toContain('max-h-[90vh]');
    // Il contenuto lungo è effettivamente renderizzato dentro al modale
    expect(node.contains(screen.getByTestId('long'))).toBe(true);
  });
});

describe('Body scroll lock — AlertDialog', () => {
  it('blocca il body quando aperto e lo rilascia alla chiusura', () => {
    const { rerender } = render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock</AlertDialogTitle>
          </AlertDialogHeader>
          <LongContent />
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(bodyLocked()).toBe(true);

    rerender(
      <AlertDialog open={false}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock</AlertDialogTitle>
          </AlertDialogHeader>
          <LongContent />
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(bodyLocked()).toBe(false);
  });

  it('il contenuto ha scroll interno', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent data-testid="alert">
          <AlertDialogHeader>
            <AlertDialogTitle>Scroll</AlertDialogTitle>
          </AlertDialogHeader>
          <LongContent />
        </AlertDialogContent>
      </AlertDialog>,
    );
    const node = screen.getByTestId('alert');
    expect(node.className).toContain('overflow-y-auto');
    expect(node.className).toContain('max-h-[90vh]');
  });
});

describe('Body scroll lock — Sheet', () => {
  it('blocca il body quando lo Sheet è aperto e lo rilascia alla chiusura', () => {
    const { rerender } = render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Lock</SheetTitle>
          </SheetHeader>
          <LongContent />
        </SheetContent>
      </Sheet>,
    );
    expect(bodyLocked()).toBe(true);

    rerender(
      <Sheet open={false}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Lock</SheetTitle>
          </SheetHeader>
          <LongContent />
        </SheetContent>
      </Sheet>,
    );
    expect(bodyLocked()).toBe(false);
  });

  it('lo Sheet ha scroll interno (overflow-y-auto + max-h-screen)', () => {
    render(
      <Sheet open>
        <SheetContent data-testid="sheet">
          <SheetHeader>
            <SheetTitle>Scroll</SheetTitle>
          </SheetHeader>
          <LongContent />
        </SheetContent>
      </Sheet>,
    );
    const node = screen.getByTestId('sheet');
    expect(node.className).toContain('overflow-y-auto');
    expect(node.className).toContain('max-h-screen');
    expect(node.contains(screen.getByTestId('long'))).toBe(true);
  });
});
