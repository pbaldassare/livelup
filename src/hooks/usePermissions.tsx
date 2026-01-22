import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { canAccess, ROLE_ACCESS_MATRIX, type AppRole, type Resource, type Action } from '@/types/roles';

// =====================================================
// PERMISSIONS HOOK
// Verifica permessi basata su ruolo
// =====================================================

export interface UsePermissionsReturn {
  // Accesso frontend
  canAccessAdminDashboard: boolean;
  canAccessPTDashboard: boolean;
  canAccessPTApp: boolean;
  canAccessAtletaApp: boolean;
  canAccessPublicSite: boolean;
  
  // Metodi generici
  hasAccess: (resource: keyof typeof ROLE_ACCESS_MATRIX.admin) => boolean;
  hasRole: (role: AppRole) => boolean;
  
  // Role info
  currentRole: AppRole | null;
  isAdmin: boolean;
  isPT: boolean;
  isAtleta: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { role } = useAuth();

  return useMemo(() => {
    const hasAccess = (resource: keyof typeof ROLE_ACCESS_MATRIX.admin): boolean => {
      if (!role) return false;
      return canAccess(role, resource);
    };

    const hasRole = (targetRole: AppRole): boolean => {
      return role === targetRole;
    };

    return {
      // Accesso frontend specifico
      canAccessAdminDashboard: hasAccess('dashboard_admin'),
      canAccessPTDashboard: hasAccess('dashboard_pt'),
      canAccessPTApp: hasAccess('app_pt'),
      canAccessAtletaApp: hasAccess('app_atleta'),
      canAccessPublicSite: hasAccess('sito_pubblico'),
      
      // Metodi generici
      hasAccess,
      hasRole,
      
      // Role info
      currentRole: role,
      isAdmin: hasRole('admin'),
      isPT: hasRole('pt'),
      isAtleta: hasRole('atleta'),
    };
  }, [role]);
}

export default usePermissions;
