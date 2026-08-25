import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Logo } from '@/components/common/Logo';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';
import { getAuthEmailOtpFromLocation, markPasswordRecovery } from '@/lib/passwordRecovery';

const passwordSchema = z.string().min(6, 'La password deve avere almeno 6 caratteri');

export function AuthResetPasswordPage() {
  const navigate = useNavigate();
  const { session, isLoading: authLoading, updatePassword, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [linkExpired, setLinkExpired] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const otpConsumedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (session) {
      setLinkExpired(false);
      setNeedsTap(false);
      return;
    }
    if (otpConsumedRef.current) return;

    const otp = getAuthEmailOtpFromLocation();
    if (otp?.tokenHash && otp.type === 'recovery') {
      setNeedsTap(true);
      setLinkExpired(false);
      return;
    }

    const otp = getAuthEmailOtpFromLocation();
    if (otp?.tokenHash && otp.type === 'recovery') {
      setNeedsTap(true);
      setLinkExpired(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!session) setLinkExpired(true);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [authLoading, session]);

  const verifyFromLink = async () => {
    const otp = getAuthEmailOtpFromLocation();
    if (!otp?.tokenHash) {
      setLinkExpired(true);
      return;
    }
    setIsVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({
      type: (otp.type as EmailOtpType) || 'recovery',
      token_hash: otp.tokenHash,
    });
    setIsVerifying(false);
    if (error || !data.session) {
      setLinkExpired(true);
      setNeedsTap(false);
      toast.error('Link non valido o scaduto', { description: error?.message });
      return;
    }
    markPasswordRecovery();
    otpConsumedRef.current = true;
    setNeedsTap(false);
    navigate('/auth?type=recovery', { replace: true });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Le password non corrispondono';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);

    if (error) {
      toast.error("Errore durante l'aggiornamento", {
        description: error.message,
      });
      return;
    }

    toast.success('Password aggiornata con successo');
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (authLoading) {
    return (
      <LoadingSpinner
        variant="logo"
        size="lg"
        text="Verifica del link in corso..."
        fullScreen
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <Logo variant="icon" className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold">Livelapp</h1>
          <p className="text-muted-foreground">Reimposta la tua password</p>
        </div>

        <Card>
          {linkExpired ? (
            <>
              <CardHeader>
                <CardTitle>Link non valido o scaduto</CardTitle>
                <CardDescription>
                  Il link di reimpostazione password non è più valido. Richiedine uno nuovo dalla
                  pagina di accesso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate('/auth', { replace: true })}>
                  Torna al login
                </Button>
              </CardContent>
            </>
          ) : needsTap && !session ? (
            <>
              <CardHeader className="flex flex-col items-center gap-2 text-center">
                <KeyRound className="h-8 w-8 text-primary" />
                <CardTitle>Conferma il reset</CardTitle>
                <CardDescription>
                  Tocca il pulsante per sbloccare il cambio password. Così il link non scade se l’email
                  viene aperta in anteprima (WhatsApp, Gmail).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => void verifyFromLink()} disabled={isVerifying}>
                  {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continua
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="flex flex-col items-center gap-2 text-center">
                <KeyRound className="h-8 w-8 text-primary" />
                <CardTitle>Imposta una nuova password</CardTitle>
                <CardDescription>Scegli una nuova password per il tuo account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nuova password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn('pr-10', errors.password && 'border-destructive')}
                        autoFocus
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
                    <Label htmlFor="confirm-new-password">Conferma nuova password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-new-password"
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
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Aggiorna password
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default AuthResetPasswordPage;
