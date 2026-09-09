import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TouchIntegerInput } from '@/components/pt/TouchIntegerInput';

function CompactHarness({ initial = 11 }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <TouchIntegerInput
      compact
      allowEmpty
      min={0}
      fallback={0}
      value={value}
      aria-label="Reps set 1"
      onCommit={setValue}
      onEmptyCommit={() => setValue(null)}
    />
  );
}

describe('TouchIntegerInput compact', () => {
  it('svuota senza rimettere il numero mentre si scrive', () => {
    render(<CompactHarness />);
    const input = screen.getByLabelText('Reps set 1') as HTMLInputElement;
    expect(input.value).toBe('11');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.blur(input);
    expect(input.value).toBe('8');
  });

  it('su blur campo vuoto resta vuoto', () => {
    render(<CompactHarness />);
    const input = screen.getByLabelText('Reps set 1');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('non mostra i pulsanti −/+', () => {
    render(<CompactHarness />);
    expect(screen.queryByRole('button', { name: 'Diminuisci' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aumenta' })).toBeNull();
  });
});
