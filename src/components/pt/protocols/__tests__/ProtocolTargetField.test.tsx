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
