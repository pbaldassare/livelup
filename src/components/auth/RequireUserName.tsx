import { ReactNode, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, UserCircle2, AlertCircle } from 'lucide-react';

// =====================================================
// REQUIRE USER NAME — Gate first_name/last_name
// Blocca l'app finché l'utente non compila nome/cognome.
// Si applica a TUTTI i ruoli (atleta, pt, admin) tramite layout.
// =====================================================

interface Props {
  children: ReactNode;
}

function isMissing(value: string | null | undefined): boolean {
  return !value || value.trim().length < 2;
}

export function RequireUserName({ children }: Props) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-name-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
    }
  }, [profile]);

  // Non blocca se non autenticato o ancora in caricamento (lascia passare loader)
  if (!isAuthenticated || !user) return <>{children}</>;
  if (isLoading) return <>{children}</>;

  const needsName = isMissing(profile?.first_name) || isMissing(profile?.last_name);
  if (!needsName) return <>{children}</>;

  const canSubmit = !isMissing(firstName) && !isMissing(lastName) && !saving;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (isMissing(firstName) || isMissing(lastName)) {
      setFormError('Inserisci nome e cognome (almeno 2 caratteri ciascuno).');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: user.email ?? null,
      };

      // 1) prova update sulla riga esistente
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', user.id)
        .select('user_id');
      if (updateError) throw updateError;

      // 2) se nessuna riga aggiornata, la riga profilo non esiste ancora → insert
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, ...payload });
        if (insertError) throw insertError;
      }

      await queryClient.invalidateQueries({ queryKey: ['profile-name-check', user.id] });
      await queryClient.fetchQuery({ queryKey: ['profile-name-check', user.id] });
      toast.success('Profilo aggiornato');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore salvataggio';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-app-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-card p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-full bg-app-accent/10 p-3">
            <UserCircle2 className="h-8 w-8 text-app-accent" />
          </div>
          <h2 className="text-xl font-bold text-app-foreground">Completa il profilo</h2>
          <p className="mt-1 text-sm text-app-muted-foreground">
            Digita nome e cognome (minimo 2 caratteri) per continuare
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="first_name" className="text-app-foreground">
              Nome *
            </Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setFormError(null);
              }}
              placeholder="Il tuo nome"
              maxLength={50}
              required
              autoFocus
              className="mt-1 bg-app-muted border-app-border text-app-foreground"
            />
          </div>
          <div>
            <Label htmlFor="last_name" className="text-app-foreground">
              Cognome *
            </Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setFormError(null);
              }}
              placeholder="Il tuo cognome"
              maxLength={50}
              required
              className="mt-1 bg-app-muted border-app-border text-app-foreground"
            />
          </div>

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio…
              </>
            ) : (
              'Continua'
            )}
          </Button>

          {!canSubmit && !saving && (
            <p className="text-center text-xs text-app-muted-foreground">
              Compila entrambi i campi (minimo 2 caratteri) per attivare il pulsante.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default RequireUserName;
