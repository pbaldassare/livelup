import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import {
  shareExerciseToAthletes,
  type SharedExerciseSnapshot,
} from '@/lib/exerciseShare';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dumbbell, Loader2, Search, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ShareExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: SharedExerciseSnapshot | null;
}

export function ShareExerciseDialog({ open, onOpenChange, exercise }: ShareExerciseDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch('');
    }
  }, [open, exercise?.id]);

  const { data: athletes = [], isLoading: loadingAthletes } = useQuery({
    queryKey: ['connected-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (c) => {
          const { data: p } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url')
            .eq('user_id', c.atleta_user_id)
            .single();
          return { atleta_user_id: c.atleta_user_id, profile: p };
        }),
      );
      return enriched;
    },
    enabled: !!user?.id && open,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) => {
      const name = getAthleteDisplayName(
        a.profile?.first_name,
        a.profile?.last_name,
        a.profile?.email,
      ).toLowerCase();
      const email = (a.profile?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [athletes, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(athletes.map((a) => a.atleta_user_id)));
  };

  const shareMutation = useMutation({
    mutationFn: () => {
      if (!user?.id || !exercise) throw new Error('Sessione o esercizio non valido');
      return shareExerciseToAthletes({
        ptUserId: user.id,
        athleteUserIds: [...selected],
        exercise,
      });
    },
    onSuccess: ({ sent, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['pt-chats'] });
      queryClient.invalidateQueries({ queryKey: ['pt-chats-with-athletes'] });
      queryClient.invalidateQueries({ queryKey: ['pt-athletes-chats'] });
      queryClient.invalidateQueries({ queryKey: ['atleta-chats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (sent === 0) {
        toast.error(failed > 0 ? 'Impossibile consigliare l’esercizio' : 'Nessun atleta selezionato');
        return;
      }
      toast.success(
        sent === 1
          ? 'Esercizio consigliato in chat'
          : `Esercizio consigliato a ${sent} atleti`,
      );
      if (failed > 0) {
        toast.message(`${failed} invii non riusciti`);
      }
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-1.5rem)] sm:w-full max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Share2 className="h-5 w-5 text-primary" />
            Consiglia esercizio
          </DialogTitle>
          <DialogDescription>
            Invia l’esercizio in chat agli atleti collegati. Non diventa una scheda né un allenamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {exercise ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Dumbbell className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{exercise.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[exercise.category, exercise.difficulty_level].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ) : null}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca atleta…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={selectAll}
              disabled={athletes.length === 0}
            >
              <Users className="mr-1 h-3.5 w-3.5" />
              Seleziona tutti
            </Button>
          </div>

          {loadingAthletes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun atleta collegato trovato
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((athlete) => {
                const id = athlete.atleta_user_id;
                const checked = selected.has(id);
                const name = getAthleteDisplayName(
                  athlete.profile?.first_name,
                  athlete.profile?.last_name,
                  athlete.profile?.email,
                );
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className="w-full flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted/50"
                    >
                      <Checkbox checked={checked} />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={athlete.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getAthleteInitials(
                            athlete.profile?.first_name,
                            athlete.profile?.last_name,
                            athlete.profile?.email,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {athlete.profile?.email ? (
                          <p className="text-xs text-muted-foreground truncate">
                            {athlete.profile.email}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="px-4 sm:px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            type="button"
            disabled={selected.size === 0 || shareMutation.isPending || !exercise}
            onClick={() => shareMutation.mutate()}
          >
            {shareMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Consiglia ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
