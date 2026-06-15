import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// =====================================================
// Test: standardizzazione centratura popup
// Verifica che DialogContent e AlertDialogContent abbiano
// SEMPRE le classi di centratura forzata e lo scroll
// interno per contenuti lunghi.
// =====================================================

const REQUIRED_CLASSES = [
  'fixed',
  '!left-1/2',
  '!top-1/2',
  '!-translate-x-1/2',
  '!-translate-y-1/2',
  'max-h-[90vh]',
  'overflow-y-auto',
];

describe('Popup centering — DialogContent', () => {
  it('rende le classi di centratura assoluta + scroll interno', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dlg">
          <DialogHeader>
            <DialogTitle>Test</DialogTitle>
          </DialogHeader>
          <p>Body</p>
        </DialogContent>
      </Dialog>,
    );
    const node = screen.getByTestId('dlg');
    REQUIRED_CLASSES.forEach((cls) => {
      expect(node.className).toContain(cls);
    });
  });

  it('mantiene la centratura anche con className custom', () => {
    render(
      <Dialog open>
        <DialogContent
          data-testid="dlg"
          className="sm:max-w-[640px] bg-card"
        >
          <DialogHeader>
            <DialogTitle>Custom</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    const node = screen.getByTestId('dlg');
    REQUIRED_CLASSES.forEach((cls) => {
      expect(node.className).toContain(cls);
    });
    // anche le custom devono restare
    expect(node.className).toContain('sm:max-w-[640px]');
    expect(node.className).toContain('bg-card');
  });

  it('gestisce contenuti molto lunghi senza perdere lo scroll', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dlg">
          <DialogHeader>
            <DialogTitle>Long</DialogTitle>
          </DialogHeader>
          {Array.from({ length: 200 }).map((_, i) => (
            <p key={i}>Riga {i}</p>
          ))}
        </DialogContent>
      </Dialog>,
    );
    const node = screen.getByTestId('dlg');
    expect(node.className).toContain('max-h-[90vh]');
    expect(node.className).toContain('overflow-y-auto');
  });
});

describe('Popup centering — AlertDialogContent', () => {
  it('rende le classi di centratura assoluta + scroll interno', () => {
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
    REQUIRED_CLASSES.forEach((cls) => {
      expect(node.className).toContain(cls);
    });
  });
});
