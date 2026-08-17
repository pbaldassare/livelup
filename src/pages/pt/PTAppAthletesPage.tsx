import { useState, useEffect, useMemo } from 'react';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  getPTConnectionsWithPtActive,
  acceptConnection,
  rejectConnection,
  recallAthleteFromTransfer,
} from '@/lib/api/connections';
import { AthleteSubscriptionsTab } from '@/components/pt/AthleteSubscriptionsTab';
import { AddAthleteDialog } from '@/components/pt/AddAthleteDialog';
import { TrainingModalityBadge } from '@/components/pt/TrainingModalityBadge';
import { ManageAthleteCategoriesDialog } from '@/components/pt/ManageAthleteCategoriesDialog';
import { AthleteRosterBadges } from '@/components/pt/AthleteRosterBadges';
import { listAthleteCategories } from '@/lib/api/athleteCategories';
import { isSystemCategorySlug, resolveCategoryId } from '@/lib/athleteCategories';
import { isTrainingModality } from '@/lib/trainingModality';
import {
  ROSTER_RELATION_FILTERS,
  usePTAthleteRosterMeta,
  type RosterRelationFilter,
  type AthleteRosterRole,
  type CededMeta,
} from '@/hooks/usePTAthleteRosterMeta';
import { ptRoutes } from '@/lib/pt/routes';
import { 
  Users, 
  Search, 
  MessageSquare, 
  Dumbbell,
  ChevronRight,
  Clock,
  UserPlus,
  UserRoundPlus,
  Check,
  X,
  Package,
  Tags,
  ArrowRightLeft,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// PT APP ATHLETES PAGE - Lista atleti (Mobile)
// =====================================================

const VALID_TABS = ['active', 'pending', 'subscriptions'] as const;

// Normalizza alias italiani/legacy dei tab (?tab=richieste)
function normalizeTab(value: string | null): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === 'richieste' || v === 'pending') return 'pending';
  if (v === 'attivi' || v === 'active') return 'active';
  if (v === 'abbonamenti' || v === 'subscriptions') return 'subscriptions';
  return null;
}

export function PTAppAthletesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    normalizeTab(searchParams.get('tab')) ?? 'active',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [addAthleteOpen, setAddAthleteOpen] = useState(false);
  const [addAthleteTab, setAddAthleteTab] = useState<'link' | 'create'>('link');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [relationFilter, setRelationFilter] = useState<RosterRelationFilter>('all');
  const [recallingId, setRecallingId] = useState<string | null>(null);

  const roster = usePTAthleteRosterMeta(user?.id);

  const categoryFilterParam = searchParams.get('category') ?? searchParams.get('modality');

  const setCategoryFilter = (value: string | 'all') => {
    const next = new URLSearchParams(searchParams);
    next.delete('modality');
    if (value === 'all') next.delete('category');
    else next.set('category', value);
    setSearchParams(next, { replace: true });
  };

  const { data: athleteCategories = [] } = useQuery({
    queryKey: ['pt-athlete-categories'],
    queryFn: () => listAthleteCategories(),
  });

  const activeCategoryId: string | 'all' = (() => {
    if (!categoryFilterParam) return 'all';
    if (isTrainingModality(categoryFilterParam) || isSystemCategorySlug(categoryFilterParam)) {
      return resolveCategoryId(null, categoryFilterParam, athleteCategories) ?? 'all';
    }
    return categoryFilterParam;
  })();

  // Tab -> URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'active') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next, { replace: true });
    if (value !== 'active') {
      setRelationFilter('all');
    }
  };

  useEffect(() => {
    if (searchParams.get('invite') !== '1') return;
    setAddAthleteTab('link');
    setAddAthleteOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('invite');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al mount con ?invite=1
  }, []);

  // URL -> tab

  useEffect(() => {
    const t = normalizeTab(searchParams.get('tab'));
    if (t && t !== activeTab) {
      setActiveTab(t);
      return;
    }
    if (
      !t &&
      (searchParams.get('category') || isTrainingModality(searchParams.get('modality')))
    ) {
      setActiveTab('active');
    }
  }, [searchParams]);

  // Conteggio richieste in attesa (badge)
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pt-pending-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('pt_atleta_connections')
        .select('id', { count: 'exact', head: true })
        .eq('pt_user_id', user.id)
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  const refreshAfterConnectionChange = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pt-connections'] }),
      queryClient.invalidateQueries({ queryKey: ['pt-pending-count'] }),
      queryClient.invalidateQueries({ queryKey: ['pt-home-data'] }),
      queryClient.invalidateQueries({ queryKey: ['pt-pending-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['pt-athletes'] }),
    ]);
  };

  const handleAccept = async (connectionId: string, name: string) => {
    setProcessingId(connectionId);
    try {
      await acceptConnection(connectionId);
      toast.success(`${name} è ora collegato al tuo profilo`);
      await refreshAfterConnectionChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'accettazione');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    const { id } = rejectTarget;
    setRejectTarget(null);
    setProcessingId(id);
    try {
      await rejectConnection(id);
      toast.info('Richiesta rifiutata');
      await refreshAfterConnectionChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il rifiuto');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRecall = async (atletaUserId: string, name: string) => {
    setRecallingId(atletaUserId);
    try {
      await recallAthleteFromTransfer({ atletaUserId });
      toast.success(`${name} ripreso`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pt-athletes'] }),
        queryClient.invalidateQueries({ queryKey: ['pt-ceded-athletes'] }),
        queryClient.invalidateQueries({ queryKey: ['pt-connections'] }),
        roster.refetch(),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore ripresa atleta');
    } finally {
      setRecallingId(null);
    }
  };

  // Fetch connections
  const { data: connections, isLoading } = useQuery({
    queryKey: ['pt-connections', user?.id, activeTab],
    queryFn: async () => {
      if (!user?.id) return [];

      const status = activeTab === 'active' ? 'active' : 'pending';

      const data = await getPTConnectionsWithPtActive(user.id, {
        status,
        columns: 'list',
        orderByCreatedAt: true,
      });

      // Fetch profiles for each connection
      const connectionsWithProfiles = await Promise.all(
        data.map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, email')
            .eq('user_id', conn.atleta_user_id)
            .single();

          const { data: atletaProfile } = await supabase
            .from('atleta_profiles')
            .select('fitness_level, goals')
            .eq('user_id', conn.atleta_user_id)
            .single();

          return {
            ...conn,
            profiles: profile,
            atleta_profiles: atletaProfile,
          };
        })
      );

      return connectionsWithProfiles;
    },
    enabled: !!user?.id,
  });

  const filteredConnections = useMemo(() => {
    if (!connections) return [];
    return connections.filter((conn) => {
      if (activeTab === 'active') {
        if (activeCategoryId !== 'all') {
          const connCategoryId = resolveCategoryId(
            conn.category_id,
            conn.training_modality,
            athleteCategories,
          );
          if (connCategoryId !== activeCategoryId) return false;
        }
        if (!roster.matchesRelationFilter(conn.atleta_user_id, relationFilter)) {
          return false;
        }
      }
      if (!searchQuery) return true;
      const name = `${conn.profiles?.first_name || ''} ${conn.profiles?.last_name || ''}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  }, [
    connections,
    searchQuery,
    activeCategoryId,
    activeTab,
    athleteCategories,
    relationFilter,
    roster,
  ]);

  const activeCount = connections?.length || 0;

  return (
    <div className="pb-4" data-tour="pt-athletes-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">I miei atleti</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">{activeCount}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddAthleteTab('create');
                setAddAthleteOpen(true);
              }}
            >
              <UserRoundPlus className="h-4 w-4 mr-1" />
              Crea atleta
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setAddAthleteTab('link');
                setAddAthleteOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Invita
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {activeTab === 'active' && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground mr-1">Relazione</span>
              {ROSTER_RELATION_FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={relationFilter === value ? 'default' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => setRelationFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground mr-1">Categoria</span>
              <Button
                type="button"
                size="sm"
                variant={activeCategoryId === 'all' ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setCategoryFilter('all')}
              >
                Tutte
              </Button>
              {athleteCategories.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  size="sm"
                  variant={activeCategoryId === c.id ? 'default' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => setCategoryFilter(c.id)}
                >
                  {c.name}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1"
                onClick={() => setManageCategoriesOpen(true)}
              >
                <Tags className="h-3.5 w-3.5" />
                Gestisci
              </Button>
            </div>
          </div>
        )}
      </div>

      <ManageAthleteCategoriesDialog
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="p-4">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Attivi</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 gap-1">
            Richieste
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex-1 gap-1">
            <Package className="h-3 w-3" />
            Abbonamenti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : filteredConnections.length > 0 ? (
            filteredConnections.map((conn) => (
              <AthleteCard
                key={conn.id}
                connection={conn}
                type="active"
                role={roster.getRole(conn.atleta_user_id)}
                ceded={roster.isCeded(conn.atleta_user_id)}
                cededMeta={roster.getCededMeta(conn.atleta_user_id)}
                recalling={recallingId === conn.atleta_user_id}
                onRecall={(name) => handleRecall(conn.atleta_user_id, name)}
                onCede={() => navigate(ptRoutes.app.athleteTransfer)}
              />
            ))
          ) : (
            <EmptyState
              type="active"
              categoryLabel={
                activeCategoryId === 'all'
                  ? null
                  : athleteCategories.find((c) => c.id === activeCategoryId)?.name
              }
            />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : filteredConnections.length > 0 ? (
            filteredConnections.map((conn) => (
              <AthleteCard
                key={conn.id}
                connection={conn}
                type="pending"
                processing={processingId === conn.id}
                onAccept={(name) => handleAccept(conn.id, name)}
                onReject={(name) => setRejectTarget({ id: conn.id, name })}

              />
            ))
          ) : (
            <EmptyState type="pending" />
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <AthleteSubscriptionsTab />
        </TabsContent>
      </Tabs>

      <AddAthleteDialog
        open={addAthleteOpen}
        onOpenChange={setAddAthleteOpen}
        defaultTab={addAthleteTab}
      />

      <AlertDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifiutare questa richiesta?</AlertDialogTitle>
            <AlertDialogDescription>
              La richiesta scomparirà e non verrà più mostrata. L'atleta non sarà collegato al tuo profilo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmReject}
            >
              Rifiuta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AthleteCard({
  connection,
  type,
  processing = false,
  onAccept,
  onReject,
  role = 'unknown',
  ceded = false,
  cededMeta = null,
  recalling = false,
  onRecall,
  onCede,
}: {
  connection: any;
  type: 'active' | 'pending';
  processing?: boolean;
  onAccept?: (name: string) => void;
  onReject?: (name: string) => void;
  role?: AthleteRosterRole;
  ceded?: boolean;
  cededMeta?: CededMeta | null;
  recalling?: boolean;
  onRecall?: (name: string) => void;
  onCede?: () => void;
}) {

  const p = connection.profiles;
  const name = getAthleteDisplayName(p?.first_name, p?.last_name, p?.email);
  const initials = getAthleteInitials(p?.first_name, p?.last_name, p?.email);
  const email = p?.email?.trim() || null;
  const isPtActive = connection.is_pt_active !== false;
  const showRecall = Boolean(cededMeta?.is_recallable);
  const showCede = role === 'owner' && !ceded;

  // Card richieste: nessuna navigazione chevron, azioni dirette sulla card
  if (type === 'pending') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={p?.avatar_url || undefined} />
              <AvatarFallback>{initials || 'A'}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{name}</h3>
              {email && email !== name && (
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  In attesa
                </Badge>
                {connection.atleta_profiles?.fitness_level && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {connection.atleta_profiles.fitness_level}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1"
              disabled={processing}
              onClick={() => onAccept?.(name)}
            >
              <Check className="h-4 w-4 mr-1" />
              Accetta
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={processing}
              onClick={() => onReject?.(name)}
            >
              <X className="h-4 w-4 mr-1" />
              Rifiuta
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <Link
          to={`/pt/app/athlete/${connection.atleta_user_id}`}
          className="flex items-center gap-3"
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={p?.avatar_url || undefined} />
            <AvatarFallback>{initials || 'A'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold truncate">{name}</h3>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  isPtActive
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                )}
              >
                {isPtActive ? 'Attivo' : 'Disattivo'}
              </Badge>
              <TrainingModalityBadge
                modality={connection.training_modality}
                name={connection.athlete_category?.name}
                color={connection.athlete_category?.color}
                slug={connection.athlete_category?.slug}
                isSystem={connection.athlete_category?.is_system}
              />
              {connection.atleta_profiles?.fitness_level && (
                <Badge variant="outline" className="text-xs capitalize">
                  {connection.atleta_profiles.fitness_level}
                </Badge>
              )}
            </div>
            <AthleteRosterBadges
              role={role}
              ceded={ceded}
              cededMeta={cededMeta}
              className="mt-1.5"
            />
          </div>
        </Link>

        <div className="flex gap-2 mt-3 flex-wrap">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to={`/pt/app/chat/${connection.atleta_user_id}`}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to={`/pt/app/athlete/${connection.atleta_user_id}/workouts`}>
              <Dumbbell className="h-4 w-4 mr-1" />
              Schede
            </Link>
          </Button>
          {showRecall && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={recalling}
              onClick={() => onRecall?.(name)}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Riprendi
            </Button>
          )}
          {showCede && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onCede?.()}>
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              Cedi
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


function EmptyState({
  type,
  categoryLabel,
}: {
  type: 'active' | 'pending';
  categoryLabel?: string | null;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        {type === 'active' ? (
          <>
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {!categoryLabel
                ? 'Nessun atleta attivo'
                : `Nessun atleta in «${categoryLabel}»`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {!categoryLabel
                ? 'I tuoi atleti collegati appariranno qui'
                : 'Prova un altro filtro o cambia la categoria dell\'atleta dal dettaglio'}
            </p>
          </>
        ) : (
          <>
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nessuna richiesta</h3>
            <p className="text-sm text-muted-foreground">
              Le richieste di connessione appariranno qui
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PTAppAthletesPage;
