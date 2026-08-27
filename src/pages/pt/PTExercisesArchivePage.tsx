import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
} from '@/components/ui/alert-dialog';
import { Search, Video, Library, Info, Star, Dumbbell, Plus, FolderPlus, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { TablePagination } from '@/components/dashboard/TablePagination';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { ExerciseDetailDialog } from '@/components/exercises/ExerciseDetailDialog';
import { CreateExerciseDialog } from '@/components/pt/CreateExerciseDialog';
import { ImportExercisesDialog } from '@/components/pt/ImportExercisesDialog';
import { CreateCatalogDialog } from '@/components/pt/CreateCatalogDialog';
import { CatalogDetailDialog } from '@/components/pt/CatalogDetailDialog';
import { ExerciseCatalogAssignPopover } from '@/components/pt/ExerciseCatalogAssignPopover';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/usePTFavoriteExercises';
import { useExerciseCatalogs, getCatalogAccess, type ExerciseCatalog } from '@/hooks/useExerciseCatalogs';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { deleteOwnPtExercise } from '@/lib/api/ptExercises';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import livellappIcon from '@/assets/livellapp-icon.svg';

const EXERCISE_COLUMNS =
  'id, name, description, category, muscle_groups, difficulty_level, video_url, image_url, instructions, is_public, created_by';

type Exercise = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  muscle_groups: string[];
  difficulty_level: string;
  video_url: string | null;
  image_url: string | null;
  instructions: string | null;
  is_public: boolean;
  created_by: string | null;
};

type SourceFilter = 'all' | 'archivio' | 'miei' | 'preferiti';

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'archivio', label: 'Archivio' },
  { value: 'miei', label: 'I miei' },
  { value: 'preferiti', label: 'Preferiti' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'Tutte le difficoltà' },
  { value: 'nessuno', label: 'Nessuno' },
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
];

const difficultyColor = (level: string) => {
  switch (level) {
    case 'principiante':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'intermedio':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'avanzato':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
    default:
      return '';
  }
};

export default function PTExercisesArchivePage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deleteExercise, setDeleteExercise] = useState<Exercise | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createCatalogOpen, setCreateCatalogOpen] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data: favIds } = useFavoriteIds();
  const { data: catalogs = [] } = useExerciseCatalogs();
  const toggleFav = useToggleFavorite();

  const selectedCatalog: ExerciseCatalog | null =
    catalogs.find((c) => c.id === selectedCatalogId) ?? null;

  const ownedCatalogs = catalogs.filter((c) => getCatalogAccess(c, user?.id) === 'owned');
  const sharedCatalogs = catalogs.filter((c) => getCatalogAccess(c, user?.id) === 'shared');
  const publicCatalogs = catalogs.filter((c) => getCatalogAccess(c, user?.id) === 'public');

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['pt-exercises-archive', user?.id, sourceFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      return fetchAllRows<Exercise>(async (from, to) => {
        let q = supabase.from('exercises').select(EXERCISE_COLUMNS);

        if (sourceFilter === 'archivio') {
          q = q.or('is_public.eq.true,created_by.is.null');
        } else if (sourceFilter === 'miei') {
          q = q.eq('created_by', user.id).eq('is_public', false);
        }
        // 'all' / 'preferiti': RLS returns (public exercises) ∪ (own private exercises) automatically

        const { data, error } = await q.order('category').order('name').range(from, to);
        return { data: (data ?? []) as Exercise[], error };
      });
    },
    enabled: !!user?.id,
  });

  const { categories, muscleGroups } = useMemo(() => {
    const cats = new Set<string>();
    const muscles = new Set<string>();
    exercises.forEach(ex => {
      if (ex.category) cats.add(ex.category);
      (ex.muscle_groups || []).forEach(m => muscles.add(m));
    });
    return {
      categories: Array.from(cats).sort(),
      muscleGroups: Array.from(muscles).sort(),
    };
  }, [exercises]);

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Tutte le categorie' },
      ...categories.map((c) => ({ value: c, label: c })),
    ],
    [categories],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return exercises.filter((ex) => {
      const matchesSearch = !q || ex.name.toLowerCase().includes(q);
      const matchesDiff = difficultyFilter === 'all' || ex.difficulty_level === difficultyFilter;
      const matchesCat = categoryFilter === 'all' || ex.category === categoryFilter;
      const matchesMuscle = muscleFilter === 'all' || (ex.muscle_groups || []).includes(muscleFilter);
      const matchesFav = sourceFilter !== 'preferiti' || (favIds?.has(ex.id) ?? false);
      return matchesSearch && matchesDiff && matchesCat && matchesMuscle && matchesFav;
    });
  }, [exercises, search, difficultyFilter, categoryFilter, muscleFilter, sourceFilter, favIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sourceFilter, difficultyFilter, categoryFilter, muscleFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const isOwnExercise = (ex: Exercise) => ex.created_by === user?.id;

  const isPersonal = (ex: Exercise) =>
    ex.created_by === user?.id && !ex.is_public;

  const isOwnShared = (ex: Exercise) =>
    ex.created_by === user?.id && ex.is_public;

  /** Archivio piattaforma / esercizi pubblici di altri (non i propri condivisi). */
  const isPlatformGlobal = (ex: Exercise) =>
    ex.is_public && ex.created_by !== user?.id;

  const openCreate = () => {
    setEditingExercise(null);
    setCreateOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setSelected(null);
    setEditingExercise(ex);
    setCreateOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      await deleteOwnPtExercise(exerciseId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercises-archive'] });
      queryClient.invalidateQueries({ queryKey: ['pt-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['template-exercises-library'] });
      setDeleteExercise(null);
      setSelected(null);
      toast.success('Esercizio eliminato');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Errore durante l\'eliminazione');
    },
  });

  return (
    <div className="space-y-6">
      {!embedded && (
        <DashboardPageHeader
          title="Esercizi"
          subtitle="Archivio pubblico e i tuoi esercizi personali"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importa Excel
              </Button>
              <Button variant="outline" onClick={() => setCreateCatalogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Crea catalogo
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crea esercizio
              </Button>
            </div>
          }
        />
      )}
      {embedded && (
        <div className="flex justify-end gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Importa
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreateCatalogOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-1" /> Catalogo
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Crea
          </Button>
        </div>
      )}

      {(ownedCatalogs.length > 0 || sharedCatalogs.length > 0 || publicCatalogs.length > 0) && (
        <div className="space-y-2">
          {ownedCatalogs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">I tuoi cataloghi:</span>
              {ownedCatalogs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCatalogId(c.id)}
                  title={c.description || 'Apri catalogo'}
                  className="inline-flex"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1 text-xs font-normal cursor-pointer transition-colors hover:bg-primary/10 hover:border-primary/40',
                      selectedCatalogId === c.id && 'bg-primary/10 border-primary/40',
                    )}
                  >
                    <span>{c.emoji}</span>
                    {c.name}
                    {c.is_public ? ' · pubblico' : ''}
                  </Badge>
                </button>
              ))}
            </div>
          )}
          {sharedCatalogs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Condivisi con te:</span>
              {sharedCatalogs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCatalogId(c.id)}
                  title={c.description || 'Apri catalogo'}
                  className="inline-flex"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1 text-xs font-normal cursor-pointer transition-colors hover:bg-primary/10 hover:border-primary/40',
                      selectedCatalogId === c.id && 'bg-primary/10 border-primary/40',
                    )}
                  >
                    <span>{c.emoji}</span>
                    {c.name}
                  </Badge>
                </button>
              ))}
            </div>
          )}
          {publicCatalogs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Cataloghi pubblici:</span>
              {publicCatalogs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCatalogId(c.id)}
                  title={c.description || 'Apri catalogo'}
                  className="inline-flex"
                >
                  <Badge
                    variant="secondary"
                    className={cn(
                      'gap-1 text-xs font-normal cursor-pointer',
                      selectedCatalogId === c.id && 'ring-1 ring-primary',
                    )}
                  >
                    <span>{c.emoji}</span>
                    {c.name}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            Aggiungi ai preferiti gli esercizi pubblici che usi più spesso.
          </p>
          <p className="text-muted-foreground mt-0.5">
            I tuoi esercizi <span className="font-medium">personali</span> e quelli{' '}
            <span className="font-medium">preferiti</span> appaiono sempre nel builder schede.
          </p>
        </div>
      </div>

      {/* Source toggle + Filters */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {/* Source filter segmented control */}
          <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/30 w-fit">
            {SOURCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSourceFilter(opt.value)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  sourceFilter === opt.value
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Other filters */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca esercizio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Difficoltà" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SearchableSelect
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={categoryOptions}
              placeholder="Categoria"
              searchPlaceholder="Cerca categoria..."
              emptyText="Nessuna categoria"
              aria-label="Categoria"
              className="w-full lg:w-[180px]"
            />
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Gruppo muscolare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i muscoli</SelectItem>
                {muscleGroups.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Esercizi ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Caricamento...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              {sourceFilter === 'miei' ? (
                <>
                  <p className="font-medium">Nessun esercizio personale</p>
                  <p className="text-sm mt-1">
                    Clicca su <strong>Crea esercizio</strong> per aggiungerne uno.
                  </p>
                </>
              ) : sourceFilter === 'preferiti' ? (
                <>
                  <p className="font-medium">Nessun esercizio preferito</p>
                  <p className="text-sm mt-1">
                    Clicca sulla <Star className="inline h-3.5 w-3.5 -mt-0.5" /> su un esercizio per aggiungerlo ai preferiti.
                  </p>
                </>
              ) : (
                <p>Nessun esercizio trovato</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-[76px]">Media</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Difficoltà</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden md:table-cell">Muscoli</TableHead>
                  <TableHead className="hidden lg:table-cell">Anteprima</TableHead>
                  <TableHead className="text-right">Video</TableHead>
                  <TableHead className="w-[88px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(ex => {
                  const isFav = favIds?.has(ex.id) ?? false;
                  const personal = isPersonal(ex);
                  const ownShared = isOwnShared(ex);
                  const platform = isPlatformGlobal(ex);
                  return (
                    <TableRow
                      key={ex.id}
                      className={cn(
                        'cursor-pointer hover:bg-muted/50',
                        isFav && 'bg-primary/[0.03]',
                      )}
                      onClick={() => setSelected(ex)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              toggleFav.mutate({ exerciseId: ex.id, isFavorite: isFav })
                            }
                            disabled={toggleFav.isPending}
                            title={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                          >
                            <Star
                              className={cn(
                                'h-4 w-4 transition-colors',
                                isFav ? 'fill-primary text-primary' : 'text-muted-foreground',
                              )}
                            />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <ExerciseCatalogAssignPopover exerciseId={ex.id} />
                      </TableCell>
                      <TableCell>
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                          {ex.image_url ? (
                            <img src={ex.image_url} alt={ex.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <Dumbbell className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ex.name}</span>
                          {personal && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 shrink-0"
                            >
                              Personale
                            </Badge>
                          )}
                          {ownShared && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 shrink-0"
                            >
                              Condiviso
                            </Badge>
                          )}
                          {platform && (
                            <img
                              src={livellappIcon}
                              alt=""
                              title="Esercizio Livelapp"
                              className="h-4 w-4 shrink-0"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={difficultyColor(ex.difficulty_level)}>
                          {ex.difficulty_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary">{ex.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(ex.muscle_groups || []).slice(0, 3).map(mg => (
                            <Badge key={mg} variant="outline" className="text-xs">{mg}</Badge>
                          ))}
                          {(ex.muscle_groups || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">+{ex.muscle_groups.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-xs truncate">
                        {ex.instructions || ex.description || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {ex.video_url ? (
                          <Video className="inline h-4 w-4 text-primary" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isOwnExercise(ex) ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Modifica"
                              onClick={() => openEdit(ex)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Elimina"
                              onClick={() => setDeleteExercise(ex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!isLoading && filtered.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[25, 50, 100]}
            />
          )}
        </CardContent>
      </Card>

      <ExerciseDetailDialog
        exercise={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        showFavoriteToggle
        showShareAction
        onEdit={selected && isOwnExercise(selected) ? () => openEdit(selected) : undefined}
        onDelete={selected && isOwnExercise(selected) ? () => setDeleteExercise(selected) : undefined}
      />

      <CreateExerciseDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditingExercise(null);
        }}
        exercise={editingExercise}
      />

      <AlertDialog open={!!deleteExercise} onOpenChange={(o) => !o && setDeleteExercise(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l&apos;esercizio?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteExercise
                ? `"${deleteExercise.name}" verrà rimosso dalla tua libreria. Se è già in una scheda template, sparirà anche da lì. Non puoi eliminarlo se è in un corso o in un allenamento già assegnato.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteExercise && deleteMutation.mutate(deleteExercise.id)}
              disabled={deleteMutation.isPending}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportExercisesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        compact={embedded}
      />

      <CreateCatalogDialog
        open={createCatalogOpen}
        onOpenChange={setCreateCatalogOpen}
      />

      <CatalogDetailDialog
        catalog={selectedCatalog}
        open={!!selectedCatalog}
        onOpenChange={(o) => {
          if (!o) setSelectedCatalogId(null);
        }}
      />
    </div>
  );
}
