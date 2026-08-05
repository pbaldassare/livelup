import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { useAuth } from '@/hooks/useAuth';
import { setPrimaryCoach } from '@/lib/api/connections';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { buildCoachFullName, getCoachInitials } from '@/lib/coachName';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  UserPlus,
  Hourglass,
  Check,
  X,
  Compass,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// =====================================================
// COACH CARD(S) - Home Atleta (multi-PT)
// =====================================================

interface CoachCardProps {
  variant?: 'default' | 'compact';
}

export function CoachCard({ variant = 'default' }: CoachCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    connections,
    pendingConnections,
    isConnected,
    isLoading,
  } = useAtletaStatus();
  const [acting, setActing] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="h-4 w-32 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  const invitations = pendingConnections.filter(
    (c) => !!c.requested_by && c.requested_by === c.pt_user_id,
  );
  const outgoingPending = pendingConnections.filter(
    (c) => !c.requested_by || c.requested_by !== c.pt_user_id,
  );

  const respond = async (
    connectionId: string,
    newStatus: 'active' | 'terminated',
    displayName: string,
  ) => {
    if (!user?.id || acting) return;
    setActing(true);
    try {
      const update: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'active') update.accepted_at = new Date().toISOString();
      if (newStatus === 'terminated') update.terminated_at = new Date().toISOString();

      const { error } = await supabase
        .from('pt_atleta_connections')
        .update(update)
        .eq('id', connectionId);
      if (error) throw error;

      toast({
        title: newStatus === 'active' ? 'Coach collegato!' : 'Invito rifiutato',
        description:
          newStatus === 'active'
            ? `Sei ora collegato a ${displayName}`
            : "Hai rifiutato l'invito",
      });
      queryClient.invalidateQueries({ queryKey: ['atleta-connection', user.id] });
    } catch (e) {
      toast({
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Riprova',
        variant: 'destructive',
      });
    } finally {
      setActing(false);
    }
  };

  const onSetPrimary = async (ptUserId: string) => {
    if (!user?.id || settingPrimary) return;
    setSettingPrimary(ptUserId);
    try {
      await setPrimaryCoach(ptUserId);
      toast({ title: 'Coach primario aggiornato' });
      queryClient.invalidateQueries({ queryKey: ['atleta-connection', user.id] });
    } catch (e) {
      toast({
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Riprova',
        variant: 'destructive',
      });
    } finally {
      setSettingPrimary(null);
    }
  };

  // Nessun coach e nessuna pending
  if (!isConnected && pendingConnections.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-dashed border-white/15 bg-gray-900/40 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <ShieldAlert className="h-5 w-5 text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">
              I tuoi Coach
            </p>
            <p className="text-sm text-white/70">Non sei ancora collegato</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/app/discover')}
            className="bg-app-accent text-black hover:bg-app-accent/90 font-semibold"
          >
            <Compass className="h-4 w-4" />
            Trova
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((inv) => {
        const name =
          buildCoachFullName(inv.profiles?.first_name, inv.profiles?.last_name) ??
          'Coach';
        const initials = getCoachInitials(
          inv.profiles?.first_name,
          inv.profiles?.last_name,
        );
        return (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-app-accent/30 bg-gradient-to-br from-app-accent/10 to-transparent p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-app-accent/40">
                <AvatarImage src={inv.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-gray-800 text-app-accent text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-app-accent">
                  <UserPlus className="inline h-3 w-3 mr-1" />
                  Invito ricevuto
                </p>
                <p className="text-sm font-semibold text-white truncate">
                  {name} vuole collegarsi
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => respond(inv.id, 'active', name)}
                disabled={acting}
                className="bg-app-accent text-black hover:bg-app-accent/90 font-semibold"
              >
                <Check className="h-4 w-4" />
                Accetta
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(inv.id, 'terminated', name)}
                disabled={acting}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Rifiuta
              </Button>
            </div>
          </motion.div>
        );
      })}

      {outgoingPending.map((p) => {
        const name =
          buildCoachFullName(p.profiles?.first_name, p.profiles?.last_name) ??
          'Coach';
        const initials = getCoachInitials(
          p.profiles?.first_name,
          p.profiles?.last_name,
        );
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-yellow-500/30">
                <AvatarImage src={p.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-gray-800 text-yellow-400 text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-yellow-400">
                  <Hourglass className="inline h-3 w-3 mr-1" />
                  In attesa
                </p>
                <p className="text-sm font-semibold text-white truncate">{name}</p>
                <p className="text-xs text-white/50">Richiesta inviata</p>
              </div>
            </div>
          </motion.div>
        );
      })}

      {connections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium uppercase tracking-wide text-app-accent">
              {connections.length === 1 ? 'Il tuo Coach' : 'I tuoi Coach'}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-white/50 hover:text-white"
              onClick={() => navigate('/app/discover')}
            >
              + Aggiungi
            </Button>
          </div>

          {connections.map((c) => {
            const name =
              buildCoachFullName(c.profiles?.first_name, c.profiles?.last_name) ??
              'Coach';
            const initials = getCoachInitials(
              c.profiles?.first_name,
              c.profiles?.last_name,
            );
            const paused = c.is_pt_active === false;
            const isPrimary = !!c.is_primary;

            if (variant === 'compact') {
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/app/chat/${c.pt_user_id}`)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-gray-900/60 p-3 text-left transition-colors hover:bg-gray-900/90"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-app-accent/40">
                    <AvatarImage src={c.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gray-800 text-app-accent text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {name}
                      {isPrimary ? (
                        <Star className="inline h-3 w-3 ml-1 text-app-accent fill-app-accent" />
                      ) : null}
                    </p>
                  </div>
                  <MessageCircle className="h-4 w-4 text-white/40" />
                </button>
              );
            }

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-2xl border bg-gradient-to-br from-gray-900 to-black p-4',
                  isPrimary ? 'border-app-accent/40' : 'border-white/10',
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/app/pt/${c.pt_user_id}`)}
                    className="flex-shrink-0"
                    type="button"
                  >
                    <Avatar className="h-14 w-14 ring-2 ring-app-accent/50">
                      <AvatarImage src={c.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gray-800 text-app-accent font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-app-accent">
                      {isPrimary ? 'Coach primario' : 'Coach'}
                    </p>
                    <p className="text-base font-bold text-white truncate">{name}</p>
                    <p className="text-xs text-white/40 truncate">
                      {paused
                        ? 'Collaborazione in pausa — chat disponibile'
                        : 'Collegato'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/app/chat/${c.pt_user_id}`)}
                      className="bg-app-accent text-black hover:bg-app-accent/90 font-semibold"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Contatta
                    </Button>
                    {!isPrimary && connections.length > 1 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={settingPrimary === c.pt_user_id}
                        onClick={() => onSetPrimary(c.pt_user_id)}
                        className="h-7 text-[10px] text-white/50 hover:text-app-accent"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Imposta primario
                      </Button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default CoachCard;
