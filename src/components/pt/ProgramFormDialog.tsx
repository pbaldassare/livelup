import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createProgram,
  updateProgram,
  replaceProgramSchedules,
  getProgram,
  countActiveAssignments,
  type ProgramScheduleInput,
  type ProgramMode,
} from '@/lib/api/programs';
import { WizardProgress } from './program-wizard/WizardProgress';
import { Step1Info } from './program-wizard/Step1Info';
import { Step2Mode } from './program-wizard/Step2Mode';
import { Step3Planner } from './program-wizard/Step3Planner';
import { Step4Timeline } from './program-wizard/Step4Timeline';
import { Step5Review } from './program-wizard/Step5Review';
import {
  initialWizardData,
  type WizardData,
  type ProgressionPreset,
  PROGRESSION_LABELS,
} from './program-wizard/types';

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId?: string | null;
}

const STEPS = [
  { label: 'Dati programma', short: 'Info' },
  { label: 'Modalità', short: 'Modalità' },
  { label: 'Costruzione', short: 'Planner' },
  { label: 'Timeline', short: 'Timeline' },
  { label: 'Riepilogo', short: 'Conferma' },
];

const PROGRESSION_PREFIX_RX = /^\[progression:(\w+)\](?:\n|$)/;

function extractProgression(notes: string | null | undefined): {
  preset: ProgressionPreset;
  cleanNotes: string;
} {
  if (!notes) return { preset: 'none', cleanNotes: '' };
  const m = notes.match(PROGRESSION_PREFIX_RX);
  if (m && m[1] in PROGRESSION_LABELS) {
    return {
      preset: m[1] as ProgressionPreset,
      cleanNotes: notes.replace(PROGRESSION_PREFIX_RX, '').trim(),
    };
  }
  return { preset: 'none', cleanNotes: notes };
}

function buildNotes(preset: ProgressionPreset, notes: string): string | null {
  const trimmed = notes.trim();
  if (preset === 'none') return trimmed || null;
  return `[progression:${preset}]\n${trimmed}`.trim();
}

export function ProgramFormDialog({
  open,
  onOpenChange,
  programId,
}: ProgramFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!programId;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialWizardData);

  const patch = (p: Partial<WizardData>) => setData((prev) => ({ ...prev, ...p }));

  const { data: existing } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => getProgram(programId!),
    enabled: !!programId && open,
  });

  const { data: activeAssignmentsCount = 0 } = useQuery({
    queryKey: ['program-active-assignments', programId],
    queryFn: () => countActiveAssignments(programId!),
    enabled: !!programId && open,
  });

  const [initialMode, setInitialMode] = useState<ProgramMode | null>(null);
  const [initialDuration, setInitialDuration] = useState<number | null>(null);
  const [initialSchedulesCount, setInitialSchedulesCount] = useState<number | null>(null);

  // Reset / load
  useEffect(() => {
    if (!open) return;
    if (existing) {
      const existingMode = ((existing as any).mode as ProgramMode) ?? 'recurring';
      const { preset, cleanNotes } = extractProgression((existing as any).notes);
      const allSchedules = ((existing as any).program_schedules || []) as any[];
      const sortedRecurring = [...allSchedules].sort(
        (a, b) => a.order_index - b.order_index,
      );
      const sortedDayByDay = [...allSchedules].sort(
        (a, b) => (a.day_offset ?? 0) - (b.day_offset ?? 0),
      );

      setData({
        name: existing.name,
        description: existing.description ?? '',
        durationWeeks: existing.duration_weeks,
        athleteLevel: 'any',
        notes: cleanNotes,
        mode: existingMode,
        activeDays:
          (existing as any).active_days?.length > 0
            ? (existing as any).active_days
            : [1, 3, 5],
        schedules:
          existingMode === 'recurring'
            ? sortedRecurring.map((s: any) => ({
                id: s.id,
                template_id: s.template_id,
                day_of_week: s.day_of_week,
                week_offset: s.week_offset,
                order_index: s.order_index,
              }))
            : [],
        dayByDayEntries:
          existingMode === 'day_by_day'
            ? sortedDayByDay.map((s: any) => ({
                id: s.id,
                template_id: s.template_id,
                day_offset: s.day_offset ?? 0,
              }))
            : [],
        progressionPreset: preset,
      });
      setInitialMode(existingMode);
      setInitialDuration(existing.duration_weeks);
      setInitialSchedulesCount(allSchedules.length);
      setStep(isEdit ? 3 : 1);
    } else if (!programId) {
      setData(initialWizardData);
      setInitialMode(null);
      setInitialDuration(null);
      setInitialSchedulesCount(null);
      setStep(1);
    }
  }, [open, existing, programId, isEdit]);

  // Step validation
  const stepValid = (s: number): boolean => {
    if (s === 1) return data.name.trim().length > 0 && data.durationWeeks >= 1;
    if (s === 2) return !!data.mode;
    if (s === 3) {
      if (data.mode === 'recurring') {
        return data.schedules.length > 0 && data.activeDays.length > 0;
      }
      return data.dayByDayEntries.length > 0;
    }
    return true;
  };

  const canSubmit = stepValid(1) && stepValid(2) && stepValid(3);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!canSubmit) throw new Error('Compila tutti i passaggi richiesti');

      const finalNotes = buildNotes(data.progressionPreset, data.notes);

      const dayByDaySchedules: ProgramScheduleInput[] = [...data.dayByDayEntries]
        .sort((a, b) => a.day_offset - b.day_offset)
        .map((e, i) => ({
          id: e.id,
          template_id: e.template_id,
          day_offset: e.day_offset,
          order_index: i,
        }));

      // Conferma per programmi assegnati
      if (isEdit && activeAssignmentsCount > 0) {
        const modeChanged = initialMode && initialMode !== data.mode;
        const durationChanged =
          initialDuration !== null && initialDuration !== data.durationWeeks;
        const currentCount =
          data.mode === 'recurring' ? data.schedules.length : data.dayByDayEntries.length;
        const countChanged =
          initialSchedulesCount !== null && initialSchedulesCount !== currentCount;

        if (modeChanged || durationChanged || countChanged) {
          const ok = window.confirm(
            `Stai per modificare un programma assegnato a ${activeAssignmentsCount} atleta/i.\n\n` +
              `Le modifiche si applicheranno SOLO agli allenamenti futuri. Lo storico resta invariato.\n\n` +
              `Vuoi procedere?`,
          );
          if (!ok) throw new Error('__cancelled__');
        }
      }

      if (isEdit && programId) {
        await updateProgram(programId, {
          name: data.name.trim(),
          description: data.description.trim() || null,
          duration_weeks: data.durationWeeks,
          frequency_per_week:
            data.mode === 'recurring' ? data.activeDays.length : data.dayByDayEntries.length,
          active_days: data.mode === 'recurring' ? data.activeDays : [],
          notes: finalNotes,
        });
        await replaceProgramSchedules(
          programId,
          data.mode === 'recurring' ? data.schedules : dayByDaySchedules,
          data.mode,
        );
      } else {
        await createProgram({
          ptUserId: user.id,
          name: data.name.trim(),
          description: data.description.trim() || undefined,
          durationWeeks: data.durationWeeks,
          frequencyPerWeek:
            data.mode === 'recurring' ? data.activeDays.length : data.dayByDayEntries.length,
          activeDays: data.mode === 'recurring' ? data.activeDays : [],
          notes: finalNotes ?? undefined,
          schedules: data.mode === 'recurring' ? data.schedules : dayByDaySchedules,
          mode: data.mode,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-programs'] });
      queryClient.invalidateQueries({ queryKey: ['program', programId] });
      toast.success(isEdit ? 'Programma aggiornato' : 'Programma creato');
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Errore';
      if (msg === '__cancelled__') return;
      toast.error(msg);
    },
  });

  const next = () => {
    if (step < STEPS.length && stepValid(step)) setStep(step + 1);
  };
  const prev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="h-5 w-5 text-primary" />
            {isEdit ? 'Modifica Programma' : 'Nuovo Programma'}
          </DialogTitle>
          <DialogDescription>{STEPS[step - 1]?.label}</DialogDescription>
        </DialogHeader>

        <WizardProgress
          currentStep={step}
          totalSteps={STEPS.length}
          steps={STEPS}
          onStepClick={setStep}
        />

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {step === 1 && <Step1Info data={data} onChange={patch} />}
              {step === 2 && <Step2Mode data={data} onChange={patch} isEdit={isEdit} />}
              {step === 3 && <Step3Planner data={data} onChange={patch} />}
              {step === 4 && <Step4Timeline data={data} />}
              {step === 5 && (
                <Step5Review
                  data={data}
                  isEdit={isEdit}
                  activeAssignmentsCount={activeAssignmentsCount}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={step === 1 ? () => onOpenChange(false) : prev}
            disabled={saveMutation.isPending}
          >
            {step === 1 ? (
              'Annulla'
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Indietro
              </>
            )}
          </Button>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            Step {step} di {STEPS.length}
          </span>

          {step < STEPS.length ? (
            <Button onClick={next} disabled={!stepValid(step)}>
              Continua
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !canSubmit}
            >
              {saveMutation.isPending
                ? 'Salvataggio...'
                : isEdit
                  ? 'Salva modifiche'
                  : 'Crea programma'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
