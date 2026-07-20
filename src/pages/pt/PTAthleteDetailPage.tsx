import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { PageLoader } from '@/components/common/PageLoader';
import { AssignWorkoutDialog } from '@/components/pt/AssignWorkoutDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PTAthleteWorkoutRunner } from '@/components/pt/PTAthleteWorkoutRunner';
import { AnagraficaEditor } from '@/components/pt/athlete-detail/AnagraficaEditor';
import { AthletePtActiveToggle } from '@/components/pt/AthletePtActiveToggle';
import { AthleteTrainingModalitySelect } from '@/components/pt/AthleteTrainingModalitySelect';
import { TrainingModalityBadge } from '@/components/pt/TrainingModalityBadge';
import { PTNotesTab } from '@/components/pt/athlete-detail/PTNotesTab';
import { DocumentsTab } from '@/components/pt/athlete-detail/DocumentsTab';
import { ProgressTab } from '@/components/pt/athlete-detail/ProgressTab';
import { ProgrammiTab } from '@/components/pt/athlete-detail/ProgrammiTab';
import { BadgesTab } from '@/components/pt/athlete-detail/BadgesTab';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import {
  User,
  ArrowLeft,
  MessageSquare,
  Target,
  Activity,
  TrendingUp,
  Award,
  IdCard,
  StickyNote,
  FileText,
} from 'lucide-react';
import { usePTRoutes } from '@/hooks/usePTRoutes';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

// =====================================================
// PT ATHLETE DETAIL PAGE
// Dettaglio atleta per PT
// =====================================================

export function PTAthleteDetailPage() {
  const { atletaId } = useParams<{ atletaId: string }>();
  const navigate = useNavigate();
  const { isApp, routes } = usePTRoutes();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState<string | undefined>();
  const [runningWorkoutId, setRunningWorkoutId] = useState<string | null>(null);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(
    tabParam === 'history' || tabParam === 'train' ? 'overview' : tabParam || 'overview',
  );

  // Auto-open assign dialog when ?assign=1 is in URL
  useEffect(() => {
    if (searchParams.get('assign') === '1') {
      setAssignDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('assign');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Legacy tabs merged into Programmi — redirect ?tab=history or ?tab=train
  useEffect(() => {
    const legacyTab = searchParams.get('tab');
    if (legacyTab === 'history' || legacyTab === 'train') {
      setActiveTab('overview');
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'overview') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  // Fetch athlete data
  // NOTE: keepPreviousData + non-throwing connection lookup evita che riapertura
  // del dialog (anteprima/documento) causi un flicker o un finto "non trovato"
  // che il guard interpreterebbe come motivo per tornare a /pt.
  const { data: athlete, isLoading } = useQuery({
    queryKey: ['pt-athlete-detail', atletaId, user?.id],
    queryFn: async () => {
      if (!atletaId || !user?.id) return null;

      // Get connection (no throw: una connessione mancante è uno stato valido)
      const { data: connection, error: connError } = await supabase
        .from('pt_atleta_connections')
        .select('*')
        .eq('atleta_user_id', atletaId)
        .eq('pt_user_id', user.id)
        .maybeSingle();

      if (connError) {
        console.warn('[PTAthleteDetail] connection lookup failed', connError.message);
      }

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', atletaId)
        .maybeSingle();

      // Get atleta profile
      const { data: atletaProfile } = await supabase
        .from('atleta_profiles')
        .select('*')
        .eq('user_id', atletaId)
        .maybeSingle();

      return {
        connection: connection ?? null,
        profile: profile ?? null,
        atletaProfile: atletaProfile ?? null,
      };
    },
    enabled: !!atletaId && !!user?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  if (isLoading) {
    return <PageLoader text="Caricamento atleta..." />;
  }

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Atleta non trovato</p>
        <Button variant="link" onClick={() => navigate(routes.athletes)}>
          Torna alla lista atleti
        </Button>
      </div>
    );
  }

  const { connection, profile, atletaProfile } = athlete;
  const isPtActive = (connection as { is_pt_active?: boolean } | null)?.is_pt_active !== false;
  const trainingModality = (connection as { training_modality?: string | null } | null)
    ?.training_modality;
  const ptManagedStatus =
    connection?.status === 'active'
      ? isPtActive
        ? 'active'
        : 'inactive'
      : connection?.status;
  const fullName = getAthleteDisplayName(profile?.first_name, profile?.last_name, profile?.email);
  const initials = getAthleteInitials(profile?.first_name, profile?.last_name, profile?.email);

  const pageBody = (
    <div className="space-y-6 animate-in">
      {!isApp && (
      <DashboardPageHeader
        title={fullName}
        subtitle="Dettaglio atleta e storico allenamenti"
        icon={<User className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Dashboard', href: routes.home },
          { label: 'Atleti', href: routes.athletes },
          { label: fullName },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(routes.athletes)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
        }
      />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto ring-4 ring-role-atleta/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-role-atleta/10 text-role-atleta text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">{fullName}</CardTitle>
            <CardDescription>{profile?.email}</CardDescription>
            <div className="flex justify-center flex-wrap gap-2 mt-2">
              {ptManagedStatus && (
                <DashboardStatusBadge
                  status={ptManagedStatus}
                  label={connection?.status === 'active' ? (isPtActive ? 'Attivo' : 'Disattivo') : undefined}
                />
              )}
              {atletaProfile?.level && (
                <Badge variant="outline" className="capitalize">
                  {atletaProfile.level}
                </Badge>
              )}
              {connection?.status === 'active' && (
                <TrainingModalityBadge modality={trainingModality} />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isApp && connection?.status === 'active' && connection.id && atletaId && (
              <AthletePtActiveToggle
                connectionId={connection.id}
                atletaUserId={atletaId}
                isPtActive={isPtActive}
                ptUserId={user?.id}
              />
            )}
            {connection?.status === 'active' && connection.id && atletaId && (
              <AthleteTrainingModalitySelect
                connectionId={connection.id}
                atletaUserId={atletaId}
                modality={trainingModality}
                ptUserId={user?.id}
              />
            )}

            {/* Quick Actions */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => atletaId && navigate(routes.chat(atletaId))}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>

            <Separator />

            {/* Athlete Info */}
            <div className="space-y-3">
              {profile?.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Telefono</span>
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
            </div>

            {/* Goals */}
            {atletaProfile?.goals && atletaProfile.goals.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    Obiettivi
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {atletaProfile.goals.map((goal, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
              <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1.5" /> Programmi</TabsTrigger>
              <TabsTrigger value="anagrafica"><IdCard className="h-4 w-4 mr-1.5" /> Anagrafica</TabsTrigger>
              <TabsTrigger value="progress"><TrendingUp className="h-4 w-4 mr-1.5" /> Progressi</TabsTrigger>
              <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-1.5" /> Note PT</TabsTrigger>
              <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1.5" /> Documenti</TabsTrigger>
              <TabsTrigger value="badges"><Award className="h-4 w-4 mr-1.5" /> Badge</TabsTrigger>
            </TabsList>

            <TabsContent value="anagrafica" className="mt-4">
              {atletaId && (
                <AnagraficaEditor
                  atletaUserId={atletaId}
                  profile={profile}
                  atletaProfile={atletaProfile}
                  connectionAcceptedAt={connection?.accepted_at ?? null}
                />
              )}
            </TabsContent>

            <TabsContent value="progress" className="mt-4">
              {atletaId && user?.id && (
                <ProgressTab atletaUserId={atletaId} ptUserId={user.id} />
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              {atletaId && <PTNotesTab atletaUserId={atletaId} />}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              {atletaId && <DocumentsTab atletaUserId={atletaId} />}
            </TabsContent>

            <TabsContent value='overview' className='mt-4'>
              {atletaId && user?.id && (
                <ProgrammiTab
                  atletaUserId={atletaId}
                  ptUserId={user.id}
                  onStartWorkout={setRunningWorkoutId}
                  onAssignWorkout={(templateId) => {
                    setAssignTemplateId(templateId);
                    setAssignDialogOpen(true);
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="badges" className="mt-4">
              {atletaId && <BadgesTab atletaUserId={atletaId} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Assign Workout Dialog */}
      <AssignWorkoutDialog
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) setAssignTemplateId(undefined);
        }}
        preselectedAthleteId={atletaId}
        preselectedTemplateId={assignTemplateId}
      />

      <Dialog open={!!runningWorkoutId} onOpenChange={(o) => !o && setRunningWorkoutId(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Sessione guidata</DialogTitle>
          </DialogHeader>
          {runningWorkoutId && atletaId && (
            <PTAthleteWorkoutRunner
              workoutId={runningWorkoutId}
              atletaUserId={atletaId}
              atletaName={fullName}
              onClose={() => setRunningWorkoutId(null)}
              onCompleted={() => {
                queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts', atletaId] });
                queryClient.invalidateQueries({ queryKey: ['workout-history', atletaId] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isApp) {
    return (
      <PTAppPageShell
        title={fullName}
        description="Dettaglio atleta"
        showBack
        backTo={routes.athletes}
      >
        {pageBody}
      </PTAppPageShell>
    );
  }

  return pageBody;
}

export default PTAthleteDetailPage;
