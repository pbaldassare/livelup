import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProtocolTargetField } from '@/components/pt/protocols/ProtocolTargetField';
import type { ProtocolExerciseTarget } from '@/lib/protocols/exerciseTarget';

function Harness({ initial = 11 }: { initial?: number }) {
  const [value, setValue] = useState<ProtocolExerciseTarget>({
    mode: 'reps',
    reps: initial,
    duration_seconds: null,
  });
  return (
    <ProtocolTargetField
      value={value}
      onChange={setValue}
    />
  );
}

describe('ProtocolTargetField mobile numeric edit', () => {
  it('svuota il campo senza rimettere 1 mentre si scrive', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Reps') as HTMLInputElement;
    expect(input.value).toBe('11');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: '8' } });
    expect(input.value).toBe('8');
    fireEvent.blur(input);
    expect(input.value).toBe('8');
  });

  it('la X cancella il numero in un tap', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancella numero' }));
    expect((screen.getByLabelText('Reps') as HTMLInputElement).value).toBe('');
  });

  it('− e + regolano il valore', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Diminuisci' }));
    expect((screen.getByLabelText('Reps') as HTMLInputElement).value).toBe('10');
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta' }));
    expect((screen.getByLabelText('Reps') as HTMLInputElement).value).toBe('11');
  });

  it('su blur campo vuoto torna al minimo 1', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Reps');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe('1');
  });
});

function SecondsHarness({ initial = 600 }: { initial?: number }) {
  const [value, setValue] = useState<ProtocolExerciseTarget>({
    mode: 'seconds',
    reps: null,
    duration_seconds: initial,
  });
  return (
    <div>
      <ProtocolTargetField value={value} onChange={setValue} />
      <span data-testid="stored">{value.duration_seconds ?? 'empty'}</span>
    </div>
  );
}

describe('ProtocolTargetField durata min|sec', () => {
  it('in modalità Sec accetta minuti e persiste secondi', () => {
    render(<SecondsHarness initial={60} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unità minuti' }));
    const input = screen.getByLabelText('Durata') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('stored').textContent).toBe('600');
  });

  it('mantiene il toggle Reps | Sec come tipo target', () => {
    render(<SecondsHarness />);
    expect(screen.getByRole('button', { name: 'Reps' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sec' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unità minuti' })).toBeInTheDocument();
  });
});
