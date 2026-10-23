import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AtletaEmomPlayer } from '@/components/app/AtletaEmomPlayer';

describe('AtletaEmomPlayer', () => {
  it('a fine EMOM mostra il riepilogo e salva quanto fatto in ogni round', () => {
    const onFinished = vi.fn();
    render(
      <AtletaEmomPlayer
        exerciseName="EMOM"
        protocolParams={{
          rounds: 1,
          round_duration: 60,
          blocks: [{ id: 'b1', exercises: [{ id: 'e1', exercise_id: 'ex-1', name: 'Burpees', reps: 12 }] }],
        }}
        onFinished={onFinished}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /inizia emom/i }));
    fireEvent.change(screen.getByLabelText('Ripetizioni fatte'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /prossimo round/i }));

    expect(screen.getByText('Cosa hai fatto?')).toBeInTheDocument();
    const reviewInput = screen.getByLabelText('Burpees: Ripetizioni fatte') as HTMLInputElement;
    expect(reviewInput.value).toBe('10');
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta' }));
    fireEvent.click(screen.getByRole('button', { name: /salva e continua/i }));

    expect(onFinished).toHaveBeenCalledWith({
      results: [expect.objectContaining({ round: 1, exercise_id: 'ex-1', target: 12, done: 11 })],
    });
  });
});
