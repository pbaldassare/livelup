import { describe, expect, it } from 'vitest';
import {
  buildResultEntry,
  formatEntryValue,
  groupEntriesByRound,
  isEntryShort,
  parseProtocolResults,
  roundLabel,
  sumDoneReps,
  sumDoneSeconds,
} from '@/lib/protocols/protocolResults';

describe('buildResultEntry', () => {
  it('precompila il fatto con il previsto', () => {
    const entry = buildResultEntry({
      round: 1,
      exerciseIndex: 0,
      source: { exercise_id: 'ex-1', name: 'Australian pullup', mode: 'reps', reps: 10 },
      fallbackName: 'Esercizio',
    });
    expect(entry).toMatchObject({ name: 'Australian pullup', mode: 'reps', target: 10, done: 10 });
  });

  it('usa i secondi per gli esercizi a tempo', () => {
    const entry = buildResultEntry({
      round: 2,
      exerciseIndex: 1,
      source: { name: 'Plank', mode: 'seconds', duration_seconds: 30 },
      fallbackName: 'Esercizio',
      done: 25,
    });
    expect(entry).toMatchObject({ mode: 'seconds', target: 30, done: 25 });
    expect(isEntryShort(entry)).toBe(true);
  });

  it('HIIT: reps senza target, fatto a 0 finché l’atleta non lo inserisce', () => {
    const entry = buildResultEntry({
      round: 1,
      exerciseIndex: 0,
      source: { name: 'Burpees' },
      fallbackName: 'Esercizio',
      mode: 'reps',
      target: null,
      done: 0,
    });
    expect(entry).toMatchObject({ target: null, done: 0 });
    expect(isEntryShort(entry)).toBe(false);
  });

  it('non accetta valori negativi', () => {
    const entry = buildResultEntry({ round: 1, exerciseIndex: 0, source: { reps: 10 }, fallbackName: 'X', done: -3 });
    expect(entry.done).toBe(0);
  });
});

describe('totali e formattazione', () => {
  const entries = [
    buildResultEntry({ round: 1, exerciseIndex: 0, source: { name: 'A', reps: 10 }, fallbackName: 'A', done: 8 }),
    buildResultEntry({ round: 1, exerciseIndex: 1, source: { name: 'B', mode: 'seconds', duration_seconds: 20 }, fallbackName: 'B' }),
    buildResultEntry({ round: 2, exerciseIndex: 0, source: { name: 'A', reps: 10 }, fallbackName: 'A', done: 12 }),
  ];

  it('somma reps e secondi separatamente', () => {
    expect(sumDoneReps(entries)).toBe(20);
    expect(sumDoneSeconds(entries)).toBe(20);
  });

  it('formatta fatto/previsto', () => {
    expect(formatEntryValue(entries[0])).toBe('8/10 reps');
    expect(formatEntryValue(entries[1])).toBe('20s/20s');
    expect(formatEntryValue({ mode: 'reps', done: 15, target: null })).toBe('15 reps');
  });

  it('raggruppa per round', () => {
    const groups = groupEntriesByRound(entries);
    expect(groups.map((g) => [g.round, g.entries.length])).toEqual([
      [1, 2],
      [2, 1],
    ]);
    expect(roundLabel('SUPERSET', 2)).toBe('Superset 2');
    expect(roundLabel('AMRAP', null)).toBe('Totale');
  });
});

describe('parseProtocolResults', () => {
  it('legge il JSON salvato e scarta dati non validi', () => {
    expect(parseProtocolResults(null)).toBeNull();
    expect(parseProtocolResults({ entries: [] })).toBeNull();
    const parsed = parseProtocolResults({
      version: 1,
      protocol: 'EMOM',
      entries: [{ round: 1, exercise_index: 0, name: 'Dip', mode: 'reps', target: 10, done: 9 }, 'x'],
    });
    expect(parsed?.protocol).toBe('EMOM');
    expect(parsed?.entries).toHaveLength(1);
    expect(parsed?.entries[0]).toMatchObject({ name: 'Dip', done: 9, target: 10 });
  });
});
