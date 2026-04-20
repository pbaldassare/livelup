import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getHomeRoute } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { currentRole: role } = usePermissions();

  useEffect(() => {
    const path = location.pathname + location.search;
    console.error("[404] Route not found:", path, {
      referrer: document.referrer,
      role,
      userId: user?.id,
    });

    // Telemetria non bloccante
    supabase
      .from("app_404_logs")
      .insert({
        path,
        referrer: document.referrer || null,
        user_id: user?.id ?? null,
        role: role ?? null,
        user_agent: navigator.userAgent,
      })
      .then(({ error }) => {
        if (error) console.warn("[404] log insert failed:", error.message);
      });
  }, [location.pathname, location.search, role, user?.id]);

  const homeRoute = isAuthenticated && role ? getHomeRoute(role) : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground px-4">
      <div className="text-center max-w-md">
        <h1 className="mb-2 text-7xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
          404
        </h1>
        <p className="mb-2 text-xl font-semibold">Pagina non trovata</p>
        <p className="mb-6 text-sm text-muted-foreground break-all">
          La rotta <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">{location.pathname}</code> non esiste.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <Button asChild>
            <Link to={homeRoute}>
              <Home className="h-4 w-4 mr-2" />
              {isAuthenticated ? "Vai alla tua area" : "Torna alla Home"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
