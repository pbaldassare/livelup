import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DurationUnitInput } from '@/components/pt/DurationUnitInput';

function Harness({ initial = 600 }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <div>
      <DurationUnitInput
        valueSeconds={value}
        onCommitSeconds={setValue}
        minSeconds={1}
        stepSeconds={30}
        fallbackSeconds={600}
        aria-label="Durata totale"
      />
      <span data-testid="stored">{value ?? 'empty'}</span>
    </div>
  );
}

describe('DurationUnitInput', () => {
  it('digitare 90 in sec persiste 90 secondi', () => {
    render(<Harness initial={600} />);
    const input = screen.getByLabelText('Durata totale') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('stored').textContent).toBe('90');
    expect(input.value).toBe('90');
  });

  it('digitare 10 in min persiste 600 secondi', () => {
    render(<Harness initial={60} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unità minuti' }));
    const input = screen.getByLabelText('Durata totale') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('stored').textContent).toBe('600');
    expect(input.value).toBe('10');
  });

  it('il toggle min converte 600s in 10 senza perdere secondi', () => {
    render(<Harness initial={600} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unità minuti' }));
    expect((screen.getByLabelText('Durata totale') as HTMLInputElement).value).toBe('10');
    expect(screen.getByTestId('stored').textContent).toBe('600');
  });

  it('passando a min con 90s snap al minuto più vicino (120s)', () => {
    render(<Harness initial={90} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unità minuti' }));
    expect(screen.getByTestId('stored').textContent).toBe('120');
    expect((screen.getByLabelText('Durata totale') as HTMLInputElement).value).toBe('2');
  });

  it('in minuti + avanza di 1 minuto', () => {
    render(<Harness initial={600} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unità minuti' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta' }));
    expect(screen.getByTestId('stored').textContent).toBe('660');
    expect((screen.getByLabelText('Durata totale') as HTMLInputElement).value).toBe('11');
  });
});
