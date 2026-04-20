import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  UserPlus,
  Hourglass,
  Check,
  X,
  Compass,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

// =====================================================
// COACH CARD - Sempre visibile in Home Atleta
// Mostra: nome + avatar + stato + CTA contestuali
// Casi: active | invitation (PT→atleta) | pending (atleta→PT) | nessuno
// =====================================================

interface CoachCardProps {
  variant?: 'default' | 'compact';
}

export function CoachCard({ variant = 'default' }: CoachCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    connection,
    ptName,
    ptInitials,
    ptAvatarUrl,
    isConnected,
    hasPendingRequest,
    pendingInvitationFromPT,
    isLoading,
  } = useAtletaStatus();
  const [acting, setActing] = useState(false);

  // Nome visibile: nome reale o fallback descrittivo (mai "coach"/"pt")
  const displayName = ptName ?? 'Coach assegnato';

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

  // ─── CASO 3: Nessun coach ────────────────────────────
  if (!connection) {
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
              Il tuo Coach
            </p>
            <p className="text-sm text-white/70">
              Non sei ancora collegato
            </p>
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

  const initials = ptInitials;

  // ─── CASO 2A: Invito ricevuto dal PT ─────────────────
  if (pendingInvitationFromPT) {
    const respond = async (newStatus: 'active' | 'terminated') => {
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
          .eq('id', connection.id);
        if (error) throw error;

        toast({
          title: newStatus === 'active' ? 'Coach collegato!' : 'Invito rifiutato',
          description:
            newStatus === 'active'
              ? `Sei ora collegato a ${displayName}`
              : 'Hai rifiutato l\'invito',
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

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-app-accent/30 bg-gradient-to-br from-app-accent/10 to-transparent p-4 space-y-3"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-app-accent/40">
            <AvatarImage src={ptAvatarUrl || undefined} />
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
              {displayName} vuole essere il tuo Coach
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => respond('active')}
            disabled={acting}
            className="bg-app-accent text-black hover:bg-app-accent/90 font-semibold"
          >
            <Check className="h-4 w-4" />
            Accetta
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => respond('terminated')}
            disabled={acting}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
            Rifiuta
          </Button>
        </div>
      </motion.div>
    );
  }

  // ─── CASO 2B: Richiesta inviata dall'atleta, attesa ──
  if (hasPendingRequest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-yellow-500/30">
            <AvatarImage src={ptAvatarUrl || undefined} />
            <AvatarFallback className="bg-gray-800 text-yellow-400 text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-yellow-400">
              <Hourglass className="inline h-3 w-3 mr-1" />
              In attesa
            </p>
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs text-white/50">Richiesta inviata</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── CASO 1: Coach attivo ────────────────────────────
  if (isConnected) {
    if (variant === 'compact') {
      return (
        <button
          onClick={() => navigate(`/app/chat/${connection.pt_user_id}`)}
          className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-gray-900/60 p-3 text-left transition-colors hover:bg-gray-900/90"
        >
          <Avatar className="h-10 w-10 ring-2 ring-app-accent/40">
            <AvatarImage src={ptAvatarUrl || undefined} />
            <AvatarFallback className="bg-gray-800 text-app-accent text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
              Il tuo Coach
            </p>
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          </div>
          <MessageCircle className="h-4 w-4 text-white/40" />
        </button>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-black p-4"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/app/pt/${connection.pt_user_id}`)}
            className="flex-shrink-0"
          >
            <Avatar className="h-14 w-14 ring-2 ring-app-accent/50">
              <AvatarImage src={ptAvatarUrl || undefined} />
              <AvatarFallback className="bg-gray-800 text-app-accent font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-app-accent">
              Il tuo Coach
            </p>
            <p className="text-base font-bold text-white truncate">{displayName}</p>
            <p className="text-xs text-white/40 truncate">Collegato</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/app/chat/${connection.pt_user_id}`)}
            className="bg-app-accent text-black hover:bg-app-accent/90 font-semibold"
          >
            <MessageCircle className="h-4 w-4" />
            Contatta
          </Button>
        </div>
      </motion.div>
    );
  }

  return null;
}

export default CoachCard;
