import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getGroupAnnouncement,
  toggleAnnouncementRsvp,
} from '@/lib/api/groups';
import type { GroupAnnouncementRow } from '@/types/groups';
import { AnnouncementParticipantsSheet } from '@/components/groups/AnnouncementParticipantsSheet';
import { Button } from '@/components/ui/button';
import { Calendar, Heart, MapPin, Megaphone, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function invalidateAnnouncementQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
  announcementId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['group-announcements', groupId] });
  queryClient.invalidateQueries({ queryKey: ['group-announcement', announcementId] });
  queryClient.invalidateQueries({ queryKey: ['group-announcement-rsvps', announcementId] });
  queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
}

export function AnnouncementChatCard({
  announcementId,
  groupId,
  userId,
  announcement: announcementProp,
  compact = false,
}: {
  announcementId: string;
  groupId: string;
  userId: string;
  /** Prefetched from group list cache when available */
  announcement?: GroupAnnouncementRow | null;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: fetched, isLoading } = useQuery({
    queryKey: ['group-announcement', announcementId, userId],
    queryFn: () => getGroupAnnouncement(announcementId, userId),
    enabled: !!announcementId && !announcementProp,
  });

  const item = announcementProp ?? fetched ?? null;
  const requiresRsvp = item?.requires_rsvp !== false;

  const rsvpMutation = useMutation({
    mutationFn: () =>
      toggleAnnouncementRsvp({
        announcementId,
        userId,
        currentlyJoined: !!item?.joined_by_me,
      }),
    onSuccess: () => {
      invalidateAnnouncementQueries(queryClient, groupId, announcementId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!item && isLoading) {
    return (
      <div className="rounded-xl border border-app-border bg-app-card p-3 text-sm text-app-muted-foreground">
        Caricamento annuncio…
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-xl border border-app-border bg-app-card p-3 text-sm text-app-muted-foreground">
        Annuncio non disponibile
      </div>
    );
  }

  const starts = item.starts_at ? parseISO(item.starts_at) : null;
  const count = item.rsvp_count ?? 0;

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-app-border bg-app-card overflow-hidden text-app-foreground',
          compact ? 'max-w-[min(100%,280px)]' : 'w-full max-w-sm',
        )}
      >
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt=""
            className={cn('w-full object-cover', compact ? 'h-24' : 'h-32')}
          />
        ) : (
          <div className="w-full h-14 bg-app-muted flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-app-muted-foreground" />
          </div>
        )}
        <div className="p-3 space-y-2">
          <h3 className="font-semibold text-sm leading-snug">{item.title}</h3>
          {starts && (
            <p className="text-xs text-app-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {format(starts, "EEE d MMM · HH:mm", { locale: it })}
            </p>
          )}
          {(item.place_label || item.address_line) && (
            <p className="text-xs text-app-muted-foreground flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2">
                {item.place_label}
                {item.place_label && item.address_line ? ' · ' : ''}
                {item.address_line}
              </span>
            </p>
          )}

          {requiresRsvp && (
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="text-xs text-app-muted-foreground flex items-center gap-1.5 self-start min-h-9 px-1 -ml-1 rounded-md hover:text-app-foreground hover:bg-app-muted/60 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                {count} {count === 1 ? 'partecipante' : 'partecipanti'}
              </button>
              <Button
                type="button"
                size="lg"
                variant={item.joined_by_me ? 'outline' : 'default'}
                className={cn(
                  'w-full min-h-11 text-sm font-semibold',
                  !item.joined_by_me &&
                    'bg-app-accent text-app-accent-foreground hover:bg-app-accent/90',
                  item.joined_by_me && 'border-app-border',
                )}
                disabled={rsvpMutation.isPending}
                onClick={() => rsvpMutation.mutate()}
              >
                <Heart
                  className={cn(
                    'h-4 w-4 mr-2',
                    item.joined_by_me && 'fill-current text-red-500',
                  )}
                />
                {item.joined_by_me ? 'Non ci sono più' : 'Ci sono'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {requiresRsvp && (
        <AnnouncementParticipantsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          announcementId={announcementId}
          title={item.title}
        />
      )}
    </>
  );
}
