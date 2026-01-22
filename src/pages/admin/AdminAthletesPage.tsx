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
import { Users, MoreHorizontal, Eye, Ban, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';

interface AtletaListItem {
  id: string;
  user_id: string;
  status: string;
  fitness_level: string | null;
  goals: string[] | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export function AdminAthletesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const queryClient = useQueryClient();

  // Fetch Athletes
  const { data: athletes, isLoading } = useQuery({
    queryKey: ['admin-athletes', statusFilter],
    queryFn: async () => {
      const { data: atletaData, error } = await supabase
        .from('atleta_profiles')
        .select('id, user_id, status, fitness_level, goals, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = atletaData?.map(a => a.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      let result = atletaData?.map(a => ({
        ...a,
        profiles: profilesMap.get(a.user_id) || null
      })) || [];

      if (statusFilter !== 'all') {
        result = result.filter(a => a.status === statusFilter);
      }

      return result as AtletaListItem[];
    },
  });

  const columns: Column<AtletaListItem>[] = [
    {
      key: 'name',
      header: 'Nome',
      cell: (atleta) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-role-atleta/10 text-role-atleta text-sm font-medium">
            {atleta.profiles?.first_name?.[0] || 'A'}
          </div>
          <div>
            <p className="font-medium">
              {atleta.profiles?.first_name} {atleta.profiles?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{atleta.profiles?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (atleta) => <StatusBadge status={atleta.status} />,
    },
    {
      key: 'level',
      header: 'Livello',
      cell: (atleta) => atleta.fitness_level || '-',
    },
    {
      key: 'goals',
      header: 'Obiettivi',
      cell: (atleta) => (
        <div className="flex flex-wrap gap-1">
          {atleta.goals?.slice(0, 2).map((goal, i) => (
            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
              {goal}
            </span>
          )) || '-'}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Registrato',
      cell: (atleta) => new Date(atleta.created_at).toLocaleDateString('it-IT'),
    },
  ];

  const actions = (atleta: AtletaListItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/athletes/${atleta.user_id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizza
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestione Atleti"
        description="Visualizza e gestisci gli atleti della piattaforma"
        icon={Users}
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
            <SelectItem value="non_collegato">Non collegati</SelectItem>
            <SelectItem value="collegato">Collegati</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={athletes || []}
        isLoading={isLoading}
        searchPlaceholder="Cerca atleta..."
        emptyMessage="Nessun atleta trovato"
        actions={actions}
      />
    </div>
  );
}

export default AdminAthletesPage;
