import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ExerciseCatalog, useCreateExerciseCatalog, useUpdateExerciseCatalog } from '@/hooks/useExerciseCatalogs';

interface CreateCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se presente, il dialog opera in modalità modifica su questo catalogo. */
  editCatalog?: ExerciseCatalog | null;
}

const EMOJI_PRESETS = [
  '🗂️', '💪', '🏋️', '🔥', '⚡', '🏃', '🧘', '🤸', '🥇', '🎯', '⭐', '🩱',
];

const emptyForm = {
  name: '',
  emoji: EMOJI_PRESETS[0],
  description: '',
};

export function CreateCatalogDialog({ open, onOpenChange, editCatalog }: CreateCatalogDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const createCatalog = useCreateExerciseCatalog();
  const updateCatalog = useUpdateExerciseCatalog();
  const isEditing = !!editCatalog;
  const mutation = isEditing ? updateCatalog : createCatalog;

  useEffect(() => {
    if (open) {
      setForm(
        editCatalog
          ? { name: editCatalog.name, emoji: editCatalog.emoji, description: editCatalog.description ?? '' }
          : emptyForm,
      );
    }
  }, [open, editCatalog]);

  const handleSave = () => {
    if (isEditing && editCatalog) {
      updateCatalog.mutate(
        { id: editCatalog.id, name: form.name, emoji: form.emoji, description: form.description },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createCatalog.mutate(
        { name: form.name, emoji: form.emoji, description: form.description },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifica catalogo' : 'Crea catalogo'}</DialogTitle>
          <DialogDescription>
            Un catalogo raggruppa esercizi omogenei (es. per attrezzo, disciplina o obiettivo).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome del catalogo *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Es: Calisthenics base"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Emoticon collegata</Label>
            <div className="flex items-center gap-2">
              <Input
                value={form.emoji}
                onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                placeholder="🗂️"
                className="w-16 text-center text-lg"
                maxLength={4}
              />
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, emoji: e }))}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md border text-base transition-colors',
                      form.emoji === e
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Breve descrizione</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="A cosa serve questo catalogo..."
              className="min-h-[70px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || mutation.isPending}
          >
            {mutation.isPending ? 'Salvataggio...' : isEditing ? 'Salva modifiche' : 'Crea catalogo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCatalogDialog;
