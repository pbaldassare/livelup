import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getHomeRoute, getRoleLabel, type AppRole } from '@/types/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Dumbbell, User, Loader2, Eye, EyeOff, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Logo } from '@/components/common/Logo';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// =====================================================
// AUTH PAGE - Login e Registrazione
// =====================================================

const emailSchema = z.string().email('Email non valida');
const passwordSchema = z.string().min(6, 'La password deve avere almeno 6 caratteri');

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, isAuthenticated, role, isLoading: authLoading, isRoleLoading, user } = useAuth();
  
  const rawRef = searchParams.get('ref');
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const refPt = rawRef && UUID_RE.test(rawRef) ? rawRef : null;
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' || refPt ? 'signup' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('atleta');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupEmailSent, setSignupEmailSent] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const didRedirectRef = useRef(false);
  const didHandleConfirmedRef = useRef(false);
  const loginSafetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoginSafetyTimeout = () => {
    if (loginSafetyTimeoutRef.current != null) {
      clearTimeout(loginSafetyTimeoutRef.current);
      loginSafetyTimeoutRef.current = null;
    }
  };

  useEffect(() => () => clearLoginSafetyTimeout(), []);

  // Conferma email completata (redirect da link email)
  const confirmedShownRef = useRef(false);
  useEffect(() => {
    if (searchParams.get('confirmed') === '1' && !confirmedShownRef.current) {
      confirmedShownRef.current = true;
      toast.success('Email confermata', { description: 'Ora puoi accedere al tuo account.' });
    }
  }, [searchParams]);

  // Redirect if already authenticated, handle referral connection
  useEffect(() => {
    if (didRedirectRef.current) return;

    if (isAuthenticated && role) {
      clearLoginSafetyTimeout();
      setIsLoading(false);
      // Process referral if present
      const storedRef = localStorage.getItem('livellapp_ref_pt');
      if (storedRef && role === 'atleta' && user) {
        localStorage.removeItem('livellapp_ref_pt');
        // Create connection request and save referred_by_pt
        (async () => {
          try {
            await supabase.from('pt_atleta_connections').insert({
              pt_user_id: storedRef,
              atleta_user_id: user.id,
              requested_by: user.id,
              status: 'pending',
            });
            await supabase.from('atleta_profiles').update({ referred_by_pt: storedRef }).eq('user_id', user.id);
          } catch (e) {
            console.warn('Referral connection error', e);
          }
        })();
      }
      const homeRoute = getHomeRoute(role);
      didRedirectRef.current = true;
      navigate(homeRoute, { replace: true });
      return;
    }

    // Handle case: authenticated but role is null after auth fully finished loading
    if (isAuthenticated && !role && !authLoading && !isRoleLoading) {
      // Give extra grace period before showing error
      const timeout = setTimeout(() => {
        setIsLoading(false);
        toast.error('Errore nel caricamento del ruolo', {
          description: 'Riprova ad accedere.',
        });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, role, authLoading, isRoleLoading]);

  // Handle redirect back from confirmation email link
  useEffect(() => {
    if (didHandleConfirmedRef.current) return;
    if (searchParams.get('confirmed') === '1') {
      didHandleConfirmedRef.current = true;
      toast.success('Email confermata, puoi accedere');
      setActiveTab('login');
    }
  }, [searchParams]);

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

    if (error) {
      setIsLoading(false);
      toast.error('Errore di accesso', {
        description: error.message,
      });
    } else {
      toast.success('Accesso effettuato');
      // Safety timeout: if redirect doesn't happen within 12s, unblock UI.
      // Must use a ref + effect cleanup — returning a function from this
      // handler does nothing (it is not a React effect).
      clearLoginSafetyTimeout();
      loginSafetyTimeoutRef.current = setTimeout(() => {
        loginSafetyTimeoutRef.current = null;
        setIsLoading(false);
        toast.error('Accesso lento', {
          description: 'Il caricamento sta impiegando troppo. Riprova.',
        });
      }, 12000);
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
      // If ref PT param present and registering as atleta, save referral info
      if (refPt && selectedRole === 'atleta') {
        try {
          // Store referral in localStorage, will be processed after email confirmation & login
          localStorage.setItem('livellapp_ref_pt', refPt);
        } catch (e) {
          console.warn('Could not save referral info', e);
        }
      }
      toast.success('Registrazione completata', {
        description: 'Controlla la tua email per confermare la registrazione.',
      });
      setSignupEmailSent(true);
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = emailSchema.safeParse(forgotPasswordEmail);
    if (!emailResult.success) {
      toast.error('Email non valida');
      return;
    }

    setForgotPasswordLoading(true);
    const { error } = await resetPassword(forgotPasswordEmail);
    setForgotPasswordLoading(false);

    if (error) {
      toast.error('Errore', { description: error.message });
      return;
    }

    toast.success('Email inviata', {
      description: 'Controlla la tua email per il link di reimpostazione password.',
    });
    setForgotPasswordOpen(false);
    setForgotPasswordEmail('');
  };

  if (authLoading) {
    return (
      <LoadingSpinner 
        variant="logo" 
        size="lg" 
        text="Verifica credenziali..." 
        fullScreen 
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <Logo variant="icon" className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold">LIVEL APP</h1>
          <p className="text-muted-foreground">La tua piattaforma per allenarti</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as 'login' | 'signup');
                setSignupEmailSent(false);
              }}
            >
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
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn('pr-10', errors.password && 'border-destructive')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accedi
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordEmail(email);
                      setForgotPasswordOpen(true);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Password dimenticata?
                  </button>
                </div>
              </form>
            ) : signupEmailSent ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <MailCheck className="h-12 w-12 text-primary" />
                <p className="font-medium">Controlla la tua email</p>
                <p className="text-sm text-muted-foreground">
                  Ti abbiamo inviato un'email con un link di conferma a <strong>{email}</strong>.
                  Clicca sul link per attivare il tuo account, poi torna qui per accedere.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSignupEmailSent(false);
                    setActiveTab('login');
                  }}
                >
                  Torna al login
                </Button>
              </div>
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
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn('pr-10', errors.password && 'border-destructive')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Conferma Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn('pr-10', errors.confirmPassword && 'border-destructive')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
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
                    onClick={() => {
                      setActiveTab('signup');
                      setSignupEmailSent(false);
                    }}
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
                    onClick={() => {
                      setActiveTab('login');
                      setSignupEmailSent(false);
                    }}
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

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password dimenticata?</DialogTitle>
            <DialogDescription>
              Inserisci la tua email: ti invieremo un link per reimpostare la password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-password-email">Email</Label>
              <Input
                id="forgot-password-email"
                type="email"
                placeholder="email@esempio.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                {forgotPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Invia link di reimpostazione
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AuthPage;
