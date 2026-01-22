import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Ticket, MoreHorizontal, Eye, CheckCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string | null;
  status: string;
  priority: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

export function AdminSupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'open';
  const queryClient = useQueryClient();

  // Fetch tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter],
    queryFn: async () => {
      const { data: ticketData, error } = await supabase
        .from('support_tickets')
        .select('id, user_id, subject, description, category, status, priority, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = ticketData?.map(t => t.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      let result = ticketData?.map(t => ({
        ...t,
        profiles: profilesMap.get(t.user_id) || null
      })) || [];

      if (statusFilter !== 'all') {
        result = result.filter(t => t.status === statusFilter);
      }

      return result as SupportTicket[];
    },
  });

  // Update ticket status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Ticket aggiornato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  const columns: Column<SupportTicket>[] = [
    {
      key: 'subject',
      header: 'Oggetto',
      cell: (ticket) => (
        <div>
          <p className="font-medium">{ticket.subject}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[300px]">
            {ticket.description}
          </p>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Utente',
      cell: (ticket) => (
        <div>
          <p className="text-sm">
            {ticket.profiles?.first_name} {ticket.profiles?.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{ticket.profiles?.email}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      cell: (ticket) => ticket.category || '-',
    },
    {
      key: 'priority',
      header: 'Priorità',
      cell: (ticket) => (
        <Badge variant="outline" className={priorityColors[ticket.priority]}>
          {ticket.priority}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (ticket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'created_at',
      header: 'Data',
      cell: (ticket) => new Date(ticket.created_at).toLocaleDateString('it-IT'),
    },
  ];

  const actions = (ticket: SupportTicket) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/support/${ticket.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizza
          </Link>
        </DropdownMenuItem>
        {ticket.status === 'open' && (
          <DropdownMenuItem
            onClick={() =>
              updateStatusMutation.mutate({ id: ticket.id, status: 'in_progress' })
            }
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Prendi in carico
          </DropdownMenuItem>
        )}
        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
          <DropdownMenuItem
            onClick={() =>
              updateStatusMutation.mutate({ id: ticket.id, status: 'resolved' })
            }
          >
            <CheckCircle className="mr-2 h-4 w-4 text-success" />
            Segna risolto
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supporto"
        description="Gestisci i ticket di supporto degli utenti"
        icon={Ticket}
      />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setSearchParams({ status: value });
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="open">Aperti</SelectItem>
            <SelectItem value="in_progress">In corso</SelectItem>
            <SelectItem value="resolved">Risolti</SelectItem>
            <SelectItem value="closed">Chiusi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={tickets || []}
        isLoading={isLoading}
        searchPlaceholder="Cerca ticket..."
        emptyMessage="Nessun ticket trovato"
        actions={actions}
      />
    </div>
  );
}

export default AdminSupportPage;
