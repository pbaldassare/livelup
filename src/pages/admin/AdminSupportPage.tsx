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
import { Link, useLocation, useSearchParams } from 'react-router-dom';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string | null;
  status: string;
  priority: string;
  needs_admin_reply?: boolean;
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPtFeedbackRoute = location.pathname === '/admin/pt-feedback';
  const statusFilter =
    searchParams.get('status') || (isPtFeedbackRoute ? 'all' : 'open');
  const ptOnly = isPtFeedbackRoute || searchParams.get('type') === 'pt';
  const pendingReplyOnly = searchParams.get('pending_reply') === '1';
  const queryClient = useQueryClient();

  // Fetch tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter, ptOnly, pendingReplyOnly],
    queryFn: async () => {
      const { data: ticketData, error } = await supabase
        .from('support_tickets')
        .select('id, user_id, subject, description, category, status, priority, needs_admin_reply, created_at')
        .order('created_at', { ascending: false })
        .returns<Array<Omit<SupportTicket, 'profiles'> & { user_id: string }>>();

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
      if (ptOnly) {
        result = result.filter((t) => t.category?.startsWith('pt_'));
      }
      if (pendingReplyOnly) {
        result = result.filter(
          (t) =>
            t.category?.startsWith('pt_') &&
            (t as SupportTicket & { needs_admin_reply?: boolean }).needs_admin_reply &&
            ['open', 'in_progress'].includes(t.status),
        );
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
        title={ptOnly ? 'Feedback Professionisti' : 'Supporto'}
        description={
          pendingReplyOnly
            ? 'Ticket PT in attesa di una tua risposta'
            : 'Gestisci i ticket di supporto degli utenti'
        }
        icon={Ticket}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {ptOnly && (
          <Badge variant="secondary">Solo feedback PT</Badge>
        )}
        {pendingReplyOnly && (
          <Badge className="bg-warning/15 text-warning border-warning/30">Da rispondere</Badge>
        )}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            if (isPtFeedbackRoute) {
              const next = new URLSearchParams();
              if (value !== 'all') next.set('status', value);
              if (pendingReplyOnly) next.set('pending_reply', '1');
              setSearchParams(next);
              return;
            }
            const next = new URLSearchParams();
            next.set('status', value);
            if (ptOnly) next.set('type', 'pt');
            if (pendingReplyOnly) next.set('pending_reply', '1');
            setSearchParams(next);
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
