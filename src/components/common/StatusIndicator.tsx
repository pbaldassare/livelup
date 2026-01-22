import { cn } from '@/lib/utils';

// =====================================================
// STATUS INDICATOR - Indicatori di stato
// =====================================================

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'away' | 'busy' | 'active' | 'inactive' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  online: { color: 'bg-green-500', label: 'Online', pulse: true },
  offline: { color: 'bg-gray-400', label: 'Offline', pulse: false },
  away: { color: 'bg-yellow-500', label: 'Assente', pulse: false },
  busy: { color: 'bg-red-500', label: 'Occupato', pulse: false },
  active: { color: 'bg-green-500', label: 'Attivo', pulse: true },
  inactive: { color: 'bg-gray-400', label: 'Inattivo', pulse: false },
  pending: { color: 'bg-yellow-500', label: 'In attesa', pulse: true },
};

const sizeConfig = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusIndicator({ 
  status, 
  size = 'md', 
  showLabel = false,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex">
        <span
          className={cn(
            'rounded-full',
            sizeConfig[size],
            config.color
          )}
        />
        {config.pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              config.color
            )}
          />
        )}
      </span>
      {showLabel && (
        <span className="text-sm text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}

// =====================================================
// CONNECTION STATUS - Stato connessione PT-Atleta
// =====================================================

interface ConnectionStatusProps {
  status: 'pending' | 'active' | 'attivo' | 'rejected' | 'rifiutato' | 'terminated' | 'terminato';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const connectionStatusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  pending: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'In attesa' },
  active: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Attivo' },
  attivo: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Attivo' },
  rejected: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Rifiutato' },
  rifiutato: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Rifiutato' },
  terminated: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Terminato' },
  terminato: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Terminato' },
};

export function ConnectionStatus({ 
  status, 
  size = 'md', 
  showLabel = true,
  className,
}: ConnectionStatusProps) {
  const config = connectionStatusConfig[status] || connectionStatusConfig.pending;

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium',
        config.bgColor,
        config.color,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'lg' && 'text-base px-3 py-1',
        className
      )}
    >
      <span
        className={cn(
          'rounded-full',
          sizeConfig[size],
          status === 'pending' ? 'bg-yellow-500' :
          status === 'active' || status === 'attivo' ? 'bg-green-500' :
          'bg-gray-400'
        )}
      />
      {showLabel && config.label}
    </span>
  );
}

// =====================================================
// SUBSCRIPTION STATUS - Stato abbonamento
// =====================================================

interface SubscriptionStatusProps {
  status: 'active' | 'trialing' | 'expired' | 'cancelled' | 'pending';
  expiresAt?: string;
  className?: string;
}

const subscriptionStatusConfig = {
  active: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Attivo' },
  trialing: { color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Prova' },
  expired: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Scaduto' },
  cancelled: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Cancellato' },
  pending: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'In attesa' },
};

export function SubscriptionStatus({ 
  status, 
  expiresAt,
  className,
}: SubscriptionStatusProps) {
  const config = subscriptionStatusConfig[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span 
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          config.bgColor,
          config.color
        )}
      >
        {config.label}
      </span>
      {expiresAt && status !== 'cancelled' && (
        <span className="text-xs text-muted-foreground">
          Scade: {new Date(expiresAt).toLocaleDateString('it-IT')}
        </span>
      )}
    </div>
  );
}

// =====================================================
// PT STATUS - Stato Personal Trainer
// =====================================================

interface PTStatusProps {
  status: 'registrato' | 'in_attesa_approvazione' | 'attivo' | 'sospeso' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const ptStatusConfig = {
  registrato: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Registrato' },
  in_attesa_approvazione: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'In attesa' },
  attivo: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Attivo' },
  sospeso: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Sospeso' },
  premium: { color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Premium' },
};

export function PTStatus({ 
  status, 
  size = 'md', 
  showLabel = true,
  className,
}: PTStatusProps) {
  const config = ptStatusConfig[status] || ptStatusConfig.registrato;

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium',
        config.bgColor,
        config.color,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'lg' && 'text-base px-3 py-1',
        !showLabel && 'px-0',
        className
      )}
    >
      <span
        className={cn(
          'rounded-full',
          sizeConfig[size],
          status === 'attivo' ? 'bg-green-500' :
          status === 'in_attesa_approvazione' || status === 'registrato' ? 'bg-yellow-500' :
          status === 'premium' ? 'bg-purple-500' :
          'bg-red-500'
        )}
      />
      {showLabel && config.label}
    </span>
  );
}

export default StatusIndicator;
