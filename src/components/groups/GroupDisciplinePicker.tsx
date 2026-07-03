import { useQuery } from '@tanstack/react-query';
import { getDisciplines } from '@/lib/api/groups';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GroupDisciplinePickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function GroupDisciplinePicker({
  value,
  onChange,
  disabled,
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

  return (
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
              'rounded-full border px-3 py-1 text-xs transition-colors',
              selected
                ? 'border-app-accent bg-app-accent/20 text-app-accent'
                : 'border-app-border text-app-muted-foreground hover:border-app-accent/50',
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
        <Badge variant="outline" className="text-xs">
          {value.length} selezionate
        </Badge>
      )}
    </div>
  );
}
