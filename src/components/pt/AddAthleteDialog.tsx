import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { listAthleteCategories } from '@/lib/api/athleteCategories';
import { getAthleteDisplayName } from '@/lib/athleteName';
import { Loader2, Search, UserPlus, UserRoundPlus } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'link' | 'create';
};

const ATHLETE_GOALS = [
  { id: 'perdita_peso', label: 'Perdita peso' },
  { id: 'massa_muscolare', label: 'Massa muscolare' },
  { id: 'tonificazione', label: 'Tonificazione' },
  { id: 'salute', label: 'Salute generale' },
  { id: 'resistenza', label: 'Resistenza' },
  { id: 'flessibilita', label: 'Flessibilità' },
] as const;

const ATHLETE_LEVELS = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
  { value: 'agonista', label: 'Agonista' },
] as const;

const defaultCreateForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  fitnessLevel: '',
  selectedGoals: [] as string[],
};

function invalidateAthleteLists(queryClient: ReturnType<typeof useQueryClient>, ptUserId?: string) {
  queryClient.invalidateQueries({ queryKey: ['pt-athletes'] });
  queryClient.invalidateQueries({ queryKey: ['pt-connections', ptUserId] });
}

export function AddAthleteDialog({ open, onOpenChange, defaultTab = 'link' }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'link' | 'create'>(defaultTab);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<AtletaLookupResult | null>(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [categoryId, setCategoryId] = useState('');

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['pt-athlete-categories'],
    queryFn: () => listAthleteCategories(),
    enabled: open,
  });

  const defaultMixId = useMemo(
    () => categories.find((c) => c.is_system && c.slug === 'mix')?.id ?? '',
    [categories],
  );

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  useEffect(() => {
    if (!open) return;
    if (!categoryId && defaultMixId) {
      setCategoryId(defaultMixId);
    }
  }, [open, categoryId, defaultMixId]);

  const reset = () => {
    setTab(defaultTab);
    setLookupEmail('');
    setLookupResult(null);
    setCreateForm(defaultCreateForm);
    setCategoryId(defaultMixId);
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
          description: 'Puoi crearne uno nuovo con "Crea atleta".',
        });
      }
    },
    onError: () => toast.error('Errore durante la ricerca'),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !lookupResult?.user_id) throw new Error('Dati mancanti');
      if (!categoryId) throw new Error('Seleziona la categoria cliente');
      await inviteExistingAtleta(user.id, lookupResult.user_id, categoryId);
    },
    onSuccess: () => {
      invalidateAthleteLists(queryClient, user?.id);
      toast.success("Invito inviato — l'atleta dovrà confermare dall'app");
      handleOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Impossibile inviare l'invito");
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!categoryId) throw new Error('Seleziona la categoria cliente');
      return createAndConnectAtleta({
        email: createForm.email,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        phone: createForm.phone || undefined,
        fitnessLevel: createForm.fitnessLevel || undefined,
        goals: createForm.selectedGoals,
        categoryId,
      });
    },
    onSuccess: (created) => {
      invalidateAthleteLists(queryClient, user?.id);
      const emailDescription = created.emailSent
        ? "Riceverà un'email con la password temporanea Leone123! — chiedigli di cambiarla subito."
        : "Account creato e collegato. L'email di benvenuto verrà inviata appena il servizio email è attivo.";
      toast.success(`${created.firstName} ${created.lastName} aggiunto tra i tuoi atleti attivi`, {
        description: emailDescription,
      });
      handleOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Errore durante la creazione');
    },
  });

  const toggleGoal = (goalId: string) => {
    setCreateForm((f) => ({
      ...f,
      selectedGoals: f.selectedGoals.includes(goalId)
        ? f.selectedGoals.filter((id) => id !== goalId)
        : [...f.selectedGoals, goalId],
    }));
  };

  const hasCategory = Boolean(categoryId) && !categoryId.startsWith('fallback-');

  const canCreate =
    createForm.firstName.trim().length >= 2 &&
    createForm.lastName.trim().length >= 2 &&
    createForm.email.trim().length > 0 &&
    hasCategory;

  const canInvite =
    lookupResult?.found &&
    !lookupResult.has_active_pt &&
    lookupResult.connection_with_me !== 'active' &&
    lookupResult.connection_with_me !== 'pending' &&
    hasCategory;

  const inviteBlockedReason = (() => {
    if (!lookupResult?.found) return null;
    if (lookupResult.connection_with_me === 'active') return 'Già collegato a te.';
    if (lookupResult.connection_with_me === 'pending') return 'Invito già in attesa di conferma.';
    if (lookupResult.has_active_pt) return 'Ha già un altro Personal Trainer attivo.';
    return null;
  })();

  const categorySelect = (
    <div className="space-y-2">
      <Label htmlFor={`athlete-category-${tab}`}>Categoria cliente *</Label>
      <Select
        value={categoryId || undefined}
        onValueChange={setCategoryId}
        disabled={categoriesLoading || categories.length === 0}
      >
        <SelectTrigger id={`athlete-category-${tab}`}>
          <SelectValue placeholder="Seleziona categoria" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
              {c.is_system ? '' : ' (tua)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        In presenza, Online, Mix oppure una tua categoria. Puoi cambiarla dopo dalla scheda atleta.
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {tab === 'create' ? 'Crea atleta' : 'Invita atleta'}
          </DialogTitle>
          <DialogDescription>
            {tab === 'create'
              ? 'Crea un nuovo account atleta collegato subito a te.'
              : 'Collega un atleta già registrato inviando una richiesta di connessione.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'link' | 'create')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Invita esistente</TabsTrigger>
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
                Nessun atleta con questa email. Usa{' '}
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

            {categorySelect}

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
                  placeholder="Mario"
                  minLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-last">Cognome *</Label>
                <Input
                  id="create-last"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Rossi"
                  minLength={2}
                  required
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
                placeholder="atleta@email.com"
                required
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

            {categorySelect}

            <div className="space-y-2">
              <Label>Livello</Label>
              <Select
                value={createForm.fitnessLevel || undefined}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, fitnessLevel: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona (opzionale)" />
                </SelectTrigger>
                <SelectContent>
                  {ATHLETE_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Obiettivi</Label>
              <div className="grid grid-cols-2 gap-2">
                {ATHLETE_GOALS.map((goal) => (
                  <label
                    key={goal.id}
                    htmlFor={`goal-${goal.id}`}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      id={`goal-${goal.id}`}
                      checked={createForm.selectedGoals.includes(goal.id)}
                      onCheckedChange={() => toggleGoal(goal.id)}
                    />
                    <span>{goal.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
              Verrà creato un account con password temporanea <strong>Leone123!</strong>, inviata via email.
              L&apos;atleta comparirà subito tra i tuoi atleti attivi: chiedigli di cambiare la password al primo accesso.
            </p>

            <DialogFooter className="sm:justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Annulla
              </Button>
              <Button
                type="button"
                disabled={!canCreate || createMutation.isPending}
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
