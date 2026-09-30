import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AtletaSupersetPlayer } from '@/components/app/AtletaSupersetPlayer';

const params = {
  supersets_count: 1,
  rest_between_exercises_enabled: false,
  rest_between_supersets: 0,
  exercises: [
    { id: 'a', exercise_id: 'ex-a', name: 'Australian pullup', mode: 'reps', reps: 10 },
    { id: 'b', exercise_id: 'ex-b', name: 'Dip', mode: 'reps', reps: 8 },
  ],
};

describe('AtletaSupersetPlayer', () => {
  it('registra le ripetizioni fatte davvero per ogni esercizio', () => {
    const onFinished = vi.fn();
    render(<AtletaSupersetPlayer exerciseName="Superset" protocolParams={params} onFinished={onFinished} />);

    fireEvent.click(screen.getByRole('button', { name: /inizia superset/i }));

    const input = screen.getByLabelText('Ripetizioni fatte') as HTMLInputElement;
    expect(input.value).toBe('10');
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: /completato/i }));

    expect((screen.getByLabelText('Ripetizioni fatte') as HTMLInputElement).value).toBe('8');
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta' }));
    fireEvent.click(screen.getByRole('button', { name: /completato/i }));

    expect(onFinished).toHaveBeenCalledTimes(1);
    const { results } = onFinished.mock.calls[0][0];
    expect(results).toEqual([
      expect.objectContaining({ round: 1, exercise_index: 0, exercise_id: 'ex-a', target: 10, done: 7 }),
      expect.objectContaining({ round: 1, exercise_index: 1, exercise_id: 'ex-b', target: 8, done: 9 }),
    ]);
  });

  it('scheda progressiva: blocca se le ripetizioni sono sotto il previsto', () => {
    const onFinished = vi.fn();
    render(
      <AtletaSupersetPlayer
        exerciseName="Superset"
        protocolParams={{ ...params, exercises: [params.exercises[0]] }}
        onFinished={onFinished}
        requireFullCompletion
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /inizia superset/i }));
    fireEvent.change(screen.getByLabelText('Ripetizioni fatte'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /completato/i }));
    expect(onFinished).not.toHaveBeenCalled();
  });
});
