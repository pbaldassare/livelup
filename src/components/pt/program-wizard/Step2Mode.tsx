import { Repeat, CalendarRange, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { WizardData } from './types';
import type { ProgramMode } from '@/lib/api/programs';

interface Props {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  isEdit?: boolean;
}

const MODES: {
  value: ProgramMode;
  title: string;
  icon: typeof Repeat;
  description: string;
  example: string;
  tooltip: string;
}[] = [
  {
    value: 'recurring',
    title: 'Ricorrente',
    icon: Repeat,
    description:
      'Schede in rotazione automatica nei giorni della settimana selezionati.',
    example: 'Es: Lun=Push, Mer=Pull, Ven=Legs → ripete ogni settimana.',
    tooltip:
      'La sequenza ciclica continua senza resettarsi. Ideale per programmi a struttura fissa.',
  },
  {
    value: 'day_by_day',
    title: 'Day by Day',
    icon: CalendarRange,
    description:
      'Una scheda specifica per ogni giorno preciso del programma.',
    example: 'Es: Giorno 1=Test, Giorno 3=Tecnica, Giorno 7=Forza...',
    tooltip:
      'Controllo totale: ogni giornata è pianificata individualmente. Ideale per percorsi su misura, trasferte, recuperi.',
  },
];

export function Step2Mode({ data, onChange, isEdit }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-base">Scegli la modalità</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Determina come distribuirai le schede nel tempo.
          </p>
        </div>

        {isEdit && (
          <div className="rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground">
            La modalità non può essere modificata dopo la creazione.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map((m) => {
            const selected = data.mode === m.value;
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                type="button"
                disabled={isEdit}
                onClick={() => !isEdit && onChange({ mode: m.value })}
                className={cn(
                  'text-left rounded-xl border-2 p-4 transition-all relative',
                  selected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30',
                  isEdit && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-6 w-6 rounded-full bg-muted/60 flex items-center justify-center cursor-help"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">
                      <p className="text-xs">{m.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <h4 className="font-semibold mb-1">{m.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{m.description}</p>
                <p className="text-[11px] text-muted-foreground/80 italic">{m.example}</p>
                {selected && (
                  <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
