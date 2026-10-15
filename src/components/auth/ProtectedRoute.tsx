import { ReactNode, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { AppRole } from '@/types/roles';
import { ROLE_ACCESS_MATRIX, getHomeRoute } from '@/types/roles';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { isNativeApp } from '@/lib/native';

// =====================================================
// PROTECTED ROUTE
// Gestione accesso basata su ruoli e permessi
// =====================================================

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  requiredResource?: keyof typeof ROLE_ACCESS_MATRIX.admin;
  redirectTo?: string;
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
  // Mantiene l'ultimo ruolo "buono" per evitare redirect transitori durante
  // TOKEN_REFRESHED / SIGNED_IN che riemettono onAuthStateChange.
  const lastGoodRoleRef = useRef<AppRole | null>(null);
  if (role) lastGoodRoleRef.current = role;
  const effectiveRole = role ?? lastGoodRoleRef.current;

  // Initial auth loading
  if (isLoading) {
    return (
      fallback ?? (
        <LoadingSpinner variant="logo" size="lg" text="Caricamento..." fullScreen />
      )
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role still resolving — mostra spinner, nessun logout automatico.
  // Se la sessione c'è ma il ruolo RPC è lento/fallisce, NON mandare a /auth:
  // dopo un refresh lastGoodRoleRef è vuoto e sembrava un logout.
  if (!effectiveRole) {
    return (
      <LoadingSpinner variant="logo" size="lg" text="Caricamento permessi..." fullScreen />
    );
  }

  // Check allowed roles — usa effectiveRole per non sbattere fuori durante un refresh token
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(r => r === effectiveRole || hasRole(r));
    if (!hasAllowedRole) {
      return <Navigate to={getHomeRoute(effectiveRole)} replace />;
    }
  }

  // Check required resource access
  if (requiredResource && !hasAccess(requiredResource) && !ROLE_ACCESS_MATRIX[effectiveRole]?.[requiredResource as keyof typeof ROLE_ACCESS_MATRIX.admin]) {
    return <Navigate to={getHomeRoute(effectiveRole)} replace />;
  }

  return <>{children}</>;
}

// =====================================================
// SPECIALIZED PROTECTED ROUTES
// =====================================================

/** L'area admin e' pensata per lo schermo grande: nell'app nativa non c'e'. */
function AdminSoloDaBrowser() {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 pt-[var(--sat)] pb-[var(--sab)] text-center text-foreground">
      <h1 className="text-xl font-bold">Area admin solo da browser</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La gestione della piattaforma si fa dal sito, da computer. L'app è per Professionisti e Atleti.
      </p>
      <Button onClick={() => void signOut()}>Esci</Button>
    </div>
  );
}

export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute allowedRoles={['admin']} requiredResource="dashboard_admin" {...props}>
      {isNativeApp() ? <AdminSoloDaBrowser /> : children}
    </ProtectedRoute>
  );
}

export function PTDashboardRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute allowedRoles={['pt']} requiredResource="dashboard_pt" {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function PTAppRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute allowedRoles={['pt']} requiredResource="app_pt" {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function AtletaRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute allowedRoles={['atleta']} requiredResource="app_atleta" {...props}>
      {children}
    </ProtectedRoute>
  );
}

export default ProtectedRoute;
