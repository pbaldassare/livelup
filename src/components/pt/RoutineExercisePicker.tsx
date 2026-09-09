import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, ChevronDown, Loader2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RoutineExercisePicker({
  selectedId,
  selectedName,
  disabled,
  excludeIds = [],
  variant = 'select',
  onPick,
}: {
  selectedId: string | null;
  selectedName?: string;
  disabled?: boolean;
  excludeIds?: string[];
  variant?: 'select' | 'add';
  onPick: (id: string, name: string) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['pt-routine-exercise-options', user?.id, search],
    queryFn: async () => {
      if (!user?.id) return [] as { id: string; name: string }[];
      let q = supabase
        .from('exercises')
        .select('id, name')
        .or(`is_public.eq.true,created_by.eq.${user.id}`)
        .order('name')
        .limit(120);
      const term = search.trim();
      if (term) q = q.ilike('name', `%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
    enabled: open && !!user?.id,
  });

  const visible = options.filter((ex) => ex.id === selectedId || !excludeIds.includes(ex.id));

  return (
    <>
      {variant === 'add' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-9 w-full gap-1"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi esercizio
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-11 w-full justify-between bg-background text-xs font-normal"
          onClick={() => setOpen(true)}
        >
          <span className="truncate text-left">
            {selectedName || (selectedId ? 'Esercizio collegato' : 'Seleziona esercizio…')}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
      >
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] p-4 max-h-[min(90vh,560px)] flex flex-col gap-3">
          <DialogHeader>
            <DialogTitle>
              {variant === 'add' ? 'Aggiungi un esercizio' : 'Scegli un esercizio'}
            </DialogTitle>
            <DialogDescription>
              Cerca per nome. Vale su desktop e sul telefono.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca esercizio…"
              className="pl-9 h-11"
              autoFocus
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain -mx-1 px-1 space-y-1 max-h-[50vh]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nessun esercizio trovato.</p>
            ) : (
              visible.map((ex) => {
                const active = ex.id === selectedId;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    className={cn(
                      'flex w-full min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm',
                      active ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                    )}
                    onClick={() => {
                      onPick(ex.id, ex.name);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <span className="truncate">{ex.name}</span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
