import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import {
  getCededAthletes,
  getPTConnectionsWithPtActive,
  getPtTransferHistory,
  getRecallableAthletes,
  recallAthleteFromTransfer,
  searchPTsForTransfer,
  transferAthletesToPt,
  type CededAthlete,
  type PtTransferTarget,
  type RecallableAthlete,
} from '@/lib/api/connections';
import { TrainingModalityBadge } from '@/components/pt/TrainingModalityBadge';
import {
  TRAINING_MODALITIES,
  TRAINING_MODALITY_LABELS,
  normalizeTrainingModality,
  type TrainingModality,
} from '@/lib/trainingModality';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  ArrowRightLeft,
  CheckCircle2,
  History,
  Info,
  RotateCcw,
  Search,
  Star,
  UserRound,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function formatPtName(first?: string | null, last?: string | null) {
  return getAthleteDisplayName(first, last, undefined, 'Personal Trainer');
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: it });
}

function actionLabel(action: string) {
  switch (action) {
    case 'transfer_out':
      return 'Cessione';
    case 'recall':
      return 'Ripresa';
    case 'transfer_in':
      return 'Ricezione';
    default:
      return action;
  }
}

type ModalityFilter = TrainingModality | 'all';

export function PTAppAthleteTransferPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('cedi');
  const [athleteSearch, setAthleteSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('all');
  const [ptSearch, setPtSearch] = useState('');
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [selectedPtId, setSelectedPtId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [recallTarget, setRecallTarget] = useState<RecallableAthlete | CededAthlete | null>(null);
  const [infoAthlete, setInfoAthlete] = useState<CededAthlete | null>(null);

  const { data: myAthletes, isLoading: loadingAthletes } = useQuery({
    queryKey: ['pt-transfer-my-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const connections = await getPTConnectionsWithPtActive(user.id, {
        status: 'active',
        columns: 'list',
        orderByCreatedAt: true,
      });
      const withProfiles = await Promise.all(
        connections.map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, email')
            .eq('user_id', conn.atleta_user_id)
            .single();
          return { ...conn, profile };
        }),
      );
      return withProfiles;
    },
    enabled: !!user?.id,
  });

  const { data: ptTargets, isLoading: loadingPts } = useQuery({
    queryKey: ['pt-transfer-targets', ptSearch],
    queryFn: () => searchPTsForTransfer(ptSearch || undefined),
    enabled: activeTab === 'cedi' && selectedAthleteIds.length > 0,
  });

  const { data: recallable, isLoading: loadingRecallable } = useQuery({
    queryKey: ['pt-recallable-athletes', user?.id],
    queryFn: getRecallableAthletes,
    enabled: !!user?.id && (activeTab === 'riprendi' || activeTab === 'ceduti'),
  });

  const { data: cededAthletes, isLoading: loadingCeded } = useQuery({
    queryKey: ['pt-ceded-athletes', user?.id],
    queryFn: getCededAthletes,
    enabled: !!user?.id && (activeTab === 'ceduti' || activeTab === 'storico'),
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['pt-transfer-history', user?.id],
    queryFn: async () => {
      const rows = await getPtTransferHistory(user!.id);
      const userIds = new Set<string>();
      rows.forEach((r) => {
        userIds.add(r.atleta_user_id);
        userIds.add(r.from_pt_user_id);
        userIds.add(r.to_pt_user_id);
      });
      const ids = Array.from(userIds);
      if (ids.length === 0) {
        return rows.map((r) => ({
          ...r,
          profiles: {} as Record<string, { first_name: string | null; last_name: string | null }>,
        }));
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', ids);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [
          p.user_id,
          { first_name: p.first_name, last_name: p.last_name },
        ]),
      );

      return rows.map((r) => ({ ...r, profiles: profileMap }));
    },
    enabled: !!user?.id && activeTab === 'storico',
  });

  const filteredAthletes = useMemo(() => {
    if (!myAthletes) return [];
    const q = athleteSearch.trim().toLowerCase();
    return myAthletes.filter((a) => {
      if (modalityFilter !== 'all') {
        if (normalizeTrainingModality(a.training_modality) !== modalityFilter) return false;
      }
      if (!q) return true;
      const name = getAthleteDisplayName(
        a.profile?.first_name,
        a.profile?.last_name,
        a.profile?.email,
      ).toLowerCase();
      return name.includes(q);
    });
  }, [myAthletes, athleteSearch, modalityFilter]);

  const selectedAthletes = useMemo(
    () => (myAthletes ?? []).filter((a) => selectedAthleteIds.includes(a.atleta_user_id)),
    [myAthletes, selectedAthleteIds],
  );
  const selectedPt = ptTargets?.find((p) => p.user_id === selectedPtId);

  const toggleAthlete = (id: string) => {
    setSelectedAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setSelectedPtId(null);
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredAthletes.map((a) => a.atleta_user_id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedAthleteIds.includes(id));
    if (allSelected) {
      setSelectedAthleteIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedAthleteIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
    setSelectedPtId(null);
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['pt-transfer-my-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['pt-recallable-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['pt-ceded-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['pt-transfer-history'] });
    queryClient.invalidateQueries({ queryKey: ['pt-connections'] });
    queryClient.invalidateQueries({ queryKey: ['pt-home-data'] });
  };

  const transferMutation = useMutation({
    mutationFn: () =>
      transferAthletesToPt({
        atletaUserIds: selectedAthleteIds,
        toPtUserId: selectedPtId!,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (count) => {
      toast({
        title: count === 1 ? 'Atleta ceduto' : `${count} atleti ceduti`,
        description: 'Il trasferimento al nuovo Personal Trainer è completato.',
      });
      setSelectedAthleteIds([]);
      setSelectedPtId(null);
      setNotes('');
      setConfirmTransfer(false);
      invalidateAll();
    },
    onError: (err: Error) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
      setConfirmTransfer(false);
    },
  });

  const recallMutation = useMutation({
    mutationFn: (atletaUserId: string) =>
      recallAthleteFromTransfer({
        atletaUserId,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Atleta ripreso',
        description: 'L\'atleta è di nuovo collegato al tuo profilo.',
      });
      setRecallTarget(null);
      setNotes('');
      invalidateAll();
    },
    onError: (err: Error) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
      setRecallTarget(null);
    },
  });

  type HistoryRow = Awaited<ReturnType<typeof getPtTransferHistory>>[number] & {
    profiles?: Record<string, { first_name: string | null; last_name: string | null }>;
  };

  const openCededInfoFromHistory = (atletaUserId: string) => {
    const fromCeded = cededAthletes?.find((c) => c.atleta_user_id === atletaUserId);
    if (fromCeded) {
      setInfoAthlete(fromCeded);
      return;
    }
    const row = history?.find((h) => h.atleta_user_id === atletaUserId) as HistoryRow | undefined;
    const profiles = row?.profiles ?? {};
    const athlete = profiles[atletaUserId];
    setInfoAthlete({
      atleta_user_id: atletaUserId,
      first_name: athlete?.first_name ?? null,
      last_name: athlete?.last_name ?? null,
      avatar_url: null,
      email: null,
      training_modality: 'mix',
      fitness_level: null,
      current_pt_user_id: row?.to_pt_user_id ?? null,
      current_pt_first_name: profiles[row?.to_pt_user_id ?? '']?.first_name ?? null,
      current_pt_last_name: profiles[row?.to_pt_user_id ?? '']?.last_name ?? null,
      transferred_at: row?.completed_at ?? row?.requested_at ?? null,
      is_recallable: false,
    });
  };

  return (
    <PTAppPageShell
      title="Assegna atleta"
      description="Cedi uno o più atleti a un altro PT, consulta i ceduti o riprendili. Storico e dati restano disponibili."
      showBack
      backTo="/pt/app/athletes"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-app-background border border-app-border">
          <TabsTrigger value="cedi" className="text-[11px] sm:text-sm px-1">
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
            Cedi
          </TabsTrigger>
          <TabsTrigger value="ceduti" className="text-[11px] sm:text-sm px-1">
            <Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
            Ceduti
          </TabsTrigger>
          <TabsTrigger value="riprendi" className="text-[11px] sm:text-sm px-1">
            <RotateCcw className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
            Riprendi
          </TabsTrigger>
          <TabsTrigger value="storico" className="text-[11px] sm:text-sm px-1">
            <History className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
            Storico
          </TabsTrigger>
        </TabsList>

        {/* ── CEDI ATLETA (multi-select) ── */}
        <TabsContent value="cedi" className="space-y-4 mt-0">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-app-foreground">1. Seleziona atleti</h2>
              {selectedAthleteIds.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedAthleteIds.length} selezionati
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
              <Input
                placeholder="Cerca tra i tuoi atleti…"
                value={athleteSearch}
                onChange={(e) => setAthleteSearch(e.target.value)}
                className="pl-9 bg-app-background border-app-border"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={modalityFilter === 'all' ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setModalityFilter('all')}
              >
                Tutti
              </Button>
              {TRAINING_MODALITIES.map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={modalityFilter === m ? 'default' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => setModalityFilter(m)}
                >
                  {TRAINING_MODALITY_LABELS[m]}
                </Button>
              ))}
            </div>
            {filteredAthletes.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="text-xs text-app-accent font-medium hover:underline"
              >
                {filteredAthletes.every((a) => selectedAthleteIds.includes(a.atleta_user_id))
                  ? 'Deseleziona visibili'
                  : 'Seleziona tutti i visibili'}
              </button>
            )}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {loadingAthletes ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))
              ) : filteredAthletes.length === 0 ? (
                <p className="text-sm text-app-muted-foreground py-4 text-center">
                  Nessun atleta attivo da cedere
                  {modalityFilter !== 'all'
                    ? ` in modalità ${TRAINING_MODALITY_LABELS[modalityFilter].toLowerCase()}`
                    : ''}
                  .
                </p>
              ) : (
                filteredAthletes.map((conn) => {
                  const selected = selectedAthleteIds.includes(conn.atleta_user_id);
                  return (
                    <button
                      key={conn.atleta_user_id}
                      type="button"
                      onClick={() => toggleAthlete(conn.atleta_user_id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                        selected
                          ? 'border-app-accent bg-app-accent/10'
                          : 'border-app-border bg-app-card hover:border-app-accent/40',
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleAthlete(conn.atleta_user_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                        aria-label="Seleziona atleta"
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conn.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-app-background text-app-foreground">
                          {getAthleteInitials(conn.profile?.first_name, conn.profile?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-app-foreground truncate">
                          {getAthleteDisplayName(
                            conn.profile?.first_name,
                            conn.profile?.last_name,
                            conn.profile?.email,
                          )}
                        </p>
                        <div className="mt-1">
                          <TrainingModalityBadge modality={conn.training_modality} />
                        </div>
                      </div>
                      {selected && <CheckCircle2 className="h-5 w-5 text-app-accent shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {selectedAthleteIds.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-app-foreground">2. PT destinatario</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
                <Input
                  placeholder="Cerca per nome o città…"
                  value={ptSearch}
                  onChange={(e) => setPtSearch(e.target.value)}
                  className="pl-9 bg-app-background border-app-border"
                />
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {loadingPts ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))
                ) : (ptTargets ?? []).length === 0 ? (
                  <p className="text-sm text-app-muted-foreground py-4 text-center">
                    Nessun PT trovato. Prova un altro termine di ricerca.
                  </p>
                ) : (
                  (ptTargets ?? []).map((pt) => (
                    <PtTargetRow
                      key={pt.user_id}
                      pt={pt}
                      selected={selectedPtId === pt.user_id}
                      onSelect={() => setSelectedPtId(pt.user_id)}
                    />
                  ))
                )}
              </div>
            </section>
          )}

          {selectedAthleteIds.length > 0 && selectedPtId && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-app-foreground">3. Conferma</h2>
              <Card className="bg-app-card border-app-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2 text-sm text-app-muted-foreground">
                    <UserRound className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <p>
                        {selectedAthletes.length === 1
                          ? getAthleteDisplayName(
                              selectedAthletes[0]?.profile?.first_name,
                              selectedAthletes[0]?.profile?.last_name,
                            )
                          : `${selectedAthletes.length} atleti`}
                        <ArrowRightLeft className="h-3.5 w-3.5 inline mx-1.5 align-middle" />
                        {formatPtName(selectedPt?.first_name, selectedPt?.last_name)}
                      </p>
                      {selectedAthletes.length > 1 && (
                        <ul className="text-xs space-y-0.5">
                          {selectedAthletes.slice(0, 5).map((a) => (
                            <li key={a.atleta_user_id} className="truncate">
                              ·{' '}
                              {getAthleteDisplayName(
                                a.profile?.first_name,
                                a.profile?.last_name,
                                a.profile?.email,
                              )}{' '}
                              (
                              {TRAINING_MODALITY_LABELS[
                                normalizeTrainingModality(a.training_modality)
                              ]}
                              )
                            </li>
                          ))}
                          {selectedAthletes.length > 5 && (
                            <li>… e altri {selectedAthletes.length - 5}</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Note opzionali (es. motivo del passaggio)…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-app-background border-app-border min-h-[72px]"
                  />
                  <Button
                    className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                    onClick={() => setConfirmTransfer(true)}
                  >
                    {selectedAthletes.length === 1
                      ? 'Cedi atleta'
                      : `Cedi ${selectedAthletes.length} atleti`}
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}
        </TabsContent>

        {/* ── CEDUTI (post-assign visibility) ── */}
        <TabsContent value="ceduti" className="space-y-3 mt-0">
          <p className="text-xs text-app-muted-foreground">
            Atleti che hai ceduto: puoi sempre consultare nome, modalità e stato. Usa Riprendi se
            risultano ancora riprendibili.
          </p>
          {loadingCeded ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : (cededAthletes ?? []).length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center text-sm text-app-muted-foreground">
                Nessun atleta ceduto al momento.
              </CardContent>
            </Card>
          ) : (
            (cededAthletes ?? []).map((item) => (
              <Card key={item.atleta_user_id} className="bg-app-card border-app-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={item.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-app-background">
                      {getAthleteInitials(item.first_name, item.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-app-foreground truncate">
                      {getAthleteDisplayName(item.first_name, item.last_name, item.email)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TrainingModalityBadge modality={item.training_modality} />
                      {item.is_recallable ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Riprendibile
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Ceduto
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-app-muted-foreground truncate">
                      Con {formatPtName(item.current_pt_first_name, item.current_pt_last_name)}
                      {item.transferred_at && ` · ceduto il ${formatDate(item.transferred_at)}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-app-border"
                      onClick={() => setInfoAthlete(item)}
                    >
                      <Info className="h-3.5 w-3.5 mr-1" />
                      Info
                    </Button>
                    {item.is_recallable && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setRecallTarget(item)}
                      >
                        Riprendi
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── RIPRENDI ATLETA ── */}
        <TabsContent value="riprendi" className="space-y-3 mt-0">
          <p className="text-xs text-app-muted-foreground">
            Atleti che hai ceduto e che puoi riprendere in autonomia finché restano collegati al PT
            destinatario.
          </p>
          {loadingRecallable ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : (recallable ?? []).length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center text-sm text-app-muted-foreground">
                Nessun atleta disponibile per la ripresa.
              </CardContent>
            </Card>
          ) : (
            (recallable ?? []).map((item) => (
              <Card key={item.atleta_user_id} className="bg-app-card border-app-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={item.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-app-background">
                      {getAthleteInitials(item.first_name, item.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-app-foreground truncate">
                      {getAthleteDisplayName(item.first_name, item.last_name)}
                    </p>
                    <p className="text-xs text-app-muted-foreground truncate">
                      Con {formatPtName(item.current_pt_first_name, item.current_pt_last_name)}
                      {item.transferred_at && ` · ceduto il ${formatDate(item.transferred_at)}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-app-border"
                    onClick={() => setRecallTarget(item)}
                  >
                    Riprendi
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── STORICO ── */}
        <TabsContent value="storico" className="space-y-2 mt-0">
          {loadingHistory ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))
          ) : (history ?? []).length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center text-sm text-app-muted-foreground">
                Nessun trasferimento registrato.
              </CardContent>
            </Card>
          ) : (
            (history ?? []).map((entry) => {
              const row = entry as HistoryRow;
              const profiles = row.profiles ?? {};
              const athlete = profiles[row.atleta_user_id];
              const fromPt = profiles[row.from_pt_user_id];
              const toPt = profiles[row.to_pt_user_id];
              const isFromMe = row.from_pt_user_id === user?.id;
              const counterparty = isFromMe ? toPt : fromPt;
              const cededMeta = cededAthletes?.find(
                (c) => c.atleta_user_id === row.atleta_user_id,
              );

              return (
                <Card key={row.id} className="bg-app-card border-app-border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-app-foreground truncate">
                        {getAthleteDisplayName(athlete?.first_name, athlete?.last_name)}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {cededMeta && (
                          <TrainingModalityBadge modality={cededMeta.training_modality} />
                        )}
                        <Badge variant="secondary" className="text-[10px]">
                          {actionLabel(row.action)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-app-muted-foreground">
                      {row.action === 'recall'
                        ? `Ripreso da ${formatPtName(fromPt?.first_name, fromPt?.last_name)}`
                        : isFromMe
                          ? `Ceduto a ${formatPtName(counterparty?.first_name, counterparty?.last_name)}`
                          : `Ricevuto da ${formatPtName(counterparty?.first_name, counterparty?.last_name)}`}
                      {' · '}
                      {formatDate(row.completed_at ?? row.requested_at)}
                    </p>
                    {row.notes && (
                      <p className="text-xs text-app-muted-foreground italic">{row.notes}</p>
                    )}
                    {isFromMe && row.action === 'transfer_out' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => openCededInfoFromHistory(row.atleta_user_id)}
                      >
                        <Info className="h-3.5 w-3.5 mr-1" />
                        Vedi info atleta
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmTransfer} onOpenChange={setConfirmTransfer}>
        <AlertDialogContent className="bg-app-card border-app-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAthletes.length === 1
                ? 'Confermi la cessione?'
                : `Confermi la cessione di ${selectedAthletes.length} atleti?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAthletes.length === 1 ? (
                <>
                  L&apos;atleta uscirà dalla tua lista attiva e apparirà nel profilo di{' '}
                  <strong>{formatPtName(selectedPt?.first_name, selectedPt?.last_name)}</strong>.
                  Potrai comunque consultarlo nella sezione Ceduti.
                </>
              ) : (
                <>
                  Gli atleti selezionati usciranno dalla tua lista attiva e appariranno nel profilo di{' '}
                  <strong>{formatPtName(selectedPt?.first_name, selectedPt?.last_name)}</strong>.
                  Resteranno visibili in Ceduti / Storico.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={transferMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                transferMutation.mutate();
              }}
            >
              {transferMutation.isPending ? 'Trasferimento…' : 'Conferma cessione'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!recallTarget} onOpenChange={(open) => !open && setRecallTarget(null)}>
        <AlertDialogContent className="bg-app-card border-app-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Riprendi atleta</AlertDialogTitle>
            <AlertDialogDescription>
              {recallTarget && (
                <>
                  <strong>
                    {getAthleteDisplayName(recallTarget.first_name, recallTarget.last_name)}
                  </strong>{' '}
                  tornerà collegato a te. La connessione con{' '}
                  {formatPtName(
                    recallTarget.current_pt_first_name,
                    recallTarget.current_pt_last_name,
                  )}{' '}
                  verrà terminata.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Note opzionali…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-app-background border-app-border min-h-[64px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={recallMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (recallTarget) recallMutation.mutate(recallTarget.atleta_user_id);
              }}
            >
              {recallMutation.isPending ? 'Ripresa…' : 'Conferma ripresa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!infoAthlete} onOpenChange={(open) => !open && setInfoAthlete(null)}>
        <SheetContent
          side="bottom"
          className="bg-app-card border-app-border text-app-foreground rounded-t-3xl max-h-[75vh]"
        >
          {infoAthlete && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-app-foreground">
                  {getAthleteDisplayName(
                    infoAthlete.first_name,
                    infoAthlete.last_name,
                    infoAthlete.email,
                  )}
                </SheetTitle>
                <SheetDescription className="text-app-muted-foreground">
                  Scheda informativa post-cessione (sola lettura)
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={infoAthlete.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-app-background">
                      {getAthleteInitials(infoAthlete.first_name, infoAthlete.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1.5">
                    <TrainingModalityBadge modality={infoAthlete.training_modality} />
                    {infoAthlete.fitness_level && (
                      <Badge variant="outline" className="text-xs capitalize ml-1">
                        {infoAthlete.fitness_level}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-app-border bg-app-background p-3 space-y-2 text-sm">
                  {infoAthlete.email && (
                    <div className="flex justify-between gap-2">
                      <span className="text-app-muted-foreground">Email</span>
                      <span className="truncate text-app-foreground">{infoAthlete.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-app-muted-foreground">Stato</span>
                    <span className="text-app-foreground">
                      {infoAthlete.is_recallable ? 'Ceduto (riprendibile)' : 'Ceduto'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-app-muted-foreground">PT attuale</span>
                    <span className="text-app-foreground text-right">
                      {formatPtName(
                        infoAthlete.current_pt_first_name,
                        infoAthlete.current_pt_last_name,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-app-muted-foreground">Ceduto il</span>
                    <span className="text-app-foreground">
                      {formatDate(infoAthlete.transferred_at)}
                    </span>
                  </div>
                </div>
                {infoAthlete.is_recallable && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setRecallTarget(infoAthlete);
                      setInfoAthlete(null);
                    }}
                  >
                    Riprendi atleta
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PTAppPageShell>
  );
}

function PtTargetRow({
  pt,
  selected,
  onSelect,
}: {
  pt: PtTransferTarget;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
        selected
          ? 'border-app-accent bg-app-accent/10'
          : 'border-app-border bg-app-card hover:border-app-accent/40',
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={pt.avatar_url ?? undefined} />
        <AvatarFallback className="bg-app-background">
          {getAthleteInitials(pt.first_name, pt.last_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-app-foreground truncate">
          {formatPtName(pt.first_name, pt.last_name)}
        </p>
        <p className="text-xs text-app-muted-foreground flex items-center gap-2">
          {pt.location_city && <span>{pt.location_city}</span>}
          {pt.rating_avg != null && pt.rating_avg > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-app-accent text-app-accent" />
              {Number(pt.rating_avg).toFixed(1)}
            </span>
          )}
        </p>
      </div>
      {selected && <CheckCircle2 className="h-5 w-5 text-app-accent shrink-0" />}
    </button>
  );
}

export default PTAppAthleteTransferPage;
