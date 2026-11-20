import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthPage } from '../AuthPage';
import { useAuth } from '@/hooks/useAuth';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

vi.mock('@/hooks/useAuth');
vi.mock('@/lib/native', () => ({
  vendeAbbonamenti: () => true,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { resend: vi.fn() },
    from: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const useAuthMock = vi.mocked(useAuth);

function renderAuth(path: string) {
  useAuthMock.mockReturnValue({
    user: null,
    session: null,
    role: null,
    isLoading: false,
    isAuthenticated: false,
    isRoleLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshRole: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthPage PT athlete invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides Personal Trainer when the URL is a PT athlete invite', () => {
    renderAuth(
      '/auth?mode=signup&ref=f655ebb3-4470-4ab6-a74c-763b0602b869',
    );

    expect(screen.getByText(/Invito di un Professionista/i)).toBeInTheDocument();
    expect(screen.queryByText('Personal Trainer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrati come Atleta/i })).toBeInTheDocument();
  });

  it('keeps role choice on public signup', () => {
    renderAuth('/auth?mode=signup');

    expect(screen.getByText('Personal Trainer')).toBeInTheDocument();
    expect(screen.getByText('Atleta')).toBeInTheDocument();
  });
});
