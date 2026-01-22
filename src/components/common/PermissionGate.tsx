import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { useAuth } from '@/hooks/useAuth';
import { LockedState, LoadingState } from './EmptyState';
import { AppRole } from '@/types/roles';

// =====================================================
// PERMISSION GATE - Controllo accesso basato su ruolo
// =====================================================

interface PermissionGateProps {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
  requireConnected?: boolean;
  requirePremium?: boolean;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  lockedTitle?: string;
  lockedDescription?: string;
  lockedAction?: string;
  onLockedAction?: () => void;
}

export function PermissionGate({
  children,
  requiredRole,
  requireConnected = false,
  requirePremium = false,
  fallback,
  loadingFallback,
  lockedTitle = 'Accesso bloccato',
  lockedDescription = 'Non hai i permessi per accedere a questa funzionalità.',
  lockedAction,
  onLockedAction,
}: PermissionGateProps) {
  const { role, isLoading: authLoading } = useAuth();
  const { hasRole } = usePermissions();
  const { isConnected, isLoading: statusLoading } = useAtletaStatus();

  const isLoading = authLoading || (requireConnected && statusLoading);

  if (isLoading) {
    return loadingFallback ? <>{loadingFallback}</> : <LoadingState />;
  }

  // Check role requirement
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = roles.some(r => hasRole(r));
    
    if (!hasRequiredRole) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <LockedState
          title={lockedTitle}
          description={lockedDescription}
          actionLabel={lockedAction}
          onAction={onLockedAction}
        />
      );
    }
  }

  // Check connection requirement (for atleta)
  if (requireConnected && role === 'atleta' && !isConnected) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <LockedState
        title="Collegati con un PT"
        description="Per accedere a questa funzionalità devi essere collegato con un Personal Trainer."
        actionLabel={lockedAction || "Trova un PT"}
        onAction={onLockedAction}
      />
    );
  }

  // TODO: Check premium requirement when subscription logic is implemented
  if (requirePremium) {
    // Add premium check logic here
  }

  return <>{children}</>;
}

// =====================================================
// ROLE SPECIFIC GATES - Gate specifici per ruolo
// =====================================================

interface RoleGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnlyGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate
      requiredRole="admin"
      fallback={fallback}
      lockedTitle="Solo Amministratori"
      lockedDescription="Questa funzionalità è riservata agli amministratori."
    >
      {children}
    </PermissionGate>
  );
}

export function PTOnlyGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate
      requiredRole="pt"
      fallback={fallback}
      lockedTitle="Solo Personal Trainer"
      lockedDescription="Questa funzionalità è riservata ai Personal Trainer."
    >
      {children}
    </PermissionGate>
  );
}

export function AtletaOnlyGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate
      requiredRole="atleta"
      fallback={fallback}
      lockedTitle="Solo Atleti"
      lockedDescription="Questa funzionalità è riservata agli atleti."
    >
      {children}
    </PermissionGate>
  );
}

export function ConnectedAtletaGate({ 
  children, 
  fallback,
  onFindPT,
}: RoleGateProps & { onFindPT?: () => void }) {
  return (
    <PermissionGate
      requiredRole="atleta"
      requireConnected
      fallback={fallback}
      lockedTitle="Collegati con un PT"
      lockedDescription="Per accedere a questa funzionalità devi essere collegato con un Personal Trainer."
      lockedAction="Trova un PT"
      onLockedAction={onFindPT}
    >
      {children}
    </PermissionGate>
  );
}

// =====================================================
// FEATURE FLAG GATE - Controllo basato su feature flag
// =====================================================

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  // TODO: Implement feature flag logic
  // For now, all features are enabled
  const isEnabled = true;

  if (!isEnabled) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

export default PermissionGate;
