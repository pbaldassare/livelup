import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { AssignWorkoutDialog } from '@/components/pt/AssignWorkoutDialog';
import { normalizeTemplateRole } from '@/lib/pt/templateRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelectSearch } from '@/components/common/MultiSelectSearch';
import {
  ChevronRight,
  FileText,
  Library,
  MoreVertical,
  Plus,
  Search,
  UserPlus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// =====================================================
// PT PWA — Schede hub
// Comporre schede · Archivio esercizi · lista con assegna
// =====================================================

const MUSCLE_GROUP_OPTIONS = [
  { id: 'petto', name: 'Petto' },
  { id: 'full body', name: 'Full Body' },
  { id: 'schiena', name: 'Schiena' },
  { id: 'gambe', name: 'Gambe' },
  { id: 'spalle', name: 'Spalle' },
  { id: 'braccia', name: 'Braccia' },
  { id: 'core', name: 'Core' },
  { id: 'glutei', name: 'Glutei' },
  { id: 'addominali', name: 'Addominali' },
  { id: 'cardio', name: 'Cardio' },
];

interface WorkoutTemplate {
  id: string;
  title: string;
  description: string | null;
  difficulty_level: string;
  category: string | null;
  estimated_duration: number | null;
  created_at: string;
}

function HubTile({
  icon: Icon,
  title,
  subtitle,
  onClick,
  accent = false,
}: {
  icon: typeof FileText;
  title: string;
  subtitle: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-2 p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform',
        accent
          ? 'border-app-accent/40 bg-app-accent/10'
          : 'border-app-border bg-app-card'
      )}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
          accent ? 'bg-app-accent/20' : 'bg-app-muted'
        )}
      >
        <Icon className={cn('h-5 w-5', accent ? 'text-app-accent' : 'text-app-foreground')} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-app-foreground leading-tight">{title}</p>
        <p className="text-xs text-app-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </button>
  );
}

export function PTAppTemplatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { routes } = usePTRoutes(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    description: '',
    difficulty_level: '',
    muscle_groups: [] as string[],
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['pt-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, title, description, difficulty_level, category, estimated_duration, created_at')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutTemplate[];
    },
    enabled: !!user?.id,
  });

  const filteredTemplates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false) ||
        (t.category?.toLowerCase().includes(q) ?? false)
    );
  }, [templates, searchTerm]);

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');

      const { data: created, error } = await supabase
        .from('workout_templates')
        .insert({
          pt_user_id: user.id,
          title: newTemplate.title.trim(),
          description: newTemplate.description.trim() || null,
          difficulty_level: (newTemplate.difficulty_level || 'nessuno') as
            | 'principiante'
            | 'intermedio'
            | 'avanzato'
            | 'agonista'
            | 'nessuno',
          muscle_groups: newTemplate.muscle_groups,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      const { error: blockError } = await supabase.from('template_blocks').insert({
        template_id: created.id,
        order_index: 0,
        type: 'SET',
        name: 'Blocco 1',
        params: { sets: 4, reps: 10, rest_seconds: 90 },
      });

      if (blockError) console.warn('Errore creazione blocco default:', blockError);
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Scheda creata · Inizia ad aggiungere esercizi');
      setIsCreateOpen(false);
      setNewTemplate({ title: '', description: '', difficulty_level: '', muscle_groups: [] });
      navigate(routes.template(created.id));
    },
    onError: (e: Error) => {
      toast.error(e?.message || 'Errore durante la creazione della scheda');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from('workout_templates').delete().eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Scheda eliminata');
    },
    onError: () => toast.error('Errore durante l\'eliminazione'),
  });

  const openAssign = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsAssignOpen(true);
  };

  return (
    <PTAppPageShell
      title="Schede"
      description="Componi schede e assegna ai tuoi atleti"
    >
      <div className="space-y-5" data-tour="pt-workouts-page">
        {/* Hub azioni principali */}
        <div className="grid grid-cols-2 gap-3">
          <HubTile
            icon={FileText}
            title="Comporre schede"
            subtitle="Crea e modifica"
            accent
            onClick={() => setIsCreateOpen(true)}
          />
          <HubTile
            icon={Library}
            title="Archivio esercizi"
            subtitle="Cerca e modifica"
            onClick={() => navigate(routes.exercises)}
          />
        </div>

        {/* Lista schede */}
        <section aria-labelledby="templates-list-title">
          <div className="flex items-center justify-between mb-2.5">
            <h2
              id="templates-list-title"
              className="text-[11px] font-semibold text-app-muted-foreground uppercase tracking-wide"
            >
              Le tue schede
              {!isLoading && templates.length > 0 && (
                <span className="ml-1.5 text-app-foreground/70">({templates.length})</span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-semibold text-app-accent flex items-center gap-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuova
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted-foreground" />
            <Input
              placeholder="Cerca scheda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-app-card border-app-border text-app-foreground placeholder:text-app-muted-foreground"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full bg-app-muted rounded-xl" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="w-full flex flex-col items-center gap-3 p-8 rounded-2xl border border-dashed border-app-border bg-app-card/50 text-center active:scale-[0.99] transition-transform"
            >
              <div className="h-12 w-12 rounded-xl bg-app-accent/15 flex items-center justify-center">
                <FileText className="h-6 w-6 text-app-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-app-foreground">
                  {searchTerm ? 'Nessuna scheda trovata' : 'Nessuna scheda ancora'}
                </p>
                <p className="text-xs text-app-muted-foreground mt-1">
                  {searchTerm
                    ? 'Prova con un altro termine di ricerca'
                    : 'Crea la tua prima scheda per iniziare'}
                </p>
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-2xl border border-app-border bg-app-card overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full text-left p-4 pb-3 active:bg-app-muted/30 transition-colors"
                    onClick={() => navigate(routes.template(template.id))}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-app-foreground truncate">{template.title}</p>
                        {template.description && (
                          <p className="text-xs text-app-muted-foreground line-clamp-2 mt-0.5">
                            {template.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {template.difficulty_level &&
                            template.difficulty_level !== 'nessuno' && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] capitalize bg-app-muted text-app-foreground border-0"
                              >
                                {template.difficulty_level}
                              </Badge>
                            )}
                          {template.category && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-app-border text-app-muted-foreground"
                            >
                              {template.category}
                            </Badge>
                          )}
                          {template.estimated_duration != null && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-app-border text-app-muted-foreground"
                            >
                              {template.estimated_duration} min
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-app-muted-foreground shrink-0 mt-1" />
                    </div>
                  </button>

                  <div className="flex items-center gap-2 px-3 pb-3 pt-0">
                    <Button
                      size="sm"
                      className="flex-1 h-9 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                      onClick={() => openAssign(template.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Assegna ad atleta
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 shrink-0 border-app-border"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(routes.template(template.id))}>
                          Modifica scheda
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                        >
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Crea scheda */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col bg-app-card border-app-border">
          <DialogHeader>
            <DialogTitle className="text-app-foreground">Nuova scheda</DialogTitle>
            <DialogDescription className="text-app-muted-foreground">
              Definisci i dati base. Subito dopo entrerai nel builder con un blocco SET già pronto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="template-title">
                Titolo scheda <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-title"
                autoFocus
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                placeholder="Es: Full Body Principiante"
                className="bg-app-background border-app-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Gruppi muscolari (opzionale)</Label>
              <MultiSelectSearch
                options={MUSCLE_GROUP_OPTIONS}
                selected={newTemplate.muscle_groups}
                onChange={(v) => setNewTemplate({ ...newTemplate, muscle_groups: v })}
                placeholder="Seleziona gruppi muscolari..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-livello">Livello (opzionale)</Label>
              <Select
                value={newTemplate.difficulty_level || undefined}
                onValueChange={(v) => setNewTemplate({ ...newTemplate, difficulty_level: v })}
              >
                <SelectTrigger id="template-livello" className="bg-app-background border-app-border">
                  <SelectValue placeholder="Seleziona livello..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principiante">Principiante</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzato">Avanzato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Descrizione (opzionale)</Label>
              <Textarea
                id="template-description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Breve descrizione dell'allenamento..."
                className="min-h-[70px] bg-app-background border-app-border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-app-border">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annulla
            </Button>
            <Button
              className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              onClick={() => createTemplateMutation.mutate()}
              disabled={!newTemplate.title.trim() || createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? 'Creazione…' : 'Continua'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AssignWorkoutDialog
        open={isAssignOpen}
        onOpenChange={(open) => {
          setIsAssignOpen(open);
          if (!open) setSelectedTemplateId(null);
        }}
        preselectedTemplateId={selectedTemplateId || undefined}
      />
    </PTAppPageShell>
  );
}

export default PTAppTemplatesPage;
