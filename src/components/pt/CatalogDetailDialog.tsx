import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, X, Dumbbell, Plus, Search, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ExerciseCatalog,
  getCatalogAccess,
  useCatalogExercises,
  useCatalogShares,
  useDeleteExerciseCatalog,
  useRemoveExerciseFromCatalog,
  useRevokeCatalogShare,
  useToggleCatalogItem,
} from '@/hooks/useExerciseCatalogs';
import { CreateCatalogDialog } from '@/components/pt/CreateCatalogDialog';
import { ShareCatalogDialog } from '@/components/pt/ShareCatalogDialog';

interface CatalogDetailDialogProps {
  catalog: ExerciseCatalog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogDetailDialog({ catalog, open, onOpenChange }: CatalogDetailDialogProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const { user } = useAuth();

  const catalogId = open ? catalog?.id ?? null : null;
  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCatalogExercises(catalogId);
  const removeItem = useRemoveExerciseFromCatalog();
  const deleteCatalog = useDeleteExerciseCatalog();
  const toggleItem = useToggleCatalogItem();
  const revokeShare = useRevokeCatalogShare();
  const sharesForLeave = useCatalogShares(catalogId, open && !!catalog && catalog.pt_user_id !== user?.id);

  const inCatalogIds = useMemo(
    () => new Set(rows.map((r) => r.exerciseId)),
    [rows],
  );

  const { data: allExercises = [], isLoading: loadingExercises } = useQuery({
    queryKey: ['pt-exercises-for-catalog-add', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error: qErr } = await supabase
        .from('exercises')
        .select('id, name, category, image_url')
        .order('name');
      if (qErr) throw qErr;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        category: string | null;
        image_url: string | null;
      }>;
    },
    enabled: !!user?.id && addOpen,
  });

  const addable = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return allExercises
      .filter((ex) => !inCatalogIds.has(ex.id))
      .filter((ex) => !q || ex.name.toLowerCase().includes(q));
  }, [allExercises, inCatalogIds, addSearch]);

  if (!catalog) return null;

  const access = getCatalogAccess(catalog, user?.id);
  const isOwner = access === 'owned';
  const myShare = (sharesForLeave.data ?? []).find((s) => s.shared_with_user_id === user?.id);

  const handleDelete = () => {
    deleteCatalog.mutate(catalog.id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        onOpenChange(false);
      },
    });
  };

  const errorMessage =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  const missingItemsTable =
    errorMessage.toLowerCase().includes('schema cache') ||
    errorMessage.toLowerCase().includes('does not exist') ||
    (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'PGRST205');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>{catalog.emoji}</span>
              {catalog.name}
              {catalog.is_public && (
                <Badge variant="secondary" className="text-[10px] font-normal">Pubblico</Badge>
              )}
              {access === 'shared' && (
                <Badge variant="outline" className="text-[10px] font-normal">Condiviso con te</Badge>
              )}
              {access === 'public' && (
                <Badge variant="outline" className="text-[10px] font-normal">Di un altro PT</Badge>
              )}
            </DialogTitle>
            {catalog.description && (
              <DialogDescription>{catalog.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 border-b pb-3 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {rows.length} {rows.length === 1 ? 'esercizio' : 'esercizi'} nel catalogo
            </span>
            <div className="flex gap-2 flex-wrap">
              {isOwner ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
                    <Share2 className="h-3.5 w-3.5 mr-1.5" /> Condividi
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Aggiungi
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Rinomina
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Elimina
                  </Button>
                </>
              ) : (
                myShare && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      revokeShare.mutate(
                        { shareId: myShare.id, catalogId: catalog.id },
                        { onSuccess: () => onOpenChange(false) },
                      )
                    }
                    disabled={revokeShare.isPending}
                  >
                    Rimuovi dal mio elenco
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-1.5 -mx-1 px-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Caricamento...</p>
            ) : isError ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <p className="text-sm">
                  {missingItemsTable
                    ? 'Tabella cataloghi esercizi non ancora creata sul backend. Applica la migration exercise_catalog_items su Lovable Cloud.'
                    : 'Impossibile caricare gli esercizi del catalogo.'}
                </p>
                {!missingItemsTable && (
                  <Button size="sm" variant="outline" onClick={() => refetch()}>
                    Riprova
                  </Button>
                )}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nessun esercizio in questo catalogo.</p>
                {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Aggiungi esercizi
                </Button>
                )}
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
                  {isOwner && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      removeItem.mutate({ catalogId: catalog.id, exerciseId: row.exerciseId })
                    }
                    disabled={removeItem.isPending}
                    title="Rimuovi dal catalogo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateCatalogDialog open={editOpen} onOpenChange={setEditOpen} editCatalog={catalog} />

      <ShareCatalogDialog open={shareOpen} onOpenChange={setShareOpen} catalog={catalog} />

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setAddSearch('');
        }}
      >
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Aggiungi esercizi</DialogTitle>
            <DialogDescription>
              Seleziona esercizi dall&apos;archivio da aggiungere a &quot;{catalog.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Cerca esercizio..."
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto space-y-1 -mx-1 px-1">
            {loadingExercises ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : addable.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {allExercises.length === 0
                  ? 'Nessun esercizio disponibile nell\'archivio.'
                  : addSearch
                    ? 'Nessun risultato per questa ricerca.'
                    : 'Tutti gli esercizi sono già in questo catalogo.'}
              </p>
            ) : (
              addable.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                  disabled={toggleItem.isPending}
                  onClick={() =>
                    toggleItem.mutate(
                      { exerciseId: ex.id, catalogId: catalog.id, checked: true },
                      {
                        onSuccess: () => {
                          toast.success(`«${ex.name}» aggiunto al catalogo`);
                        },
                      },
                    )
                  }
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {ex.image_url ? (
                      <img src={ex.image_url} alt={ex.name} className="h-full w-full object-cover" />
                    ) : (
                      <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    {ex.category && (
                      <p className="text-[11px] text-muted-foreground truncate">{ex.category}</p>
                    )}
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo catalogo?</AlertDialogTitle>
            <AlertDialogDescription>
              Il catalogo &quot;{catalog.name}&quot; verrà eliminato definitivamente. Gli esercizi non
              verranno cancellati: verrà rimossa solo l&apos;associazione al catalogo.
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
