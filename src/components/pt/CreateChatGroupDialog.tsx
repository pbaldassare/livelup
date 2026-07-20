import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Label } from '@/components/ui/label';
import { MultiSelectSearch } from '@/components/common/MultiSelectSearch';
import { createChatGroup } from '@/lib/api/chatGroups';
import { getAthleteDisplayName } from '@/lib/athleteName';
import { Users } from 'lucide-react';
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

interface CreateChatGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ptUserId: string;
  athletes: ConnectedAthleteOption[];
  /** basePath del gruppo appena creato (es. /pt/app/chat/group). Opzionale se si passa onCreated. */
  detailBasePath?: string;
  /** Se presente, seleziona il gruppo in-page invece di navigare (es. dashboard web Messaggi). */
  onCreated?: (groupId: string) => void;
}

export function CreateChatGroupDialog({
  open,
  onOpenChange,
  ptUserId,
  athletes,
  detailBasePath,
  onCreated,
}: CreateChatGroupDialogProps) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const options = athletes.map((a) => ({
    id: a.atleta_user_id,
    name: getAthleteDisplayName(a.profile?.first_name, a.profile?.last_name, a.profile?.email),
  }));

  const resetForm = () => {
    setName('');
    setSelectedIds([]);
  };

  const createMutation = useMutation({
    mutationFn: () => createChatGroup(ptUserId, name, selectedIds),
    onSuccess: (group) => {
      toast.success('Gruppo creato!');
      queryClient.invalidateQueries({ queryKey: ['pt-chat-groups', ptUserId] });
      onOpenChange(false);
      resetForm();
      if (onCreated) {
        onCreated(group.id);
      } else if (detailBasePath) {
        navigate(`${detailBasePath}/${group.id}`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitDisabled = !name.trim() || selectedIds.length === 0 || createMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Nuovo gruppo chat
          </DialogTitle>
          <DialogDescription>
            Crea una chat di gruppo con un sottoinsieme dei tuoi atleti collegati.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">
              Nome gruppo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Squadra Powerlifting"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Atleti <span className="text-destructive">*</span>
            </Label>
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground border border-dashed rounded-md p-3 text-center">
                Nessun atleta collegato
              </p>
            ) : (
              <MultiSelectSearch
                options={options}
                selected={selectedIds}
                onChange={setSelectedIds}
                placeholder="Seleziona atleti..."
                emptyText="Nessun atleta trovato"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={submitDisabled}>
            {createMutation.isPending ? 'Creazione...' : 'Crea gruppo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateChatGroupDialog;
