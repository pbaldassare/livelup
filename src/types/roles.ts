// =====================================================
// SISTEMA RUOLI - DEFINIZIONI TIPO
// VINCOLANTE: Solo 3 ruoli, mai mescolare
// =====================================================

export type AppRole = 'admin' | 'pt' | 'atleta';

export type PTStatus = 
  | 'registrato' 
  | 'in_attesa_approvazione' 
  | 'attivo' 
  | 'sospeso' 
  | 'premium';

export type AtletaStatus = 
  | 'non_collegato' 
  | 'collegato' 
  | 'premium';

export type ConnectionStatus = 'pending' | 'active' | 'terminated';

// =====================================================
// PERMESSI - Matrice accesso risorse
// =====================================================

export type Resource = 
  | 'dashboard_admin'
  | 'dashboard_pt'
  | 'app_pt'
  | 'app_atleta'
  | 'sito_pubblico'
  | 'users'
  | 'roles'
  | 'system'
  | 'atleti'
  | 'workouts'
  | 'schedule'
  | 'progress'
  | 'pt_discovery'
  | 'chat'
  | 'notifications'
  | 'payments'
  | 'subscriptions'
  | 'events'
  | 'gamification';

export type Action = 
  | 'access'
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage'
  | 'configure';

export interface Permission {
  role: AppRole;
  resource: Resource;
  action: Action;
  allowed: boolean;
}

// =====================================================
// TABELLA PERMESSI - Logica accesso frontend
// =====================================================

export const ROLE_ACCESS_MATRIX: Record<AppRole, {
  dashboard_admin: boolean;
  dashboard_pt: boolean;
  app_pt: boolean;
  app_atleta: boolean;
  sito_pubblico: boolean;
}> = {
  admin: {
    dashboard_admin: true,
    dashboard_pt: false,
    app_pt: false,
    app_atleta: false,
    sito_pubblico: false,
  },
  pt: {
    dashboard_admin: false,
    dashboard_pt: true,
    app_pt: true,
    app_atleta: false,
    sito_pubblico: true, // profilo pubblico
  },
  atleta: {
    dashboard_admin: false,
    dashboard_pt: false,
    app_pt: false,
    app_atleta: true,
    sito_pubblico: true,
  },
};

// =====================================================
// ROUTE MAPPINGS
// =====================================================

export const ROLE_HOME_ROUTES: Record<AppRole, string> = {
  admin: '/admin',
  pt: '/pt',
  atleta: '/app',
};

export const ROLE_REDIRECT_ON_UNAUTHORIZED: Record<AppRole, string> = {
  admin: '/admin',
  pt: '/pt',
  atleta: '/app',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function canAccess(role: AppRole, resource: keyof typeof ROLE_ACCESS_MATRIX.admin): boolean {
  return ROLE_ACCESS_MATRIX[role]?.[resource] ?? false;
}

export function getHomeRoute(role: AppRole): string {
  return ROLE_HOME_ROUTES[role] ?? '/';
}

export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: 'Amministratore',
    pt: 'Personal Trainer',
    atleta: 'Atleta',
  };
  return labels[role] ?? role;
}

export function getPTStatusLabel(status: PTStatus): string {
  const labels: Record<PTStatus, string> = {
    registrato: 'Registrato',
    in_attesa_approvazione: 'In attesa di approvazione',
    attivo: 'Attivo',
    sospeso: 'Sospeso',
    premium: 'Premium',
  };
  return labels[status] ?? status;
}

export function getAtletaStatusLabel(status: AtletaStatus): string {
  const labels: Record<AtletaStatus, string> = {
    non_collegato: 'Non collegato',
    collegato: 'Collegato',
    premium: 'Premium',
  };
  return labels[status] ?? status;
}
