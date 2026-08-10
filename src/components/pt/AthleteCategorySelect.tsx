import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  listAthleteCategories,
  setAthleteCategory,
} from '@/lib/api/athleteCategories';
import { systemCategoryIdFromSlug } from '@/lib/athleteCategories';
import { cn } from '@/lib/utils';

interface Props {
  connectionId: string;
  atletaUserId: string;
  categoryId?: string | null;
  modality?: string | null;
  ptUserId?: string;
  className?: string;
}

export function AthleteCategorySelect({
  connectionId,
  atletaUserId,
  categoryId,
  modality,
  ptUserId,
  className,
}: Props) {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['pt-athlete-categories'],
    queryFn: () => listAthleteCategories(),
  });

  const value = categoryId || systemCategoryIdFromSlug(modality);

  const mutation = useMutation({
    mutationFn: (nextId: string) =>
      setAthleteCategory({ connectionId, categoryId: nextId }),
    onSuccess: (_data, nextId) => {
      const label = categories.find((c) => c.id === nextId)?.name ?? 'Categoria';
      toast.success(`Categoria: ${label}`);
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-detail', atletaUserId, ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-connections', ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-transfer-my-athletes'] });
      queryClient.invalidateQueries({ queryKey: ['pt-home-data', ptUserId] });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Errore aggiornamento categoria');
    },
  });

  return (
    <div
      className={cn(
        'rounded-xl border border-app-border/80 bg-app-muted/30 px-3 py-2.5 space-y-1.5',
        className,
      )}
    >
      <Label htmlFor="athlete-category" className="text-sm font-medium">
        Categoria cliente
      </Label>
      <Select
        value={value}
        disabled={mutation.isPending || isLoading || categories.length === 0}
        onValueChange={(v) => mutation.mutate(v)}
      >
        <SelectTrigger id="athlete-category" className="bg-app-background border-app-border">
          <SelectValue placeholder="Seleziona categoria" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
