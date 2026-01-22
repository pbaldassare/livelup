import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  UserCog, 
  MoreHorizontal, 
  Check, 
  X, 
  Eye,
  Ban,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';

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
  } | null;
}

export function AdminPTsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const queryClient = useQueryClient();

  // Fetch PTs
  const { data: pts, isLoading } = useQuery({
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
        .select('user_id, first_name, last_name, email, avatar_url')
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

  const columns: Column<PTListItem>[] = [
    {
      key: 'name',
      header: 'Nome',
      cell: (pt) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-role-pt/10 text-role-pt text-sm font-medium">
            {pt.profiles?.first_name?.[0] || 'P'}
          </div>
          <div>
            <p className="font-medium">
              {pt.profiles?.first_name} {pt.profiles?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{pt.profiles?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (pt) => <StatusBadge status={pt.status} />,
    },
    {
      key: 'level',
      header: 'Livello',
      cell: (pt) => pt.level || '-',
    },
    {
      key: 'location',
      header: 'Città',
      cell: (pt) => pt.location_city || '-',
    },
    {
      key: 'rating',
      header: 'Rating',
      cell: (pt) => (
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">★</span>
          <span>{pt.rating_avg?.toFixed(1) || '0.0'}</span>
          <span className="text-muted-foreground text-xs">({pt.review_count})</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Registrato',
      cell: (pt) => new Date(pt.created_at).toLocaleDateString('it-IT'),
    },
  ];

  const actions = (pt: PTListItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/pts/${pt.user_id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizza
          </Link>
        </DropdownMenuItem>
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
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestione Personal Trainers"
        description="Approva, sospendi e gestisci i Personal Trainer"
        icon={UserCog}
      />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setSearchParams(value === 'all' ? {} : { status: value });
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="pending">In attesa</SelectItem>
            <SelectItem value="attivo">Attivi</SelectItem>
            <SelectItem value="sospeso">Sospesi</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={pts || []}
        isLoading={isLoading}
        searchPlaceholder="Cerca PT..."
        emptyMessage="Nessun Personal Trainer trovato"
        actions={actions}
      />
    </div>
  );
}

export default AdminPTsPage;
