import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/hooks/useAuth';
import {
  createAndConnectAtleta,
  findAtletaByEmail,
  inviteExistingAtleta,
  type AtletaLookupResult,
} from '@/lib/api/ptAthletes';
import { FITNESS_LEVELS } from '@/lib/ptAssistantWizard';
import { getAthleteDisplayName } from '@/lib/athleteName';
import { Loader2, Search, UserPlus, UserRoundPlus } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const defaultCreateForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  fitnessLevel: 'nessuno',
  goalsText: '',
};

export function AddAthleteDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'link' | 'create'>('link');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<AtletaLookupResult | null>(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);

  const reset = () => {
    setTab('link');
    setLookupEmail('');
    setLookupResult(null);
    setCreateForm(defaultCreateForm);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const lookupMutation = useMutation({
    mutationFn: () => findAtletaByEmail(lookupEmail),
    onSuccess: (result) => {
      setLookupResult(result);
      if (!result.found) {
        toast.message('Nessun atleta trovato', {
          description: 'Puoi crearne uno nuovo nel tab "Crea nuovo".',
        });
      }
    },
    onError: () => toast.error('Errore durante la ricerca'),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !lookupResult?.user_id) throw new Error('Dati mancanti');
      await inviteExistingAtleta(user.id, lookupResult.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-athletes'] });
      toast.success('Invito inviato — l\'atleta dovrà confermare dall\'app');
      handleOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Impossibile inviare l\'invito');
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const goals = createForm.goalsText
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);
      return createAndConnectAtleta({
        email: createForm.email,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        phone: createForm.phone || undefined,
        fitnessLevel: createForm.fitnessLevel,
        goals,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['pt-athletes'] });
      toast.success(`${created.firstName} ${created.lastName} aggiunto`, {
        description: 'Riceverà un\'email per impostare la password.',
      });
      handleOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Errore durante la creazione');
    },
  });

  const canInvite =
    lookupResult?.found &&
    !lookupResult.has_active_pt &&
    lookupResult.connection_with_me !== 'active' &&
    lookupResult.connection_with_me !== 'pending';

  const inviteBlockedReason = (() => {
    if (!lookupResult?.found) return null;
    if (lookupResult.connection_with_me === 'active') return 'Già collegato a te.';
    if (lookupResult.connection_with_me === 'pending') return 'Invito già in attesa di conferma.';
    if (lookupResult.has_active_pt) return 'Ha già un altro Personal Trainer attivo.';
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Aggiungi atleta
          </DialogTitle>
          <DialogDescription>
            Collega un atleta già registrato oppure crea un nuovo account collegato a te.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'link' | 'create')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Collega esistente</TabsTrigger>
            <TabsTrigger value="create">Crea nuovo</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="lookup-email">Email atleta</Label>
              <div className="flex gap-2">
                <Input
                  id="lookup-email"
                  type="email"
                  placeholder="atleta@email.com"
                  value={lookupEmail}
                  onChange={(e) => {
                    setLookupEmail(e.target.value);
                    setLookupResult(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && lookupEmail.trim() && lookupMutation.mutate()}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!lookupEmail.trim() || lookupMutation.isPending}
                  onClick={() => lookupMutation.mutate()}
                >
                  {lookupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {lookupResult?.found && (
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {getAthleteDisplayName(
                    lookupResult.first_name,
                    lookupResult.last_name,
                    lookupEmail,
                  )}
                </p>
                <p className="text-muted-foreground">{lookupEmail}</p>
                {inviteBlockedReason && (
                  <p className="text-amber-600 dark:text-amber-400 pt-1">{inviteBlockedReason}</p>
                )}
              </div>
            )}

            {lookupResult && !lookupResult.found && (
              <p className="text-sm text-muted-foreground">
                Nessun atleta con questa email. Passa al tab{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => {
                    setTab('create');
                    setCreateForm((f) => ({ ...f, email: lookupEmail }));
                  }}
                >
                  Crea nuovo
                </button>
                .
              </p>
            )}

            <DialogFooter className="sm:justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Annulla
              </Button>
              <Button
                type="button"
                disabled={!canInvite || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Invia invito
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-first">Nome *</Label>
                <Input
                  id="create-first"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-last">Cognome *</Label>
                <Input
                  id="create-last"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-phone">Telefono</Label>
              <Input
                id="create-phone"
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Livello</Label>
              <Select
                value={createForm.fitnessLevel}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, fitnessLevel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FITNESS_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-goals">Obiettivi (separati da virgola)</Label>
              <Input
                id="create-goals"
                placeholder="Es. massa, resistenza"
                value={createForm.goalsText}
                onChange={(e) => setCreateForm((f) => ({ ...f, goalsText: e.target.value }))}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              L&apos;atleta riceverà un&apos;email per impostare la password e comparirà subito tra i tuoi atleti attivi.
            </p>

            <DialogFooter className="sm:justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Annulla
              </Button>
              <Button
                type="button"
                disabled={
                  !createForm.firstName.trim() ||
                  !createForm.lastName.trim() ||
                  !createForm.email.trim() ||
                  createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserRoundPlus className="h-4 w-4 mr-2" />
                )}
                Crea e collega
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
