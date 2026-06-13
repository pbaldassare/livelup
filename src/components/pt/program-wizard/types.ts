import type { ProgramMode, ProgramScheduleInput } from '@/lib/api/programs';

export type AthleteLevel = 'any' | 'beginner' | 'intermediate' | 'advanced';

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
};
