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
  inviteExistingAtleta,
  searchAtletiForPt,
  type AtletaLookupResult,
  type AtletaSearchHit,
} from '@/lib/api/ptAthletes';
import { listAthleteCategories } from '@/lib/api/athleteCategories';
import { getAthleteDisplayName } from '@/lib/athleteName';
import { Loader2, Search, UserPlus, UserRoundPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
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
    const handle = window.setTimeout(() => setDebouncedQuery(lookupEmail.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [lookupEmail]);

  useEffect(() => {
    if (!open) return;
    if (!categoryId && defaultMixId) {
      setCategoryId(defaultMixId);
    }
  }, [open, categoryId, defaultMixId]);

  const reset = () => {
    setTab(defaultTab);
    setLookupEmail('');
    setDebouncedQuery('');
    setLookupResult(null);
    setCreateForm(defaultCreateForm);
    setCategoryId(defaultMixId);
  };

  const searchQuery = useQuery({
    queryKey: ['pt-search-atleti', debouncedQuery],
    queryFn: () => searchAtletiForPt(debouncedQuery),
    enabled: open && tab === 'link' && debouncedQuery.length >= 3,
    placeholderData: (previous) => previous,
  });

  const selectHit = (hit: AtletaSearchHit) => {
    setLookupEmail(hit.email ?? '');
    setLookupResult({
      found: true,
      user_id: hit.user_id,
      email: hit.email,
      first_name: hit.first_name,
      last_name: hit.last_name,
      has_active_pt: hit.has_active_pt,
      has_other_pts: hit.has_other_pts,
      connection_with_me: hit.connection_with_me,
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

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

  // Multi-PT: si può invitare anche se ha già altri coach; blocco solo se già con te
  const canInvite =
    lookupResult?.found &&
    lookupResult.connection_with_me !== 'active' &&
    lookupResult.connection_with_me !== 'pending' &&
    hasCategory;

  const inviteBlockedReason = (() => {
    if (!lookupResult?.found) return null;
    if (lookupResult.connection_with_me === 'active') return 'Già collegato a te.';
    if (lookupResult.connection_with_me === 'pending') return 'Invito già in attesa di conferma.';
    return null;
  })();

  const relationHint = (hit: Pick<AtletaSearchHit, 'connection_with_me'>) => {
    if (hit.connection_with_me === 'active') return { label: 'Già tuo', blocked: true };
    if (hit.connection_with_me === 'pending') return { label: 'Invito in attesa', blocked: true };
    return { label: 'Non collegato a te', blocked: false };
  };

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
              <Label htmlFor="lookup-email">Cerca atleta registrato</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lookup-email"
                  type="search"
                  autoComplete="off"
                  placeholder="Email o nome (almeno 3 caratteri)"
                  className="pl-9"
                  value={lookupEmail}
                  onChange={(e) => {
                    setLookupEmail(e.target.value);
                    setLookupResult(null);
                  }}
                />
                {searchQuery.isFetching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Cerca per email o nome tra gli atleti già registrati.
              </p>

              {lookupEmail.trim().length > 0 && lookupEmail.trim().length < 3 && (
                <p className="text-xs text-muted-foreground">Scrivi almeno 3 caratteri per cercare.</p>
              )}

              {searchQuery.isError && (
                <p className="text-sm text-destructive">Errore durante la ricerca. Riprova.</p>
              )}

              {!lookupResult?.found && debouncedQuery.length >= 3 && (
                <div className="max-h-56 overflow-y-auto rounded-lg border">
                  {searchQuery.isFetching && !searchQuery.data ? (
                    <p className="p-3 text-sm text-muted-foreground">Ricerca in corso…</p>
                  ) : (searchQuery.data ?? []).length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      Nessun atleta trovato. Usa{' '}
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
                  ) : (
                    <ul className="divide-y">
                      {(searchQuery.data ?? []).map((hit) => {
                        const hint = relationHint(hit);
                        return (
                          <li key={hit.user_id}>
                            <button
                              type="button"
                              className="flex w-full items-start justify-between gap-2 p-3 text-left text-sm hover:bg-muted/60"
                              onClick={() => selectHit(hit)}
                            >
                              <span>
                                <span className="block font-medium">
                                  {getAthleteDisplayName(hit.first_name, hit.last_name, hit.email)}
                                </span>
                                <span className="block text-muted-foreground">{hit.email}</span>
                              </span>
                              <Badge variant={hint.blocked ? 'secondary' : 'outline'} className="shrink-0">
                                {hint.label}
                              </Badge>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {lookupResult?.found && (
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {getAthleteDisplayName(
                    lookupResult.first_name,
                    lookupResult.last_name,
                    lookupResult.email ?? lookupEmail,
                  )}
                </p>
                <p className="text-muted-foreground">{lookupResult.email ?? lookupEmail}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="outline">
                    {relationHint({
                      connection_with_me: lookupResult.connection_with_me ?? null,
                    }).label}
                  </Badge>
                </div>
                {inviteBlockedReason && (
                  <p className="text-amber-600 dark:text-amber-400 pt-1">{inviteBlockedReason}</p>
                )}
              </div>
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
