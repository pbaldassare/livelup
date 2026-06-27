import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Download,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  addEventParticipant,
  exportParticipantsCsv,
  loadEventParticipants,
  messageAllParticipants,
  participantDisplayName,
  removeEventParticipant,
  updateParticipantStatus,
  type EventParticipantRow,
} from '@/lib/api/eventParticipants';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  eventId: string;
  eventTitle: string;
  isClosedNumber: boolean;
  maxParticipants: number | null;
  compact?: boolean;
};

export function EventParticipantsPanel({
  eventId,
  eventTitle,
  isClosedNumber,
  maxParticipants,
  compact = false,
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addUserId, setAddUserId] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');

  const { data: participants = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['event-participants-pt', eventId],
    queryFn: () => loadEventParticipants(eventId),
    enabled: !!eventId,
  });

  const { data: connectedAthletes = [] } = useQuery({
    queryKey: ['pt-connected-for-event', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: conns } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');
      const ids = (conns || []).map((c) => c.atleta_user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', ids);
      return (profs || []).map((p) => ({
        user_id: p.user_id,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Atleta',
        avatar_url: p.avatar_url,
      }));
    },
    enabled: !!user?.id,
  });

  const registered = useMemo(
    () => participants.filter((p) => p.status === 'registered'),
    [participants],
  );
  const waitlist = useMemo(
    () => participants.filter((p) => p.status === 'waitlist'),
    [participants],
  );

  const filteredRegistered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registered;
    return registered.filter((p) => participantDisplayName(p).toLowerCase().includes(q));
  }, [registered, search]);

  const spotsLeft =
    isClosedNumber && maxParticipants != null
      ? Math.max(0, maxParticipants - registered.length)
      : null;

  const fillPct =
    isClosedNumber && maxParticipants != null && maxParticipants > 0
      ? Math.min(100, (registered.length / maxParticipants) * 100)
      : null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['event-participants-pt', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-participant-counts'] });
    queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] });
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeEventParticipant(id, eventId),
    onSuccess: () => {
      toast.success('Iscritto rimosso');
      invalidate();
    },
    onError: () => toast.error('Errore rimozione iscritto'),
  });

  const promoteMutation = useMutation({
    mutationFn: (id: string) => updateParticipantStatus(id, 'registered'),
    onSuccess: () => {
      toast.success('Spostato in lista iscritti');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Evento pieno'),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addEventParticipant(eventId, addUserId, {
        isClosedNumber,
        maxParticipants,
      }),
    onSuccess: () => {
      toast.success('Atleta aggiunto');
      setAddUserId('');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Errore aggiunta'),
  });

  const messageMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('Non autenticato');
      return messageAllParticipants(user.id, registered, messageText.trim());
    },
    onSuccess: ({ sent, failed }) => {
      setMessageOpen(false);
      setMessageText('');
      if (sent > 0) toast.success(`Messaggio inviato a ${sent} iscritti`);
      if (failed > 0) toast.warning(`${failed} iscritti non raggiungibili (serve connessione attiva)`);
    },
    onError: () => toast.error('Errore invio messaggi'),
  });

  const alreadyIds = new Set(participants.map((p) => p.user_id));
  const addableAthletes = connectedAthletes.filter((a) => !alreadyIds.has(a.user_id));

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {/* Riepilogo */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {registered.length} iscritti
              {waitlist.length > 0 && (
                <span className="text-muted-foreground font-normal"> · {waitlist.length} in attesa</span>
              )}
            </span>
          </div>
          {isClosedNumber && maxParticipants != null && (
            <Badge variant={spotsLeft === 0 ? 'destructive' : 'secondary'}>
              {registered.length}/{maxParticipants} posti
              {spotsLeft === 0 ? ' · Completo' : spotsLeft != null ? ` · ${spotsLeft} liberi` : ''}
            </Badge>
          )}
        </div>
        {fillPct != null && <Progress value={fillPct} className="h-2" />}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isFetching && 'animate-spin')} />
            Aggiorna
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={participants.length === 0}
            onClick={() => exportParticipantsCsv(eventTitle, participants)}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Esporta CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={registered.length === 0}
            onClick={() => setMessageOpen(true)}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Messaggio a tutti
          </Button>
        </div>
      </div>

      {/* Aggiungi manualmente */}
      {addableAthletes.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={addUserId} onValueChange={setAddUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Aggiungi atleta collegato…" />
            </SelectTrigger>
            <SelectContent>
              {addableAthletes.map((a) => (
                <SelectItem key={a.user_id} value={a.user_id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            disabled={!addUserId || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Aggiungi
          </Button>
        </div>
      )}

      {!compact && (
        <Input
          placeholder="Cerca iscritto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      )}

      {/* Lista iscritti */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRegistered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nessun iscritto ancora</p>
      ) : (
        <ul className={cn('space-y-2', compact ? 'max-h-[280px] overflow-y-auto' : 'max-h-[360px] overflow-y-auto')}>
          {filteredRegistered.map((p) => (
            <ParticipantRow
              key={p.id}
              participant={p}
              onRemove={() => removeMutation.mutate(p.id)}
              removing={removeMutation.isPending}
              ptUserId={user?.id}
            />
          ))}
        </ul>
      )}

      {/* Lista d'attesa */}
      {waitlist.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Lista d&apos;attesa</Label>
          <ul className="space-y-2">
            {waitlist.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{participantDisplayName(p).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{participantDisplayName(p)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.registered_at), "d MMM yyyy, HH:mm", { locale: it })}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={spotsLeft === 0 || promoteMutation.isPending}
                  onClick={() => promoteMutation.mutate(p.id)}
                >
                  Promuovi
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeMutation.mutate(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Messaggio a tutti gli iscritti</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Scrivi un messaggio per tutti gli iscritti confermati…"
          />
          <p className="text-xs text-muted-foreground">
            Verrà inviato via chat agli atleti con cui hai una connessione attiva ({registered.length} iscritti).
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMessageOpen(false)}>Annulla</Button>
            <Button
              type="button"
              disabled={!messageText.trim() || messageMutation.isPending}
              onClick={() => messageMutation.mutate()}
            >
              {messageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParticipantRow({
  participant: p,
  onRemove,
  removing,
  ptUserId,
}: {
  participant: EventParticipantRow;
  onRemove: () => void;
  removing: boolean;
  ptUserId?: string;
}) {
  const name = participantDisplayName(p);

  return (
    <li className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm hover:bg-muted/40">
      <Avatar className="h-9 w-9">
        <AvatarImage src={p.profile?.avatar_url ?? undefined} />
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {format(new Date(p.registered_at), "d MMM yyyy, HH:mm", { locale: it })}
          {p.profile?.email && (
            <>
              {' · '}
              <Mail className="inline h-3 w-3" /> {p.profile.email}
            </>
          )}
        </p>
      </div>
      {ptUserId && (
        <Button type="button" size="sm" variant="ghost" asChild>
          <Link to={`/pt/messages?athleteId=${p.user_id}`}>Chat</Link>
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;iscrizione verrà annullata. Se c&apos;è lista d&apos;attesa, il primo in coda verrà promosso automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove} disabled={removing} className="bg-destructive text-destructive-foreground">
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
