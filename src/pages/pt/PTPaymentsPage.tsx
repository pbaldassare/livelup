import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

// =====================================================
// PT PAYMENTS PAGE - Stato Abbonamento e Fatturazione
// Solo per ruolo: pt (web dashboard)
// =====================================================

interface Subscription {
  id: string;
  subscription_type: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  next_billing_at: string | null;
  price_monthly: number | null;
  currency: string;
  trial_ends_at: string | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  description: string | null;
}

export function PTPaymentsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();

  // Fetch subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['pt-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Subscription | null;
    },
    enabled: !!user?.id,
  });

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['pt-payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user?.id,
  });

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'date',
      header: 'Data',
      cell: (payment) => (
        <span className="text-sm">
          {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: it })}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descrizione',
      cell: (payment) => (
        <span>{payment.description || 'Pagamento abbonamento'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Importo',
      cell: (payment) => (
        <span className="font-medium">
          {formatCurrency(payment.amount, payment.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: 'paid_at',
      header: 'Pagato il',
      cell: (payment) => (
        <span className="text-sm text-muted-foreground">
          {payment.paid_at 
            ? format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm', { locale: it })
            : '-'
          }
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        {!embedded && (
          <PageHeader
            title="Pagamenti"
            description="Gestisci il tuo abbonamento e visualizza lo storico pagamenti"
            icon={CreditCard}
          />
        )}
        <Button variant="outline" size="sm" onClick={() => {
          const csvRows = [['Data', 'Descrizione', 'Importo', 'Valuta', 'Stato', 'Pagato il']];
          payments.forEach(p => {
            csvRows.push([
              format(new Date(p.created_at), 'dd/MM/yyyy', { locale: it }),
              p.description || 'Pagamento abbonamento',
              String(p.amount),
              p.currency,
              p.status,
              p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy HH:mm', { locale: it }) : '-',
            ]);
          });
          const csv = csvRows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'pagamenti.csv'; a.click();
          URL.revokeObjectURL(url);
          toast.success('CSV esportato');
        }}>
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      {/* Subscription Status Card */}
      <Card className="border-role-pt/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-role-pt" />
            Stato Abbonamento
          </CardTitle>
          <CardDescription>
            Il tuo piano attuale e le informazioni di fatturazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionLoading ? (
            <LoadingSpinner variant="dots" size="sm" text="Caricamento abbonamento..." />
          ) : subscription ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Piano</p>
                <p className="text-lg font-semibold capitalize">
                  {subscription.subscription_type.replace('_', ' ')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Stato</p>
                <StatusBadge status={subscription.status} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Prezzo Mensile</p>
                <p className="text-lg font-semibold">
                  {subscription.price_monthly 
                    ? formatCurrency(subscription.price_monthly, subscription.currency)
                    : 'N/A'
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Prossimo Rinnovo</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {subscription.next_billing_at 
                    ? format(new Date(subscription.next_billing_at), 'dd MMM yyyy', { locale: it })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <p className="text-lg font-medium">Nessun abbonamento attivo</p>
              <p className="text-muted-foreground mt-1">
                Attiva un piano per accedere a tutte le funzionalità
              </p>
              <Button className="mt-4">Visualizza Piani</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale Pagato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold">
                {formatCurrency(totalPaid)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagamenti Riusciti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold">
                {payments.filter(p => p.status === 'paid').length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-2xl font-bold">
                {payments.filter(p => p.status === 'pending').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments History */}
      <Card>
        <CardHeader>
          <CardTitle>Storico Pagamenti</CardTitle>
          <CardDescription>
            Tutti i pagamenti effettuati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={paymentColumns}
            data={payments}
            isLoading={paymentsLoading}
            emptyMessage="Nessun pagamento trovato"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default PTPaymentsPage;
