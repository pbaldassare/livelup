import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getHomeRoute } from '@/types/roles';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { LandingPage } from './public/LandingPage';

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
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
