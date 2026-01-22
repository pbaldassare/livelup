import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// =====================================================
// SECTION CARD - Card con bordo laterale colorato tratteggiato
// Segue il design reference: dashed border a sinistra
// =====================================================

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'primary' | 'blue' | 'green' | 'yellow' | 'muted';
  children: ReactNode;
  className?: string;
}

const borderColorStyles = {
  primary: 'border-l-primary',
  blue: 'border-l-info',
  green: 'border-l-success',
  yellow: 'border-l-warning',
  muted: 'border-l-muted-foreground',
};

const iconBgStyles = {
  primary: 'bg-primary/10 text-primary',
  blue: 'bg-info/10 text-info',
  green: 'bg-success/10 text-success',
  yellow: 'bg-warning/10 text-warning',
  muted: 'bg-muted text-muted-foreground',
};

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'primary',
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn(
      'border-l-[3px] border-dashed rounded-l-none',
      borderColorStyles[iconColor],
      className
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('p-2 rounded-lg', iconBgStyles[iconColor])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

// =====================================================
// INFO SECTION - Sezione informativa senza bordo
// Per contenuti dettagliati
// =====================================================

interface InfoSectionProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: 'primary' | 'blue' | 'green' | 'yellow' | 'muted';
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function InfoSection({
  title,
  icon: Icon,
  iconColor = 'primary',
  action,
  children,
  className,
}: InfoSectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn('p-2 rounded-lg', iconBgStyles[iconColor])}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

export default SectionCard;
