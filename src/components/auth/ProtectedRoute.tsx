import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { AppRole } from '@/types/roles';
import { ROLE_ACCESS_MATRIX, getHomeRoute } from '@/types/roles';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// PROTECTED ROUTE
// Gestione accesso basata su ruoli e permessi
// =====================================================

interface ProtectedRouteProps {
  children: ReactNode;
  /** Ruoli consentiti per questa route */
  allowedRoles?: AppRole[];
  /** Risorsa richiesta per accesso */
  requiredResource?: keyof typeof ROLE_ACCESS_MATRIX.admin;
  /** Redirect personalizzato se non autorizzato */
  redirectTo?: string;
  /** Mostra loader durante il caricamento */
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredResource,
  redirectTo = '/auth',
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const { hasAccess, hasRole } = usePermissions();
  const location = useLocation();

  // Loading state
  if (isLoading) {
    return (
      fallback ?? (
        <LoadingSpinner 
          variant="logo" 
          size="lg" 
          text="Caricamento..." 
          fullScreen 
        />
      )
    );
  }

  // Not authenticated - redirect to auth
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // No role assigned yet
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-xl font-semibold mb-2">Ruolo non assegnato</h2>
          <p className="text-muted-foreground mb-4">
            Il tuo account è in attesa di assegnazione ruolo.
            Contatta l'amministratore per completare la registrazione.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refreshRole()} variant="default">
              Riprova
            </Button>
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/auth';
              }}
              variant="outline"
            >
              Esci
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(allowedRole => hasRole(allowedRole));
    if (!hasAllowedRole) {
      // Redirect to user's appropriate home based on their role
      const homeRoute = getHomeRoute(role);
      return <Navigate to={homeRoute} replace />;
    }
  }

  // Check required resource access
  if (requiredResource) {
    if (!hasAccess(requiredResource)) {
      // Redirect to user's appropriate home based on their role
      const homeRoute = getHomeRoute(role);
      return <Navigate to={homeRoute} replace />;
    }
  }

  // All checks passed
  return <>{children}</>;
}

// =====================================================
// SPECIALIZED PROTECTED ROUTES
// =====================================================

/** Route solo per Admin */
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute 
      allowedRoles={['admin']} 
      requiredResource="dashboard_admin"
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
}

/** Route solo per PT (dashboard web) */
export function PTDashboardRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute 
      allowedRoles={['pt']} 
      requiredResource="dashboard_pt"
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
}

/** Route solo per PT (app/PWA) */
export function PTAppRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute 
      allowedRoles={['pt']} 
      requiredResource="app_pt"
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
}

/** Route solo per Atleta (app/PWA) */
export function AtletaRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute 
      allowedRoles={['atleta']} 
      requiredResource="app_atleta"
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
}

export default ProtectedRoute;
