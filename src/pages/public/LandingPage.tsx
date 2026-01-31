import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dumbbell, 
  Users, 
  Calendar, 
  TrendingUp, 
  MessageSquare, 
  CreditCard,
  ChevronRight,
  Check,
  Download,
  Smartphone
} from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { PWAUpdatePrompt } from '@/components/pwa/PWAUpdatePrompt';

// =====================================================
// LANDING PAGE - Sito pubblico
// Accessibile a: tutti
// =====================================================

const features = [
  {
    icon: Users,
    title: 'Gestione Atleti',
    description: 'CRM completo per gestire tutti i tuoi clienti in un unico posto.',
  },
  {
    icon: Dumbbell,
    title: 'Programmi Personalizzati',
    description: 'Crea e assegna allenamenti su misura per ogni atleta.',
  },
  {
    icon: Calendar,
    title: 'Calendario Integrato',
    description: 'Pianifica sessioni e gestisci appuntamenti senza Excel.',
  },
  {
    icon: MessageSquare,
    title: 'Chat Integrata',
    description: 'Comunica direttamente con i tuoi atleti, addio WhatsApp.',
  },
  {
    icon: TrendingUp,
    title: 'Tracciamento Progressi',
    description: 'Monitora i risultati con grafici e statistiche dettagliate.',
  },
  {
    icon: CreditCard,
    title: 'Pagamenti Semplificati',
    description: 'Gestisci abbonamenti e incassi senza complicazioni.',
  },
];

export function LandingPage() {
  const { isInstallable, isInstalled, isIOS, install } = useInstallPrompt();
  const showInstallButton = (isInstallable || isIOS) && !isInstalled;

  const handleInstall = () => {
    if (isIOS) {
      // iOS doesn't support the install prompt, redirect to install page
      window.location.href = '/install';
    } else {
      install();
    }
  };

  return (
    <div className="flex flex-col">
      {/* PWA Update Prompt */}
      <PWAUpdatePrompt />

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container-wide relative py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Piattaforma Enterprise
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              La piattaforma per PT e atleti che sostituisce{' '}
              <span className="text-gradient-primary">tutto il resto</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Dimentica Excel, WhatsApp, Google Calendar e le app sparse. 
              Gestisci atleti, allenamenti, pagamenti e comunicazioni in un'unica piattaforma enterprise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link to="/auth?mode=signup">
                  Inizia gratis
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pts">
                  Trova un Personal Trainer
                </Link>
              </Button>
              {showInstallButton && (
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={handleInstall}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Installa App
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-20 bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tutto in un'unica piattaforma</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Smetti di saltare tra decine di app e strumenti. 
              LIVELLAPP centralizza tutto ciò di cui hai bisogno.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-interactive">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For PT section */}
      <section className="py-20">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-role-pt/10 px-3 py-1 text-sm text-role-pt mb-4">
                Per Personal Trainer
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Fai crescere il tuo business
              </h2>
              <p className="text-muted-foreground mb-6">
                Dashboard web completa per gestire tutto il tuo lavoro, 
                più app mobile per essere sempre connesso con i tuoi atleti.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Dashboard web per gestione completa',
                  'App mobile per operatività on-the-go',
                  'Profilo pubblico per farti scoprire',
                  'Gestione pagamenti e abbonamenti',
                  'Chat diretta con ogni atleta',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-role-pt/10">
                      <Check className="h-3 w-3 text-role-pt" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild>
                <Link to="/auth?mode=signup">
                  Registrati come PT
                </Link>
              </Button>
            </div>
            <div className="lg:order-first">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-role-pt/20 to-role-pt/5 flex items-center justify-center">
                <p className="text-muted-foreground">Shell - Screenshot/Mockup da aggiungere</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Athletes section */}
      <section className="py-20 bg-muted/30">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-role-atleta/10 px-3 py-1 text-sm text-role-atleta mb-4">
                Per Atleti
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Raggiungi i tuoi obiettivi
              </h2>
              <p className="text-muted-foreground mb-6">
                App dedicata per seguire i tuoi allenamenti, 
                comunicare con il tuo PT e tracciare ogni progresso.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'App mobile dedicata',
                  'Allenamenti guidati passo passo',
                  'Tracciamento progressi con grafici',
                  'Scopri e connettiti con PT',
                  'Chat diretta con il tuo trainer',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-role-atleta/10">
                      <Check className="h-3 w-3 text-role-atleta" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild>
                <Link to="/auth?mode=signup">
                  Registrati come Atleta
                </Link>
              </Button>
            </div>
            <div>
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-role-atleta/20 to-role-atleta/5 flex items-center justify-center">
                <p className="text-muted-foreground">Shell - Screenshot/Mockup da aggiungere</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 pb-32 md:pb-20">
        <div className="container-wide">
          <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Pronto a rivoluzionare il tuo business?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Unisciti a centinaia di Personal Trainer che hanno già scelto LIVELLAPP 
                per gestire i loro atleti in modo professionale.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/auth?mode=signup">
                    Inizia gratuitamente
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/contact">
                    Contattaci
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PWA Install Banner - Fixed at bottom */}
      {showInstallButton && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden animate-fade-in">
          <div 
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-4 shadow-2xl"
            style={{
              animation: 'pulse-glow 2s ease-in-out infinite'
            }}
          >
            {/* Animated background shimmer */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{
                animation: 'shimmer 2s ease-in-out infinite'
              }}
            />
            
            <div className="relative flex items-center gap-4">
              {/* App icon with bounce animation */}
              <div 
                className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center"
                style={{
                  animation: 'bounce-subtle 1.5s ease-in-out infinite'
                }}
              >
                <Smartphone className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg">Installa LIVELLAPP</h3>
                <p className="text-sm text-white/80 mt-0.5">
                  Accesso rapido dalla home del tuo telefono
                </p>
              </div>

              {/* Install button */}
              <Button 
                size="sm"
                onClick={handleInstall}
                className="flex-shrink-0 bg-white text-primary hover:bg-white/90 font-semibold gap-1.5 shadow-lg"
              >
                <Download className="w-4 h-4" />
                Installa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom animations for PWA banner */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(var(--primary), 0.3), 0 10px 40px rgba(0, 0, 0, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(var(--primary), 0.5), 0 10px 50px rgba(0, 0, 0, 0.3);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
