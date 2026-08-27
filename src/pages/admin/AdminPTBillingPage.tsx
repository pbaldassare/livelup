import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  adminCompletePTPayment,
  adminEnforcePTPastDue,
  adminUnblockPTBilling,
  fetchAdminPTBillingReport,
  formatEur,
} from '@/lib/api/ptBilling';
import { BarChart3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PTSubRow {
  id: string;
  user_id: string;
  status: string;
  price_monthly: number | null;
  current_athlete_count: number;
  past_due_since: string | null;
  grace_period_ends_at: string | null;
  next_billing_at: string | null;
  plan_name: string;
  full_name: string;
  email: string;
}

interface PendingPayRow {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created_at: string;
  full_name: string;
  email: string;
}

export function AdminPTBillingPage() {
  const queryClient = useQueryClient();

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['admin-pt-billing-report'],
    queryFn: fetchAdminPTBillingReport,
  });

  const { data: subs = [], isLoading: subsLoading } = useQuery({
    queryKey: ['admin-pt-billing-subs'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase.from('subscriptions') as any)
        .select('id, user_id, status, price_monthly, current_athlete_count, past_due_since, grace_period_ends_at, next_billing_at, plan_id')
        .in('subscription_type', ['pt_base', 'pt_premium'])
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))] as string[];
      const planIds = [...new Set((rows ?? []).map((r: any) => r.plan_id).filter(Boolean))] as string[];

      const [{ data: profiles }, { data: plans }] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, last_name, email').in('user_id', userIds),
        planIds.length
          ? supabase.from('subscription_plans').select('id, name').in('id', planIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);

      const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      const planMap = new Map((plans ?? []).map((p) => [p.id, p.name]));

      return (rows ?? []).map((r) => {
        const p = pMap.get(r.user_id);
        return {
          ...r,
          current_athlete_count: Number(
            (r as { current_athlete_count?: number }).current_athlete_count ?? 0,
          ),
          plan_name: r.plan_id ? planMap.get(r.plan_id) || '—' : '—',
          full_name: [p?.first_name, p?.last_name].filter(Boolean).join(' ') || '—',
          email: p?.email || '—',
        } as PTSubRow;
      });
    },
  });

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-pt-pending-payments'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('payments')
        .select('id, user_id, amount, currency, status, description, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);
      const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return (rows ?? []).map((r) => {
        const p = pMap.get(r.user_id);
        return {
          ...r,
          full_name: [p?.first_name, p?.last_name].filter(Boolean).join(' ') || '—',
          email: p?.email || '—',
        } as PendingPayRow;
      });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-pt-billing-report'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pt-billing-subs'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pt-pending-payments'] });
    queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
  };

  const completeMut = useMutation({
    mutationFn: adminCompletePTPayment,
    onSuccess: () => {
      toast.success('Pagamento confermato, piano attivato');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unblockMut = useMutation({
    mutationFn: adminUnblockPTBilling,
    onSuccess: () => {
      toast.success('PT sbloccato');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enforceMut = useMutation({
    mutationFn: adminEnforcePTPastDue,
    onSuccess: (n) => {
      toast.success(`Controllo scaduti: ${n} abbonamenti verificati`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const subColumns: Column<PTSubRow>[] = [
    {
      key: 'pt',
      header: 'Professionista',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    { key: 'plan_name', header: 'Piano', cell: (row) => row.plan_name },
    { key: 'athletes', header: 'Atleti', cell: (row) => row.current_athlete_count },
    {
      key: 'price',
      header: 'Mensile',
      cell: (row) => formatEur(Number(row.price_monthly ?? 0)),
    },
    { key: 'status', header: 'Stato', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'grace',
      header: 'Grazia / scad.',
      cell: (row) =>
        row.grace_period_ends_at
          ? new Date(row.grace_period_ends_at).toLocaleDateString('it-IT')
          : row.next_billing_at
            ? new Date(row.next_billing_at).toLocaleDateString('it-IT')
            : '—',
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        row.status === 'bloccato' || row.past_due_since ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => unblockMut.mutate(row.user_id)}
            disabled={unblockMut.isPending}
          >
            Sblocca
          </Button>
        ) : null,
    },
  ];

  const payColumns: Column<PendingPayRow>[] = [
    {
      key: 'pt',
      header: 'Professionista',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    { key: 'description', header: 'Descrizione', cell: (row) => row.description || '—' },
    { key: 'amount', header: 'Importo', cell: (row) => formatEur(Number(row.amount), row.currency) },
    {
      key: 'created',
      header: 'Richiesto',
      cell: (row) => new Date(row.created_at).toLocaleDateString('it-IT'),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          size="sm"
          onClick={() => completeMut.mutate(row.id)}
          disabled={completeMut.isPending}
        >
          Conferma pagamento
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Report billing PT"
          description="Ricavi per fascia atleti, scaduti, blocchi. Stripe si collega dopo."
          icon={BarChart3}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => enforceMut.mutate()}
          disabled={enforceMut.isPending}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Verifica scaduti
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {reportLoading ? '…' : formatEur(Number(report?.mrr ?? 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">In grazia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report?.grace ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bloccati</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report?.blocked ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pagamenti pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report?.pending_payments ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Falliti (mese)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report?.failed_this_month ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Split per piano</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(report?.by_plan ?? []).map((p) => (
            <div key={p.slug} className="rounded-lg border p-3">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {p.subscribers} PT · {formatEur(Number(p.mrr))} MRR
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {(report?.near_limit?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vicini al tetto atleti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report!.near_limit.map((n) => (
              <div key={n.user_id} className="flex justify-between gap-2 border-b py-2 last:border-0">
                <span>
                  {[n.first_name, n.last_name].filter(Boolean).join(' ') || n.email}
                </span>
                <span className="text-muted-foreground">
                  {n.current_athlete_count}/{n.max_athletes ?? '∞'} · {n.plan_name}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pagamenti in attesa (conferma manuale pre-Stripe)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={payColumns}
            data={pending}
            isLoading={pendingLoading}
            emptyMessage="Nessun pagamento in attesa"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abbonamenti PT</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={subColumns}
            data={subs}
            isLoading={subsLoading}
            searchPlaceholder="Cerca PT..."
            emptyMessage="Nessun abbonamento PT"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPTBillingPage;
