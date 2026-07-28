import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Search } from 'lucide-react';

type ExerciseRow = {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[] | null;
  difficulty_level: string | null;
  is_public: boolean;
  created_by: string | null;
  image_url: string | null;
};

interface StepExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: ExerciseRow) => void;
  excludeIds?: string[];
}

export function StepExercisePicker({
  open,
  onOpenChange,
  onSelect,
  excludeIds = [],
}: StepExercisePickerProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [muscleFilter, setMuscleFilter] = useState('all');

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['pt-course-exercise-picker', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ExerciseRow[];
      // RLS: pubblici ∪ privati del PT (created_by = auth.uid())
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, category, muscle_groups, difficulty_level, is_public, created_by, image_url')
        .order('category')
        .order('name');
      if (error) throw error;
      return (data || []) as ExerciseRow[];
    },
    enabled: open && !!user?.id,
  });

  const { categories, muscleGroups } = useMemo(() => {
    const cats = new Set<string>();
    const muscles = new Set<string>();
    exercises.forEach((ex) => {
      if (ex.category) cats.add(ex.category);
      (ex.muscle_groups || []).forEach((m) => muscles.add(m));
    });
    return {
      categories: Array.from(cats).sort(),
      muscleGroups: Array.from(muscles).sort(),
    };
  }, [exercises]);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const filtered = exercises.filter((ex) => {
    if (excluded.has(ex.id)) return false;
    const matchesSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || ex.category === categoryFilter;
    const matchesMuscle =
      muscleFilter === 'all' || (ex.muscle_groups || []).includes(muscleFilter);
    return matchesSearch && matchesCat && matchesMuscle;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aggiungi esercizio</DialogTitle>
          <DialogDescription>
            Scegli dall&apos;archivio pubblico o dai tuoi esercizi personali
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome..."
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Muscoli" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i muscoli</SelectItem>
                {muscleGroups.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border border-border rounded-md divide-y">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10 px-4">
              Nessun esercizio trovato
            </p>
          ) : (
            filtered.map((ex) => {
              const isMine = ex.created_by === user?.id && !ex.is_public;
              return (
                <button
                  key={ex.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                  onClick={() => {
                    onSelect(ex);
                    onOpenChange(false);
                    setSearch('');
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{ex.name}</span>
                      {isMine && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Mio
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {ex.category}
                      {(ex.muscle_groups || []).length > 0
                        ? ` · ${(ex.muscle_groups || []).slice(0, 3).join(', ')}`
                        : ''}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-primary shrink-0" />
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
