import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Pause,
  HelpCircle,
  Loader2
} from 'lucide-react';

// =====================================================
// STATUS BADGE - Badge di stato con colori semantici
// Segue il design reference con colori specifici
// =====================================================

type StatusType = 
  | 'active' | 'attivo' | 'approved' | 'approvato' | 'success' | 'completato'
  | 'pending' | 'in_attesa' | 'in_corso' | 'warning'
  | 'inactive' | 'inattivo' | 'sospeso' | 'suspended'
  | 'error' | 'rejected' | 'rifiutato' | 'cancelled'
  | 'info' | 'draft' | 'bozza'
  | 'unknown';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: typeof CheckCircle2;
  defaultLabel: string;
}> = {
  active: { variant: 'default', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20', icon: CheckCircle2, defaultLabel: 'Attivo' },
  attivo: { variant: 'default', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20', icon: CheckCircle2, defaultLabel: 'Attivo' },
  approved: { variant: 'default', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20', icon: CheckCircle2, defaultLabel: 'Approvato' },
  approvato: { variant: 'default', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20', icon: CheckCircle2, defaultLabel: 'Approvato' },
  success: { variant: 'default', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20', icon: CheckCircle2, defaultLabel: 'Completato' },
  completato: { variant: 'default', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20', icon: CheckCircle2, defaultLabel: 'Completato' },
  
  pending: { variant: 'secondary', className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20', icon: Clock, defaultLabel: 'In attesa' },
  in_attesa: { variant: 'secondary', className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20', icon: Clock, defaultLabel: 'In attesa' },
  in_corso: { variant: 'secondary', className: 'bg-info/10 text-info border-info/20 hover:bg-info/20', icon: Loader2, defaultLabel: 'In corso' },
  warning: { variant: 'secondary', className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20', icon: AlertCircle, defaultLabel: 'Attenzione' },
  
  inactive: { variant: 'outline', className: 'bg-muted/50 text-muted-foreground border-muted-foreground/20', icon: Pause, defaultLabel: 'Inattivo' },
  inattivo: { variant: 'outline', className: 'bg-muted/50 text-muted-foreground border-muted-foreground/20', icon: Pause, defaultLabel: 'Inattivo' },
  sospeso: { variant: 'outline', className: 'bg-muted/50 text-muted-foreground border-muted-foreground/20', icon: Pause, defaultLabel: 'Sospeso' },
  suspended: { variant: 'outline', className: 'bg-muted/50 text-muted-foreground border-muted-foreground/20', icon: Pause, defaultLabel: 'Sospeso' },
  
  error: { variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20', icon: XCircle, defaultLabel: 'Errore' },
  rejected: { variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20', icon: XCircle, defaultLabel: 'Rifiutato' },
  rifiutato: { variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20', icon: XCircle, defaultLabel: 'Rifiutato' },
  cancelled: { variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20', icon: XCircle, defaultLabel: 'Annullato' },
  
  info: { variant: 'secondary', className: 'bg-info/10 text-info border-info/20 hover:bg-info/20', icon: HelpCircle, defaultLabel: 'Info' },
  draft: { variant: 'outline', className: 'bg-muted/30 text-muted-foreground border-muted-foreground/20', icon: HelpCircle, defaultLabel: 'Bozza' },
  bozza: { variant: 'outline', className: 'bg-muted/30 text-muted-foreground border-muted-foreground/20', icon: HelpCircle, defaultLabel: 'Bozza' },
  
  unknown: { variant: 'outline', className: 'bg-muted/30 text-muted-foreground', icon: HelpCircle, defaultLabel: 'Sconosciuto' },
};

function normalizeStatus(status: string): StatusType {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  if (normalized in statusConfig) {
    return normalized as StatusType;
  }
  return 'unknown';
}

export function DashboardStatusBadge({ 
  status, 
  label, 
  size = 'default',
  showIcon = true,
  className 
}: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status);
  const config = statusConfig[normalizedStatus];
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <Badge 
      variant="outline"
      className={cn(
        'font-medium border',
        config.className,
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          'mr-1',
          size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
          normalizedStatus === 'in_corso' && 'animate-spin'
        )} />
      )}
      {displayLabel}
    </Badge>
  );
}

// =====================================================
// TAG BADGE - Badge per etichette/categorie
// =====================================================

interface TagBadgeProps {
  label: string;
  color?: 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
  className?: string;
}

const tagColorStyles = {
  default: 'bg-muted text-muted-foreground',
  blue: 'bg-info/10 text-info',
  green: 'bg-success/10 text-success',
  yellow: 'bg-warning/10 text-warning',
  red: 'bg-destructive/10 text-destructive',
  purple: 'bg-primary/10 text-primary',
  cyan: 'bg-cyan-500/10 text-cyan-600',
};

export function TagBadge({ label, color = 'default', className }: TagBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      tagColorStyles[color],
      className
    )}>
      {label}
    </span>
  );
}

// =====================================================
// MATCH BADGE - Badge con checkmark per matching
// =====================================================

interface MatchBadgeProps {
  label: string;
  matched?: boolean;
  className?: string;
}

export function MatchBadge({ label, matched = true, className }: MatchBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
      matched 
        ? 'bg-success/10 text-success' 
        : 'bg-muted text-muted-foreground',
      className
    )}>
      {matched && <CheckCircle2 className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default DashboardStatusBadge;
