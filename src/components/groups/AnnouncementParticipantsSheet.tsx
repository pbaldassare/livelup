import { useQuery } from '@tanstack/react-query';
import { listAnnouncementRsvps } from '@/lib/api/groups';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

function displayName(p: {
  first_name: string | null;
  last_name: string | null;
}) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Utente';
}

export function AnnouncementParticipantsSheet({
  open,
  onOpenChange,
  announcementId,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcementId: string | null;
  title?: string;
}) {
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['group-announcement-rsvps', announcementId],
    queryFn: () => listAnnouncementRsvps(announcementId!),
    enabled: open && !!announcementId,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl bg-app-card border-app-border max-h-[70vh] overflow-y-auto"
      >
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-app-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Partecipanti
          </SheetTitle>
          {title ? (
            <SheetDescription className="text-app-muted-foreground truncate">
              {title}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        {isLoading && (
          <p className="text-sm text-app-muted-foreground text-center py-8">Caricamento…</p>
        )}
        {!isLoading && participants.length === 0 && (
          <p className="text-sm text-app-muted-foreground text-center py-8">
            Nessun partecipante ancora.
          </p>
        )}
        <ul className="space-y-2 pb-4">
          {participants.map((p) => {
            const name = displayName(p);
            return (
              <li
                key={p.user_id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 bg-app-background"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="bg-app-muted text-app-foreground text-xs">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-app-foreground truncate">{name}</span>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
