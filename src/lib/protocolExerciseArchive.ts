import type { ProtocolExerciseOption } from '@/components/pt/protocols/ProtocolExerciseCombobox';

export type ArchiveExerciseRow = {
  id: string;
  name: string;
  is_public: boolean;
  created_by: string | null;
};

export type ProtocolExerciseArchiveGroups = {
  favoriteOptions: ProtocolExerciseOption[];
  mineOptions: ProtocolExerciseOption[];
  globalOptions: ProtocolExerciseOption[];
};

/** Allinea categorie a Archivio Esercizi: preferiti → i miei → globali. */
export function categorizeArchiveExercises(
  rows: ArchiveExerciseRow[],
  opts: {
    userId: string;
    favIds: Set<string>;
    excludeIds?: Set<string>;
  },
): ProtocolExerciseArchiveGroups {
  const exclude = opts.excludeIds ?? new Set<string>();
  const favoriteOptions: ProtocolExerciseOption[] = [];
  const mineOptions: ProtocolExerciseOption[] = [];
  const globalOptions: ProtocolExerciseOption[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row.name?.trim() || exclude.has(row.id) || seen.has(row.id)) continue;
    seen.add(row.id);
    const opt = { id: row.id, name: row.name };

    if (opts.favIds.has(row.id)) {
      favoriteOptions.push(opt);
    } else if (row.created_by === opts.userId && !row.is_public) {
      mineOptions.push(opt);
    } else if (row.is_public || row.created_by === null) {
      globalOptions.push(opt);
    }
  }

  return { favoriteOptions, mineOptions, globalOptions };
}
