import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { resolvePostAuthRedirect } from '@/lib/lastAppPath';
import { peekPendingGroupInvite } from '@/lib/groupInvite';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { LandingPage } from './public/LandingPage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// =====================================================
// INDEX PAGE - Entry point
// Redirect autenticati al loro home, mostra landing ai visitatori.
// Su PWA / viewport mobile, un cold-start a `/` (start_url) ripristina
// l'ultima pagina app invece di forzare sempre la home.
// =====================================================

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && role) {
      const pending = peekPendingGroupInvite();
      if (pending) {
        navigate(`/g/${pending}`, { replace: true });
        return;
      }
      // No `state.from` on `/`; last-path (PWA/mobile) then home.
      const target = resolvePostAuthRedirect(role);
      const current = `${location.pathname}${location.search}`;
      // Skip if already on target — avoids redirect loop / blank hang after SW update.
      if (target === current) return;
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, role, navigate, location.pathname, location.search]);

  // Loading state
  if (isLoading) {
    return (
      <LoadingSpinner 
        variant="logo" 
        size="lg" 
        fullScreen 
      />
    );
  }

  // Se non autenticato, mostra landing page
  return (
    <PublicLayout>
      <LandingPage />
    </PublicLayout>
  );
};

export default Index;
