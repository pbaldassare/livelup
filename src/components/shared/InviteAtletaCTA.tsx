import { useState } from 'react';
import { Share2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildInviteLink, shareInviteLink } from '@/lib/inviteLink';

// =====================================================
// INVITE ATLETA CTA — card condivisa PT app home / Atleta app home
// Genera un link pubblico (/install, con eventuale ?ref=<ptUserId>)
// e lo condivide (navigator.share) o lo copia negli appunti.
// =====================================================

interface InviteAtletaCTAProps {
  /** ID del PT da collegare automaticamente al nuovo atleta dopo la registrazione */
  refUserId?: string | null;
  title?: string;
  subtitle?: string;
  shareText?: string;
  className?: string;
  /** Variante compatta: solo icona + testo su una riga, per header di sezione */
  variant?: 'card' | 'compact';
}

const DEFAULT_SHARE_TEXT =
  "Allenati con me su Livelapp: scarica l'app e inizia il tuo percorso fitness!";

export function InviteAtletaCTA({
  refUserId,
  title = 'Invita un atleta',
  subtitle = 'Genera un link di invito',
  shareText = DEFAULT_SHARE_TEXT,
  className,
  variant = 'card',
}: InviteAtletaCTAProps) {
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (sending) return;
    setSending(true);
    try {
      const link = buildInviteLink({ refUserId });
      const result = await shareInviteLink(link, {
        title: 'Invita un atleta su Livelapp',
        text: shareText,
      });
      if (result === 'copied' || result === 'shared') {
        toast.success('Link copiato');
      } else {
        toast.error('Impossibile generare il link di invito');
      }
    } finally {
      setSending(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleInvite}
        disabled={sending}
        className={cn(
          'text-xs font-semibold text-app-accent flex items-center gap-1 disabled:opacity-60',
          className,
        )}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Invita
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInvite}
      disabled={sending}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-app-border bg-app-card/50 text-left active:scale-[0.99] transition-transform disabled:opacity-60',
        className,
      )}
    >
      <div className="h-10 w-10 rounded-xl bg-app-accent/15 flex items-center justify-center shrink-0">
        <UserPlus className="h-5 w-5 text-app-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-app-foreground">{title}</p>
        <p className="text-xs text-app-muted-foreground">{subtitle}</p>
      </div>
      <Share2 className="h-4 w-4 text-app-muted-foreground shrink-0" />
    </button>
  );
}

export default InviteAtletaCTA;
