import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Repeat, CalendarRange } from 'lucide-react';
import type { WizardData } from './types';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

interface Props {
  data: WizardData;
}

export function Step4Timeline({ data }: Props) {
  const { user } = useAuth();

  const { data: templates = [] } = useQuery({
    queryKey: ['pt-templates-min', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, title')
        .eq('pt_user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const titleOf = (id: string) => templates.find((t) => t.id === id)?.title ?? 'Scheda';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Timeline programma
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Anteprima visiva del percorso settimana per settimana.
        </p>
      </div>

      {data.mode === 'recurring' ? (
        <RecurringTimeline data={data} titleOf={titleOf} />
      ) : (
        <DayByDayTimeline data={data} titleOf={titleOf} />
      )}
    </div>
  );
}

function RecurringTimeline({
  data,
  titleOf,
}: {
  data: WizardData;
  titleOf: (id: string) => string;
}) {
  const weeks = Array.from({ length: data.durationWeeks }, (_, i) => i);
  const sortedDays = [...data.activeDays].sort((a, b) => a - b);

  // Simulazione rotazione continua A→B→C→A
  let rotIdx = 0;
  const totalSlots = data.durationWeeks * sortedDays.length;
  const rotation: { week: number; day: number; templateTitle: string }[] = [];
  for (let w = 0; w < data.durationWeeks; w++) {
    for (const d of sortedDays) {
      const sch = data.schedules[rotIdx % Math.max(1, data.schedules.length)];
      rotation.push({
        week: w,
        day: d,
        templateTitle: sch ? titleOf(sch.template_id) : '—',
      });
      rotIdx++;
    }
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {weeks.map((w) => {
        const weekItems = rotation.filter((r) => r.week === w);
        return (
          <div key={w} className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/40 to-transparent" />
            <div className="absolute left-[-3px] top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
            <Card className="p-3 ml-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  Settimana {w + 1}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {weekItems.length} session{weekItems.length === 1 ? 'e' : 'i'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {weekItems.map((item, i) => (
                  <div
                    key={i}
                    className="text-[11px] rounded-md bg-muted/50 px-2 py-1 border"
                  >
                    <span className="font-semibold text-primary">
                      {DAY_LABELS[item.day - 1]}
                    </span>{' '}
                    · {item.templateTitle}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function DayByDayTimeline({
  data,
  titleOf,
}: {
  data: WizardData;
  titleOf: (id: string) => string;
}) {
  const weeks = Array.from({ length: data.durationWeeks }, (_, i) => i);
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {weeks.map((w) => {
        const weekEntries = data.dayByDayEntries
          .filter((e) => Math.floor(e.day_offset / 7) === w)
          .sort((a, b) => a.day_offset - b.day_offset);
        if (weekEntries.length === 0) return null;
        return (
          <div key={w} className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/40 to-transparent" />
            <div className="absolute left-[-3px] top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
            <Card className="p-3 ml-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  Settimana {w + 1}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {weekEntries.map((e) => (
                  <div
                    key={e.day_offset}
                    className="text-[11px] rounded-md bg-muted/50 px-2 py-1 border"
                  >
                    <span className="font-semibold text-primary">G{e.day_offset + 1}</span> ·{' '}
                    {titleOf(e.template_id)}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      })}
      {data.dayByDayEntries.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Nessuna giornata pianificata.
        </p>
      )}
    </div>
  );
}
