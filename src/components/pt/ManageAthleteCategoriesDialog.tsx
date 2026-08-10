import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  archiveAthleteCategory,
  createAthleteCategory,
  deleteAthleteCategory,
  listAthleteCategories,
  updateAthleteCategory,
} from '@/lib/api/athleteCategories';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageAthleteCategoriesDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['pt-athlete-categories', 'manage'],
    queryFn: () => listAthleteCategories({ includeInactive: true }),
    enabled: open,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pt-athlete-categories'] });
  };

  const createMutation = useMutation({
    mutationFn: () => createAthleteCategory({ name: newName }),
    onSuccess: async () => {
      setNewName('');
      toast.success('Categoria creata');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMutation = useMutation({
    mutationFn: () =>
      updateAthleteCategory({ id: editingId!, name: editingName }),
    onSuccess: async () => {
      setEditingId(null);
      setEditingName('');
      toast.success('Categoria aggiornata');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteAthleteCategory(id);
      } catch {
        await archiveAthleteCategory(id);
      }
    },
    onSuccess: async () => {
      toast.success('Categoria rimossa');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const system = categories.filter((c) => c.is_system && c.is_active);
  const custom = categories.filter((c) => !c.is_system);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Categorie cliente</DialogTitle>
          <DialogDescription>
            Le 3 di base sono fisse. Puoi aggiungere e personalizzare le tue (anche con nomi uguali).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Di base
            </p>
            <div className="flex flex-wrap gap-2">
              {system.map((c) => (
                <Badge key={c.id} variant="outline">
                  {c.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Le tue
            </p>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : custom.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna categoria personalizzata.</p>
            ) : (
              <ul className="space-y-2">
                {custom.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2"
                  >
                    {editingId === c.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameMutation.mutate();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex-1 text-left text-sm font-medium"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditingName(c.name);
                        }}
                      >
                        {c.name}
                        {!c.is_active && (
                          <span className="ml-2 text-xs text-muted-foreground">(archiviata)</span>
                        )}
                      </button>
                    )}
                    {editingId === c.id ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={renameMutation.isPending}
                        onClick={() => renameMutation.mutate()}
                      >
                        Salva
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(c.id)}
                        aria-label="Elimina categoria"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Nuova categoria..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) createMutation.mutate();
              }}
            />
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
