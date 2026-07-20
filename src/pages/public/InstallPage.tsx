import { useState, useEffect } from 'react';
import { Download, Share, Plus, Check, Smartphone, Monitor, ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/common/Logo';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

function getDeviceType(): DeviceType {
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  if (/android/.test(userAgent)) {
    return 'android';
  }
  if (!/mobile|tablet/.test(userAgent)) {
    return 'desktop';
  }
  return 'unknown';
}

const iosSteps = [
  {
    icon: Share,
    title: 'Tocca il pulsante Condividi',
    description: 'Nella barra di navigazione di Safari, tocca l\'icona di condivisione',
  },
  {
    icon: Plus,
    title: 'Seleziona "Aggiungi a Home"',
    description: 'Scorri verso il basso e seleziona "Aggiungi alla schermata Home"',
  },
  {
    icon: Check,
    title: 'Conferma l\'installazione',
    description: 'Tocca "Aggiungi" in alto a destra per confermare',
  },
];

const androidSteps = [
  {
    icon: Download,
    title: 'Tocca "Installa app"',
    description: 'Un banner apparirà automaticamente, tocca "Installa"',
  },
  {
    icon: Check,
    title: 'Conferma l\'installazione',
    description: 'Nella finestra popup, tocca "Installa" per confermare',
  },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function InstallPage() {
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  const { isInstallable, isInstalled, install } = useInstallPrompt();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawRef = searchParams.get('ref');
  const refPt = rawRef && UUID_RE.test(rawRef) ? rawRef : null;

  useEffect(() => {
    setDeviceType(getDeviceType());
  }, []);

  const handleInstall = async () => {
    await install();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSignup = () => {
    const params = new URLSearchParams({ mode: 'signup' });
    if (refPt) params.set('ref', refPt);
    navigate(`/auth?${params.toString()}`);
  };

  const steps = deviceType === 'ios' ? iosSteps : androidSteps;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={handleGoBack} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Torna indietro</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-primary shadow-glow mb-6">
            <Logo variant="icon" className="w-16 h-16" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Installa LIVEL APP
          </h1>
          <p className="text-muted-foreground">
            Aggiungi l'app alla tua schermata Home per un accesso rapido e un'esperienza migliore
          </p>
        </div>

        {/* Crea account (propaga il referral PT se presente) */}
        <Button
          size="lg"
          variant="outline"
          className="w-full mb-6 h-12 gap-2"
          onClick={handleSignup}
        >
          <UserPlus className="w-5 h-5" />
          Crea il tuo account
        </Button>

        {/* Already Installed */}
        {isInstalled && (
          <Card className="mb-6 border-success/50 bg-success/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-success">
                  App già installata!
                </p>
                <p className="text-sm text-muted-foreground">
                  LIVEL APP è già nella tua schermata Home
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Device-specific instructions */}
        {!isInstalled && (
          <>
            {/* Direct install button for supported browsers */}
            {isInstallable && (
              <Button 
                size="lg" 
                className="w-full btn-gradient text-white mb-6 h-14 text-lg gap-2"
                onClick={handleInstall}
              >
                <Download className="w-5 h-5" />
                Installa ora
              </Button>
            )}

            {/* Step by step instructions */}
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                {deviceType === 'ios' && <Smartphone className="w-5 h-5" />}
                {deviceType === 'android' && <Smartphone className="w-5 h-5" />}
                {deviceType === 'desktop' && <Monitor className="w-5 h-5" />}
                {deviceType === 'ios' && 'Istruzioni per iPhone/iPad'}
                {deviceType === 'android' && 'Istruzioni per Android'}
                {deviceType === 'desktop' && 'Istruzioni per Desktop'}
                {deviceType === 'unknown' && 'Come installare'}
              </h2>

              {steps.map((step, index) => (
                <Card key={index} className="card-interactive">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      'bg-primary/10 text-primary'
                    )}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Passo {index + 1}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* iOS Safari note */}
            {deviceType === 'ios' && (
              <Card className="mt-6 border-warning/50 bg-warning/10">
                <CardContent className="p-4">
                  <p className="text-sm text-warning-foreground">
                    <strong>Nota:</strong> Per installare l'app su iPhone/iPad, devi usare Safari. 
                    Se stai usando un altro browser, apri questa pagina in Safari.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Benefits */}
        <div className="mt-8 pt-8 border-t border-border">
          <h2 className="font-semibold text-foreground mb-4">
            Vantaggi dell'app installata
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              Accesso rapido dalla schermata Home
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              Esperienza a schermo intero senza barra del browser
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              Funziona anche offline
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              Notifiche push per aggiornamenti importanti
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              Caricamento più veloce
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default InstallPage;
