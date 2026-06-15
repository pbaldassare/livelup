import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
// Standardizzazione popup — test di centratura,
// scroll interno, override di className, snapshot e
// comportamento responsive (desktop + mobile).
// =====================================================

const CENTERING_CLASSES = [
  'fixed',
  '!left-1/2',
  '!top-1/2',
  '!-translate-x-1/2',
  '!-translate-y-1/2',
  'max-h-[90vh]',
  'overflow-y-auto',
];

function setViewport(width: number, height = 900) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
}

beforeEach(() => setViewport(1280));
afterEach(() => cleanup());

// ----------------------------------------------------
// DialogContent
// ----------------------------------------------------
describe('DialogContent — centratura e scroll', () => {
  it.each([
    ['desktop', 1280],
    ['tablet', 768],
    ['mobile', 375],
  ])('mantiene le classi standard su viewport %s', (_label, width) => {
    setViewport(width);
    render(
      <Dialog open>
        <DialogContent data-testid="dlg">
          <DialogHeader>
            <DialogTitle>Test</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    const node = screen.getByTestId('dlg');
    CENTERING_CLASSES.forEach((cls) =>
      expect(node.className).toContain(cls),
    );
  });

  it('preserva le classi di centratura quando si passa className custom', () => {
    render(
      <Dialog open>
        <DialogContent
          data-testid="dlg"
          className="sm:max-w-[640px] bg-card border-app-border"
        >
          <DialogHeader>
            <DialogTitle>Custom</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    const node = screen.getByTestId('dlg');
    CENTERING_CLASSES.forEach((cls) =>
      expect(node.className).toContain(cls),
    );
    expect(node.className).toContain('sm:max-w-[640px]');
    expect(node.className).toContain('bg-card');
    expect(node.className).toContain('border-app-border');
  });

  it('rende il portal con un overlay nero a copertura totale', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ovl</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    const overlay = document.querySelector(
      '[data-radix-dialog-overlay], [data-state="open"].fixed.inset-0',
    );
    // L'overlay generato da Radix ha classi fixed inset-0 bg-black/80
    const fixedFull = Array.from(
      document.body.querySelectorAll<HTMLElement>('div'),
    ).find(
      (el) =>
        el.className.includes('fixed') &&
        el.className.includes('inset-0') &&
        el.className.includes('bg-black/80'),
    );
    expect(overlay || fixedFull).toBeTruthy();
  });

  it('snapshot delle classi base (regressione su centratura/wrapper)', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dlg">
          <DialogHeader>
            <DialogTitle>Snap</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId('dlg').className).toMatchInlineSnapshot(
      `"fixed !left-1/2 !top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg !-translate-x-1/2 !-translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"`,
    );
  });
});

// ----------------------------------------------------
// AlertDialogContent
// ----------------------------------------------------
describe('AlertDialogContent — centratura e scroll', () => {
  it.each([
    ['desktop', 1280],
    ['mobile', 375],
  ])('mantiene le classi standard su viewport %s', (_label, width) => {
    setViewport(width);
    render(
      <AlertDialog open>
        <AlertDialogContent data-testid="alert">
          <AlertDialogHeader>
            <AlertDialogTitle>Sicuro?</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const node = screen.getByTestId('alert');
    CENTERING_CLASSES.forEach((cls) =>
      expect(node.className).toContain(cls),
    );
  });

  it('snapshot delle classi base (regressione)', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent data-testid="alert">
          <AlertDialogHeader>
            <AlertDialogTitle>Snap</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByTestId('alert').className).toMatchInlineSnapshot(
      `"fixed !left-1/2 !top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg !-translate-x-1/2 !-translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"`,
    );
  });
});

// ----------------------------------------------------
// Sheet (laterale) — NON deve essere centrato ma deve
// avere overflow-y-auto e ancoraggio al bordo.
// ----------------------------------------------------
describe('SheetContent — ancoraggio laterale + scroll', () => {
  it('mantiene scroll interno e ancoraggio a destra di default', () => {
    render(
      <Sheet open>
        <SheetContent data-testid="sheet">
          <SheetHeader>
            <SheetTitle>Side</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );
    const node = screen.getByTestId('sheet');
    expect(node.className).toContain('fixed');
    expect(node.className).toContain('right-0');
    expect(node.className).toContain('inset-y-0');
    expect(node.className).toContain('overflow-y-auto');
    expect(node.className).toContain('max-h-screen');
    // NON deve avere le classi di centratura dei dialog
    expect(node.className).not.toContain('!-translate-x-1/2');
  });

  it('su mobile resta full-height (h-full)', () => {
    setViewport(375);
    render(
      <Sheet open>
        <SheetContent data-testid="sheet" side="right">
          <SheetHeader>
            <SheetTitle>Mobile sheet</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );
    const node = screen.getByTestId('sheet');
    expect(node.className).toContain('h-full');
    expect(node.className).toContain('overflow-y-auto');
  });
});
