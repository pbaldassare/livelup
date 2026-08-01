import { Checkbox } from '@/components/ui/checkbox';
import { getAthleteDisplayName } from '@/lib/athleteName';
import { cn } from '@/lib/utils';

export interface AthleteCheckboxOption {
  atleta_user_id: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
}

interface AthleteCheckboxPickerProps {
  athletes: AthleteCheckboxOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  emptyText?: string;
  className?: string;
}

/**
 * Lista checkbox atleti inline (niente Popover/Portal).
 * Usata dentro Dialog/Sheet: il MultiSelectSearch con Popover
 * finisce fuori dal layer modale e non riceve i click.
 */
export function AthleteCheckboxPicker({
  athletes,
  selected,
  onChange,
  emptyText = 'Nessun atleta collegato',
  className,
}: AthleteCheckboxPickerProps) {
  if (athletes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border border-dashed rounded-md p-3 text-center">
        {emptyText}
      </p>
    );
  }

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div
      className={cn(
        'max-h-52 space-y-1 overflow-y-auto rounded-md border border-border p-2',
        className,
      )}
    >
      {athletes.map((a) => {
        const label = getAthleteDisplayName(
          a.profile?.first_name,
          a.profile?.last_name,
          a.profile?.email,
        );
        const checked = selected.includes(a.atleta_user_id);
        return (
          <label
            key={a.atleta_user_id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent/50',
              checked && 'bg-accent/40',
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => toggle(a.atleta_user_id)}
              aria-label={label}
            />
            <span className="truncate">{label}</span>
          </label>
        );
      })}
    </div>
  );
}

export default AthleteCheckboxPicker;
