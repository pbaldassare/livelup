import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =====================================================
// PUBLIC LAYOUT - Sito pubblico
// Accessibile a: tutti (anche non autenticati)
// =====================================================

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container-wide flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">FitPlatform</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pts" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Trova un PT
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Chi siamo
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Prezzi
            </Link>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Accedi</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?mode=signup">Inizia ora</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="container-wide py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Dumbbell className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">FitPlatform</span>
              </div>
              <p className="text-sm text-muted-foreground">
                La piattaforma enterprise per Personal Trainer e Atleti.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">Piattaforma</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/pts" className="hover:text-foreground transition-colors">Trova un PT</Link></li>
                <li><Link to="/features" className="hover:text-foreground transition-colors">Funzionalità</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Prezzi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Supporto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/help" className="hover:text-foreground transition-colors">Centro assistenza</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contatti</Link></li>
                <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Legale</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Termini</Link></li>
                <li><Link to="/cookies" className="hover:text-foreground transition-colors">Cookie</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 FitPlatform. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
