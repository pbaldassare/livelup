import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { shareInviteLink } from '@/lib/inviteLink';
import { getGroupInviteUrl } from '@/lib/groupInvite';
import { cn } from '@/lib/utils';

interface GroupShareButtonProps {
  inviteToken?: string | null;
  groupName: string;
  className?: string;
  /** icon = overlay liste; toolbar = header chat; grid = tasto etichetta 2x2 */
  variant?: 'button' | 'icon' | 'toolbar' | 'grid';
}

export function GroupShareButton({
  inviteToken,
  groupName,
  className,
  variant = 'button',
}: GroupShareButtonProps) {
  const [sending, setSending] = useState(false);

  if (!inviteToken) return null;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sending) return;
    setSending(true);
    try {
      const url = getGroupInviteUrl(inviteToken);
      const result = await shareInviteLink(url, {
        title: groupName,
        text: `Unisciti a ${groupName} su Livelapp`,
      });
      if (result === 'copied' || result === 'shared') {
        toast.success(result === 'shared' ? 'Link condiviso' : 'Link copiato');
      } else {
        toast.error('Impossibile condividere il link');
      }
    } finally {
      setSending(false);
    }
  };

  if (variant === 'toolbar') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleShare}
        disabled={sending}
        aria-label="Condividi gruppo"
        className={cn('h-9 w-9 shrink-0 text-app-foreground', className)}
      >
        <Share2 className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === 'grid') {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={handleShare}
        disabled={sending}
        className={cn(
          'h-12 w-full justify-start rounded-2xl border-border bg-muted/50 font-medium shadow-none',
          className,
        )}
      >
        <Share2 className="h-4 w-4 mr-2 shrink-0" />
        Condividi
      </Button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        disabled={sending}
        aria-label="Condividi gruppo"
        className={cn(
          'h-8 w-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white disabled:opacity-60',
          className,
        )}
      >
        <Share2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Button variant="outline" onClick={handleShare} disabled={sending} className={className}>
      <Share2 className="h-4 w-4 mr-1" />
      Condividi
    </Button>
  );
}
