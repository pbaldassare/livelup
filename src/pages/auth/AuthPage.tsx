import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getHomeRoute, getRoleLabel, type AppRole } from '@/types/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dumbbell, Shield, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

// =====================================================
// AUTH PAGE - Login e Registrazione
// =====================================================

const emailSchema = z.string().email('Email non valida');
const passwordSchema = z.string().min(6, 'La password deve avere almeno 6 caratteri');

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, isAuthenticated, role, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('atleta');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && role) {
      const homeRoute = getHomeRoute(role);
      navigate(homeRoute, { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (activeTab === 'signup' && password !== confirmPassword) {
      newErrors.confirmPassword = 'Le password non corrispondono';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast.error('Errore di accesso', {
        description: error.message,
      });
    } else {
      toast.success('Accesso effettuato');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signUp(email, password, selectedRole);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Utente già registrato', {
          description: 'Questa email è già stata utilizzata. Prova ad accedere.',
        });
      } else {
        toast.error('Errore di registrazione', {
          description: error.message,
        });
      }
    } else {
      toast.success('Registrazione completata', {
        description: 'Controlla la tua email per confermare la registrazione.',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4">
            <Dumbbell className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">FitPlatform</h1>
          <p className="text-muted-foreground">Piattaforma Fitness Enterprise</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="signup">Registrati</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <CardTitle>Bentornato</CardTitle>
                <CardDescription>Inserisci le tue credenziali per accedere</CardDescription>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <CardTitle>Crea un account</CardTitle>
                <CardDescription>Scegli il tuo ruolo e inizia</CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>

          <CardContent>
            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="email@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accedi
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Role selection */}
                <div className="space-y-3">
                  <Label>Seleziona il tuo ruolo</Label>
                  <RadioGroup
                    value={selectedRole}
                    onValueChange={(v) => setSelectedRole(v as AppRole)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label
                      htmlFor="role-atleta"
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                        selectedRole === 'atleta'
                          ? 'border-role-atleta bg-role-atleta/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <RadioGroupItem value="atleta" id="role-atleta" className="sr-only" />
                      <User className="h-6 w-6" />
                      <span className="font-medium">Atleta</span>
                      <span className="text-xs text-muted-foreground text-center">Accesso App</span>
                    </Label>
                    <Label
                      htmlFor="role-pt"
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                        selectedRole === 'pt'
                          ? 'border-role-pt bg-role-pt/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <RadioGroupItem value="pt" id="role-pt" className="sr-only" />
                      <Dumbbell className="h-6 w-6" />
                      <span className="font-medium">Personal Trainer</span>
                      <span className="text-xs text-muted-foreground text-center">Dashboard + App</span>
                    </Label>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Nota: Gli account Admin vengono creati solo dall'amministratore di sistema.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="email@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Conferma Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrati come {getRoleLabel(selectedRole)}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {activeTab === 'login' ? (
                <>
                  Non hai un account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className="text-primary hover:underline"
                  >
                    Registrati
                  </button>
                </>
              ) : (
                <>
                  Hai già un account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-primary hover:underline"
                  >
                    Accedi
                  </button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default AuthPage;
