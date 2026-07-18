import { useState, useEffect, useMemo } from 'react';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createWorkout } from '@/lib/api/workouts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  CalendarIcon,
  ChevronsUpDown,
  Dumbbell,
  Users,
  FileText,
  CheckCircle2,
  Check,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// ASSIGN WORKOUT DIALOG
// Assegna template / scheda custom con ripetizione opzionale
// =====================================================

interface ConnectedAthlete {
  id: string;
  atleta_user_id: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface WorkoutTemplate {
  id: string;
  title: string;
  difficulty_level: string;
  template_kind: 'libera' | 'propedeutica' | 'progressiva';
  estimated_duration: number | null;
  exerciseCount: number;
}

type Frequency = 'once' | 'weekly' | 'multi_weekly';

const WEEKDAYS: { idx: number; short: string; label: string }[] = [
  { idx: 1, short: 'L', label: 'Lun' },
  { idx: 2, short: 'M', label: 'Mar' },
  { idx: 3, short: 'M', label: 'Mer' },
  { idx: 4, short: 'G', label: 'Gio' },
  { idx: 5, short: 'V', label: 'Ven' },
  { idx: 6, short: 'S', label: 'Sab' },
  { idx: 0, short: 'D', label: 'Dom' },
];

interface AssignWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedAthleteId?: string;
  preselectedTemplateId?: string;
}

export function AssignWorkoutDialog({
  open,
  onOpenChange,
  preselectedAthleteId,
  preselectedTemplateId,
}: AssignWorkoutDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [selectedAthleteId, setSelectedAthleteId] = useState(preselectedAthleteId || '');
  const [workoutSource, setWorkoutSource] = useState<'template' | 'custom'>(
    preselectedTemplateId ? 'template' : 'template',
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId || '');
  const [customTitle, setCustomTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [templateKind, setTemplateKind] = useState<'libera' | 'propedeutica' | 'progressiva'>('libera');

  // Repetition state
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [athletePickerOpen, setAthletePickerOpen] = useState(false);

  // Sync preselected values when dialog opens
  useEffect(() => {
    if (open) {
      if (preselectedTemplateId) {
        setSelectedTemplateId(preselectedTemplateId);
        setWorkoutSource('template');
      }
      if (preselectedAthleteId) {
        setSelectedAthleteId(preselectedAthleteId);
      }
    }
  }, [open, preselectedTemplateId, preselectedAthleteId]);

  // Sync tipologia dal template selezionato (moved below templates query)

  // Fetch connected athletes
  const { data: athletes = [] } = useQuery({
    queryKey: ['connected-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url')
            .eq('user_id', conn.atleta_user_id)
            .single();

          return {
            ...conn,
            profile: profile || { first_name: null, last_name: null, email: null, avatar_url: null },
          };
        }),
      );

      return enriched as ConnectedAthlete[];
    },
    enabled: !!user?.id && open,
  });

  // Fetch templates with exercise count
  const { data: templates = [] } = useQuery({
    queryKey: ['pt-templates-with-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id,
          title,
          difficulty_level,
          template_kind,
          estimated_duration,
          template_exercises (id)
        `)
        .eq('pt_user_id', user.id)
        .order('title');

      if (error) throw error;

      return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        difficulty_level: t.difficulty_level,
        template_kind: (t.template_kind ?? 'libera') as WorkoutTemplate['template_kind'],
        estimated_duration: t.estimated_duration,
        exerciseCount: t.template_exercises?.length || 0,
      })) as WorkoutTemplate[];
    },
    enabled: !!user?.id && open,
  });

  const selectedAthlete = athletes.find((a) => a.atleta_user_id === selectedAthleteId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Sync tipologia dal template selezionato (fallback 'libera' per schede custom)
  useEffect(() => {
    if (workoutSource === 'template') {
      setTemplateKind(selectedTemplate?.template_kind ?? 'libera');
    } else {
      setTemplateKind('libera');
    }
  }, [selectedTemplateId, workoutSource, selectedTemplate?.template_kind]);


  // Compute generated dates based on frequency
  const generatedDates = useMemo<Date[]>(() => {
    if (!scheduledDate) return [];

    const startDate = new Date(scheduledDate);
    startDate.setHours(0, 0, 0, 0);
    const stop = endDate ? new Date(endDate) : null;
    if (stop) stop.setHours(23, 59, 59, 999);

    // Cap to avoid runaway generation
    const MAX_OCCURRENCES = 60;

    if (frequency === 'once') {
      return [startDate];
    }

    const dates: Date[] = [startDate];

    if (frequency === 'weekly') {
      // Weekly = same weekday as startDate, every 7 days
      let cursor = new Date(startDate);
      while (dates.length < MAX_OCCURRENCES) {
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
        if (stop && cursor > stop) break;
        if (!stop && dates.length >= 8) break; // default 8 settimane se nessuna data fine
        dates.push(new Date(cursor));
      }
      return dates;
    }

    if (frequency === 'multi_weekly') {
      if (selectedDays.length === 0) return [startDate];
      // Walk day by day from startDate, keep matching weekdays
      const cursor = new Date(startDate);
      cursor.setDate(cursor.getDate() + 1);
      const limitDate = stop || (() => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + 28); // default 4 settimane
        return d;
      })();
      while (cursor <= limitDate && dates.length < MAX_OCCURRENCES) {
        if (selectedDays.includes(cursor.getDay())) {
          dates.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return dates;
    }

    return [startDate];
  }, [scheduledDate, endDate, frequency, selectedDays]);

  // Assign workout mutation (supports multi)
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!selectedAthleteId) throw new Error('Seleziona un atleta');
      if (generatedDates.length === 0) throw new Error('Seleziona almeno una data');

      const athleteConn = athletes.find((a) => a.atleta_user_id === selectedAthleteId);
      if (!athleteConn) throw new Error('Atleta non trovato');

      // Resolve title + exercises payload + circuiti
      let title: string;
      let templateId: string | undefined;
      let exercisesPayload: Array<{
        exerciseId: string;
        orderIndex: number;
        prescribedSets: number;
        prescribedRepsMin?: number | null;
        prescribedRepsMax?: number | null;
        restSeconds?: number | null;
        notes?: string | null;
        setsData?: any;
        protocolType?: string;
        protocolParams?: any;
        blockTempId?: string;
      }> = [];
      let blocksPayload:
        | Array<{ tempId: string; orderIndex: number; type: string; name?: string | null; params?: any }>
        | undefined;

      if (workoutSource === 'template') {
        if (!selectedTemplateId) throw new Error('Seleziona un template');
        const template = templates.find((t) => t.id === selectedTemplateId);
        if (!template) throw new Error('Template non trovato');

        const [{ data: templateExercises, error }, { data: templateBlocks, error: blocksErr }] = await Promise.all([
          supabase
            .from('template_exercises')
            .select('*')
            .eq('template_id', selectedTemplateId)
            .order('order_index'),
          supabase
            .from('template_blocks')
            .select('id, order_index, type, name, params')
            .eq('template_id', selectedTemplateId)
            .order('order_index'),
        ]);
        if (error) throw error;
        if (blocksErr) throw blocksErr;

        // Mappa block_id originale → tempId riusabile dall'API workouts
        blocksPayload = (templateBlocks || []).map((b: any) => ({
          tempId: b.id, // riuso l'id template come tempId — è solo un alias locale
          orderIndex: b.order_index,
          type: (b.type as any) || 'SET',
          name: b.name ?? null,
          params: b.params ?? {},
        }));

        title = template.title;
        templateId = selectedTemplateId;
        exercisesPayload = (templateExercises || []).map((te: any) => ({
          exerciseId: te.exercise_id,
          orderIndex: te.order_index,
          prescribedSets: te.sets,
          prescribedRepsMin: te.reps_min,
          prescribedRepsMax: te.reps_max,
          prescribedDurationSeconds: te.prescribed_duration_seconds ?? null,
          restSeconds: te.rest_seconds,
          notes: te.notes,
          setsData: te.sets_data ?? null,
          protocolType: te.protocol_type ?? 'SET',
          protocolParams: te.protocol_params ?? {},
          blockTempId: te.block_id ?? undefined,
        }));
      } else {
        if (!customTitle) throw new Error('Inserisci un titolo');
        title = customTitle;
      }

      // Check existing workouts on those dates to skip duplicates
      const isoDates = generatedDates.map((d) => d.toISOString().slice(0, 10));
      const { data: existing } = await supabase
        .from('workouts')
        .select('scheduled_date, title')
        .eq('atleta_user_id', selectedAthleteId)
        .eq('pt_user_id', user.id)
        .neq('status', 'completato')
        .gte('scheduled_date', `${isoDates[0]}T00:00:00.000Z`)
        .lte('scheduled_date', `${isoDates[isoDates.length - 1]}T23:59:59.999Z`);

      const existingDateSet = new Set(
        (existing || [])
          .filter((w) => w.title === title)
          .map((w) =>
            w.scheduled_date ? new Date(w.scheduled_date).toISOString().slice(0, 10) : '',
          ),
      );

      let created = 0;
      let skipped = 0;
      for (const date of generatedDates) {
        const iso = date.toISOString().slice(0, 10);
        if (existingDateSet.has(iso)) {
          skipped++;
          continue;
        }
        await createWorkout({
          atletaUserId: selectedAthleteId,
          ptUserId: user.id,
          title,
          description: workoutSource === 'custom' ? notes : undefined,
          templateId,
          templateKind,
          scheduledDate: date.toISOString(),
          exercises: exercisesPayload,
          blocks: blocksPayload,
        });
        created++;
      }

      // Notify athlete (single notification)
      if (created > 0) {
        await supabase.from('notifications').insert({
          user_id: selectedAthleteId,
          type: 'workout_assigned',
          title:
            created === 1
              ? 'Nuovo allenamento!'
              : `${created} allenamenti assegnati`,
          body:
            created === 1
              ? `Il tuo Coach ti ha assegnato: ${title}`
              : `Il tuo Coach ti ha assegnato la scheda "${title}" su ${created} giorni`,
          action_url: '/app/scheda',
          data: { pt_user_id: user.id, template_id: templateId },
        });
      }

      return { created, skipped };
    },
    onSuccess: ({ created, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ['pt-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      if (created === 0) {
        toast.warning('Nessun allenamento creato (date già occupate)');
      } else if (skipped > 0) {
        toast.success(`${created} allenamenti assegnati (${skipped} saltati)`);
      } else {
        toast.success(
          created === 1
            ? 'Allenamento assegnato con successo!'
            : `${created} allenamenti assegnati con successo!`,
        );
      }
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Errore durante l'assegnazione");
    },
  });

  const resetForm = () => {
    setSelectedAthleteId(preselectedAthleteId || '');
    setWorkoutSource('template');
    setSelectedTemplateId(preselectedTemplateId || '');
    setCustomTitle('');
    setScheduledDate(new Date());
    setEndDate(undefined);
    setNotes('');
    setFrequency('once');
    setSelectedDays([]);
  };

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort(),
    );
  };

  const submitDisabled =
    assignMutation.isPending ||
    !selectedAthleteId ||
    !scheduledDate ||
    (workoutSource === 'template' && !selectedTemplateId) ||
    (workoutSource === 'custom' && !customTitle) ||
    (frequency === 'multi_weekly' && selectedDays.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Dumbbell className="h-5 w-5 text-primary" />
            Assegna Allenamento
          </DialogTitle>
          <DialogDescription>
            Assegna un template esistente o crea una scheda personalizzata
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {/* Banner template preselezionato */}
            {preselectedTemplateId && selectedTemplate && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-primary font-medium">
                    Stai assegnando
                  </p>
                  <p className="font-semibold text-foreground truncate">
                    {selectedTemplate.title}
                  </p>
                </div>
                <Badge variant="outline" className="flex-shrink-0">
                  {selectedTemplate.exerciseCount} es.
                </Badge>
              </div>
            )}

            {/* === Atleta === */}
            <section className="space-y-2">
              <Label className="text-sm font-semibold">
                Atleta <span className="text-destructive">*</span>
              </Label>
              {athletes.length === 0 ? (
                <div className="flex h-11 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-2 opacity-50" />
                  Nessun atleta collegato
                </div>
              ) : (
                <Popover open={athletePickerOpen} onOpenChange={setAthletePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={athletePickerOpen}
                      className="h-11 w-full justify-between font-normal"
                    >
                      {selectedAthlete ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={selectedAthlete.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getAthleteInitials(
                                selectedAthlete.profile?.first_name,
                                selectedAthlete.profile?.last_name,
                                selectedAthlete.profile?.email,
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">
                            {getAthleteDisplayName(
                              selectedAthlete.profile?.first_name,
                              selectedAthlete.profile?.last_name,
                              selectedAthlete.profile?.email,
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Seleziona atleta...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Cerca atleta..." />
                      <CommandList>
                        <CommandEmpty>Nessun atleta trovato</CommandEmpty>
                        <CommandGroup>
                          {athletes.map((athlete) => {
                            const name = getAthleteDisplayName(
                              athlete.profile?.first_name,
                              athlete.profile?.last_name,
                              athlete.profile?.email,
                            );
                            const searchValue = [name, athlete.profile?.email]
                              .filter(Boolean)
                              .join(' ');
                            return (
                              <CommandItem
                                key={athlete.atleta_user_id}
                                value={searchValue}
                                onSelect={() => {
                                  setSelectedAthleteId(athlete.atleta_user_id);
                                  setAthletePickerOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4 shrink-0',
                                    selectedAthleteId === athlete.atleta_user_id
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                <Avatar className="h-6 w-6 mr-2 shrink-0">
                                  <AvatarImage src={athlete.profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getAthleteInitials(
                                      athlete.profile?.first_name,
                                      athlete.profile?.last_name,
                                      athlete.profile?.email,
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{name}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </section>

            {/* === Tipo scheda === */}
            <section className="space-y-3">
              <Label className="text-sm font-semibold">Tipo scheda</Label>
              <RadioGroup
                value={workoutSource}
                onValueChange={(v) => setWorkoutSource(v as 'template' | 'custom')}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="src-template"
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    workoutSource === 'template'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <RadioGroupItem value="template" id="src-template" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Template</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      Usa una scheda esistente
                    </p>
                  </div>
                </Label>
                <Label
                  htmlFor="src-custom"
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    workoutSource === 'custom'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <RadioGroupItem value="custom" id="src-custom" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Personalizzata</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      Crea nuova scheda
                    </p>
                  </div>
                </Label>
              </RadioGroup>
            </section>

            {/* === Template === */}
            {workoutSource === 'template' && (
              <section className="space-y-2">
                <Label className="text-sm font-semibold">
                  Template <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Seleziona template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nessun template creato</p>
                      </div>
                    ) : (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{template.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {template.exerciseCount} es.
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedTemplate && selectedTemplate.exerciseCount === 0 && (
                  <p className="text-xs text-warning">
                    ⚠️ Questo template non ha esercizi configurati
                  </p>
                )}
              </section>
            )}

            {/* === Custom Title === */}
            {workoutSource === 'custom' && (
              <section className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">
                  Titolo scheda <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Es: Scheda Forza - Settimana 1"
                  className="h-11"
                />
              </section>
            )}

            {/* === Tipologia scheda === */}
            <section className="space-y-2 p-4 rounded-lg border border-border bg-muted/20">
              <Label className="text-sm font-semibold">
                Tipologia scheda <span className="text-destructive">*</span>
              </Label>
              <Select
                value={templateKind}
                onValueChange={(v) => setTemplateKind(v as 'libera' | 'propedeutica' | 'progressiva')}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="libera">Libera — l'atleta può riordinare</SelectItem>
                  <SelectItem value="propedeutica">Propedeutica — ordine consigliato</SelectItem>
                  <SelectItem value="progressiva">Progressiva — un esercizio alla volta</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {templateKind === 'libera' &&
                  'L\'atleta potrà cambiare l\'ordine degli esercizi.'}
                {templateKind === 'propedeutica' &&
                  'Ordine consigliato dal Coach. L\'atleta può passare all\'esercizio successivo anche senza completare tutti i set.'}
                {templateKind === 'progressiva' &&
                  'L\'atleta deve completare tutti i set di un esercizio prima di passare al successivo.'}
              </p>
            </section>

            {/* === Ripetizione === */}
            <section className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Ripetizione allenamento</Label>
              </div>

              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Una volta</SelectItem>
                  <SelectItem value="weekly">Ogni settimana (stesso giorno)</SelectItem>
                  <SelectItem value="multi_weekly">X volte a settimana</SelectItem>
                </SelectContent>
              </Select>

              {frequency === 'multi_weekly' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Seleziona i giorni della settimana
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => {
                      const active = selectedDays.includes(d.idx);
                      return (
                        <button
                          key={d.idx}
                          type="button"
                          onClick={() => toggleDay(d.idx)}
                          className={cn(
                            'h-9 px-3 rounded-md text-xs font-medium border transition-all',
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:border-primary/50',
                          )}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Data inizio <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-10 bg-background',
                          !scheduledDate && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {scheduledDate
                            ? format(scheduledDate, 'd MMM yyyy', { locale: it })
                            : 'Seleziona'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        locale={it}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {frequency !== 'once' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Data fine (opzionale)
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal h-10 bg-background',
                            !endDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {endDate
                              ? format(endDate, 'd MMM yyyy', { locale: it })
                              : 'Nessuna'}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          locale={it}
                          disabled={(d) =>
                            scheduledDate ? d < scheduledDate : false
                          }
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Preview occorrenze */}
              {generatedDates.length > 0 && frequency !== 'once' && (
                <div className="text-xs text-muted-foreground p-2 rounded bg-background border border-border">
                  Verranno create{' '}
                  <span className="font-semibold text-foreground">
                    {generatedDates.length}
                  </span>{' '}
                  occorrenze • prima:{' '}
                  <span className="font-medium text-foreground">
                    {format(generatedDates[0], 'd MMM', { locale: it })}
                  </span>
                  {generatedDates.length > 1 && (
                    <>
                      {' '}
                      • ultima:{' '}
                      <span className="font-medium text-foreground">
                        {format(generatedDates[generatedDates.length - 1], 'd MMM', {
                          locale: it,
                        })}
                      </span>
                    </>
                  )}
                </div>
              )}
            </section>

            {/* === Note === */}
            <section className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Note per l'atleta
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Istruzioni o raccomandazioni..."
                rows={3}
                className="resize-none"
              />
            </section>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={submitDisabled}
            className="min-w-[140px]"
          >
            {assignMutation.isPending
              ? 'Assegnando...'
              : generatedDates.length > 1
                ? `Assegna (${generatedDates.length})`
                : 'Assegna'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignWorkoutDialog;
