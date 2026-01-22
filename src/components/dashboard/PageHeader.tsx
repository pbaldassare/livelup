import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  backLink?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
}

export function PageHeader({
  title,
  description,
  backLink,
  actions,
  icon: Icon,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        {backLink && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backLink)}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
