import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { AppRole } from '@/types/roles';

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/usePermissions');

const useAuthMock = vi.mocked(useAuth);
const usePermissionsMock = vi.mocked(usePermissions);

function renderProtected(auth: {
  isAuthenticated: boolean;
  isLoading: boolean;
  role: AppRole | null;
}) {
  useAuthMock.mockReturnValue({
    user: auth.isAuthenticated ? ({ id: 'u1' } as never) : null,
    session: auth.isAuthenticated ? ({} as never) : null,
    role: auth.role,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    isRoleLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshRole: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
  });
  usePermissionsMock.mockReturnValue({
    canAccessAdminDashboard: false,
    canAccessPTDashboard: false,
    canAccessPTApp: false,
    canAccessAtletaApp: auth.role === 'atleta',
    canAccessPublicSite: true,
    hasAccess: () => true,
    hasRole: (r) => r === auth.role,
    currentRole: auth.role,
    isAdmin: auth.role === 'admin',
    isPT: auth.role === 'pt',
    isAtleta: auth.role === 'atleta',
  });

  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['atleta']}>
              <div>Area privata</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div>Pagina login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute session restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a spinner while auth is still loading (does not send to login)', () => {
    renderProtected({ isAuthenticated: false, isLoading: true, role: null });
    expect(screen.getByText('Caricamento...')).toBeInTheDocument();
    expect(screen.queryByText('Pagina login')).not.toBeInTheDocument();
    expect(screen.queryByText('Area privata')).not.toBeInTheDocument();
  });

  it('redirects to login only when session restore finished with no user', () => {
    renderProtected({ isAuthenticated: false, isLoading: false, role: null });
    expect(screen.getByText('Pagina login')).toBeInTheDocument();
  });

  it('does not log out when the session exists but role RPC has not returned yet', () => {
    renderProtected({ isAuthenticated: true, isLoading: false, role: null });
    expect(screen.getByText('Caricamento permessi...')).toBeInTheDocument();
    expect(screen.queryByText('Pagina login')).not.toBeInTheDocument();
  });

  it('renders the protected page once session and role are ready', () => {
    renderProtected({ isAuthenticated: true, isLoading: false, role: 'atleta' });
    expect(screen.getByText('Area privata')).toBeInTheDocument();
  });
});
