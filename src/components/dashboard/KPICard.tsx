import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// =====================================================
// KPI CARD - Stile dashboard con icona in alto a destra
// Segue il design reference: card bianca, icona colorata
// =====================================================

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  className?: string;
  onClick?: () => void;
}

const iconColorStyles = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  muted: 'text-muted-foreground',
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'primary',
  className,
  onClick,
}: KPICardProps) {
  return (
    <Card 
      className={cn(
        'bg-card hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className={cn('p-2', iconColorStyles[iconColor])}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// KPI CARD COLORED - Card con sfondo colorato e icona
// Per metriche importanti evidenziate
// =====================================================

interface KPICardColoredProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
  onClick?: () => void;
}

const colorStyles = {
  blue: 'border-l-4 border-l-info bg-info/5',
  green: 'border-l-4 border-l-success bg-success/5',
  yellow: 'border-l-4 border-l-warning bg-warning/5',
  red: 'border-l-4 border-l-destructive bg-destructive/5',
  purple: 'border-l-4 border-l-primary bg-primary/5',
};

const colorTextStyles = {
  blue: 'text-info',
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-destructive',
  purple: 'text-primary',
};

export function KPICardColored({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  className,
  onClick,
}: KPICardColoredProps) {
  return (
    <Card className={cn('overflow-hidden', colorStyles[color], onClick && 'cursor-pointer', className)} onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          {Icon && (
            <Icon className={cn('h-5 w-5 mt-0.5', colorTextStyles[color])} />
          )}
          <div className="flex-1">
            <p className={cn('text-sm font-medium', colorTextStyles[color])}>{title}</p>
            <p className={cn('text-2xl font-bold mt-1', colorTextStyles[color])}>{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default KPICard;
