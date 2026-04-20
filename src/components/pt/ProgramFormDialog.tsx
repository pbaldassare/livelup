import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  CalendarDays,
  Plus,
  Trash2,
  FileText,
  Dumbbell,
  ArrowUp,
  ArrowDown,
  Repeat,
  CalendarRange,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createProgram,
  updateProgram,
  replaceProgramSchedules,
  getProgram,
  describeRotation,
  type ProgramScheduleInput,
  type ProgramMode,
} from '@/lib/api/programs';
import { cn } from '@/lib/utils';

const WEEKDAYS = [
  { iso: 1, label: 'Lun' },
  { iso: 2, label: 'Mar' },
  { iso: 3, label: 'Mer' },
  { iso: 4, label: 'Gio' },
  { iso: 5, label: 'Ven' },
  { iso: 6, label: 'Sab' },
  { iso: 7, label: 'Dom' },
];

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId?: string | null;
}

type DayByDayEntry = {
  template_id: string;
  day_offset: number; // giorni dall'inizio (0 = giorno 1)
};

export function ProgramFormDialog({ open, onOpenChange, programId }: ProgramFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!programId;

  const [mode, setMode] = useState<ProgramMode>('recurring');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [activeDays, setActiveDays] = useState<number[]>([1, 3, 5]);
  const [notes, setNotes] = useState('');
  // Modalità ricorrente: schede in rotazione
  const [schedules, setSchedules] = useState<ProgramScheduleInput[]>([]);
  // Modalità day-by-day: lista di "giorno → scheda"
  const [dayByDayEntries, setDayByDayEntries] = useState<DayByDayEntry[]>([]);
  // Strategia per caso "frequenza > schede" (UI only)
  const [extraStrategy, setExtraStrategy] = useState<'continuous' | 'extra_template'>(
    'continuous',
  );

  const { data: templates = [] } = useQuery({
    queryKey: ['pt-templates-min', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, title, difficulty_level')
        .eq('pt_user_id', user.id)
        .order('title');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const { data: existing } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => getProgram(programId!),
    enabled: !!programId && open,
  });

  useEffect(() => {
    if (open && existing) {
      const existingMode = ((existing as any).mode as ProgramMode) ?? 'recurring';
      setMode(existingMode);
      setName(existing.name);
      setDescription(existing.description ?? '');
      setDurationWeeks(existing.duration_weeks);
      setActiveDays((existing as any).active_days?.length ? (existing as any).active_days : [1, 3, 5]);
      setNotes(existing.notes ?? '');
      const sortedExisting = [...((existing as any).program_schedules || [])].sort(
        (a: any, b: any) => a.order_index - b.order_index,
      );
      if (existingMode === 'day_by_day') {
        const sortedByOffset = [...((existing as any).program_schedules || [])].sort(
          (a: any, b: any) => (a.day_offset ?? 0) - (b.day_offset ?? 0),
        );
        setDayByDayEntries(
          sortedByOffset.map((s: any) => ({
            template_id: s.template_id,
            day_offset: s.day_offset ?? 0,
          })),
        );
        setSchedules([]);
      } else {
        setSchedules(
          sortedExisting.map((s: any) => ({
            template_id: s.template_id,
            day_of_week: s.day_of_week,
            week_offset: s.week_offset,
            order_index: s.order_index,
          })),
        );
        setDayByDayEntries([]);
      }
    } else if (open && !programId) {
      setMode('recurring');
      setName('');
      setDescription('');
      setDurationWeeks(4);
      setActiveDays([1, 3, 5]);
      setNotes('');
      setSchedules([]);
      setDayByDayEntries([]);
      setExtraStrategy('continuous');
    }
  }, [open, existing, programId]);

  const toggleDay = (iso: number) => {
    setActiveDays((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
    );
  };

  // ---- Recurring helpers ----
  const addSchedule = () => {
    if (templates.length === 0) {
      toast.error('Crea prima almeno una scheda');
      return;
    }
    setSchedules((prev) => [
      ...prev,
      {
        template_id: templates[0].id,
        day_of_week: 1,
        week_offset: 0,
        order_index: prev.length,
      },
    ]);
  };
  const removeSchedule = (idx: number) =>
    setSchedules((prev) => prev.filter((_, i) => i !== idx));
  const moveSchedule = (idx: number, dir: -1 | 1) => {
    setSchedules((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };
  const updateScheduleField = (
    idx: number,
    field: keyof ProgramScheduleInput,
    value: any,
  ) => {
    setSchedules((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  // ---- Day-by-day helpers ----
  const addDayByDayEntry = () => {
    if (templates.length === 0) {
      toast.error('Crea prima almeno una scheda');
      return;
    }
    setDayByDayEntries((prev) => {
      const nextOffset =
        prev.length === 0
          ? 0
          : Math.max(...prev.map((p) => p.day_offset)) + 1;
      return [...prev, { template_id: templates[0].id, day_offset: nextOffset }];
    });
  };
  const removeDayByDayEntry = (idx: number) =>
    setDayByDayEntries((prev) => prev.filter((_, i) => i !== idx));
  const updateDayByDayField = (
    idx: number,
    field: keyof DayByDayEntry,
    value: any,
  ) => {
    setDayByDayEntries((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  // Anteprima rotazione (recurring)
  const rotationPreview = (() => {
    if (mode !== 'recurring' || schedules.length === 0) return '';
    const enriched = schedules.map((s, i) => ({
      order_index: i,
      workout_templates: {
        title: templates.find((t) => t.id === s.template_id)?.title,
      },
    }));
    return describeRotation(enriched as any, 2);
  })();

  // Warning: frequenza > schede (solo recurring)
  const showFrequencyWarning =
    mode === 'recurring' && schedules.length > 0 && activeDays.length > schedules.length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!name.trim()) throw new Error('Inserisci un nome');

      if (mode === 'recurring') {
        if (activeDays.length === 0)
          throw new Error('Seleziona almeno un giorno di allenamento');
        if (schedules.length === 0)
          throw new Error('Aggiungi almeno una scheda al programma');
      } else {
        if (dayByDayEntries.length === 0)
          throw new Error('Aggiungi almeno un giorno al programma');
      }

      const dayByDaySchedules: ProgramScheduleInput[] = [...dayByDayEntries]
        .sort((a, b) => a.day_offset - b.day_offset)
        .map((e, i) => ({
          template_id: e.template_id,
          day_offset: e.day_offset,
          order_index: i,
        }));

      if (isEdit && programId) {
        await updateProgram(programId, {
          name: name.trim(),
          description: description.trim() || null,
          duration_weeks: durationWeeks,
          frequency_per_week: mode === 'recurring' ? activeDays.length : dayByDayEntries.length,
          active_days: mode === 'recurring' ? activeDays : [],
          notes: notes.trim() || null,
        });
        await replaceProgramSchedules(
          programId,
          mode === 'recurring' ? schedules : dayByDaySchedules,
          mode,
        );
      } else {
        await createProgram({
          ptUserId: user.id,
          name: name.trim(),
          description: description.trim() || undefined,
          durationWeeks,
          frequencyPerWeek: mode === 'recurring' ? activeDays.length : dayByDayEntries.length,
          activeDays: mode === 'recurring' ? activeDays : [],
          notes: notes.trim() || undefined,
          schedules: mode === 'recurring' ? schedules : dayByDaySchedules,
          mode,
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
      toast.error(err instanceof Error ? err.message : 'Errore');
    },
  });

  const canSubmit =
    name.trim().length > 0 &&
    (mode === 'recurring'
      ? schedules.length > 0 && activeDays.length > 0
      : dayByDayEntries.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="h-5 w-5 text-primary" />
            {isEdit ? 'Modifica Programma' : 'Nuovo Programma'}
          </DialogTitle>
          <DialogDescription>
            Scegli come distribuire le schede nel tempo
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          {/* MODALITÀ */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">
              Modalità programma <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as ProgramMode)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              disabled={isEdit}
            >
              <label
                htmlFor="mode-recurring"
                className={cn(
                  'cursor-pointer rounded-lg border-2 p-4 transition-colors',
                  mode === 'recurring'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50',
                  isEdit && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="recurring" id="mode-recurring" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      <Repeat className="h-4 w-4 text-primary" />
                      Ricorrente
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Schede in rotazione automatica (A→B→C→A…) sui giorni della settimana selezionati.
                    </p>
                  </div>
                </div>
              </label>

              <label
                htmlFor="mode-daybyday"
                className={cn(
                  'cursor-pointer rounded-lg border-2 p-4 transition-colors',
                  mode === 'day_by_day'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50',
                  isEdit && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="day_by_day" id="mode-daybyday" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      <CalendarRange className="h-4 w-4 text-primary" />
                      Day by Day
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assegnazione manuale di una scheda specifica per ogni giorno (utile per trasferte, recupero).
                    </p>
                  </div>
                </div>
              </label>
            </RadioGroup>
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                La modalità non può essere modificata dopo la creazione.
              </p>
            )}
          </section>

          {/* Info base */}
          <section className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Nome programma <span className="text-destructive">*</span>
              </Label>
              <Input
                className="h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  mode === 'recurring' ? 'Es: 4 settimane corpo libero' : 'Es: Settimana trasferta'
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Descrizione</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Per chi è pensato, obiettivi..."
                className="min-h-[60px]"
              />
            </div>

            {mode === 'recurring' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Durata (settimane)</Label>
                  <Input
                    className="h-11"
                    type="number"
                    min={1}
                    max={52}
                    value={durationWeeks}
                    onChange={(e) =>
                      setDurationWeeks(Math.max(1, Number(e.target.value) || 1))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Frequenza /sett.</Label>
                  <div className="h-11 flex items-center px-3 rounded-md border bg-muted/40 text-sm">
                    {activeDays.length}x ({activeDays.length === 0 ? 'nessun giorno' : 'da giorni attivi'})
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* === MODALITÀ RICORRENTE === */}
          {mode === 'recurring' && (
            <>
              {/* Giorni attivi */}
              <section className="space-y-2">
                <Label className="text-sm font-semibold">
                  Giorni di allenamento <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <Toggle
                      key={d.iso}
                      pressed={activeDays.includes(d.iso)}
                      onPressedChange={() => toggleDay(d.iso)}
                      variant="outline"
                      size="sm"
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {d.label}
                    </Toggle>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Le schede vengono distribuite SOLO nei giorni selezionati, in rotazione continua.
                </p>
              </section>

              {/* Schede in rotazione */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Schede in rotazione{' '}
                    <span className="text-muted-foreground font-normal">
                      ({schedules.length})
                    </span>
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addSchedule}>
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi
                  </Button>
                </div>

                {schedules.length === 0 ? (
                  <Card className="p-6 text-center border-dashed">
                    <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nessuna scheda nel programma. Aggiungine almeno una.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((sch, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-start gap-2">
                          <Badge
                            variant="secondary"
                            className="h-7 w-7 rounded-full flex items-center justify-center p-0 flex-shrink-0 mt-0.5 font-bold"
                          >
                            {String.fromCharCode(65 + idx)}
                          </Badge>

                          <div className="flex-1">
                            <Select
                              value={sch.template_id}
                              onValueChange={(v) => updateScheduleField(idx, 'template_id', v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Scheda..." />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => moveSchedule(idx, -1)}
                              disabled={idx === 0}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => moveSchedule(idx, 1)}
                              disabled={idx === schedules.length - 1}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive flex-shrink-0"
                            onClick={() => removeSchedule(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {rotationPreview && (
                  <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">
                    <div className="flex items-center gap-2 text-primary font-medium mb-1">
                      <Repeat className="h-4 w-4" />
                      Sequenza ciclica
                    </div>
                    <p className="text-foreground/90 break-words">{rotationPreview}</p>
                  </div>
                )}

                {showFrequencyWarning && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          Frequenza ({activeDays.length}x) maggiore del numero di schede ({schedules.length})
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Scegli come gestire i giorni in eccesso:
                        </p>
                      </div>
                    </div>
                    <RadioGroup
                      value={extraStrategy}
                      onValueChange={(v) => setExtraStrategy(v as typeof extraStrategy)}
                      className="space-y-2 pl-6"
                    >
                      <label
                        htmlFor="extra-continuous"
                        className="flex items-start gap-2 cursor-pointer"
                      >
                        <RadioGroupItem value="continuous" id="extra-continuous" className="mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Rotazione continua</div>
                          <div className="text-xs text-muted-foreground">
                            Le schede continuano a ruotare ciclicamente (A→B→C→A→B…)
                          </div>
                        </div>
                      </label>
                      <label
                        htmlFor="extra-template"
                        className="flex items-start gap-2 cursor-not-allowed opacity-60"
                      >
                        <RadioGroupItem value="extra_template" id="extra-template" disabled className="mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Genera scheda aggiuntiva</div>
                          <div className="text-xs text-muted-foreground">
                            Disponibile prossimamente
                          </div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>
                )}
              </section>
            </>
          )}

          {/* === MODALITÀ DAY BY DAY === */}
          {mode === 'day_by_day' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  Giornate programmate{' '}
                  <span className="text-muted-foreground font-normal">
                    ({dayByDayEntries.length})
                  </span>
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addDayByDayEntry}>
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi giorno
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Indica per ogni giorno (espresso come offset dalla data di inizio assegnazione) quale scheda assegnare. Il <strong>Giorno 1</strong> coincide con la data di inizio scelta in fase di assegnazione.
              </p>

              {dayByDayEntries.length === 0 ? (
                <Card className="p-6 text-center border-dashed">
                  <CalendarRange className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nessuna giornata aggiunta. Premi "Aggiungi giorno" per iniziare.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {dayByDayEntries
                    .map((e, i) => ({ ...e, _idx: i }))
                    .sort((a, b) => a.day_offset - b.day_offset)
                    .map((entry) => {
                      const idx = entry._idx;
                      return (
                        <Card key={idx} className="p-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-20">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                Giorno
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                value={entry.day_offset + 1}
                                onChange={(e) =>
                                  updateDayByDayField(
                                    idx,
                                    'day_offset',
                                    Math.max(0, (Number(e.target.value) || 1) - 1),
                                  )
                                }
                                className="h-9 mt-0.5"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                Scheda
                              </Label>
                              <Select
                                value={entry.template_id}
                                onValueChange={(v) =>
                                  updateDayByDayField(idx, 'template_id', v)
                                }
                              >
                                <SelectTrigger className="h-9 mt-0.5">
                                  <SelectValue placeholder="Scheda..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-destructive flex-shrink-0 self-end"
                              onClick={() => removeDayByDayEntry(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </section>
          )}

          {/* Note */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">Note (opzionale)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indicazioni generali..."
              className="min-h-[60px]"
            />
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
