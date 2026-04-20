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
import { CalendarDays, Plus, Trash2, FileText, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  createProgram,
  updateProgram,
  replaceProgramSchedules,
  getProgram,
  type ProgramScheduleInput,
} from '@/lib/api/programs';

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

export function ProgramFormDialog({ open, onOpenChange, programId }: ProgramFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!programId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [frequencyPerWeek, setFrequencyPerWeek] = useState(3);
  const [notes, setNotes] = useState('');
  const [schedules, setSchedules] = useState<ProgramScheduleInput[]>([]);

  // Templates del PT
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

  // Carica programma esistente
  const { data: existing } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => getProgram(programId!),
    enabled: !!programId && open,
  });

  useEffect(() => {
    if (open && existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setDurationWeeks(existing.duration_weeks);
      setFrequencyPerWeek(existing.frequency_per_week);
      setNotes(existing.notes ?? '');
      setSchedules(
        ((existing as any).program_schedules || []).map((s: any) => ({
          template_id: s.template_id,
          day_of_week: s.day_of_week,
          week_offset: s.week_offset,
          order_index: s.order_index,
        })),
      );
    } else if (open && !programId) {
      setName('');
      setDescription('');
      setDurationWeeks(4);
      setFrequencyPerWeek(3);
      setNotes('');
      setSchedules([]);
    }
  }, [open, existing, programId]);

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

  const removeSchedule = (idx: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== idx));
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!name.trim()) throw new Error('Inserisci un nome');
      if (schedules.length === 0)
        throw new Error('Aggiungi almeno una scheda al programma');

      if (isEdit && programId) {
        await updateProgram(programId, {
          name: name.trim(),
          description: description.trim() || null,
          duration_weeks: durationWeeks,
          frequency_per_week: frequencyPerWeek,
          notes: notes.trim() || null,
        });
        await replaceProgramSchedules(programId, schedules);
      } else {
        await createProgram({
          ptUserId: user.id,
          name: name.trim(),
          description: description.trim() || undefined,
          durationWeeks,
          frequencyPerWeek,
          notes: notes.trim() || undefined,
          schedules,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="h-5 w-5 text-primary" />
            {isEdit ? 'Modifica Programma' : 'Nuovo Programma'}
          </DialogTitle>
          <DialogDescription>
            Un programma è un insieme di schede distribuite nel tempo
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
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
                placeholder="Es: 4 settimane corpo libero"
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Durata (settimane)</Label>
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  max={52}
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Frequenza /sett.</Label>
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  max={7}
                  value={frequencyPerWeek}
                  onChange={(e) =>
                    setFrequencyPerWeek(Math.max(1, Math.min(7, Number(e.target.value) || 1)))
                  }
                />
              </div>
            </div>
          </section>

          {/* Schede */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Schede del programma{' '}
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
                        className="h-7 w-7 rounded-full flex items-center justify-center p-0 flex-shrink-0 mt-0.5"
                      >
                        {idx + 1}
                      </Badge>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                        <Select
                          value={String(sch.day_of_week)}
                          onValueChange={(v) =>
                            updateScheduleField(idx, 'day_of_week', Number(v))
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAYS.map((d) => (
                              <SelectItem key={d.iso} value={String(d.iso)}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
          </section>

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
            disabled={saveMutation.isPending || !name.trim() || schedules.length === 0}
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
