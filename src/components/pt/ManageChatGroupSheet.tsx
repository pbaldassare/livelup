import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MultiSelectSearch } from '@/components/common/MultiSelectSearch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  addChatGroupMembers,
  deleteChatGroup,
  getChatGroupMembers,
  removeChatGroupMember,
  renameChatGroup,
} from '@/lib/api/chatGroups';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import { UserMinus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ConnectedAthleteOption {
  atleta_user_id: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface ManageChatGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  connectedAthletes: ConnectedAthleteOption[];
  /** Rotta lista chat PT dopo aver eliminato il gruppo */
  chatListPath: string;
}

export function ManageChatGroupSheet({
  open,
  onOpenChange,
  groupId,
  groupName,
  connectedAthletes,
  chatListPath,
}: ManageChatGroupSheetProps) {
  const [name, setName] = useState(groupName);
  const [addSelection, setAddSelection] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: members = [] } = useQuery({
    queryKey: ['chat-group-members', groupId],
    queryFn: () => getChatGroupMembers(groupId),
    enabled: open,
  });

  const memberIds = new Set(members.map((m) => m.atleta_user_id));
  const addableOptions = connectedAthletes
    .filter((a) => !memberIds.has(a.atleta_user_id))
    .map((a) => ({
      id: a.atleta_user_id,
      name: getAthleteDisplayName(a.profile?.first_name, a.profile?.last_name, a.profile?.email),
    }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['chat-group-members', groupId] });
    queryClient.invalidateQueries({ queryKey: ['chat-group', groupId] });
    queryClient.invalidateQueries({ queryKey: ['pt-chat-groups'] });
  };

  const renameMutation = useMutation({
    mutationFn: () => renameChatGroup(groupId, name),
    onSuccess: () => {
      toast.success('Nome aggiornato');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMutation = useMutation({
    mutationFn: () => addChatGroupMembers(groupId, addSelection),
    onSuccess: () => {
      toast.success('Atleti aggiunti al gruppo');
      setAddSelection([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (athleteId: string) => removeChatGroupMember(groupId, athleteId),
    onSuccess: () => {
      toast.success('Atleta rimosso dal gruppo');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteChatGroup(groupId),
    onSuccess: () => {
      toast.success('Gruppo eliminato');
      queryClient.invalidateQueries({ queryKey: ['pt-chat-groups'] });
      onOpenChange(false);
      navigate(chatListPath);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gestisci gruppo</SheetTitle>
            <SheetDescription>Rinomina, aggiungi o rimuovi atleti dal gruppo.</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-rename">Nome gruppo</Label>
              <div className="flex gap-2">
                <Input id="group-rename" value={name} onChange={(e) => setName(e.target.value)} />
                <Button
                  variant="secondary"
                  onClick={() => renameMutation.mutate()}
                  disabled={!name.trim() || name.trim() === groupName || renameMutation.isPending}
                >
                  Salva
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Membri ({members.length})</Label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {members.map((m) => {
                  const name = getAthleteDisplayName(
                    m.profiles?.first_name,
                    m.profiles?.last_name,
                    m.profiles?.email,
                  );
                  return (
                    <div key={m.id} className="flex items-center gap-2 p-2 rounded-md border border-border">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getAthleteInitials(m.profiles?.first_name, m.profiles?.last_name, m.profiles?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm truncate">{name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeMutation.mutate(m.atleta_user_id)}
                        disabled={removeMutation.isPending}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {members.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">Nessun membro</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Aggiungi atleti</Label>
              {addableOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tutti gli atleti collegati sono già nel gruppo.
                </p>
              ) : (
                <>
                  <MultiSelectSearch
                    options={addableOptions}
                    selected={addSelection}
                    onChange={setAddSelection}
                    placeholder="Seleziona atleti da aggiungere..."
                  />
                  <Button
                    size="sm"
                    onClick={() => addMutation.mutate()}
                    disabled={addSelection.length === 0 || addMutation.isPending}
                  >
                    Aggiungi al gruppo
                  </Button>
                </>
              )}
            </div>
          </div>

          <SheetFooter className="border-t pt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina gruppo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il gruppo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i messaggi del gruppo "{groupName}" verranno eliminati definitivamente. L'azione non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ManageChatGroupSheet;
