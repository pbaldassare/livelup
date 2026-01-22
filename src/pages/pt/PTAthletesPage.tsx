import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search, 
  Eye, 
  MessageSquare, 
  Dumbbell,
  Check,
  X,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// PT ATHLETES PAGE - CRM Atleti
// Solo per ruolo: pt (web dashboard)
// =====================================================

interface AtletaConnection {
  id: string;
  atleta_user_id: string;
  status: string;
  requested_at: string;
  accepted_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  atleta_profiles: {
    level: string | null;
    goals: string[] | null;
    status: string | null;
  } | null;
}

export function PTAthletesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  // Fetch connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['pt-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select(`
          id,
          atleta_user_id,
          status,
          requested_at,
          accepted_at
        `)
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for each connection
      const enrichedData = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url')
            .eq('user_id', conn.atleta_user_id)
            .single();

          const { data: atletaProfile } = await supabase
            .from('atleta_profiles')
            .select('level, goals, status')
            .eq('user_id', conn.atleta_user_id)
            .single();

          return {
            ...conn,
            profiles: profile,
            atleta_profiles: atletaProfile,
          };
        })
      );

      return enrichedData as AtletaConnection[];
    },
    enabled: !!user?.id,
  });

  // Accept request mutation
  const acceptMutation = useMutation({
    mutationFn: async (conn: AtletaConnection) => {
      const { error } = await supabase
        .from('pt_atleta_connections')
        .update({ 
          status: 'attivo', 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', conn.id);
      if (error) throw error;

      // Get PT name for notification
      const { data: ptProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const ptName = ptProfile 
        ? `${ptProfile.first_name || ''} ${ptProfile.last_name || ''}`.trim() || 'Il tuo PT'
        : 'Il tuo PT';

      // Create notification for atleta
      await supabase.from('notifications').insert({
        user_id: conn.atleta_user_id,
        type: 'connection_accepted',
        title: 'Richiesta accettata!',
        body: `${ptName} ha accettato la tua richiesta di connessione.`,
        action_url: '/app',
        data: { connection_id: conn.id, pt_user_id: user?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-athletes'] });
      toast.success('Richiesta accettata');
    },
    onError: () => {
      toast.error('Errore durante l\'accettazione');
    },
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: async (conn: AtletaConnection) => {
      const { error } = await supabase
        .from('pt_atleta_connections')
        .update({ status: 'rifiutato' })
        .eq('id', conn.id);
      if (error) throw error;

      // Create notification for atleta
      await supabase.from('notifications').insert({
        user_id: conn.atleta_user_id,
        type: 'connection_rejected',
        title: 'Richiesta non accettata',
        body: 'La tua richiesta di connessione non è stata accettata. Puoi cercare altri Personal Trainer.',
        action_url: '/pts',
        data: { pt_user_id: user?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-athletes'] });
      toast.success('Richiesta rifiutata');
    },
    onError: () => {
      toast.error('Errore durante il rifiuto');
    },
  });

  // Filter connections
  const filteredConnections = connections.filter((conn) => {
    const fullName = `${conn.profiles?.first_name || ''} ${conn.profiles?.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          conn.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'active') return conn.status === 'attivo' && matchesSearch;
    if (activeTab === 'pending') return conn.status === 'pending' && matchesSearch;
    if (activeTab === 'terminated') return conn.status === 'terminato' && matchesSearch;
    return matchesSearch;
  });

  const pendingCount = connections.filter(c => c.status === 'pending').length;
  const activeCount = connections.filter(c => c.status === 'attivo').length;

  const columns: Column<AtletaConnection>[] = [
    {
      key: 'atleta',
      header: 'Atleta',
      cell: (conn) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-atleta/10 text-role-atleta font-medium">
            {conn.profiles?.first_name?.[0]}{conn.profiles?.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium">
              {conn.profiles?.first_name} {conn.profiles?.last_name}
            </p>
            <p className="text-sm text-muted-foreground">{conn.profiles?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Livello',
      cell: (conn) => (
        <span className="capitalize">{conn.atleta_profiles?.level || 'N/A'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (conn) => <StatusBadge status={conn.status} />,
    },
    {
      key: 'since',
      header: 'Dal',
      cell: (conn) => (
        <span className="text-sm text-muted-foreground">
          {conn.accepted_at 
            ? new Date(conn.accepted_at).toLocaleDateString('it-IT')
            : new Date(conn.requested_at).toLocaleDateString('it-IT')
          }
        </span>
      ),
    },
  ];

  const renderActions = (conn: AtletaConnection) => (
    <div className="flex items-center gap-2">
      {conn.status === 'pending' ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-success hover:text-success"
            onClick={() => acceptMutation.mutate(conn)}
            disabled={acceptMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Accetta
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => rejectMutation.mutate(conn)}
            disabled={rejectMutation.isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Rifiuta
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" variant="ghost">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Dumbbell className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="I Miei Atleti"
        description="Gestisci i tuoi atleti e le richieste di collegamento"
        icon={Users}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atleti Attivi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-role-pt">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Richieste Pendenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale Storico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista Atleti</CardTitle>
              <CardDescription>Visualizza e gestisci tutti i tuoi atleti</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca atleta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                <Users className="h-4 w-4" />
                Attivi ({activeCount})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Richieste ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="terminated">
                Terminati
              </TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <DataTable
                columns={columns}
                data={filteredConnections}
                isLoading={isLoading}
                emptyMessage={
                  activeTab === 'pending' 
                    ? 'Nessuna richiesta pendente'
                    : 'Nessun atleta trovato'
                }
                actions={renderActions}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default PTAthletesPage;
