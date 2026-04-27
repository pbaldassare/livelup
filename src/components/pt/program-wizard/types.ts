import type { ProgramMode, ProgramScheduleInput } from '@/lib/api/programs';

export type AthleteLevel = 'any' | 'beginner' | 'intermediate' | 'advanced';
export type ProgressionPreset =
  | 'none'
  | 'volume_progressivo'
  | 'carico_progressivo'
  | 'deload'
  | 'personalizzato';

export type DayByDayEntry = {
  id?: string;
  template_id: string;
  day_offset: number;
};

export type WizardData = {
  // Step 1
  name: string;
  description: string;
  durationWeeks: number;
  athleteLevel: AthleteLevel;
  notes: string;
  // Step 2
  mode: ProgramMode;
  // Step 3
  activeDays: number[];
  schedules: ProgramScheduleInput[];
  dayByDayEntries: DayByDayEntry[];
  progressionPreset: ProgressionPreset;
};

export const initialWizardData: WizardData = {
  name: '',
  description: '',
  durationWeeks: 4,
  athleteLevel: 'any',
  notes: '',
  mode: 'recurring',
  activeDays: [1, 3, 5],
  schedules: [],
  dayByDayEntries: [],
  progressionPreset: 'none',
};

export const PROGRESSION_LABELS: Record<ProgressionPreset, string> = {
  none: 'Nessuna progressione',
  volume_progressivo: 'Volume progressivo',
  carico_progressivo: 'Carico progressivo',
  deload: 'Settimana di deload',
  personalizzato: 'Personalizzato',
};
