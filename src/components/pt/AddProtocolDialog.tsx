import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getProtocolDef, type ProtocolType } from '@/lib/protocols/registry';
import { ProtocolInfoPopover } from '@/components/protocols/ProtocolInfoPopover';
import { useStandardProtocols } from '@/hooks/usePTFavoriteProtocols';
import type { PtProtocol, StandardProtocol } from '@/lib/api/ptProtocols';

export type AddProtocolResult =
  | {
      mode: 'standard' | 'new';
      type: Exclude<ProtocolType, 'SET'>;
      name: string;
      /** Opzionale — flusso semplificato non richiede host in dialog */
      hostExerciseId?: string;
      hostExerciseName?: string;
      /** Salva copia privata del PT (mai modifica standard) — non usato nel flusso semplificato */
      saveAsMine?: boolean;
      favorite?: boolean;
    }
  | {
      mode: 'mine';
      protocol: PtProtocol;
      hostExerciseId: string;
      hostExerciseName: string;
    };

type ExerciseOpt = { id: string; name: string };

interface AddProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mantenuto per compat API; non usato nel flusso standard semplificato */
  exerciseOptions?: ExerciseOpt[];
  onConfirm: (result: AddProtocolResult) => void;
  isSubmitting?: boolean;
}

export function AddProtocolDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: AddProtocolDialogProps) {
  const { data: standards = [] } = useStandardProtocols();

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const useStandard = (std: StandardProtocol) => {
    onConfirm({
      mode: 'standard',
      type: std.type,
      name: std.name,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aggiungi protocollo</DialogTitle>
          <DialogDescription>
            Scegli un protocollo standard e aggiungilo alla scheda. Potrai selezionare gli esercizi dopo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          <p className="text-xs text-muted-foreground px-0.5">
            Protocolli standard della piattaforma — uguali per tutti.
          </p>
          {standards.map((std) => {
            const def = getProtocolDef(std.type);
            const Icon = def.icon;
            return (
              <div
                key={std.type}
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/40"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm flex items-center gap-1.5">
                    {std.name}
                    <ProtocolInfoPopover type={std.type} />
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{std.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => useStandard(std)}
                >
                  Usa
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
