import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TEMPLATE_KIND_BADGE_CLASS,
  TEMPLATE_KIND_DESCRIPTION,
  TEMPLATE_KIND_LABEL,
  normalizeTemplateKind,
  type TemplateKind,
} from '@/lib/pt/templateKinds';
import { useAuth } from '@/hooks/useAuth';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { TemplateExerciseBuilder } from '@/components/pt/TemplateExerciseBuilder';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  ArrowLeft,
  Clock,
  BarChart3,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { templateKindLabel } from '@/lib/pt/templateKinds';
import { TemplateRoutineLinks } from '@/components/pt/TemplateRoutineLinks';
import {
  normalizeTemplateRole,
  TEMPLATE_ROLE_LABEL,
} from '@/lib/pt/templateRoles';
import { ExportSheetPdfButton } from '@/components/shared/ExportSheetPdfButton';

// =====================================================
// PT TEMPLATE DETAIL PAGE
// Dettaglio template con gestione esercizi
// =====================================================

export function PTTemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isApp, routes } = usePTRoutes();
  const queryClient = useQueryClient();

  const updateKindMutation = useMutation({
    mutationFn: async (kind: TemplateKind) => {
      if (!templateId) throw new Error('Template id mancante');
      const { error } = await supabase
        .from('workout_templates')
        .update({ template_kind: kind } as any)
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tipologia aggiornata');
      queryClient.invalidateQueries({ queryKey: ['pt-template-detail', templateId] });
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Errore aggiornamento tipologia'),
  });

  // Fetch template
  const { data: template, isLoading } = useQuery({
    queryKey: ['pt-template-detail', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .eq('pt_user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!templateId && !!user?.id,
  });

  // Fetch template exercise counts (totale + dentro circuiti)
  const { data: exerciseStats = { total: 0, inCircuits: 0, standalone: 0 } } = useQuery({
    queryKey: ['template-exercise-stats', templateId],
    queryFn: async () => {
      if (!templateId) return { total: 0, inCircuits: 0, standalone: 0 };
      const { data, error } = await supabase
        .from('template_exercises')
        .select('block_id')
        .eq('template_id', templateId);
      if (error) throw error;
      const total = data?.length || 0;
      const inCircuits = (data || []).filter((r: any) => r.block_id).length;
      return { total, inCircuits, standalone: total - inCircuits };
    },
    enabled: !!templateId,
  });

  if (isLoading) {
    return <PageLoader text="Caricamento template..." />;
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Template non trovato</p>
        <Button variant="link" onClick={() => navigate(routes.templates)}>
          Torna ai template
        </Button>
      </div>
    );
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'principiante': return 'bg-success/10 text-success';
      case 'intermedio': return 'bg-warning/10 text-warning';
      case 'avanzato': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pageBody = (
    <div className="space-y-4 animate-in">
      {!isApp && (
      <DashboardPageHeader
        title={template.title}
        subtitle="Gestisci gli esercizi del template"
        icon={<FileText className="h-5 w-5" />}
        breadcrumbs={[
          { label: 'Dashboard', href: routes.home },
          { label: 'Allenamenti', href: routes.templates },
          { label: template.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <ExportSheetPdfButton mode="template" templateId={template.id} />
            <Button variant="outline" size="sm" onClick={() => navigate(routes.templates)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
          </div>
        }
      />
      )}

      {(() => {
        const role = normalizeTemplateRole((template as any).template_role);
        const isRoutine = role === 'warmup' || role === 'cooldown';
        return exerciseStats.total === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p>
            <span className="font-medium text-warning">
              {isRoutine ? 'Template vuoto — ' : 'Scheda vuota — '}
            </span>
            <span className="text-muted-foreground">
              {isRoutine
                ? 'aggiungi almeno un esercizio.'
                : 'aggiungi almeno un esercizio per poterla assegnare.'}
            </span>
          </p>
        </div>
        ) : null;
      })()}

      <div className={isApp ? 'flex flex-col gap-4' : 'grid gap-4 lg:grid-cols-4'}>
        <Card className={isApp ? undefined : 'lg:col-span-1'}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {normalizeTemplateRole((template as any).template_role) !== 'main' && (
              <Badge variant="secondary" className="text-xs">
                {TEMPLATE_ROLE_LABEL[normalizeTemplateRole((template as any).template_role)]}
              </Badge>
            )}

            {/* Tipologia scheda — solo main */}
            {normalizeTemplateRole((template as any).template_role) === 'main' && (
            <div className="space-y-1.5 rounded-md border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Tipologia</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${TEMPLATE_KIND_BADGE_CLASS[normalizeTemplateKind((template as any).template_kind)]}`}
                >
                  {TEMPLATE_KIND_LABEL[normalizeTemplateKind((template as any).template_kind)]}
                </Badge>
              </div>
              <Select
                value={normalizeTemplateKind((template as any).template_kind)}
                onValueChange={(v) => updateKindMutation.mutate(v as TemplateKind)}
                disabled={updateKindMutation.isPending}
              >
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="libera">Libera</SelectItem>
                  <SelectItem value="propedeutica">Propedeutica</SelectItem>
                  <SelectItem value="progressiva">Progressiva</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {TEMPLATE_KIND_DESCRIPTION[normalizeTemplateKind((template as any).template_kind)]}
              </p>
            </div>
            )}

            {normalizeTemplateRole((template as any).template_role) === 'main' && (
              <TemplateRoutineLinks
                templateId={template.id}
                includeWarmup={!!(template as any).include_warmup}
                includeCooldown={!!(template as any).include_cooldown}
                warmupTemplateId={(template as any).warmup_template_id ?? null}
                cooldownTemplateId={(template as any).cooldown_template_id ?? null}
                warmupExerciseId={(template as any).warmup_exercise_id ?? null}
                cooldownExerciseId={(template as any).cooldown_exercise_id ?? null}

              />
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm items-center">
              <dt className="text-muted-foreground whitespace-nowrap">Livello</dt>
              <dd>
                {template.difficulty_level && template.difficulty_level !== 'nessuno' ? (
                  <Badge className={`${getDifficultyColor(template.difficulty_level)} text-xs`}>
                    {template.difficulty_level}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Non specificato</span>
                )}
              </dd>

              <dt className="text-muted-foreground whitespace-nowrap">Tipologia</dt>
              <dd>
                <Badge variant="outline" className="text-xs">
                  {templateKindLabel((template as any).template_kind)}
                </Badge>
              </dd>

              <dt className="text-muted-foreground">Gruppi</dt>
              <dd>
                {template.muscle_groups && template.muscle_groups.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {template.muscle_groups.map((m: string) => (
                      <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                        {m}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">—</span>
                )}
              </dd>

              {template.category && (
                <>
                  <dt className="text-muted-foreground">Categoria</dt>
                  <dd>
                    <Badge variant="outline" className="text-xs">{template.category}</Badge>
                  </dd>
                </>
              )}

              <dt className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Durata
              </dt>
              <dd className="font-medium text-sm">
                {template.estimated_duration ? `${template.estimated_duration} min` : 'N/A'}
              </dd>

              <dt className="text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                Esercizi
              </dt>
              <dd className="text-sm">
                <span className="font-medium">{exerciseStats.total}</span>
                <span className="text-muted-foreground text-xs ml-1">
                  ({exerciseStats.standalone} liberi · {exerciseStats.inCircuits} circuiti)
                </span>
              </dd>
            </dl>

            {template.description && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Descrizione</p>
                  <p className="text-sm leading-snug">{template.description}</p>
                </div>
              </>
            )}

            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <Tag className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
                {template.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            <p className="text-[11px] text-muted-foreground leading-tight">
              Creato {format(new Date(template.created_at), 'dd MMM yyyy', { locale: it })}
              {' · '}
              Aggiornato {format(new Date(template.updated_at), 'dd MMM yyyy', { locale: it })}
            </p>
          </CardContent>
        </Card>

        <Card className={isApp ? undefined : 'lg:col-span-3'}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Esercizi e protocolli</CardTitle>
            <CardDescription className="text-xs">
              Aggiungi esercizi (set standard) o protocolli (EMOM, AMRAP, Superset, HIIT…) come blocchi nella sequenza. Trascina per riordinare.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <TemplateExerciseBuilder templateId={template.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (isApp) {
    return (
      <PTAppPageShell
        title={template.title}
        description="Gestisci gli esercizi del template"
        showBack
        backTo={routes.templates}
        flush
        actions={
          <ExportSheetPdfButton
            mode="template"
            templateId={template.id}
            iconOnly
            variant="ghost"
            className="text-app-foreground hover:text-app-accent"
          />
        }
      >
        {pageBody}
      </PTAppPageShell>
    );
  }

  return pageBody;
}

export default PTTemplateDetailPage;
