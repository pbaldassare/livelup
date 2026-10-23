// =====================================================
// Orario appuntamento "Metti nel calendario" + controllo
// sovrapposizioni con gli eventi di PT e atleta nel giorno.
// =====================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchCalendarEventsForDay } from '@/lib/api/workouts';
import {
  buildSlotRange,
  describeConflict,
  eventRangesOnDay,
  findSlotConflicts,
  formatTimeHHmm,
  normalizeDurationMinutes,
  suggestFreeTime,
} from '@/lib/calendarSlots';

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];

export function useAssignmentSlotCheck(params: {
  enabled: boolean;
  ptUserId: string | undefined;
  atletaUserId: string | null | undefined;
  day: Date | undefined;
  time: string;
  durationMinutes: number;
}) {
  const { enabled, ptUserId, atletaUserId, day, time, durationMinutes } = params;
  const dayKey = day ? format(day, 'yyyy-MM-dd') : null;

  const eventsQuery = useQuery({
    queryKey: ['assignment-calendar-day', ptUserId, atletaUserId ?? null, dayKey],
    queryFn: () => fetchCalendarEventsForDay({ ptUserId: ptUserId!, atletaUserId, day: day! }),
    enabled: enabled && !!ptUserId && !!day,
    staleTime: 30_000,
  });

  return useMemo(() => {
    const events = eventsQuery.data ?? [];
    const slot = day ? buildSlotRange(day, time, durationMinutes) : null;
    const conflicts = slot ? findSlotConflicts(slot, events) : [];
    const suggestion =
      day && conflicts.length > 0 ? suggestFreeTime(day, events, durationMinutes, time) : null;
    const busy = day
      ? events
          .flatMap((e) => eventRangesOnDay(e, day).map((r) => ({ id: e.id, title: e.title, ...r })))
          .sort((a, b) => a.start.getTime() - b.start.getTime())
      : [];
    return {
      isLoading: eventsQuery.isLoading && enabled,
      isError: eventsQuery.isError,
      invalidTime: enabled && !slot,
      slot,
      conflicts,
      suggestion,
      busy,
      blocked: enabled && (!slot || conflicts.length > 0 || eventsQuery.isLoading),
    };
  }, [eventsQuery.data, eventsQuery.isLoading, eventsQuery.isError, day, time, durationMinutes, enabled]);
}

export type AssignmentSlotCheck = ReturnType<typeof useAssignmentSlotCheck>;

interface AssignmentCalendarTimeFieldProps {
  idPrefix: string;
  time: string;
  onTimeChange: (time: string) => void;
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  check: AssignmentSlotCheck;
}

export function AssignmentCalendarTimeField({
  idPrefix,
  time,
  onTimeChange,
  durationMinutes,
  onDurationChange,
  check,
}: AssignmentCalendarTimeFieldProps) {
  const duration = normalizeDurationMinutes(durationMinutes);
  const durationOptions = DURATION_OPTIONS.includes(duration)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, duration].sort((a, b) => a - b);

  return (
    <div className="space-y-2 pt-1">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-time`} className="text-xs text-muted-foreground">
            Ora inizio
          </Label>
          <Input
            id={`${idPrefix}-time`}
            type="time"
            step={900}
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-duration`} className="text-xs text-muted-foreground">
            Durata
          </Label>
          <Select value={String(duration)} onValueChange={(v) => onDurationChange(Number(v))}>
            <SelectTrigger id={`${idPrefix}-duration`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {check.isLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Controllo il calendario…
        </p>
      ) : check.invalidTime ? (
        <p className="text-xs text-destructive">Inserisci un orario valido (HH:mm).</p>
      ) : check.conflicts.length > 0 ? (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5">
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Si sovrappone a: {check.conflicts.map(describeConflict).join(', ')}.
            </span>
          </p>
          {check.suggestion ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onTimeChange(check.suggestion!)}
            >
              Usa {check.suggestion} (primo orario libero)
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nessun orario libero in questo giorno: scegli un&apos;altra data o riduci la durata.
            </p>
          )}
        </div>
      ) : check.slot ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          Libero: {formatTimeHHmm(check.slot.start)}–{formatTimeHHmm(check.slot.end)}
        </p>
      ) : null}

      {check.isError && (
        <p className="text-xs text-muted-foreground">
          Non riesco a leggere il calendario: controlla tu che l&apos;orario sia libero.
        </p>
      )}

      {!check.isLoading && check.busy.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Già in calendario quel giorno</p>
          <ul className="space-y-0.5">
            {check.busy.map((b) => (
              <li key={`${b.id}-${b.start.getTime()}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="tabular-nums">
                  {b.allDay ? 'Tutto il giorno' : `${formatTimeHHmm(b.start)}–${formatTimeHHmm(b.end)}`}
                </span>
                <span className="truncate">{b.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
