import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  GripVertical,
  Repeat,
  CalendarRange,
  Copy,
  AlertTriangle,
  ExternalLink,
  Dumbbell,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { describeRotation } from '@/lib/api/programs';
import type { WizardData } from './types';

const WEEKDAYS = [
  { iso: 1, label: 'Lun' },
  { iso: 2, label: 'Mar' },
  { iso: 3, label: 'Mer' },
  { iso: 4, label: 'Gio' },
  { iso: 5, label: 'Ven' },
  { iso: 6, label: 'Sab' },
  { iso: 7, label: 'Dom' },
];

interface Props {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

export function Step3Planner({ data, onChange }: Props) {
  const { user } = useAuth();

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
    enabled: !!user?.id,
  });

  const noTemplates = templates.length === 0;

  const toggleDay = (iso: number) => {
    const next = data.activeDays.includes(iso)
      ? data.activeDays.filter((d) => d !== iso)
      : [...data.activeDays, iso].sort();
    onChange({ activeDays: next });
  };

  // ---- RECURRING handlers ----
  const addSchedule = () => {
    if (noTemplates) return;
    onChange({
      schedules: [
        ...data.schedules,
        {
          template_id: templates[0].id,
          day_of_week: 1,
          week_offset: 0,
          order_index: data.schedules.length,
        },
      ],
    });
  };
  const removeSchedule = (idx: number) =>
    onChange({ schedules: data.schedules.filter((_, i) => i !== idx) });
  const updateSchedule = (idx: number, template_id: string) =>
    onChange({
      schedules: data.schedules.map((s, i) =>
        i === idx ? { ...s, template_id } : s,
      ),
    });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = [...data.schedules];
    const [removed] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, removed);
    onChange({ schedules: next.map((s, i) => ({ ...s, order_index: i })) });
  };

  // ---- DAY BY DAY handlers ----
  const addDayEntry = (weekIdx: number, dayInWeek: number) => {
    if (noTemplates) return;
    const offset = weekIdx * 7 + dayInWeek;
    if (data.dayByDayEntries.some((e) => e.day_offset === offset)) return;
    onChange({
      dayByDayEntries: [
        ...data.dayByDayEntries,
        { template_id: templates[0].id, day_offset: offset },
      ],
    });
  };
  const updateDayEntry = (offset: number, template_id: string) =>
    onChange({
      dayByDayEntries: data.dayByDayEntries.map((e) =>
        e.day_offset === offset ? { ...e, template_id } : e,
      ),
    });
  const removeDayEntry = (offset: number) =>
    onChange({
      dayByDayEntries: data.dayByDayEntries.filter((e) => e.day_offset !== offset),
    });
  const duplicateWeek = (weekIdx: number) => {
    const weekEntries = data.dayByDayEntries.filter(
      (e) => Math.floor(e.day_offset / 7) === weekIdx,
    );
    if (weekEntries.length === 0) return;
    const targetWeek = weekIdx + 1;
    if (targetWeek >= data.durationWeeks) return;
    const newEntries = weekEntries
      .map((e) => ({
        template_id: e.template_id,
        day_offset: (e.day_offset % 7) + targetWeek * 7,
      }))
      .filter((ne) => !data.dayByDayEntries.some((e) => e.day_offset === ne.day_offset));
    onChange({ dayByDayEntries: [...data.dayByDayEntries, ...newEntries] });
  };

  // Rotazione preview
  const rotationPreview =
    data.mode === 'recurring' && data.schedules.length > 0
      ? describeRotation(
          data.schedules.map((s, i) => ({
            order_index: i,
            workout_templates: {
              title: templates.find((t) => t.id === s.template_id)?.title,
            },
          })) as any,
          2,
        )
      : '';

  const showFrequencyWarning =
    data.mode === 'recurring' &&
    data.schedules.length > 0 &&
    data.activeDays.length > data.schedules.length;

  if (noTemplates) {
    return (
      <Card className="p-6 text-center border-dashed">
        <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Nessuna scheda disponibile</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Per costruire un programma devi prima creare almeno una scheda.
        </p>
        <Button asChild>
          <Link to="/pt/workouts">
            <ExternalLink className="h-4 w-4 mr-2" />
            Vai a Schede
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.mode === 'recurring' ? (
        <>
          <section className="space-y-2">
            <Label className="text-sm font-semibold">
              Giorni di allenamento <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <Toggle
                  key={d.iso}
                  pressed={data.activeDays.includes(d.iso)}
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
              Le schede ruotano in modo continuo nei giorni selezionati.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Schede in rotazione
                <Badge variant="secondary" className="text-[10px]">
                  {data.schedules.length}
                </Badge>
              </Label>
              <Button type="button" size="sm" variant="outline" onClick={addSchedule}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Aggiungi
              </Button>
            </div>

            {data.schedules.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <p className="text-sm text-muted-foreground">
                  Nessuna scheda. Aggiungine almeno una per definire la rotazione.
                </p>
              </Card>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="schedules">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
                    >
                      {data.schedules.map((sch, idx) => (
                        <Draggable
                          key={`${idx}-${sch.template_id}`}
                          draggableId={`${idx}-${sch.template_id}`}
                          index={idx}
                        >
                          {(prov, snap) => (
                            <Card
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={cn(
                                'p-3 transition-shadow',
                                snap.isDragging && 'shadow-lg ring-2 ring-primary/30',
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  {...prov.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="h-7 w-7 rounded-full flex items-center justify-center p-0 font-bold"
                                >
                                  {String.fromCharCode(65 + idx)}
                                </Badge>
                                <Select
                                  value={sch.template_id}
                                  onValueChange={(v) => updateSchedule(idx, v)}
                                >
                                  <SelectTrigger className="h-9 flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {templates.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeSchedule(idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}

            {rotationPreview && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">
                <div className="flex items-center gap-2 text-primary font-medium mb-1">
                  <Repeat className="h-3.5 w-3.5" />
                  Sequenza ciclica
                </div>
                <p className="text-foreground/90 break-words text-xs">
                  {rotationPreview}
                </p>
              </div>
            )}

            {showFrequencyWarning && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                <span>
                  Hai {data.activeDays.length} giorni attivi ma solo {data.schedules.length}{' '}
                  schede. La rotazione continuerà ciclicamente (A→B→C→A…).
                </span>
              </div>
            )}
          </section>

          <Card className="p-3 bg-muted/30 border-dashed">
            <Link
              to="/pt/workouts"
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Crea una nuova scheda nell'archivio
            </Link>
          </Card>
        </>
      ) : (
        <DayByDayPlanner
          data={data}
          templates={templates}
          addDayEntry={addDayEntry}
          updateDayEntry={updateDayEntry}
          removeDayEntry={removeDayEntry}
          duplicateWeek={duplicateWeek}
        />
      )}
    </div>
  );
}

// ===========================================
// DAY BY DAY sub-component (grid settimane)
// ===========================================
function DayByDayPlanner({
  data,
  templates,
  addDayEntry,
  updateDayEntry,
  removeDayEntry,
  duplicateWeek,
}: {
  data: WizardData;
  templates: { id: string; title: string }[];
  addDayEntry: (weekIdx: number, dayInWeek: number) => void;
  updateDayEntry: (offset: number, template_id: string) => void;
  removeDayEntry: (offset: number) => void;
  duplicateWeek: (weekIdx: number) => void;
}) {
  const weeks = Array.from({ length: data.durationWeeks }, (_, i) => i);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pianifica giorno per giorno. Il <strong>Giorno 1</strong> coincide con la data di inizio
        scelta in fase di assegnazione.
      </p>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {weeks.map((weekIdx) => {
          const weekEntries = data.dayByDayEntries
            .filter((e) => Math.floor(e.day_offset / 7) === weekIdx)
            .sort((a, b) => a.day_offset - b.day_offset);

          return (
            <Card key={weekIdx} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarRange className="h-3.5 w-3.5 text-primary" />
                  Settimana {weekIdx + 1}
                  {weekEntries.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {weekEntries.length}
                    </Badge>
                  )}
                </h4>
                {weekEntries.length > 0 && weekIdx + 1 < data.durationWeeks && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => duplicateWeek(weekIdx)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Duplica
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, dayInWeek) => {
                  const offset = weekIdx * 7 + dayInWeek;
                  const entry = data.dayByDayEntries.find((e) => e.day_offset === offset);
                  const dayLabel = ['L', 'M', 'M', 'G', 'V', 'S', 'D'][dayInWeek];

                  return (
                    <div
                      key={dayInWeek}
                      className={cn(
                        'rounded-md border min-h-[68px] p-1.5 flex flex-col gap-1 transition-colors',
                        entry
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-dashed hover:border-primary/30 cursor-pointer',
                      )}
                      onClick={() => !entry && addDayEntry(weekIdx, dayInWeek)}
                    >
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {dayLabel}
                        <span className="ml-1 text-muted-foreground/60">{offset + 1}</span>
                      </div>
                      {entry ? (
                        <>
                          <Select
                            value={entry.template_id}
                            onValueChange={(v) => updateDayEntry(offset, v)}
                          >
                            <SelectTrigger
                              className="h-6 text-[10px] px-1 truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((t) => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                  {t.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDayEntry(offset);
                            }}
                            className="text-[10px] text-destructive hover:underline self-start"
                          >
                            Rimuovi
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <Plus className="h-3 w-3 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {data.dayByDayEntries.length === 0 && (
        <p className="text-xs text-warning text-center">
          Aggiungi almeno una giornata per continuare.
        </p>
      )}
    </div>
  );
}
