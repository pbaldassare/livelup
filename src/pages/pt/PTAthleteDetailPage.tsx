import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { PageLoader } from '@/components/common/PageLoader';
import { AssignWorkoutDialog } from '@/components/pt/AssignWorkoutDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PTAthleteHistoryTab } from '@/components/pt/PTAthleteHistoryTab';
import { PTAthleteTrainNowTab } from '@/components/pt/PTAthleteTrainNowTab';
import { AnagraficaEditor } from '@/components/pt/athlete-detail/AnagraficaEditor';
import { PTNotesTab } from '@/components/pt/athlete-detail/PTNotesTab';
import { DocumentsTab } from '@/components/pt/athlete-detail/DocumentsTab';
import { ProgressTab } from '@/components/pt/athlete-detail/ProgressTab';
import { getAthleteDisplayName, getAthleteInitials } from '@/lib/athleteName';
import {
  User,
  ArrowLeft,
  MessageSquare,
  Dumbbell,
  CalendarPlus,
  Target,
  Activity,
  TrendingUp,
  Clock,
  Award,
  History,
  Play,
  IdCard,
  StickyNote,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

// =====================================================
// PT ATHLETE DETAIL PAGE
// Dettaglio atleta per PT
// =====================================================

export function PTAthleteDetailPage() {
  const { atletaId } = useParams<{ atletaId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'overview');

  // Auto-open assign dialog when ?assign=1 is in URL
  useEffect(() => {
    if (searchParams.get('assign') === '1') {
      setAssignDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('assign');
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
  const { data: athlete, isLoading } = useQuery({
    queryKey: ['pt-athlete-detail', atletaId],
    queryFn: async () => {
      if (!atletaId) return null;

      // Get connection
      const { data: connection, error: connError } = await supabase
        .from('pt_atleta_connections')
        .select('*')
        .eq('atleta_user_id', atletaId)
        .eq('pt_user_id', user?.id)
        .maybeSingle();

      if (connError) throw connError;
      if (!connection) throw new Error('Connessione non trovata');

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', atletaId)
        .single();

      // Get atleta profile
      const { data: atletaProfile } = await supabase
        .from('atleta_profiles')
        .select('*')
        .eq('user_id', atletaId)
        .single();

      return {
        connection,
        profile,
        atletaProfile,
      };
    },
    enabled: !!atletaId && !!user?.id,
  });

  // Fetch workouts assigned to this athlete
  const { data: workouts = [] } = useQuery({
    queryKey: ['pt-athlete-workouts', atletaId, user?.id],
    queryFn: async () => {
      if (!atletaId || !user?.id) return [];

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('atleta_user_id', atletaId)
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!atletaId && !!user?.id,
  });

  // Fetch progress data
  const { data: progressData = [] } = useQuery({
    queryKey: ['pt-athlete-progress', atletaId],
    queryFn: async () => {
      if (!atletaId) return [];

      const { data, error } = await supabase
        .from('progress_tracking')
        .select('*')
        .eq('atleta_user_id', atletaId)
        .order('tracked_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!atletaId,
  });

  // Fetch available badges
  const { data: badges = [] } = useQuery({
    queryKey: ['all-badges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('badges').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch athlete's earned badges
  const { data: earnedBadges = [] } = useQuery({
    queryKey: ['athlete-badges', atletaId],
    queryFn: async () => {
      if (!atletaId) return [];
      const { data, error } = await supabase.from('atleta_badges').select('badge_id').eq('atleta_user_id', atletaId);
      if (error) throw error;
      return data.map(b => b.badge_id);
    },
    enabled: !!atletaId,
  });

  const assignBadgeMutation = useMutation({
    mutationFn: async () => {
      if (!atletaId || !selectedBadgeId) throw new Error('Missing data');
      const { error } = await supabase.from('atleta_badges').insert({ atleta_user_id: atletaId, badge_id: selectedBadgeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athlete-badges', atletaId] });
      toast.success('Badge assegnato!');
      setSelectedBadgeId('');
    },
    onError: () => toast.error('Errore nell\'assegnazione del badge'),
  });

  const unassignedBadges = badges.filter(b => !earnedBadges.includes(b.id));

  if (isLoading) {
    return <PageLoader text="Caricamento atleta..." />;
  }

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Atleta non trovato</p>
        <Button variant="link" onClick={() => navigate('/pt/athletes')}>
          Torna alla lista atleti
        </Button>
      </div>
    );
  }

  const { connection, profile, atletaProfile } = athlete;
  const fullName = getAthleteDisplayName(profile?.first_name, profile?.last_name, profile?.email);
  const initials = getAthleteInitials(profile?.first_name, profile?.last_name, profile?.email);
  const activeWorkouts = workouts.filter(w => w.status === 'attivo').length;
  const completedWorkouts = workouts.filter(w => w.status === 'completato').length;

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title={fullName}
        subtitle="Dettaglio atleta e storico allenamenti"
        icon={<User className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/pt' },
          { label: 'Atleti', href: '/pt/athletes' },
          { label: fullName },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate('/pt/athletes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
        }
      />

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
            <div className="flex justify-center mt-2">
              <DashboardStatusBadge status={connection.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button className="w-full" onClick={() => setAssignDialogOpen(true)}>
                <Dumbbell className="h-4 w-4 mr-2" />
                Assegna
              </Button>
            </div>

            <Separator />

            {/* Athlete Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Livello</span>
                <Badge variant="outline" className="capitalize">
                  {atletaProfile?.level || 'N/A'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Connesso da</span>
                <span className="text-sm">
                  {connection.accepted_at 
                    ? format(new Date(connection.accepted_at), 'dd MMM yyyy', { locale: it })
                    : 'N/A'
                  }
                </span>
              </div>
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

        {/* Stats and Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Activity className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeWorkouts}</p>
                    <p className="text-sm text-muted-foreground">Attivi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedWorkouts}</p>
                    <p className="text-sm text-muted-foreground">Completati</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Dumbbell className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{workouts.length}</p>
                    <p className="text-sm text-muted-foreground">Totali</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
              <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1.5" /> Panoramica</TabsTrigger>
              <TabsTrigger value="anagrafica"><IdCard className="h-4 w-4 mr-1.5" /> Anagrafica</TabsTrigger>
              <TabsTrigger value="progress"><TrendingUp className="h-4 w-4 mr-1.5" /> Progressi</TabsTrigger>
              <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" /> Storico</TabsTrigger>
              <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-1.5" /> Note PT</TabsTrigger>
              <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1.5" /> Documenti</TabsTrigger>
              <TabsTrigger value="train"><Play className="h-4 w-4 mr-1.5" /> Allena ora</TabsTrigger>
              <TabsTrigger value="badges"><Award className="h-4 w-4 mr-1.5" /> Badge</TabsTrigger>
            </TabsList>

            <TabsContent value="anagrafica" className="mt-4">
              {atletaId && (
                <AnagraficaEditor
                  atletaUserId={atletaId}
                  profile={profile}
                  atletaProfile={atletaProfile}
                />
              )}
            </TabsContent>

            <TabsContent value="progress" className="mt-4">
              {atletaId && <ProgressTab atletaUserId={atletaId} />}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              {atletaId && <PTNotesTab atletaUserId={atletaId} />}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              {atletaId && <DocumentsTab atletaUserId={atletaId} />}
            </TabsContent>

            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* Recent Workouts */}
              <SectionCard
                title="Allenamenti Recenti"
                subtitle="Ultimi 10 allenamenti assegnati"
                icon={Dumbbell}
                iconColor="primary"
              >
                {workouts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nessun allenamento assegnato</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setAssignDialogOpen(true)}
                    >
                      Assegna il primo allenamento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Dumbbell className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{workout.title}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(workout.created_at), 'dd MMM yyyy', { locale: it })}
                            </p>
                          </div>
                        </div>
                        <DashboardStatusBadge status={workout.status} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {progressData.length > 0 && (
                <SectionCard
                  title="Progressi Recenti"
                  subtitle="Ultimi aggiornamenti"
                  icon={TrendingUp}
                  iconColor="green"
                >
                  <div className="space-y-3">
                    {progressData.map((progress) => (
                      <div
                        key={progress.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(progress.tracked_date), 'dd MMM yyyy', { locale: it })}
                          </p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {progress.weight_kg && <span>Peso: {progress.weight_kg} kg</span>}
                            {progress.energy_level && (
                              <span>Energia: {progress.energy_level}/10</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {atletaId && user?.id && (
                <PTAthleteHistoryTab atletaUserId={atletaId} ptUserId={user.id} />
              )}
            </TabsContent>

            <TabsContent value="train" className="mt-4">
              {atletaId && user?.id && (
                <PTAthleteTrainNowTab
                  atletaUserId={atletaId}
                  ptUserId={user.id}
                  atletaName={fullName}
                />
              )}
            </TabsContent>

            <TabsContent value="badges" className="mt-4">
              <SectionCard
                title="Assegna Badge"
                subtitle="Premia i risultati del tuo atleta"
                icon={Award}
                iconColor="yellow"
              >
                {unassignedBadges.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Tutti i badge sono già stati assegnati! 🎉
                  </p>
                ) : (
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona badge..." />
                        </SelectTrigger>
                        <SelectContent>
                          {unassignedBadges.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} - {b.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => assignBadgeMutation.mutate()}
                      disabled={!selectedBadgeId || assignBadgeMutation.isPending}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Assegna
                    </Button>
                  </div>
                )}
                {earnedBadges.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Badge guadagnati ({earnedBadges.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {badges
                        .filter((b) => earnedBadges.includes(b.id))
                        .map((b) => (
                          <Badge key={b.id} variant="secondary">
                            {b.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Assign Workout Dialog */}
      <AssignWorkoutDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        preselectedAthleteId={atletaId}
      />
    </div>
  );
}

export default PTAthleteDetailPage;
