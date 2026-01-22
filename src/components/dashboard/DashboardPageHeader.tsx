import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// BREADCRUMB - Navigazione gerarchica
// Segue il design reference
// =====================================================

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {item.href ? (
            <Link
              to={item.href}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              {item.icon}
              <span>{item.label}</span>
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

// =====================================================
// PAGE HEADER - Header pagina con titolo e breadcrumb
// =====================================================

interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
}

export function DashboardPageHeader({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
  badges,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <PageBreadcrumb items={breadcrumbs} />
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {badges}
            </div>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPageHeader;
