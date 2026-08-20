/** Cartelle archivio = famiglie video Drive (senza scaricare i file). */
export const EXERCISE_ARCHIVE_CATEGORIES = [
  "Back lever",
  "Bar muscle up",
  "Core",
  "Dip",
  "Dragon press",
  "Front lever",
  "Handstand",
  "Hspu",
  "Human flag",
  "Iron cross",
  "L-sit",
  "Legs",
  "Maltese",
  "Oap",
  "Planche",
  "Pull up",
  "Push Up",
  "Ring muscle up",
  "Stretching",
  "Ted",
  "V-sit",
  "Victorian assisted",
  "Warm-up",
  "Altro"
] as const;

export type ExerciseArchiveCategory = (typeof EXERCISE_ARCHIVE_CATEGORIES)[number];
