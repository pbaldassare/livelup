import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  Calendar,
  Repeat,
  CalendarRange,
  Activity,
  Target,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { PROGRESSION_LABELS, type WizardData } from './types';

interface Props {
  data: WizardData;
  isEdit: boolean;
  activeAssignmentsCount: number;
}

const LEVEL_LABELS = {
  any: 'Qualsiasi',
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzato',
};

export function Step5Review({ data, isEdit, activeAssignmentsCount }: Props) {
  const sessionCount =
    data.mode === 'recurring' ? data.schedules.length : data.dayByDayEntries.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-success/10 via-primary/5 to-transparent border border-primary/20 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <div>
            <h3 className="font-semibold">Tutto pronto!</h3>
            <p className="text-xs text-muted-foreground">
              Verifica i dati e conferma per {isEdit ? 'salvare le modifiche' : 'creare il programma'}.
            </p>
          </div>
        </div>
      </div>

      {isEdit && activeAssignmentsCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            Programma assegnato a {activeAssignmentsCount} atleta
            {activeAssignmentsCount === 1 ? '' : '/i'}
          </AlertTitle>
          <AlertDescription className="text-xs">
            Le modifiche si applicheranno <strong>solo agli allenamenti futuri</strong>. Lo storico
            resta invariato.
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 space-y-3">
        <div>
          <h4 className="font-bold text-lg">{data.name}</h4>
          {data.description && (
            <p className="text-sm text-muted-foreground mt-1">{data.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1">
            {data.mode === 'recurring' ? (
              <Repeat className="h-3 w-3" />
            ) : (
              <CalendarRange className="h-3 w-3" />
            )}
            {data.mode === 'recurring' ? 'Ricorrente' : 'Day by Day'}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            {data.durationWeeks} settimane
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            {sessionCount} {data.mode === 'recurring' ? 'schede in rotazione' : 'sessioni'}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Target className="h-3 w-3" />
            {LEVEL_LABELS[data.athleteLevel]}
          </Badge>
          {data.progressionPreset !== 'none' && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {PROGRESSION_LABELS[data.progressionPreset]}
            </Badge>
          )}
        </div>

        {data.mode === 'recurring' && data.activeDays.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <strong>Giorni:</strong>{' '}
            {data.activeDays
              .map((d) => ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][d - 1])
              .join(', ')}{' '}
            · {data.activeDays.length}x/sett.
          </div>
        )}

        {data.notes && (
          <div className="rounded-lg bg-muted/40 p-2 text-xs">
            <span className="font-semibold">Note Coach:</span> {data.notes}
          </div>
        )}
      </Card>
    </div>
  );
}
