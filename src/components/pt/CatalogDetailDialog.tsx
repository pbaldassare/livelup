import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, X, Dumbbell } from 'lucide-react';
import {
  ExerciseCatalog,
  useCatalogExercises,
  useDeleteExerciseCatalog,
  useRemoveExerciseFromCatalog,
} from '@/hooks/useExerciseCatalogs';
import { CreateCatalogDialog } from '@/components/pt/CreateCatalogDialog';

interface CatalogDetailDialogProps {
  catalog: ExerciseCatalog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogDetailDialog({ catalog, open, onOpenChange }: CatalogDetailDialogProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { data: rows = [], isLoading } = useCatalogExercises(open ? catalog?.id ?? null : null);
  const removeItem = useRemoveExerciseFromCatalog();
  const deleteCatalog = useDeleteExerciseCatalog();

  if (!catalog) return null;

  const handleDelete = () => {
    deleteCatalog.mutate(catalog.id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{catalog.emoji}</span>
              {catalog.name}
            </DialogTitle>
            {catalog.description && (
              <DialogDescription>{catalog.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 border-b pb-3 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {rows.length} {rows.length === 1 ? 'esercizio' : 'esercizi'} nel catalogo
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifica
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Elimina
              </Button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-1.5 -mx-1 px-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Caricamento...</p>
            ) : rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nessun esercizio in questo catalogo.</p>
                <p className="text-xs mt-1">
                  Usa l'icona catalogo sulla riga di un esercizio nell'archivio per aggiungerlo.
                </p>
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={row.itemId}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {row.exercise?.image_url ? (
                        <img
                          src={row.exercise.image_url}
                          alt={row.exercise.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {row.exercise?.name ?? 'Esercizio rimosso'}
                      </p>
                      {row.exercise?.category && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 mt-0.5">
                          {row.exercise.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem.mutate({ catalogId: catalog.id, exerciseId: row.exerciseId })}
                    disabled={removeItem.isPending}
                    title="Rimuovi dal catalogo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateCatalogDialog open={editOpen} onOpenChange={setEditOpen} editCatalog={catalog} />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo catalogo?</AlertDialogTitle>
            <AlertDialogDescription>
              Il catalogo "{catalog.name}" verrà eliminato definitivamente. Gli esercizi non verranno
              cancellati: verrà rimossa solo l'associazione al catalogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteCatalog.isPending}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CatalogDetailDialog;
