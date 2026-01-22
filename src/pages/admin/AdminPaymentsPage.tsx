import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  description: string | null;
  created_at: string;
  paid_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export function AdminPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter],
    queryFn: async () => {
      const { data: paymentData, error } = await supabase
        .from('payments')
        .select('id, user_id, amount, currency, status, payment_method, description, created_at, paid_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const userIds = paymentData?.map(p => p.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      let result = paymentData?.map(p => ({
        ...p,
        profiles: profilesMap.get(p.user_id) || null
      })) || [];

      if (statusFilter !== 'all') {
        result = result.filter(p => p.status === statusFilter);
      }

      return result as Payment[];
    },
  });

  // Calculate stats
  const stats = {
    total: payments?.reduce((sum, p) => p.status === 'completed' ? sum + p.amount : sum, 0) || 0,
    pending: payments?.filter((p) => p.status === 'pending').length || 0,
    failed: payments?.filter((p) => p.status === 'failed').length || 0,
  };

  const columns: Column<Payment>[] = [
    {
      key: 'user',
      header: 'Utente',
      cell: (payment) => (
        <div>
          <p className="font-medium">
            {payment.profiles?.first_name} {payment.profiles?.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{payment.profiles?.email}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Importo',
      cell: (payment) => (
        <span className="font-medium">
          €{payment.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descrizione',
      cell: (payment) => payment.description || '-',
    },
    {
      key: 'method',
      header: 'Metodo',
      cell: (payment) => payment.payment_method || '-',
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: 'date',
      header: 'Data',
      cell: (payment) => new Date(payment.created_at).toLocaleDateString('it-IT'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamenti"
        description="Visualizza tutti i pagamenti della piattaforma"
        icon={CreditCard}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totale Incassato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€{stats.total.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Attesa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Falliti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

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
            <SelectItem value="completed">Completati</SelectItem>
            <SelectItem value="pending">In attesa</SelectItem>
            <SelectItem value="failed">Falliti</SelectItem>
            <SelectItem value="refunded">Rimborsati</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={payments || []}
        isLoading={isLoading}
        searchPlaceholder="Cerca pagamento..."
        emptyMessage="Nessun pagamento trovato"
      />
    </div>
  );
}

export default AdminPaymentsPage;
