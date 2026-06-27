import { Link, Navigate } from 'react-router-dom';
import { ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =====================================================
// UTENTE APP PREVIEW — localhost dev entry
// Anteprima dell'app mobile atleta in cornice telefono.
// URL dedicato: /utente (non /pt)
// =====================================================

const ATLETA_APP_PATH = '/app';

export function UtenteAppPreviewPage() {
  if (!import.meta.env.DEV) {
    return <Navigate to={ATLETA_APP_PATH} replace />;
  }

  const appUrl = `${window.location.origin}${ATLETA_APP_PATH}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg text-center mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-app-accent/10 px-3 py-1 text-xs font-medium text-app-accent">
          <Smartphone className="h-3.5 w-3.5" />
          Dev · App Atleta
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Anteprima app utente</h1>
        <p className="text-sm text-zinc-400">
          Pagina localhost dedicata alla shell mobile che vede l&apos;atleta.
          Separata dalla dashboard PT (<code className="text-zinc-300">/pt</code>).
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button asChild size="sm" className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90">
            <Link to={ATLETA_APP_PATH}>
              Apri a schermo intero
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-900">
            <Link to="/auth">Accedi</Link>
          </Button>
        </div>
        <p className="text-xs text-zinc-500 font-mono">{appUrl}</p>
      </div>

      <div
        className="relative shrink-0 rounded-[2.75rem] border-[10px] border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden"
        style={{ width: 390, height: 844 }}
      >
        <div className="absolute top-0 inset-x-0 h-7 bg-zinc-900 z-10 flex items-center justify-center pointer-events-none">
          <div className="h-1.5 w-16 rounded-full bg-zinc-700" />
        </div>
        <iframe
          src={ATLETA_APP_PATH}
          title="App Atleta"
          className="w-full h-full border-0 bg-app-background"
        />
      </div>
    </div>
  );
}

export default UtenteAppPreviewPage;
