import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { DetailSheet, ProfileInfo } from '@/components/dashboard/DetailSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  UserCog, 
  MoreHorizontal, 
  Check, 
  Eye,
  Ban,
  RefreshCw,
  Search,
  Users,
  Clock,
  UserX,
  Star,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

// =====================================================
// ADMIN PTS PAGE - Gestione Personal Trainers
// Solo per ruolo: admin (web dashboard)
// =====================================================

interface PTListItem {
  id: string;
  user_id: string;
  status: string;
  level: string | null;
  specializations: string[] | null;
  location_city: string | null;
  rating_avg: number;
  review_count: number;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
}

export function AdminPTsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPT, setSelectedPT] = useState<PTListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch PTs
  const { data: pts = [], isLoading } = useQuery({
    queryKey: ['admin-pts', statusFilter],
    queryFn: async () => {
      const { data: ptData, error } = await supabase
        .from('pt_profiles')
        .select('id, user_id, status, level, specializations, location_city, rating_avg, review_count, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = ptData?.map(p => p.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, avatar_url, phone')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      let result = ptData?.map(pt => ({
        ...pt,
        profiles: profilesMap.get(pt.user_id) || null
      })) || [];

      // Filter by status
      if (statusFilter === 'pending') {
        result = result.filter(pt => pt.status === 'in_attesa_approvazione');
      } else if (statusFilter !== 'all') {
        result = result.filter(pt => pt.status === statusFilter);
      }

      return result as PTListItem[];
    },
  });

  // Filter by search term
  const filteredPTs = pts.filter((pt) => {
    const fullName = `${pt.profiles?.first_name || ''} ${pt.profiles?.last_name || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           pt.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           pt.location_city?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Compute stats
  const totalPTs = pts.length;
  const activePTs = pts.filter(pt => pt.status === 'attivo').length;
  const pendingPTs = pts.filter(pt => pt.status === 'in_attesa_approvazione').length;
  const suspendedPTs = pts.filter(pt => pt.status === 'sospeso').length;

  // Update PT status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: 'registrato' | 'in_attesa_approvazione' | 'attivo' | 'sospeso' | 'premium' }) => {
      const { error } = await supabase
        .from('pt_profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-pts'] });
      toast.success('Stato PT aggiornato');
      setDetailOpen(false);
    },
    onError: (error) => {
      toast.error('Errore durante l\'aggiornamento: ' + error.message);
    },
  });

  const handleApprove = (userId: string) => {
    updateStatusMutation.mutate({ userId, newStatus: 'attivo' });
  };

  const handleSuspend = (userId: string) => {
    updateStatusMutation.mutate({ userId, newStatus: 'sospeso' });
  };

  const handleReactivate = (userId: string) => {
    updateStatusMutation.mutate({ userId, newStatus: 'attivo' });
  };

  const handleViewDetail = (pt: PTListItem) => {
    setSelectedPT(pt);
    setDetailOpen(true);
  };

  const getProfileInfo = (pt: PTListItem): ProfileInfo => ({
    id: pt.id,
    userId: pt.user_id,
    firstName: pt.profiles?.first_name,
    lastName: pt.profiles?.last_name,
    email: pt.profiles?.email,
    phone: pt.profiles?.phone,
    avatarUrl: pt.profiles?.avatar_url,
    status: pt.status,
    createdAt: pt.created_at,
    role: 'pt',
  });

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="Gestione Personal Trainers"
        subtitle="Approva, sospendi e gestisci i Personal Trainer"
        icon={<UserCog className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Personal Trainers' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Totale PT"
          value={totalPTs}
          icon={Users}
          iconColor="primary"
        />
        <KPICard
          title="PT Attivi"
          value={activePTs}
          icon={Check}
          iconColor="success"
        />
        <KPICard
          title="In Attesa"
          value={pendingPTs}
          icon={Clock}
          iconColor="warning"
        />
        <KPICard
          title="Sospesi"
          value={suspendedPTs}
          icon={UserX}
          iconColor="danger"
        />
      </div>

      {/* Table Section */}
      <SectionCard
        title="Lista Personal Trainers"
        subtitle="Gestisci tutti i PT registrati sulla piattaforma"
        icon={UserCog}
        iconColor="primary"
      >
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca PT per nome, email o città..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setSearchParams(value === 'all' ? {} : { status: value });
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="attivo">Attivi</SelectItem>
                <SelectItem value="sospeso">Sospesi</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personal Trainer</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Città</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Registrato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Caricamento...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPTs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nessun Personal Trainer trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPTs.map((pt) => (
                    <TableRow 
                      key={pt.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetail(pt)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-role-pt/20">
                            <AvatarImage src={pt.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-role-pt/10 text-role-pt font-medium">
                              {pt.profiles?.first_name?.[0] || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {pt.profiles?.first_name} {pt.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{pt.profiles?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DashboardStatusBadge 
                          status={pt.status === 'in_attesa_approvazione' ? 'pending' : pt.status} 
                          size="sm" 
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {pt.location_city || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          <span className="font-medium">{pt.rating_avg?.toFixed(1) || '0.0'}</span>
                          <span className="text-muted-foreground text-xs">({pt.review_count})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(pt.created_at).toLocaleDateString('it-IT')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(pt)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizza
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {pt.status === 'in_attesa_approvazione' && (
                                <DropdownMenuItem onClick={() => handleApprove(pt.user_id)}>
                                  <Check className="mr-2 h-4 w-4 text-success" />
                                  Approva
                                </DropdownMenuItem>
                              )}
                              {pt.status === 'attivo' && (
                                <DropdownMenuItem onClick={() => handleSuspend(pt.user_id)}>
                                  <Ban className="mr-2 h-4 w-4 text-destructive" />
                                  Sospendi
                                </DropdownMenuItem>
                              )}
                              {pt.status === 'sospeso' && (
                                <DropdownMenuItem onClick={() => handleReactivate(pt.user_id)}>
                                  <RefreshCw className="mr-2 h-4 w-4 text-success" />
                                  Riattiva
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SectionCard>

      {/* Detail Sheet */}
      <DetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        profile={selectedPT ? getProfileInfo(selectedPT) : null}
        tags={selectedPT?.specializations || []}
        stats={[
          { label: 'Rating', value: selectedPT?.rating_avg?.toFixed(1) || '0.0' },
          { label: 'Recensioni', value: selectedPT?.review_count || 0 },
        ]}
        extraInfo={[
          { label: 'Livello', value: selectedPT?.level || 'N/A' },
          { label: 'Città', value: selectedPT?.location_city || 'Non specificata' },
        ]}
        actions={
          selectedPT?.status === 'in_attesa_approvazione' ? (
            <>
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => handleSuspend(selectedPT.user_id)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Rifiuta
              </Button>
              <Button 
                className="flex-1"
                onClick={() => handleApprove(selectedPT.user_id)}
              >
                <Check className="h-4 w-4 mr-2" />
                Approva
              </Button>
            </>
          ) : selectedPT?.status === 'attivo' ? (
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleSuspend(selectedPT.user_id)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Sospendi PT
            </Button>
          ) : selectedPT?.status === 'sospeso' ? (
            <Button 
              className="w-full"
              onClick={() => handleReactivate(selectedPT.user_id)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Riattiva PT
            </Button>
          ) : null
        }
      />
    </div>
  );
}

export default AdminPTsPage;
