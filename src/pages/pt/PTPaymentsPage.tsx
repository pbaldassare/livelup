import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Download,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { PTBillingBanner } from '@/components/pt/PTBillingBanner';
import { usePTBilling, usePTBillingEvents, useStartPTCheckout } from '@/hooks/usePTBilling';
import {
  formatEur,
  needsPaidUpgrade,
  planAthleteLabel,
  type PTBillingPlan,
} from '@/lib/api/ptBilling';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  description: string | null;
}

interface BillingEvent {
  id: string;
  event_type: string;
  athlete_count: number | null;
  created_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  ensured: 'Piano attivato',
  upgrade_requested: 'Upgrade richiesto',
  tier_up: 'Piano aggiornato',
  tier_down_scheduled: 'Downgrade programmato',
  tier_down: 'Piano ridotto',
  payment_pending: 'Pagamento in attesa',
  payment_completed: 'Pagamento confermato',
  payment_failed: 'Pagamento fallito',
  grace_started: 'Periodo di grazia',
  blocked: 'Account bloccato',
  unblocked: 'Account sbloccato',
  reactivated: 'Riattivato',
};

function planFeatures(plan: PTBillingPlan): string[] {
  if (Array.isArray(plan.features)) return plan.features.map(String);
  return [];
}

function usagePercent(count: number, max: number | null) {
  if (max == null || max <= 0) return 0;
  return Math.min(100, Math.round((count / max) * 100));
}

export function PTPaymentsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: overview, isLoading: overviewLoading } = usePTBilling();
  const { data: events = [], isLoading: eventsLoading } = usePTBillingEvents();
  const checkoutMutation = useStartPTCheckout();

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('Pagamento ricevuto. Il piano si attiva tra pochi secondi.');
      searchParams.delete('checkout');
      setSearchParams(searchParams, { replace: true });
    }
    if (checkout === 'cancel') {
      toast.info('Checkout annullato.');
      searchParams.delete('checkout');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  const subscription = overview?.subscription ?? null;
  const currentPlan = overview?.current_plan ?? null;
  const athleteCount = overview?.athlete_count ?? 0;
  const plans = overview?.plans ?? [];
  const upgradeNeeded = needsPaidUpgrade(currentPlan, overview?.required_plan ?? null);
  const maxAthletes = currentPlan?.max_athletes ?? null;

  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const handleRequestPlan = async (plan: PTBillingPlan) => {
    if ((plan.price_monthly ?? 0) <= 0) {
      toast.info('Il piano Starter è già incluso, fino a 5 atleti.');
      return;
    }
    try {
      toast.message('Apertura Checkout Stripe…');
      await checkoutMutation.mutateAsync(plan.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossibile aprire Checkout');
    }
  };

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
      cell: (payment) => <span>{payment.description || 'Pagamento abbonamento'}</span>,
    },
    {
      key: 'amount',
      header: 'Importo',
      cell: (payment) => (
        <span className="font-medium">{formatEur(Number(payment.amount), payment.currency)}</span>
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
            : '-'}
        </span>
      ),
    },
  ];

  const eventColumns: Column<BillingEvent>[] = [
    {
      key: 'created_at',
      header: 'Data',
      cell: (ev) => format(new Date(ev.created_at), 'dd MMM yyyy HH:mm', { locale: it }),
    },
    {
      key: 'event_type',
      header: 'Evento',
      cell: (ev) => EVENT_LABELS[ev.event_type] || ev.event_type,
    },
    {
      key: 'athlete_count',
      header: 'Atleti',
      cell: (ev) => ev.athlete_count ?? '—',
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        {!embedded && (
          <PageHeader
            title="Pagamenti"
            description="Piano in base agli atleti attivi, storico e fatturazione"
            icon={CreditCard}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const csvRows = [['Data', 'Descrizione', 'Importo', 'Valuta', 'Stato', 'Pagato il']];
            payments.forEach((p) => {
              csvRows.push([
                format(new Date(p.created_at), 'dd/MM/yyyy', { locale: it }),
                p.description || 'Pagamento abbonamento',
                String(p.amount),
                p.currency,
                p.status,
                p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy HH:mm', { locale: it }) : '-',
              ]);
            });
            const csv = csvRows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pagamenti.csv';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('CSV esportato');
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      <PTBillingBanner forceApp={embedded} />

      <Card className="border-pt-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-pt-primary" />
            Piano attuale
          </CardTitle>
          <CardDescription>
            Paghi Livelapp in base al numero di atleti con connessione attiva
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <LoadingSpinner variant="dots" size="sm" text="Caricamento abbonamento..." />
          ) : subscription && currentPlan ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Piano</p>
                  <p className="text-lg font-semibold">{currentPlan.name}</p>
                  <p className="text-xs text-muted-foreground">{planAthleteLabel(currentPlan)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Stato</p>
                  <StatusBadge status={subscription.status} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Prezzo mensile</p>
                  <p className="text-lg font-semibold">
                    {formatEur(Number(subscription.price_monthly ?? currentPlan.price_monthly))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Prossimo rinnovo</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {subscription.next_billing_at
                      ? format(new Date(subscription.next_billing_at), 'dd MMM yyyy', { locale: it })
                      : 'Non previsto'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Atleti attivi
                  </span>
                  <span className="font-medium">
                    {athleteCount}
                    {maxAthletes != null ? ` / ${maxAthletes}` : ' · illimitati'}
                  </span>
                </div>
                {maxAthletes != null && (
                  <Progress value={usagePercent(athleteCount, maxAthletes)} />
                )}
                {!overview?.can_accept && (
                  <p className="text-sm text-warning">
                    Non puoi accettare nuovi atleti con il piano attuale.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <p className="text-lg font-medium">Nessun abbonamento</p>
              <p className="text-muted-foreground mt-1">
                Ricarica la pagina: il piano Starter (fino a 5 atleti) si attiva da solo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {upgradeNeeded && overview?.required_plan && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Serve {overview.required_plan.name}</AlertTitle>
          <AlertDescription>
            Con {athleteCount} atleti il piano dovuto è {overview.required_plan.name}{' '}
            ({formatEur(overview.required_plan.price_monthly)}/mese). Paga con carta su Stripe.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3">Piani disponibili</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.id === plan.id;
            const isPending = overview?.pending_plan?.id === plan.id;
            const isPaid = (plan.price_monthly ?? 0) > 0;
            return (
              <Card key={plan.id} className={isCurrent ? 'border-pt-primary' : undefined}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isCurrent && <Badge>Attuale</Badge>}
                    {isPending && !isCurrent && <Badge variant="outline">In attesa</Badge>}
                  </div>
                  <CardDescription>{planAthleteLabel(plan)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-2xl font-bold">
                    {formatEur(Number(plan.price_monthly))}
                    <span className="text-sm font-normal text-muted-foreground">/mese</span>
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {planFeatures(plan).map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || checkoutMutation.isPending || !isPaid}
                    onClick={() => handleRequestPlan(plan)}
                  >
                    {!isPaid
                      ? 'Incluso'
                      : isCurrent
                        ? 'Piano attuale'
                        : checkoutMutation.isPending
                          ? 'Reindirizzamento…'
                          : `Paga ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Pagamento con carta via Stripe Checkout. Il piano si attiva al webhook di conferma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale pagato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold">{formatEur(totalPaid)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagamenti riusciti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold">
                {payments.filter((p) => p.status === 'completed').length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In attesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-2xl font-bold">
                {payments.filter((p) => p.status === 'pending').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storico pagamenti</CardTitle>
          <CardDescription>Addebiti piattaforma (non i pacchetti che vendi agli atleti)</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Attività billing</CardTitle>
          <CardDescription>Upgrade, grazia, blocchi e conferme pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={eventColumns}
            data={events as BillingEvent[]}
            isLoading={eventsLoading}
            emptyMessage="Nessun evento"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default PTPaymentsPage;
