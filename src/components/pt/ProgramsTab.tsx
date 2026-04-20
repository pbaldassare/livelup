import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CalendarDays,
  Plus,
  Search,
  Edit2,
  Copy,
  Trash2,
  UserPlus,
  Repeat,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listPrograms,
  deleteProgram,
  duplicateProgram,
} from '@/lib/api/programs';
import { ProgramFormDialog } from './ProgramFormDialog';
import { AssignProgramDialog } from './AssignProgramDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ProgramsTabProps {
  layout?: 'grid' | 'list';
}

export function ProgramsTab({ layout = 'grid' }: ProgramsTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['pt-programs', user?.id],
    queryFn: () => listPrograms(user!.id),
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-programs'] });
      toast.success('Programma eliminato');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Errore'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateProgram(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-programs'] });
      toast.success('Programma duplicato');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Errore'),
  });

  const filtered = programs.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca programma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Button
          onClick={() => {
            setEditId(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Programma
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? 'Nessun programma trovato'
                : 'Nessun programma. Creane uno per organizzare schede nel tempo.'}
            </p>
            {!search && (
              <Button
                size="sm"
                onClick={() => {
                  setEditId(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Crea il primo programma
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            layout === 'grid'
              ? 'grid gap-3 md:grid-cols-2'
              : 'space-y-2'
          }
        >
          {filtered.map((p: any) => {
            const scheduleCount = p.program_schedules?.length || 0;
            return (
              <Card key={p.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className="text-xs">
                      <Repeat className="h-3 w-3 mr-1" />
                      {p.duration_weeks} sett.
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {p.frequency_per_week}x/sett.
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {scheduleCount} schede
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => {
                        setAssignId(p.id);
                        setAssignOpen(true);
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Assegna
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditId(p.id);
                        setFormOpen(true);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateMutation.mutate(p.id)}
                      disabled={duplicateMutation.isPending}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive ml-auto"
                      onClick={() => {
                        if (confirm(`Eliminare "${p.name}"?`)) {
                          deleteMutation.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProgramFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditId(null);
        }}
        programId={editId}
      />
      <AssignProgramDialog
        open={assignOpen}
        onOpenChange={(o) => {
          setAssignOpen(o);
          if (!o) setAssignId(null);
        }}
        programId={assignId}
      />
    </div>
  );
}
