import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { AppRole } from '@/types/roles';
import { ROLE_ACCESS_MATRIX, getHomeRoute } from '@/types/roles';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { isAuthenticated, isLoading, isRoleLoading, role, refreshRole } = useAuth();
  const { hasAccess, hasRole } = usePermissions();
  const location = useLocation();

  // Initial auth loading
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

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Authenticated but role still resolving — show intermediate state, NOT "Ruolo non assegnato"
  if (!role && isRoleLoading) {
    return (
      <LoadingSpinner 
        variant="logo" 
        size="lg" 
        text="Caricamento permessi..." 
        fullScreen 
      />
    );
  }

  // No role after resolution — auto sign-out and redirect
  const signOutTriggered = useRef(false);
  useEffect(() => {
    if (!role && !isRoleLoading && isAuthenticated && !signOutTriggered.current) {
      signOutTriggered.current = true;
      toast.error('Sessione non valida. Effettua nuovamente il login.');
      supabase.auth.signOut().finally(() => {
        window.location.href = '/auth';
      });
    }
  }, [role, isRoleLoading, isAuthenticated]);

  if (!role) {
    return (
      <LoadingSpinner variant="logo" size="lg" text="Verifica sessione..." fullScreen />
    );
  }

  // Check allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(r => hasRole(r));
    if (!hasAllowedRole) {
      return <Navigate to={getHomeRoute(role)} replace />;
    }
  }

  // Check required resource access
  if (requiredResource && !hasAccess(requiredResource)) {
    return <Navigate to={getHomeRoute(role)} replace />;
  }

  return <>{children}</>;
}

// =====================================================
// SPECIALIZED PROTECTED ROUTES
// =====================================================

export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles' | 'requiredResource'>) {
  return (
    <ProtectedRoute allowedRoles={['admin']} requiredResource="dashboard_admin" {...props}>
      {children}
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
