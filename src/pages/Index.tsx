import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getHomeRoute } from '@/types/roles';
import { getLastAppPath } from '@/lib/lastAppPath';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { LandingPage } from './public/LandingPage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// =====================================================
// INDEX PAGE - Entry point
// Redirect autenticati al loro home, mostra landing ai visitatori.
// Su PWA / viewport mobile, un cold-start a `/` (start_url) ripristina
// l'ultima pagina app invece di forzare sempre la home.
// =====================================================

function shouldRestoreLastAppPath(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'web') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const isNarrow = window.matchMedia('(max-width: 767px)').matches;
  return isStandalone || isNarrow;
}

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && role) {
      const lastPath =
        shouldRestoreLastAppPath() ? getLastAppPath(role) : null;
      navigate(lastPath ?? getHomeRoute(role), { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

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
