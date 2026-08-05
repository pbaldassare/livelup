import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import {
  assignCourseToAthletes,
  courseQueryKeys,
  listCourseEnrolledAthleteIds,
  type PtCourse,
} from '@/lib/api/courses';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AssignCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Pick<PtCourse, 'id' | 'title' | 'is_free' | 'price' | 'status'> | null;
}

export function AssignCourseDialog({ open, onOpenChange, course }: AssignCourseDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch('');
    }
  }, [open, course?.id]);

  const { data: athletes = [], isLoading: loadingAthletes } = useQuery({
    queryKey: ['connected-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (c) => {
          const { data: p } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url')
            .eq('user_id', c.atleta_user_id)
            .single();
          return { atleta_user_id: c.atleta_user_id, profile: p };
        }),
      );
      return enriched;
    },
    enabled: !!user?.id && open,
  });

  const { data: enrolledIds = [] } = useQuery({
    queryKey: ['course-enrolled-ids', course?.id],
    queryFn: () => listCourseEnrolledAthleteIds(course!.id),
    enabled: !!course?.id && open,
  });

  const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) => {
      const name = getAthleteDisplayName(
        a.profile?.first_name,
        a.profile?.last_name,
        a.profile?.email,
      ).toLowerCase();
      const email = (a.profile?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [athletes, search]);

  const toggle = (id: string) => {
    if (enrolledSet.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAssignable = () => {
    const assignable = athletes
      .map((a) => a.atleta_user_id)
      .filter((id) => !enrolledSet.has(id));
    setSelected(new Set(assignable));
  };

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!course?.id) throw new Error('Corso non valido');
      return assignCourseToAthletes(course.id, [...selected]);
    },
    onSuccess: ({ assigned, skipped }) => {
      if (user?.id && course?.id && assigned > 0) {
        // Aggiorna subito il conteggio iscritti sulla card lista
        queryClient.setQueryData(
          courseQueryKeys.list(user.id),
          (old: { id: string; enrolled_count?: number }[] | undefined) =>
            (old || []).map((c) =>
              c.id === course.id
                ? { ...c, enrolled_count: (c.enrolled_count || 0) + assigned }
                : c,
            ),
        );
      }
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: courseQueryKeys.list(user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['course-enrolled-ids', course?.id] });
      queryClient.invalidateQueries({ queryKey: ['atleta-courses'] });
      if (assigned === 0 && skipped > 0) {
        toast.message('Gli atleti selezionati risultano già iscritti');
      } else {
        toast.success(
          `Corso assegnato a ${assigned} atleta${assigned === 1 ? '' : 'i'}${
            skipped > 0 ? ` (${skipped} già iscritti)` : ''
          }`,
        );
      }
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const priceLabel =
    course && !course.is_free
      ? `€ ${Number(course.price || 0).toFixed(2)}`
      : 'Gratuito';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-1.5rem)] sm:w-full max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-primary" />
            Assegna corso
          </DialogTitle>
          <DialogDescription>
            Seleziona gli atleti collegati a cui assegnare il corso
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {course ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <GraduationCap className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{course.title}</p>
                <p className="text-xs text-muted-foreground">{priceLabel}</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {course.status === 'published' ? 'Pubblicato' : 'Bozza'}
              </Badge>
            </div>
          ) : null}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca atleta…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={selectAllAssignable}
              disabled={athletes.length === 0}
            >
              Seleziona tutti
            </Button>
          </div>

          {loadingAthletes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun atleta collegato trovato
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((athlete) => {
                const id = athlete.atleta_user_id;
                const already = enrolledSet.has(id);
                const checked = already || selected.has(id);
                const name = getAthleteDisplayName(
                  athlete.profile?.first_name,
                  athlete.profile?.last_name,
                  athlete.profile?.email,
                );
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => toggle(id)}
                      className="w-full flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted/50 disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <Checkbox checked={checked} disabled={already} />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={athlete.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getAthleteInitials(
                            athlete.profile?.first_name,
                            athlete.profile?.last_name,
                            athlete.profile?.email,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {athlete.profile?.email ? (
                          <p className="text-xs text-muted-foreground truncate">
                            {athlete.profile.email}
                          </p>
                        ) : null}
                      </div>
                      {already ? (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          Iscritto
                        </Badge>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="px-4 sm:px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            type="button"
            disabled={selected.size === 0 || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            {assignMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Assegna ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
