import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { DetailSheet, ProfileInfo } from '@/components/dashboard/DetailSheet';
import { TablePagination } from '@/components/dashboard/TablePagination';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Eye, 
  MessageSquare, 
  Dumbbell,
  Check,
  X,
  Clock,
  UserCheck,
  UserX,
  History,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// PT ATHLETES PAGE - CRM Atleti con paginazione
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
    phone: string | null;
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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'active');
  const [selectedAthlete, setSelectedAthlete] = useState<AtletaConnection | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['pt-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select(`id, atleta_user_id, status, requested_at, accepted_at`)
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedData = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url, phone')
            .eq('user_id', conn.atleta_user_id)
            .single();

          const { data: atletaProfile } = await supabase
            .from('atleta_profiles')
            .select('level, goals, status')
            .eq('user_id', conn.atleta_user_id)
            .single();

          return { ...conn, profiles: profile, atleta_profiles: atletaProfile };
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
        .update({ status: 'active', accepted_at: new Date().toISOString() })
        .eq('id', conn.id);
      if (error) throw error;

      const { data: ptProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const ptName = ptProfile 
        ? `${ptProfile.first_name || ''} ${ptProfile.last_name || ''}`.trim() || 'Il tuo PT'
        : 'Il tuo PT';

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
        .update({ status: 'rejected' })
        .eq('id', conn.id);
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: conn.atleta_user_id,
        type: 'connection_rejected',
        title: 'Richiesta non accettata',
        body: 'La tua richiesta di connessione non è stata accettata.',
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

  // Filter and paginate
  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      const fullName = `${conn.profiles?.first_name || ''} ${conn.profiles?.last_name || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                            conn.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (activeTab === 'active') return conn.status === 'active' && matchesSearch;
      if (activeTab === 'pending') return conn.status === 'pending' && matchesSearch;
      if (activeTab === 'terminated') return (conn.status === 'terminated' || conn.status === 'terminato') && matchesSearch;
      return matchesSearch;
    });
  }, [connections, searchTerm, activeTab]);

  const totalPages = Math.ceil(filteredConnections.length / pageSize);
  const paginatedConnections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredConnections.slice(start, start + pageSize);
  }, [filteredConnections, currentPage, pageSize]);

  // Reset page on filter change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const pendingCount = connections.filter(c => c.status === 'pending').length;
  const activeCount = connections.filter(c => c.status === 'active').length;
  const terminatedCount = connections.filter(c => c.status === 'terminated' || c.status === 'terminato').length;

  const handleViewDetail = (conn: AtletaConnection) => {
    setSelectedAthlete(conn);
    setDetailOpen(true);
  };

  const getProfileInfo = (conn: AtletaConnection): ProfileInfo => ({
    id: conn.id,
    userId: conn.atleta_user_id,
    firstName: conn.profiles?.first_name,
    lastName: conn.profiles?.last_name,
    email: conn.profiles?.email,
    phone: conn.profiles?.phone,
    avatarUrl: conn.profiles?.avatar_url,
    status: conn.status,
    createdAt: conn.requested_at,
    role: 'atleta',
  });

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="I Miei Atleti"
        subtitle="Gestisci i tuoi atleti e le richieste di collegamento"
        icon={<Users className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/pt' },
          { label: 'Atleti' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => {
            const csvRows = [['Nome', 'Email', 'Livello', 'Stato', 'Data']];
            filteredConnections.forEach(c => {
              csvRows.push([
                `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`.trim(),
                c.profiles?.email || '',
                c.atleta_profiles?.level || 'N/A',
                c.status,
                c.accepted_at ? new Date(c.accepted_at).toLocaleDateString('it-IT') : new Date(c.requested_at).toLocaleDateString('it-IT'),
              ]);
            });
            const csv = csvRows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'atleti.csv'; a.click();
            URL.revokeObjectURL(url);
            toast.success('CSV esportato');
          }}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard title="Atleti Attivi" value={activeCount} icon={UserCheck} iconColor="success" />
        <KPICard title="Richieste Pendenti" value={pendingCount} icon={Clock} iconColor="warning" />
        <KPICard title="Totale Storico" value={connections.length} icon={History} iconColor="info" />
      </div>

      {/* Table Section */}
      <SectionCard
        title="Lista Atleti"
        subtitle="Visualizza e gestisci tutti i tuoi atleti"
        icon={Users}
        iconColor="blue"
      >
        <div className="space-y-4">
          {/* Search and Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="active" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Attivi ({activeCount})
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Richieste ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="terminated">
                  <UserX className="h-4 w-4 mr-1" />
                  Terminati ({terminatedCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca atleta..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atleta</TableHead>
                  <TableHead>Livello</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <LoadingSpinner variant="dots" size="sm" />
                    </TableCell>
                  </TableRow>
                ) : paginatedConnections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {activeTab === 'pending' ? 'Nessuna richiesta pendente' : 'Nessun atleta trovato'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedConnections.map((conn) => (
                    <TableRow 
                      key={conn.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetail(conn)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-role-atleta/20">
                            <AvatarImage src={conn.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-role-atleta/10 text-role-atleta font-medium">
                              {conn.profiles?.first_name?.[0]}{conn.profiles?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {conn.profiles?.first_name} {conn.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{conn.profiles?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-sm">{conn.atleta_profiles?.level || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <DashboardStatusBadge status={conn.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conn.accepted_at 
                          ? new Date(conn.accepted_at).toLocaleDateString('it-IT')
                          : new Date(conn.requested_at).toLocaleDateString('it-IT')
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {conn.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success hover:text-success hover:bg-success/10"
                                onClick={() => acceptMutation.mutate(conn)}
                                disabled={acceptMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accetta
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => rejectMutation.mutate(conn)}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rifiuta
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleViewDetail(conn)}>
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredConnections.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </SectionCard>

      {/* Detail Sheet */}
      <DetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        profile={selectedAthlete ? getProfileInfo(selectedAthlete) : null}
        tags={selectedAthlete?.atleta_profiles?.goals || []}
        stats={[
          { label: 'Livello', value: selectedAthlete?.atleta_profiles?.level || 'N/A' },
          { label: 'Stato', value: selectedAthlete?.atleta_profiles?.status || 'attivo' },
        ]}
        actions={
          selectedAthlete?.status === 'active' ? (
            <>
              <Button className="flex-1" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messaggio
              </Button>
              <Button className="flex-1">
                <Dumbbell className="h-4 w-4 mr-2" />
                Assegna Scheda
              </Button>
            </>
          ) : selectedAthlete?.status === 'pending' ? (
            <>
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => {
                  if (selectedAthlete) rejectMutation.mutate(selectedAthlete);
                  setDetailOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Rifiuta
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  if (selectedAthlete) acceptMutation.mutate(selectedAthlete);
                  setDetailOpen(false);
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                Accetta
              </Button>
            </>
          ) : null
        }
      />
    </div>
  );
}

export default PTAthletesPage;
