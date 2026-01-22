import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

// Mappature status -> variant
const statusVariantMap: Record<string, StatusVariant> = {
  // PT Status
  attivo: 'success',
  registrato: 'info',
  in_attesa_approvazione: 'warning',
  sospeso: 'danger',
  premium: 'success',
  // Atleta Status
  collegato: 'success',
  non_collegato: 'muted',
  // Connection Status
  active: 'success',
  pending: 'warning',
  terminated: 'muted',
  rifiutato: 'danger',
  richiesta: 'warning',
  // Workout Status
  completato: 'success',
  scaduto: 'danger',
  // Subscription Status
  trial: 'info',
  scaduto_sub: 'danger',
  bloccato: 'danger',
  // Payment Status
  completed: 'success',
  failed: 'danger',
  refunded: 'warning',
  // Ticket Status
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'muted',
  // Generic
  true: 'success',
  false: 'muted',
};

// Label mappatura
const statusLabelMap: Record<string, string> = {
  attivo: 'Attivo',
  registrato: 'Registrato',
  in_attesa_approvazione: 'In Attesa',
  sospeso: 'Sospeso',
  premium: 'Premium',
  collegato: 'Collegato',
  non_collegato: 'Non Collegato',
  active: 'Attivo',
  pending: 'In Attesa',
  terminated: 'Terminato',
  rifiutato: 'Rifiutato',
  richiesta: 'Richiesta',
  completato: 'Completato',
  scaduto: 'Scaduto',
  trial: 'Trial',
  bloccato: 'Bloccato',
  completed: 'Completato',
  failed: 'Fallito',
  refunded: 'Rimborsato',
  open: 'Aperto',
  in_progress: 'In Corso',
  resolved: 'Risolto',
  closed: 'Chiuso',
};

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
  danger: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  info: 'bg-info/10 text-info border-info/20 hover:bg-info/20',
  default: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
  muted: 'bg-muted text-muted-foreground border-muted hover:bg-muted/80',
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant || statusVariantMap[status] || 'default';
  const label = statusLabelMap[status] || status;

  return (
    <Badge
      variant="outline"
      className={cn(variantStyles[resolvedVariant], 'font-medium', className)}
    >
      {label}
    </Badge>
  );
}

export default StatusBadge;
