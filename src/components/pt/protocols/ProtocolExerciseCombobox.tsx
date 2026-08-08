import { useEffect, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  ExerciseArchivePickerPanel,
  exercisePickerPopoverClassName,
  exercisePickerPopoverProps,
  type ExerciseOption,
  type ExerciseArchivePickerProps,
  dedupeExerciseOptions,
} from '@/components/pt/ExerciseArchivePickerPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export type ProtocolExerciseOption = ExerciseOption;
export { dedupeExerciseOptions };

export type ProtocolExercisePickerProps = Omit<
  ExerciseArchivePickerProps,
  'onSelect' | 'value' | 'showFreeOption' | 'emptyFallback' | 'className' | 'open'
>;

interface ProtocolExerciseComboboxProps extends ProtocolExercisePickerProps {
  value: string;
  onChange: (opt: { id?: string; name: string }) => void;
  /** When true, open the picker (Popover/Drawer) on mount / when it becomes true. */
  autoOpen?: boolean;
  /** Called after autoOpen has been consumed (picker opened). Parent should clear autoOpen. */
  onAutoOpenConsumed?: () => void;
}

export function ProtocolExerciseCombobox({
  value,
  onChange,
  autoOpen = false,
  onAutoOpenConsumed,
  ...pickerProps
}: ProtocolExerciseComboboxProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!autoOpen) return;
    setOpen(true);
    onAutoOpenConsumed?.();
    // Only react to autoOpen flipping true; consumed callback is fire-and-forget.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [autoOpen]);

  const trigger = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn(
        'h-9 w-full justify-between font-normal text-sm',
        !value && 'text-muted-foreground',
      )}
      onClick={() => isMobile && setOpen(true)}
    >
      <span className="truncate text-left">{value || 'Seleziona esercizio'}</span>
      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
    </Button>
  );

  const panel = (
    <ExerciseArchivePickerPanel
      {...pickerProps}
      open={open}
      value={value}
      showFreeOption
      className={isMobile ? 'max-h-[min(65vh,480px)]' : undefined}
      onSelect={(opt) => {
        onChange(opt);
        setOpen(false);
      }}
    />
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[90vh] outline-none">
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>Seleziona esercizio</DrawerTitle>
            </DrawerHeader>
            <div className="min-h-0 overflow-hidden px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {panel}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={exercisePickerPopoverClassName}
        {...exercisePickerPopoverProps}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}
