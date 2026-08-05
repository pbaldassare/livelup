import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Snowflake, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { TemplateRole } from '@/lib/pt/templateRoles';
import { TEMPLATE_ROLE_LABEL } from '@/lib/pt/templateRoles';
import { cn } from '@/lib/utils';

type RoutineRow = {
  id: string;
  title: string;
  description: string | null;
  template_role: TemplateRole;
  exerciseCount: number;
};

interface WarmupCooldownTabProps {
  /** true = token app (PWA PT) */
  embedded?: boolean;
  className?: string;
}

export function WarmupCooldownTab({ embedded = false, className }: WarmupCooldownTabProps) {
  const { user } = useAuth();
  const { routes } = usePTRoutes(embedded);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'warmup' | 'cooldown'>('warmup');
  const [createOpen, setCreateOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'warmup' | 'cooldown'>('warmup');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['pt-routine-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, title, description, template_role, template_exercises(id)')
        .eq('pt_user_id', user.id)
        .in('template_role', ['warmup', 'cooldown'])
        .order('updated_at', { ascending: false });
      if (error) {
        if (/template_role|42703|PGRST204|schema cache/i.test(error.message)) {
          return [];
        }
        throw error;
      }
      return (data || []).map(
        (r: any): RoutineRow => ({
          id: r.id,
          title: r.title,
          description: r.description,
          template_role: r.template_role,
          exerciseCount: r.template_exercises?.length ?? 0,
        }),
      );
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!title.trim()) throw new Error('Inserisci un titolo');
      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          pt_user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          template_role: createRole,
          template_kind: 'libera',
          difficulty_level: 'nessuno',
          estimated_duration: 10,
          muscle_groups: [],
          is_public: false,
        } as any)
        .select()
        .single();
      if (error) throw error;

      await supabase.from('template_blocks').insert({
        template_id: data.id,
        order_index: 0,
        type: 'SET',
        name: TEMPLATE_ROLE_LABEL[createRole],
        params: { sets: 1, reps: 10, rest_seconds: 30 } as any,
      });

      return data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['pt-routine-templates'] });
      toast.success(`${TEMPLATE_ROLE_LABEL[createRole]} creato`);
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      navigate(routes.template(created.id));
    },
    onError: (e: any) => {
      const msg = e?.message || 'Errore creazione';
      if (/template_role|42703|PGRST204|schema cache/i.test(msg)) {
        toast.error(
          'Schema non aggiornato: applica su Lovable scripts/warmup-cooldown-templates.sql',
        );
        return;
      }
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-routine-templates'] });
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Template eliminato');
    },
    onError: (e: any) => toast.error(e?.message || 'Errore eliminazione'),
  });

  const filtered = routines.filter((r) => r.template_role === subTab);

  const openCreate = (role: 'warmup' | 'cooldown') => {
    setCreateRole(role);
    setSubTab(role);
    setCreateOpen(true);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'rounded-lg border p-4 text-sm',
          embedded
            ? 'border-app-border bg-app-muted/40 text-app-muted-foreground'
            : 'bg-muted/30 text-muted-foreground',
        )}
      >
        Crea template di <strong>riscaldamento</strong> e <strong>stretching</strong> con uno o
        più esercizi. Poi, sulla scheda principale, attivali con un flag per allegarli
        all&apos;allenamento. L&apos;atleta può saltarli; non contano nel riepilogo sessione.
      </div>

      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'warmup' | 'cooldown')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList
            className={cn(
              embedded && 'bg-app-muted border border-app-border',
            )}
          >
            <TabsTrigger value="warmup" className="gap-2">
              <Flame className="h-4 w-4" />
              Riscaldamento
            </TabsTrigger>
            <TabsTrigger value="cooldown" className="gap-2">
              <Snowflake className="h-4 w-4" />
              Stretching
            </TabsTrigger>
          </TabsList>
          <Button
            size="sm"
            onClick={() => openCreate(subTab)}
            className={cn(
              'gap-1.5',
              embedded && 'bg-app-accent text-app-accent-foreground hover:bg-app-accent/90',
            )}
          >
            <Plus className="h-4 w-4" />
            Nuovo {TEMPLATE_ROLE_LABEL[subTab].toLowerCase()}
          </Button>
        </div>

        {(['warmup', 'cooldown'] as const).map((role) => (
          <TabsContent key={role} value={role} className="mt-4 space-y-3">
            {isLoading ? (
              <p
                className={cn(
                  'text-sm',
                  embedded ? 'text-app-muted-foreground' : 'text-muted-foreground',
                )}
              >
                Caricamento…
              </p>
            ) : filtered.length === 0 && subTab === role ? (
              <Card
                className={cn(
                  'border-dashed',
                  embedded && 'border-app-border bg-app-card',
                )}
              >
                <CardHeader>
                  <CardTitle
                    className={cn('text-base', embedded && 'text-app-foreground')}
                  >
                    Nessun template di {TEMPLATE_ROLE_LABEL[role].toLowerCase()}
                  </CardTitle>
                  <CardDescription className={embedded ? 'text-app-muted-foreground' : undefined}>
                    Creane uno e aggiungi gli esercizi. Potrai richiamarlo dalle schede.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => openCreate(role)}
                    className={cn('gap-1.5', embedded && 'border-app-border')}
                  >
                    <Plus className="h-4 w-4" />
                    Crea {TEMPLATE_ROLE_LABEL[role].toLowerCase()}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              subTab === role &&
              filtered.map((r) => (
                <Card
                  key={r.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:border-primary/40',
                    embedded && 'border-app-border bg-app-card hover:border-app-accent/40',
                  )}
                  onClick={() => navigate(routes.template(r.id))}
                >
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            'font-medium truncate',
                            embedded && 'text-app-foreground',
                          )}
                        >
                          {r.title}
                        </p>
                        <Badge variant="secondary" className="shrink-0">
                          {r.exerciseCount} es.
                        </Badge>
                      </div>
                      {r.description && (
                        <p
                          className={cn(
                            'text-sm truncate mt-0.5',
                            embedded ? 'text-app-muted-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {r.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => navigate(routes.template(r.id))}
                        aria-label="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Eliminare "${r.title}"?`)) deleteMutation.mutate(r.id);
                        }}
                        aria-label="Elimina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Nuovo {TEMPLATE_ROLE_LABEL[createRole].toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              Salva il template e poi aggiungi gli esercizi nel builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="routine-title">Titolo</Label>
              <Input
                id="routine-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  createRole === 'warmup' ? 'Es. Riscaldamento generale' : 'Es. Stretching finale'
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-desc">Descrizione (opzionale)</Label>
              <Textarea
                id="routine-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !title.trim()}
            >
              Crea e apri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
