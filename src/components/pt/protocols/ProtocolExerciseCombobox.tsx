import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ExerciseArchivePickerPanel,
  exercisePickerPopoverClassName,
  exercisePickerPopoverProps,
  type ExerciseOption,
  type ExerciseArchivePickerProps,
  dedupeExerciseOptions,
} from '@/components/pt/ExerciseArchivePickerPanel';
import { cn } from '@/lib/utils';

export type ProtocolExerciseOption = ExerciseOption;
export { dedupeExerciseOptions };

export type ProtocolExercisePickerProps = Omit<
  ExerciseArchivePickerProps,
  'onSelect' | 'value' | 'showFreeOption' | 'emptyFallback'
>;

interface ProtocolExerciseComboboxProps extends ProtocolExercisePickerProps {
  value: string;
  onChange: (opt: { id?: string; name: string }) => void;
}

export function ProtocolExerciseCombobox({
  value,
  onChange,
  ...pickerProps
}: ProtocolExerciseComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-8 w-full justify-between font-normal text-sm',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{value || 'Seleziona esercizio'}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={exercisePickerPopoverClassName}
        {...exercisePickerPopoverProps}
      >
        <ExerciseArchivePickerPanel
          {...pickerProps}
          open={open}
          value={value}
          showFreeOption
          onSelect={(opt) => {
            onChange(opt);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
