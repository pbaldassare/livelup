import { beforeAll, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProtocolNestedExercisesEditor } from '@/components/pt/protocols/ProtocolNestedExercisesEditor';
import {
  makeNestedExercise,
  type NestedProtocolExercise,
} from '@/lib/protocols/nestedExercises';

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

function Harness({ initial }: { initial: NestedProtocolExercise[] }) {
  const [exercises, setExercises] = useState(initial);
  return (
    <ProtocolNestedExercisesEditor
      exercises={exercises}
      onChange={setExercises}
      workoutExerciseOptions={[{ id: 'ex-1', name: 'Trazioni' }]}
    />
  );
}

describe('ProtocolNestedExercisesEditor', () => {
  it('mostra Aggiungi esercizio e aggiunge una riga', () => {
    render(
      <Harness initial={[makeNestedExercise({ id: 'n1', name: 'Trazioni' })]} />,
    );

    expect(screen.getByText('Esercizi del protocollo')).toBeInTheDocument();
    expect(screen.getAllByText('Esercizio')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi esercizio' }));

    expect(screen.getAllByText('Esercizio')).toHaveLength(2);
  });

  it('mostra un campo note su ogni esercizio', () => {
    render(
      <Harness initial={[makeNestedExercise({ id: 'n1', name: 'Trazioni' })]} />,
    );
    expect(screen.getByPlaceholderText('Es. focus tecnica, variazione, intensità…')).toBeInTheDocument();
  });

  it('non elimina l’unico esercizio', () => {
    render(
      <Harness initial={[makeNestedExercise({ id: 'n1', name: 'Trazioni' })]} />,
    );
    expect(screen.getByRole('button', { name: 'Elimina esercizio' })).toBeDisabled();
  });
});
