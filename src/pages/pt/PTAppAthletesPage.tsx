import { useState, useEffect, useMemo } from 'react';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getPTConnectionsWithPtActive, acceptConnection, rejectConnection } from '@/lib/api/connections';
import { AthleteSubscriptionsTab } from '@/components/pt/AthleteSubscriptionsTab';
import { AddAthleteDialog } from '@/components/pt/AddAthleteDialog';
import { TrainingModalityBadge } from '@/components/pt/TrainingModalityBadge';
import {
  TRAINING_MODALITIES,
  TRAINING_MODALITY_LABELS,
  isTrainingModality,
  normalizeTrainingModality,
  type TrainingModality,
} from '@/lib/trainingModality';
import { 
  Users, 
  Search, 
  MessageSquare, 
  Dumbbell,
  ChevronRight,
  Clock,
  UserPlus,
  UserRoundPlus,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// PT APP ATHLETES PAGE - Lista atleti (Mobile)
// =====================================================

const VALID_TABS = ['active', 'pending', 'subscriptions'] as const;

export function PTAppAthletesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(
    tabParam && (VALID_TABS as readonly string[]).includes(tabParam) ? tabParam : 'active',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [addAthleteOpen, setAddAthleteOpen] = useState(false);
  const [addAthleteTab, setAddAthleteTab] = useState<'link' | 'create'>('link');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const modalityFilter = searchParams.get('modality');
  const activeModality: TrainingModality | 'all' = isTrainingModality(modalityFilter)
    ? modalityFilter
    : 'all';

  const setModalityFilter = (value: TrainingModality | 'all') => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('modality');
    else next.set('modality', value);
    setSearchParams(next, { replace: true });
  };

  // Tab -> URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'active') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next, { replace: true });
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
    const t = searchParams.get('tab');
    if (t && (VALID_TABS as readonly string[]).includes(t) && t !== activeTab) {
      setActiveTab(t);
      return;
    }
    if (!t && isTrainingModality(searchParams.get('modality'))) {
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
    ]);
  };

  const handleAccept = async (connectionId: string) => {
    setProcessingId(connectionId);
    try {
      await acceptConnection(connectionId);
      toast.success('Richiesta accettata');
      await refreshAfterConnectionChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'accettazione');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (connectionId: string) => {
    setProcessingId(connectionId);
    try {
      await rejectConnection(connectionId);
      toast.success('Richiesta rifiutata');
      await refreshAfterConnectionChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il rifiuto');
    } finally {
      setProcessingId(null);
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
      if (activeTab === 'active' && activeModality !== 'all') {
        if (normalizeTrainingModality(conn.training_modality) !== activeModality) return false;
      }
      if (!searchQuery) return true;
      const name = `${conn.profiles?.first_name || ''} ${conn.profiles?.last_name || ''}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  }, [connections, searchQuery, activeModality, activeTab]);

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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeModality === 'all' ? 'default' : 'outline'}
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
                variant={activeModality === m ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setModalityFilter(m)}
              >
                {TRAINING_MODALITY_LABELS[m]}
              </Button>
            ))}
          </div>
        )}
      </div>

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
              <AthleteCard key={conn.id} connection={conn} type="active" />
            ))
          ) : (
            <EmptyState type="active" modalityFilter={activeModality} />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : filteredConnections.length > 0 ? (
            filteredConnections.map((conn) => (
              <AthleteCard key={conn.id} connection={conn} type="pending" />
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
    </div>
  );
}

function AthleteCard({ connection, type }: { connection: any; type: 'active' | 'pending' }) {
  const p = connection.profiles;
  const name = getAthleteDisplayName(p?.first_name, p?.last_name, p?.email);
  const initials = getAthleteInitials(p?.first_name, p?.last_name, p?.email);
  const isPtActive = connection.is_pt_active !== false;

  return (
    <Link to={`/pt/app/athlete/${connection.atleta_user_id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={connection.profiles?.avatar_url || undefined} />
              <AvatarFallback>{initials || 'A'}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate">{name}</h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
              
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {type === 'active' && (
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
                )}
                {type === 'active' && (
                  <TrainingModalityBadge modality={connection.training_modality} />
                )}
                {connection.atleta_profiles?.fitness_level && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {connection.atleta_profiles.fitness_level}
                  </Badge>
                )}
                {type === 'pending' && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    In attesa
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {type === 'active' && (
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link to={`/pt/app/chat/${connection.atleta_user_id}`} onClick={(e) => e.stopPropagation()}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Chat
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link to={`/pt/app/athlete/${connection.atleta_user_id}/workouts`} onClick={(e) => e.stopPropagation()}>
                  <Dumbbell className="h-4 w-4 mr-1" />
                  Schede
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({
  type,
  modalityFilter = 'all',
}: {
  type: 'active' | 'pending';
  modalityFilter?: TrainingModality | 'all';
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        {type === 'active' ? (
          <>
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {modalityFilter === 'all'
                ? 'Nessun atleta attivo'
                : `Nessun atleta ${TRAINING_MODALITY_LABELS[modalityFilter].toLowerCase()}`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {modalityFilter === 'all'
                ? 'I tuoi atleti collegati appariranno qui'
                : 'Prova un altro filtro modalità o cambia la categoria dell\'atleta dal dettaglio'}
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
