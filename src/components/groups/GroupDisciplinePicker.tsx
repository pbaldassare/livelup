import { useQuery } from '@tanstack/react-query';
import { getDisciplines } from '@/lib/api/groups';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface GroupDisciplinePickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Accordion chiuso di default. Default true. */
  accordion?: boolean;
  label?: string;
  required?: boolean;
}

export function GroupDisciplinePicker({
  value,
  onChange,
  disabled,
  accordion = true,
  label = 'Discipline',
  required = false,
}: GroupDisciplinePickerProps) {
  const { data: disciplines = [], isLoading } = useQuery({
    queryKey: ['pt-types-disciplines'],
    queryFn: getDisciplines,
  });

  const toggle = (id: string) => {
    if (disabled) return;
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-app-muted-foreground">Caricamento discipline...</p>;
  }

  const chips = (
    <div className="flex flex-wrap gap-2">
      {disciplines.map((d) => {
        const selected = value.includes(d.id);
        return (
          <button
            key={d.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(d.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              selected
                ? 'border-app-accent bg-app-accent/15 text-app-foreground'
                : 'border-border bg-muted/40 text-foreground hover:border-app-accent/50',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {d.name}
          </button>
        );
      })}
      {value.length === 0 && (
        <p className="text-xs text-app-muted-foreground w-full">
          Seleziona almeno una disciplina
        </p>
      )}
      {value.length > 0 && (
        <Badge
          variant="outline"
          className="text-xs border-app-accent/40 text-app-accent bg-app-accent/10"
        >
          {value.length} selezionate
        </Badge>
      )}
    </div>
  );

  const title = (
    <span>
      {label}
      {required ? ' *' : ''}
      {value.length > 0 ? (
        <span className="ml-1 font-normal text-muted-foreground">({value.length})</span>
      ) : null}
    </span>
  );

  if (!accordion) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {chips}
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="disciplines" className="border rounded-xl px-3 border-border">
        <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
          {title}
        </AccordionTrigger>
        <AccordionContent>{chips}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
