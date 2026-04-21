import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { getProtocolDef, type ProtocolType } from '@/lib/protocols/registry';
import { cn } from '@/lib/utils';

interface ProtocolInfoPopoverProps {
  type: ProtocolType;
  className?: string;
  size?: 'sm' | 'md';
  /** Forza la visualizzazione anche per il protocollo SET (di default nascosto nel builder). */
  forceShow?: boolean;
}

export function ProtocolInfoPopover({ type, className, size = 'sm', forceShow = false }: ProtocolInfoPopoverProps) {
  // Regola: il protocollo SET è il default base e NON ha introduzione/descrizione nel builder.
  // Con forceShow=true (es. tab Protocolli) viene comunque mostrato.
  if (type === 'SET' && !forceShow) return null;

  const def = getProtocolDef(type);
  const Icon = def.icon;
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 text-muted-foreground hover:text-foreground', className)}
          aria-label={`Informazioni sul protocollo ${def.label}`}
        >
          <Info className={dim} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <h4 className="font-semibold leading-none">{def.label}</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{def.description}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
