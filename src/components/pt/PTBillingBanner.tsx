import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePTBilling } from '@/hooks/usePTBilling';
import { formatEur, needsPaidUpgrade, planAthleteLabel } from '@/lib/api/ptBilling';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import { cn } from '@/lib/utils';

export function PTBillingBanner({ forceApp = false }: { forceApp?: boolean }) {
  const { data, isLoading } = usePTBilling();
  const { routes, isApp } = usePTRoutes(forceApp);
  const { pathname } = useLocation();

  if (pathname.includes('/payments')) return null;

  if (isLoading || !data?.subscription) return null;

  const sub = data.subscription;
  const blocked = sub.status === 'bloccato';
  const pastDue = !!sub.past_due_since && !blocked;
  const upgrade = needsPaidUpgrade(data.current_plan, data.required_plan);

  if (!blocked && !pastDue && !upgrade) return null;

  const href = routes.payments;

  if (blocked) {
    return (
      <Alert className={cn('mb-4 border-destructive/40 bg-destructive/10')}>
        <Lock className="h-4 w-4" />
        <AlertTitle>Abbonamento bloccato</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Il pagamento non è andato a buon fine. Non puoi accettare nuovi atleti finché
            l&apos;abbonamento non viene riattivato.
          </span>
          <Button asChild size="sm" variant="destructive">
            <Link to={href}>Vai a Pagamenti</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (pastDue) {
    const grace = sub.grace_period_ends_at
      ? new Date(sub.grace_period_ends_at).toLocaleDateString('it-IT')
      : null;
    return (
      <Alert className="mb-4 border-warning/40 bg-warning/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Pagamento in ritardo</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Hai 7 giorni di grazia{grace ? ` (fino al ${grace})` : ''}. Non puoi accettare nuovi
            atleti. Poi l&apos;account verrà disattivato.
          </span>
          <Button asChild size="sm">
            <Link to={href}>Regolarizza</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert
      className={cn(
        'mb-4',
        isApp ? 'border-app-border bg-app-card text-app-foreground' : 'border-pt-primary/30 bg-pt-primary/5',
      )}
    >
      <CreditCard className="h-4 w-4" />
      <AlertTitle>Piano da aggiornare</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Hai {data.athlete_count} atleti attivi. Serve il piano {data.required_plan?.name} (
          {planAthleteLabel(data.required_plan)}
          {data.required_plan ? ` · ${formatEur(data.required_plan.price_monthly)}/mese` : ''}).
          Non puoi accettare altri atleti sul piano attuale.
        </span>
        <Button asChild size="sm">
          <Link to={href}>Aggiorna piano</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
