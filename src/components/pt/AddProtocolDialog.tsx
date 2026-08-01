import { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProtocolDef, type ProtocolType } from '@/lib/protocols/registry';
import { ProtocolInfoPopover } from '@/components/protocols/ProtocolInfoPopover';
import {
  useMineProtocols,
  useStandardProtocols,
  useFavoriteProtocolIds,
  useToggleFavoriteProtocol,
} from '@/hooks/usePTFavoriteProtocols';
import type { PtProtocol, StandardProtocol } from '@/lib/api/ptProtocols';
import { cn } from '@/lib/utils';

export type AddProtocolResult =
  | {
      mode: 'standard' | 'new';
      type: Exclude<ProtocolType, 'SET'>;
      name: string;
      hostExerciseId: string;
      hostExerciseName: string;
      /** Salva copia privata del PT (mai modifica standard) */
      saveAsMine: boolean;
      favorite: boolean;
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
  exerciseOptions: ExerciseOpt[];
  onConfirm: (result: AddProtocolResult) => void;
  isSubmitting?: boolean;
}

export function AddProtocolDialog({
  open,
  onOpenChange,
  exerciseOptions,
  onConfirm,
  isSubmitting,
}: AddProtocolDialogProps) {
  const { data: mine = [] } = useMineProtocols();
  const { data: standards = [] } = useStandardProtocols();
  const { data: favIds } = useFavoriteProtocolIds();
  const toggleFav = useToggleFavoriteProtocol();

  const [tab, setTab] = useState<'standard' | 'mine' | 'favorites'>('standard');
  const [hostExerciseId, setHostExerciseId] = useState('');

  // Personalizza da standard
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [pendingStandard, setPendingStandard] = useState<StandardProtocol | null>(null);
  const [customName, setCustomName] = useState('');
  const [saveAsMine, setSaveAsMine] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const favoriteMine = useMemo(
    () => mine.filter((p) => favIds?.has(p.id)),
    [mine, favIds],
  );

  const hostName = exerciseOptions.find((e) => e.id === hostExerciseId)?.name || '';

  const reset = () => {
    setHostExerciseId('');
    setCustomizeOpen(false);
    setPendingStandard(null);
    setCustomName('');
    setSaveAsMine(false);
    setFavorite(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const startUseStandard = (std: StandardProtocol) => {
    setPendingStandard(std);
    setCustomName(std.name);
    setSaveAsMine(false);
    setFavorite(false);
    setCustomizeOpen(true);
  };

  const confirmStandard = () => {
    if (!pendingStandard || !hostExerciseId) return;
    onConfirm({
      mode: saveAsMine || favorite ? 'new' : 'standard',
      type: pendingStandard.type,
      name: customName.trim() || pendingStandard.name,
      hostExerciseId,
      hostExerciseName: hostName,
      saveAsMine: saveAsMine || favorite,
      favorite,
    });
  };

  const submitMine = (protocol: PtProtocol) => {
    const fromConfig =
      (typeof protocol.config?.host_exercise_id === 'string' && protocol.config.host_exercise_id) ||
      hostExerciseId;
    if (!fromConfig) return;
    const exName =
      exerciseOptions.find((e) => e.id === fromConfig)?.name ||
      hostName ||
      protocol.name;
    onConfirm({
      mode: 'mine',
      protocol,
      hostExerciseId: fromConfig,
      hostExerciseName: exName,
    });
  };

  const HostPicker = () => (
    <div className="pt-2 space-y-1.5 border-t mt-2">
      <Label className="text-xs">Esercizio iniziale</Label>
      <Select value={hostExerciseId} onValueChange={setHostExerciseId}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Seleziona esercizio…" />
        </SelectTrigger>
        <SelectContent>
          {exerciseOptions.map((ex) => (
            <SelectItem key={ex.id} value={ex.id}>
              {ex.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Obbligatorio per aggiungere il protocollo alla scheda. Puoi aggiungere altri esercizi dopo.
      </p>
    </div>
  );

  const StandardList = () => (
    <div className="space-y-2 max-h-[320px] overflow-y-auto">
      <p className="text-xs text-muted-foreground px-0.5">
        Protocolli standard della piattaforma — uguali per tutti, non modificabili.
        Personalizzandoli crei una tua copia privata.
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
              variant="ghost"
              size="icon"
              className="shrink-0"
              title="Personalizza e aggiungi ai miei preferiti"
              onClick={() =>
                toggleFav.mutate({
                  protocolId: std.id,
                  isFavorite: false,
                  standard: std,
                })
              }
            >
              <Star className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => startUseStandard(std)}
            >
              Usa
            </Button>
          </div>
        );
      })}
    </div>
  );

  const MineList = ({ items, empty }: { items: PtProtocol[]; empty: string }) => {
    if (items.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
      );
    }
    return (
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {items.map((p) => {
          const def = getProtocolDef(p.type);
          const Icon = def.icon;
          const isFav = favIds?.has(p.id) ?? false;
          const needsHost = !p.config?.host_exercise_id && !hostExerciseId;
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.02] p-3 hover:bg-muted/40"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  Tuo · {def.label}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() =>
                  toggleFav.mutate({ protocolId: p.id, isFavorite: isFav })
                }
                title={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    isFav ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground',
                  )}
                />
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={needsHost || isSubmitting}
                onClick={() => submitMine(p)}
              >
                Aggiungi
              </Button>
            </div>
          );
        })}
        <HostPicker />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aggiungi protocollo</DialogTitle>
          <DialogDescription>
            Gli standard restano uguali per tutti. Le tue personalizzazioni sono solo tue.
          </DialogDescription>
        </DialogHeader>

        {!customizeOpen ? (
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as typeof tab)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="mine">I miei</TabsTrigger>
              <TabsTrigger value="favorites">Preferiti</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="mt-3">
              <StandardList />
            </TabsContent>

            <TabsContent value="mine" className="mt-3">
              <MineList
                items={mine}
                empty='Nessun protocollo personalizzato. Usa uno Standard e attiva "Salva nei miei".'
              />
            </TabsContent>

            <TabsContent value="favorites" className="mt-3">
              <MineList
                items={favoriteMine}
                empty="Nessun preferito. Dalla tab Standard o I miei, tocca la stella."
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-sm font-medium">
                Standard: {pendingStandard?.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Puoi usarlo così com&apos;è, oppure salvarne una copia personale.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="protocol-name">Nome nella scheda</Label>
              <Input
                id="protocol-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Es. Tabata full body"
              />
            </div>

            <HostPicker />

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Salva nei miei</p>
                <p className="text-[11px] text-muted-foreground">
                  Crea una copia privata (lo standard resta intatto)
                </p>
              </div>
              <Switch
                checked={saveAsMine}
                onCheckedChange={(v) => {
                  setSaveAsMine(v);
                  if (!v) setFavorite(false);
                }}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-sm font-medium">Preferito</p>
                  <p className="text-[11px] text-muted-foreground">
                    Salva nei miei e marca preferito
                  </p>
                </div>
              </div>
              <Switch
                checked={favorite}
                onCheckedChange={(v) => {
                  setFavorite(v);
                  if (v) setSaveAsMine(true);
                }}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setCustomizeOpen(false)}>
                Indietro
              </Button>
              <Button
                disabled={!hostExerciseId || !customName.trim() || isSubmitting}
                onClick={confirmStandard}
              >
                Aggiungi alla scheda
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
