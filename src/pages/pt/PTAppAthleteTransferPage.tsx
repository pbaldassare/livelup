import { useEffect, useMemo, useState } from 'react';
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
  getReceivedAthletes,
  recallAthleteFromTransfer,
  searchPTsForTransfer,
  transferAthletesToPt,
  type CededAthlete,
  type PtTransferTarget,
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
  ChevronDown,
  ChevronRight,
  Inbox,
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

type ModalityFilter = TrainingModality | 'all';
type ListTab = 'collaboratori' | 'ceduti' | 'ricevuti';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function PTAppAthleteTransferPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ListTab>('collaboratori');
  const [listSearch, setListSearch] = useState('');
  const [cediOpen, setCediOpen] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('all');
  const [ptSearch, setPtSearch] = useState('');
  const debouncedPtSearch = useDebouncedValue(ptSearch, 300);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [selectedPtId, setSelectedPtId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [recallTarget, setRecallTarget] = useState<CededAthlete | null>(null);
  const [infoAthlete, setInfoAthlete] = useState<CededAthlete | null>(null);
  const [expandedCollabIds, setExpandedCollabIds] = useState<string[]>([]);

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

  const {
    data: ptTargets,
    isLoading: loadingPts,
    isError: ptTargetsError,
    error: ptTargetsErrorObj,
    refetch: refetchPtTargets,
  } = useQuery({
    queryKey: ['pt-transfer-targets', debouncedPtSearch],
    queryFn: () => searchPTsForTransfer(debouncedPtSearch || undefined),
    enabled: cediOpen && selectedAthleteIds.length > 0,
    retry: 1,
  });

  const { data: cededAthletes, isLoading: loadingCeded } = useQuery({
    queryKey: ['pt-ceded-athletes', user?.id],
    queryFn: getCededAthletes,
    enabled: !!user?.id && (activeTab === 'collaboratori' || activeTab === 'ceduti'),
  });

  const { data: receivedAthletes, isLoading: loadingReceived } = useQuery({
    queryKey: ['pt-received-athletes', user?.id],
    queryFn: getReceivedAthletes,
    enabled: !!user?.id && activeTab === 'ricevuti',
  });

  const listSearchQuery = listSearch.trim().toLowerCase();

  /** Collaboratori = destinazione PT di almeno un atleta ceduto. */
  const collaboratorGroups = useMemo(() => {
    type PtGroup = {
      pt_user_id: string;
      first_name: string | null;
      last_name: string | null;
      athletes: CededAthlete[];
    };
    const map = new Map<string, PtGroup>();
    for (const item of cededAthletes ?? []) {
      const key = item.current_pt_user_id ?? '__unknown__';
      let group = map.get(key);
      if (!group) {
        group = {
          pt_user_id: key,
          first_name: item.current_pt_first_name,
          last_name: item.current_pt_last_name,
          athletes: [],
        };
        map.set(key, group);
      }
      group.athletes.push(item);
    }
    return Array.from(map.values()).sort((a, b) => {
      const an = `${a.last_name ?? ''} ${a.first_name ?? ''}`.trim().toLowerCase();
      const bn = `${b.last_name ?? ''} ${b.first_name ?? ''}`.trim().toLowerCase();
      return an.localeCompare(bn, 'it');
    });
  }, [cededAthletes]);

  const filteredCollaboratorGroups = useMemo(() => {
    if (!listSearchQuery) return collaboratorGroups;
    return collaboratorGroups.filter((group) => {
      const ptLabel =
        group.pt_user_id === '__unknown__'
          ? 'pt non disponibile'
          : formatPtName(group.first_name, group.last_name).toLowerCase();
      if (ptLabel.includes(listSearchQuery)) return true;
      return group.athletes.some((athlete) => {
        const athleteName = getAthleteDisplayName(
          athlete.first_name,
          athlete.last_name,
          athlete.email,
        ).toLowerCase();
        return athleteName.includes(listSearchQuery);
      });
    });
  }, [collaboratorGroups, listSearchQuery]);

  const filteredCededAthletes = useMemo(() => {
    const items = cededAthletes ?? [];
    if (!listSearchQuery) return items;
    return items.filter((item) => {
      const athleteName = getAthleteDisplayName(
        item.first_name,
        item.last_name,
        item.email,
      ).toLowerCase();
      const destinationPt = formatPtName(
        item.current_pt_first_name,
        item.current_pt_last_name,
      ).toLowerCase();
      return athleteName.includes(listSearchQuery) || destinationPt.includes(listSearchQuery);
    });
  }, [cededAthletes, listSearchQuery]);

  const filteredReceivedAthletes = useMemo(() => {
    const items = receivedAthletes ?? [];
    if (!listSearchQuery) return items;
    return items.filter((item) => {
      const athleteName = getAthleteDisplayName(
        item.first_name,
        item.last_name,
      ).toLowerCase();
      const fromPt = formatPtName(item.from_pt_first_name, item.from_pt_last_name).toLowerCase();
      return athleteName.includes(listSearchQuery) || fromPt.includes(listSearchQuery);
    });
  }, [receivedAthletes, listSearchQuery]);

  const filteredAthletes = useMemo(() => {
    const q = athleteSearch.trim().toLowerCase();
    return (myAthletes ?? []).filter((a) => {
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

  const ptTargetsList = useMemo(
    () => (ptTargets ?? []).filter((pt) => pt.user_id !== user?.id),
    [ptTargets, user?.id],
  );
  const selectedPt = ptTargetsList.find((p) => p.user_id === selectedPtId);

  const resetCediForm = () => {
    setSelectedAthleteIds([]);
    setSelectedPtId(null);
    setNotes('');
    setAthleteSearch('');
    setModalityFilter('all');
    setPtSearch('');
    setConfirmTransfer(false);
  };

  const toggleAthlete = (id: string) => {
    setSelectedAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setSelectedPtId(null);
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredAthletes.map((a) => a.atleta_user_id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedAthleteIds.includes(id));
    if (allSelected) {
      setSelectedAthleteIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedAthleteIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
    setSelectedPtId(null);
  };

  const toggleExpandedCollab = (id: string) => {
    setExpandedCollabIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['pt-transfer-my-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['pt-ceded-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['pt-received-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['pt-recallable-athletes'] });
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
      resetCediForm();
      setCediOpen(false);
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
        description: "L'atleta è di nuovo collegato al tuo profilo.",
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

  return (
    <PTAppPageShell
      title="Assegna atleta"
      description="Cedi atleti a un altro PT, consulta chi li ha ricevuti e riprendili quando possibile."
      showBack
      backTo="/pt/app/athletes"
      actions={
        <Button
          size="sm"
          className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
          onClick={() => setCediOpen(true)}
        >
          <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
          Cedi
        </Button>
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ListTab)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 bg-app-background border border-app-border h-auto">
          <TabsTrigger value="collaboratori" className="text-xs sm:text-sm px-1 py-2">
            <Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
            Collaboratori
          </TabsTrigger>
          <TabsTrigger value="ceduti" className="text-xs sm:text-sm px-1 py-2">
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
            Ceduti
          </TabsTrigger>
          <TabsTrigger value="ricevuti" className="text-xs sm:text-sm px-1 py-2">
            <Inbox className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
            Ricevuti
          </TabsTrigger>
        </TabsList>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
          <Input
            placeholder="Cerca per nome…"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            className="pl-9 bg-app-background border-app-border"
            aria-label="Cerca per nome"
          />
        </div>

        {/* ── COLLABORATORI (PT destinazione delle cessioni) ── */}
        <TabsContent value="collaboratori" className="space-y-3 mt-0">
          <p className="text-xs text-app-muted-foreground">
            Personal Trainer a cui hai ceduto almeno un atleta. Espandi per vedere gli atleti e
            riprenderli se disponibili.
          </p>
          {loadingCeded ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : collaboratorGroups.length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-sm text-app-muted-foreground">
                  Nessun collaboratore ancora: non hai ceduto atleti ad altri PT.
                </p>
                <Button
                  size="sm"
                  className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                  onClick={() => setCediOpen(true)}
                >
                  Cedi un atleta
                </Button>
              </CardContent>
            </Card>
          ) : filteredCollaboratorGroups.length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center text-sm text-app-muted-foreground">
                Nessun risultato
              </CardContent>
            </Card>
          ) : (
            filteredCollaboratorGroups.map((group) => {
              const expanded = expandedCollabIds.includes(group.pt_user_id);
              const ptLabel =
                group.pt_user_id === '__unknown__'
                  ? 'PT non disponibile'
                  : formatPtName(group.first_name, group.last_name);
              const recallableCount = group.athletes.filter((a) => a.is_recallable).length;
              return (
                <Card
                  key={group.pt_user_id}
                  className="bg-app-card border-app-border overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full p-4 flex items-center gap-3 text-left"
                    onClick={() => toggleExpandedCollab(group.pt_user_id)}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-app-background">
                        {getAthleteInitials(group.first_name, group.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-app-foreground truncate">{ptLabel}</p>
                      <p className="text-xs text-app-muted-foreground">
                        {group.athletes.length}{' '}
                        {group.athletes.length === 1 ? 'atleta ceduto' : 'atleti ceduti'}
                        {recallableCount > 0
                          ? ` · ${recallableCount} riprendibil${recallableCount === 1 ? 'e' : 'i'}`
                          : ''}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {group.athletes.length}
                    </Badge>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-app-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-app-muted-foreground shrink-0" />
                    )}
                  </button>
                  {expanded && (
                    <div className="border-t border-app-border px-3 pb-3 space-y-2">
                      {group.athletes.map((item) => (
                        <div key={item.atleta_user_id} className="pt-3">
                          <CededAthleteCard
                            item={item}
                            showDestinationPt={false}
                            compact
                            onInfo={() => setInfoAthlete(item)}
                            onRecall={() => setRecallTarget(item)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── CEDUTI ── */}
        <TabsContent value="ceduti" className="space-y-3 mt-0">
          <p className="text-xs text-app-muted-foreground">
            Atleti che hai ceduto a un altro PT. Se risultano riprendibili puoi riprenderli da qui.
          </p>
          {loadingCeded ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : (cededAthletes ?? []).length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-sm text-app-muted-foreground">
                  Nessun atleta ceduto al momento.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-app-border"
                  onClick={() => setCediOpen(true)}
                >
                  Apri Cedi
                </Button>
              </CardContent>
            </Card>
          ) : filteredCededAthletes.length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center text-sm text-app-muted-foreground">
                Nessun risultato
              </CardContent>
            </Card>
          ) : (
            filteredCededAthletes.map((item) => (
              <CededAthleteCard
                key={item.atleta_user_id}
                item={item}
                showDestinationPt
                onInfo={() => setInfoAthlete(item)}
                onRecall={() => setRecallTarget(item)}
              />
            ))
          )}
        </TabsContent>

        {/* ── RICEVUTI ── */}
        <TabsContent value="ricevuti" className="space-y-3 mt-0">
          <p className="text-xs text-app-muted-foreground">
            Atleti che altri PT ti hanno ceduto con trasferimento completo.
          </p>
          {loadingReceived ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : (receivedAthletes ?? []).length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center text-sm text-app-muted-foreground">
                Nessun atleta ricevuto da altri PT.
              </CardContent>
            </Card>
          ) : filteredReceivedAthletes.length === 0 ? (
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-6 text-center text-sm text-app-muted-foreground">
                Nessun risultato
              </CardContent>
            </Card>
          ) : (
            filteredReceivedAthletes.map((item) => (
              <Card key={item.id} className="bg-app-card border-app-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={item.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-app-background">
                      {getAthleteInitials(item.first_name, item.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-app-foreground truncate">
                      {getAthleteDisplayName(item.first_name, item.last_name)}
                    </p>
                    <p className="text-xs text-app-muted-foreground truncate">
                      Da {formatPtName(item.from_pt_first_name, item.from_pt_last_name)}
                      {item.completed_at && ` · ${formatDate(item.completed_at)}`}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-app-muted-foreground italic line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Cedi — sheet flusso trasferimento */}
      <Sheet
        open={cediOpen}
        onOpenChange={(open) => {
          setCediOpen(open);
          if (!open) resetCediForm();
        }}
      >
        <SheetContent
          side="bottom"
          className="bg-app-card border-app-border text-app-foreground rounded-t-3xl max-h-[92vh] overflow-y-auto"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-app-foreground">Cedi atleta</SheetTitle>
            <SheetDescription className="text-app-muted-foreground">
              Seleziona uno o più atleti e il Personal Trainer destinatario. La cessione è un
              trasferimento completo.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
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
                            : 'border-app-border bg-app-background hover:border-app-accent/40',
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
                          <AvatarFallback className="bg-app-card text-app-foreground">
                            {getAthleteInitials(
                              conn.profile?.first_name,
                              conn.profile?.last_name,
                            )}
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
                  ) : ptTargetsError ? (
                    <div className="py-4 text-center space-y-2">
                      <p className="text-sm text-app-muted-foreground">
                        Impossibile caricare i PT destinatari
                        {ptTargetsErrorObj instanceof Error && ptTargetsErrorObj.message
                          ? `: ${ptTargetsErrorObj.message}`
                          : '.'}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-app-border"
                        onClick={() => refetchPtTargets()}
                      >
                        Riprova
                      </Button>
                    </div>
                  ) : ptTargetsList.length === 0 ? (
                    <p className="text-sm text-app-muted-foreground py-4 text-center">
                      {debouncedPtSearch.trim()
                        ? 'Nessun PT trovato. Prova un altro termine di ricerca.'
                        : 'Nessun altro PT attivo disponibile come destinatario.'}
                    </p>
                  ) : (
                    ptTargetsList.map((pt) => (
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
                <Card className="bg-app-background border-app-border">
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
                                {
                                  TRAINING_MODALITY_LABELS[
                                    normalizeTrainingModality(a.training_modality)
                                  ]
                                }
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
                      className="bg-app-card border-app-border min-h-[72px]"
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
          </div>
        </SheetContent>
      </Sheet>

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
                  Potrai comunque consultarlo in Ceduti e Collaboratori.
                </>
              ) : (
                <>
                  Gli atleti selezionati usciranno dalla tua lista attiva e appariranno nel profilo
                  di{' '}
                  <strong>{formatPtName(selectedPt?.first_name, selectedPt?.last_name)}</strong>.
                  Resteranno visibili in Ceduti e Collaboratori.
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
                    <RotateCcw className="h-4 w-4 mr-1.5" />
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

function CededAthleteCard({
  item,
  showDestinationPt,
  compact = false,
  onInfo,
  onRecall,
}: {
  item: CededAthlete;
  showDestinationPt: boolean;
  compact?: boolean;
  onInfo: () => void;
  onRecall: () => void;
}) {
  const athleteName = getAthleteDisplayName(item.first_name, item.last_name, item.email);
  const destinationPt = formatPtName(item.current_pt_first_name, item.current_pt_last_name);

  return (
    <Card
      className={cn(
        'bg-app-card border-app-border',
        compact && 'border-0 shadow-none bg-transparent',
      )}
    >
      <CardContent className={cn('flex items-center gap-3', compact ? 'p-0' : 'p-4')}>
        <Avatar className={cn(compact ? 'h-9 w-9' : 'h-11 w-11')}>
          <AvatarImage src={item.avatar_url ?? undefined} />
          <AvatarFallback className="bg-app-background">
            {getAthleteInitials(item.first_name, item.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn('font-medium text-app-foreground truncate', compact && 'text-sm')}>
            {athleteName}
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
            {showDestinationPt
              ? `PT destinatario: ${destinationPt}`
              : 'Atleta ceduto'}
            {item.transferred_at && ` · ceduto il ${formatDate(item.transferred_at)}`}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="border-app-border" onClick={onInfo}>
            <Info className="h-3.5 w-3.5 mr-1" />
            Info
          </Button>
          {item.is_recallable && (
            <Button size="sm" variant="secondary" onClick={onRecall}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Riprendi
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
          : 'border-app-border bg-app-background hover:border-app-accent/40',
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={pt.avatar_url ?? undefined} />
        <AvatarFallback className="bg-app-card">
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
