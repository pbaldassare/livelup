import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getHomeRoute } from '@/types/roles';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { LandingPage } from './public/LandingPage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// =====================================================
// INDEX PAGE - Entry point
// Redirect autenticati al loro home, mostra landing ai visitatori
// =====================================================

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading } = useAuth();

  useEffect(() => {
    // Se autenticato con ruolo, redirect alla home appropriata
    if (isAuthenticated && role) {
      const homeRoute = getHomeRoute(role);
      navigate(homeRoute, { replace: true });
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
