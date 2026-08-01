import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { getHomeRoute } from '@/types/roles';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Logo } from '@/components/common/Logo';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { currentRole: role } = usePermissions();

  useEffect(() => {
    const path = location.pathname + location.search;
    console.error('[404] Route not found:', path, {
      referrer: document.referrer,
      role,
      userId: user?.id,
    });

    supabase
      .from('app_404_logs')
      .insert({
        path,
        referrer: document.referrer || null,
        user_id: user?.id ?? null,
        role: role ?? null,
        user_agent: navigator.userAgent,
      })
      .then(({ error }) => {
        if (error) console.warn('[404] log insert failed:', error.message);
      });
  }, [location.pathname, location.search, role, user?.id]);

  const homeRoute = isAuthenticated && role ? getHomeRoute(role) : '/';

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(220_33%_98%)] text-foreground">
      <header className="border-b border-border bg-background/95">
        <div className="container-wide flex h-14 items-center">
          <Link to="/">
            <Logo variant="full" className="h-7" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Errore 404</p>
          <h1 className="mt-3 font-[Space_Grotesk,system-ui,sans-serif] text-5xl font-bold md:text-6xl">
            Pagina non trovata
          </h1>
          <p className="mt-4 text-muted-foreground">
            Il link potrebbe essere scaduto, spostato o digitato in modo errato. Torna alla home
            oppure esplora le sezioni principali di Livelapp.
          </p>
          <p className="mt-2 break-all text-xs text-muted-foreground/80">
            Percorso: <code className="rounded bg-muted px-1.5 py-0.5">{location.pathname}</code>
          </p>

          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro
            </Button>
            <Button className="rounded-xl" asChild>
              <Link to={homeRoute}>
                <Home className="mr-2 h-4 w-4" />
                {isAuthenticated ? 'Vai alla tua area' : 'Torna alla Home'}
              </Link>
            </Button>
            <Button variant="secondary" className="rounded-xl" asChild>
              <Link to="/pts">
                <Search className="mr-2 h-4 w-4" />
                Trova un PT
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
