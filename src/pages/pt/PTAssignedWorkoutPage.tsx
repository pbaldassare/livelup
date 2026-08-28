import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import { updateAssignedWorkout } from '@/lib/api/workouts';
import { getAthleteDisplayName } from '@/lib/athleteName';
import {
  TEMPLATE_KIND_DESCRIPTION,
  TEMPLATE_KIND_LABEL,
  normalizeTemplateKind,
  type TemplateKind,
} from '@/lib/pt/templateKinds';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { TemplateExerciseBuilder } from '@/components/pt/TemplateExerciseBuilder';
import { PageLoader } from '@/components/common/PageLoader';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { ExportSheetPdfButton } from '@/components/shared/ExportSheetPdfButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PTAssignedWorkoutPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isApp, routes } = usePTRoutes();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: workout, isLoading } = useQuery({
    queryKey: ['pt-assigned-workout', workoutId],
    queryFn: async () => {
      if (!workoutId || !user?.id) return null;
      const { data, error } = await supabase
        .from('workouts')
        .select(
          'id, title, description, status, template_id, template_kind, atleta_user_id, pt_user_id, scheduled_date',
        )
        .eq('id', workoutId)
        .eq('pt_user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workoutId && !!user?.id,
  });

  const { data: athleteName } = useQuery({
    queryKey: ['pt-assigned-workout-athlete', workout?.atleta_user_id],
    queryFn: async () => {
      if (!workout?.atleta_user_id) return 'Atleta';
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', workout.atleta_user_id)
        .single();
      return getAthleteDisplayName(data?.first_name, data?.last_name, data?.email);
    },
    enabled: !!workout?.atleta_user_id,
  });

  useEffect(() => {
    if (!workout) return;
    setTitle(workout.title ?? '');
    setDescription(workout.description ?? '');
  }, [workout?.id, workout?.title, workout?.description]);

  const saveMetaMutation = useMutation({
    mutationFn: (patch: { title?: string; description?: string | null; templateKind?: TemplateKind }) => {
      if (!workoutId || !user?.id) throw new Error('Non autenticato');
      return updateAssignedWorkout(workoutId, user.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-assigned-workout', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['pt-workouts'] });
      toast.success('Scheda assegnata aggiornata');
    },
    onError: (e: Error) => toast.error(e.message || 'Errore salvataggio'),
  });

  const backTo = workout?.atleta_user_id
    ? routes.athlete(workout.atleta_user_id)
    : routes.athletes;

  if (isLoading) {
    return <PageLoader text="Caricamento scheda assegnata..." />;
  }

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Scheda assegnata non trovata</p>
        <Button variant="link" onClick={() => navigate(routes.athletes)}>
          Torna agli atleti
        </Button>
      </div>
    );
  }

  const kind = normalizeTemplateKind((workout as any).template_kind);
  const pageBody = (
    <div className="space-y-4 animate-in">
      {!isApp && (
        <DashboardPageHeader
          title={title.trim() || workout.title}
          subtitle={`Copia assegnata a ${athleteName ?? 'atleta'} — le modifiche non toccano la scheda originale`}
          icon={<FileText className="h-5 w-5" />}
          breadcrumbs={[
            { label: 'Dashboard', href: routes.home },
            { label: athleteName ?? 'Atleta', href: backTo },
            { label: title.trim() || workout.title },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <ExportSheetPdfButton mode="workout" workoutId={workout.id} />
              <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Indietro
              </Button>
            </div>
          }
        />
      )}

      <div className={isApp ? 'flex flex-col gap-4' : 'grid gap-4 lg:grid-cols-4'}>
        <Card className={isApp ? undefined : 'lg:col-span-1'}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Questa assegnazione</CardTitle>
            <CardDescription className="text-xs">
              Nome e contenuto valgono solo per questo atleta.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="assigned-title" className="text-xs">
                Nome scheda
              </Label>
              <Input
                id="assigned-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  const next = title.trim();
                  if (next && next !== workout.title) {
                    saveMetaMutation.mutate({ title: next });
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assigned-desc" className="text-xs">
                Note
              </Label>
              <Textarea
                id="assigned-desc"
                value={description}
                rows={3}
                className="resize-none"
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  const next = description.trim() || null;
                  if (next !== (workout.description ?? null)) {
                    saveMetaMutation.mutate({ description: next });
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipologia</Label>
              <Select
                value={kind}
                onValueChange={(v) => saveMetaMutation.mutate({ templateKind: v as TemplateKind })}
                disabled={saveMetaMutation.isPending}
              >
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="libera">{TEMPLATE_KIND_LABEL.libera}</SelectItem>
                  <SelectItem value="propedeutica">{TEMPLATE_KIND_LABEL.propedeutica}</SelectItem>
                  <SelectItem value="progressiva">{TEMPLATE_KIND_LABEL.progressiva}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {TEMPLATE_KIND_DESCRIPTION[kind]}
              </p>
            </div>
            {workout.template_id && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate(routes.template(workout.template_id!))}
              >
                Apri scheda originale
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={isApp ? undefined : 'lg:col-span-3'}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Esercizi e protocolli</CardTitle>
            <CardDescription className="text-xs">
              Modifiche solo su questa copia assegnata, come una duplica.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <TemplateExerciseBuilder workoutId={workout.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (isApp) {
    return (
      <PTAppPageShell
        title={title.trim() || workout.title}
        description={`Assegnata a ${athleteName ?? 'atleta'}`}
        showBack
        backTo={backTo}
        flush
        actions={
          <ExportSheetPdfButton
            mode="workout"
            workoutId={workout.id}
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

export default PTAssignedWorkoutPage;
