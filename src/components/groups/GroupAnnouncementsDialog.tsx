import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGroupAnnouncement,
  listGroupAnnouncements,
  toggleAnnouncementRsvp,
  uploadGroupAnnouncementCover,
} from '@/lib/api/groups';
import type { GroupAnnouncementRow, GroupMemberRole } from '@/types/groups';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Megaphone, Plus, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function isAdminRole(role?: GroupMemberRole | null) {
  return role === 'owner' || role === 'admin';
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AnnouncementCard({
  item,
  isAdmin,
  onToggleRsvp,
  rsvpPending,
}: {
  item: GroupAnnouncementRow;
  isAdmin: boolean;
  onToggleRsvp: (item: GroupAnnouncementRow) => void;
  rsvpPending: boolean;
}) {
  const starts = item.starts_at ? parseISO(item.starts_at) : null;
  return (
    <div className="rounded-xl border border-app-border bg-app-background overflow-hidden">
      {item.cover_url ? (
        <img src={item.cover_url} alt="" className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-20 bg-app-muted flex items-center justify-center">
          <Megaphone className="h-6 w-6 text-app-muted-foreground" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-app-foreground">{item.title}</h3>
        {starts && (
          <p className="text-xs text-app-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {format(starts, "EEEE d MMMM · HH:mm", { locale: it })}
          </p>
        )}
        {(item.place_label || item.address_line) && (
          <p className="text-xs text-app-muted-foreground flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              {item.place_label}
              {item.place_label && item.address_line ? ' · ' : ''}
              {item.address_line}
            </span>
          </p>
        )}
        {item.body ? (
          <p className="text-sm text-app-foreground whitespace-pre-wrap">{item.body}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-app-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {item.rsvp_count ?? 0}{' '}
            {(item.rsvp_count ?? 0) === 1 ? 'partecipante' : 'partecipanti'}
            {isAdmin ? ' · visibile a te' : ''}
          </span>
          <Button
            size="sm"
            variant={item.joined_by_me ? 'outline' : 'default'}
            className={cn(
              !item.joined_by_me && 'bg-app-accent text-app-accent-foreground hover:bg-app-accent/90',
            )}
            disabled={rsvpPending}
            onClick={() => onToggleRsvp(item)}
          >
            {item.joined_by_me ? 'Annulla' : 'Partecipa'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GroupAnnouncementsDialog({
  open,
  onOpenChange,
  groupId,
  userId,
  myRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  userId: string;
  myRole?: GroupMemberRole | null;
}) {
  const queryClient = useQueryClient();
  const admin = isAdminRole(myRole);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date()));
  const [placeLabel, setPlaceLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['group-announcements', groupId, userId],
    queryFn: () => listGroupAnnouncements(groupId, userId),
    enabled: open && !!groupId,
  });

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }, [items]);

  const createMutation = useMutation({
    mutationFn: () =>
      createGroupAnnouncement(userId, {
        groupId,
        title,
        body,
        coverUrl,
        startsAt: new Date(startsAt).toISOString(),
        placeLabel,
        addressLine,
      }),
    onSuccess: () => {
      toast.success('Annuncio pubblicato');
      setCreating(false);
      setTitle('');
      setBody('');
      setPlaceLabel('');
      setAddressLine('');
      setCoverUrl(null);
      queryClient.invalidateQueries({ queryKey: ['group-announcements', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, 'general'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rsvpMutation = useMutation({
    mutationFn: (item: GroupAnnouncementRow) =>
      toggleAnnouncementRsvp({
        announcementId: item.id,
        userId,
        currentlyJoined: !!item.joined_by_me,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-announcements', groupId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onCoverPick = async (file?: File | null) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadGroupAnnouncementCover({ userId, file });
      setCoverUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore upload');
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-app-card border-app-border">
        <DialogHeader>
          <DialogTitle className="text-app-foreground flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Annunci
          </DialogTitle>
          <DialogDescription className="text-app-muted-foreground">
            Mini-eventi del gruppo: data, luogo e partecipazione.
          </DialogDescription>
        </DialogHeader>

        {admin && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant={creating ? 'outline' : 'default'}
              className={!creating ? 'bg-app-accent text-app-accent-foreground' : undefined}
              onClick={() => setCreating((v) => !v)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {creating ? 'Chiudi form' : 'Nuovo annuncio'}
            </Button>
          </div>
        )}

        {creating && admin && (
          <div className="space-y-3 rounded-xl border border-app-border p-3 bg-app-background">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Open day calisthenics"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data e ora *</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Luogo</Label>
              <Input
                value={placeLabel}
                onChange={(e) => setPlaceLabel(e.target.value)}
                placeholder="Nome luogo"
              />
              <Input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Indirizzo (opzionale)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Testo</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Dettagli dell'annuncio..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Locandina (opzionale)</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={uploadingCover}
                onChange={(e) => void onCoverPick(e.target.files?.[0])}
              />
              {coverUrl && (
                <img src={coverUrl} alt="" className="h-28 w-full object-cover rounded-lg" />
              )}
            </div>
            <Button
              className="w-full bg-app-accent text-app-accent-foreground"
              disabled={!title.trim() || !startsAt || createMutation.isPending || uploadingCover}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Pubblicazione…' : 'Pubblica annuncio'}
            </Button>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-app-muted-foreground text-center py-6">Caricamento…</p>
        )}
        {isError && (
          <div className="text-center space-y-2 py-4">
            <p className="text-sm text-app-muted-foreground">
              Impossibile caricare gli annunci. Applica la migration sul backend e riprova.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Riprova
            </Button>
          </div>
        )}
        {!isLoading && !isError && sorted.length === 0 && (
          <p className="text-sm text-app-muted-foreground text-center py-6">
            Nessun annuncio ancora.
            {admin ? ' Creane uno con «Nuovo annuncio».' : ''}
          </p>
        )}
        <div className="space-y-3">
          {sorted.map((item) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              isAdmin={admin}
              rsvpPending={rsvpMutation.isPending}
              onToggleRsvp={(a) => rsvpMutation.mutate(a)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
