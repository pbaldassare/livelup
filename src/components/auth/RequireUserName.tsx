import { ReactNode, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, UserCircle2 } from 'lucide-react';

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMissing(firstName) || isMissing(lastName)) {
      toast.error('Inserisci nome e cognome');
      return;
    }
    setSaving(true);
    try {
      // upsert (riga profilo potrebbe non esistere ancora)
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: user.email ?? null,
          },
          { onConflict: 'user_id' },
        );
      if (error) throw error;

      toast.success('Profilo aggiornato');
      await queryClient.invalidateQueries({ queryKey: ['profile-name-check', user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore salvataggio');
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
            Inserisci nome e cognome per continuare
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
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Mario"
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
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Rossi"
              maxLength={50}
              required
              className="mt-1 bg-app-muted border-app-border text-app-foreground"
            />
          </div>
          <Button
            type="submit"
            disabled={saving || isMissing(firstName) || isMissing(lastName)}
            className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 font-semibold"
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
        </form>
      </div>
    </div>
  );
}

export default RequireUserName;
