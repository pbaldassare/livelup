// =====================================================
// DTO per export PDF scheda allenamento
// =====================================================

export type SheetSetRow = {
  setNumber: number;
  reps?: string | null;
  kg?: string | null;
  restSeconds?: number | null;
  durationSeconds?: number | null;
};

export type SheetNestedExercise = {
  name: string;
  reps?: string | null;
  kg?: string | null;
  notes?: string | null;
  sets?: SheetSetRow[];
};

export type SheetExerciseItem = {
  kind: 'exercise';
  name: string;
  category?: string | null;
  muscles?: string[];
  tempo?: string | null;
  notes?: string | null;
  sets: SheetSetRow[];
};

export type SheetProtocolItem = {
  kind: 'protocol';
  protocolType: string;
  protocolLabel: string;
  name: string;
  summary: string;
  notes?: string | null;
  hostExerciseName?: string | null;
  nestedExercises: SheetNestedExercise[];
  paramsLines: string[];
};

export type SheetItem = SheetExerciseItem | SheetProtocolItem;

export type WorkoutSheetDto = {
  title: string;
  ptName?: string | null;
  athleteName?: string | null;
  dateLabel?: string | null;
  kindLabel?: string | null;
  levelLabel?: string | null;
  description?: string | null;
  notesPt?: string | null;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
  items: SheetItem[];
  source: 'template' | 'workout';
};
