import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  User, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  Target, 
  Activity,
  Link2,
  Dumbbell,
  AlertTriangle,
  Trash2,
  Loader2,
  Check,
  X,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export function AdminAthleteDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Edit states
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch athlete details
  const { data: athlete, isLoading } = useQuery({
    queryKey: ['admin-athlete-detail', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      // Get atleta profile
      const { data: atletaProfile, error: atletaError } = await supabase
        .from('atleta_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (atletaError) throw atletaError;

      // Get base profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // Get connections
      const { data: connections, error: connError } = await supabase
        .from('pt_atleta_connections')
        .select('*, pt_profiles:pt_user_id(user_id)')
        .eq('atleta_user_id', userId)
        .order('created_at', { ascending: false });

      // Get PT profiles for connections
      const ptUserIds = connections?.map(c => c.pt_user_id) || [];
      const { data: ptProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', ptUserIds);

      const ptProfilesMap = new Map(ptProfiles?.map(p => [p.user_id, p]) || []);

      // Get workouts count
      const { count: workoutsCount } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('atleta_user_id', userId);

      const { count: completedWorkouts } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('atleta_user_id', userId)
        .eq('status', 'completato');

      return {
        ...atletaProfile,
        profile,
        connections: connections?.map(c => ({
          ...c,
          ptProfile: ptProfilesMap.get(c.pt_user_id)
        })) || [],
        workoutsCount: workoutsCount || 0,
        completedWorkouts: completedWorkouts || 0
      };
    },
    enabled: !!userId
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: 'non_collegato' | 'collegato' | 'premium') => {
      const { error } = await supabase
        .from('atleta_profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-athlete-detail', userId] });
      toast.success('Stato aggiornato');
    },
    onError: (error) => toast.error('Errore: ' + error.message)
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-athlete-detail', userId] });
      toast.success('Profilo aggiornato');
      setEditingEmail(false);
      setEditingPhone(false);
    },
    onError: (error) => toast.error('Errore: ' + error.message)
  });

  // Delete mutation
  const deleteAtletaMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Non autenticato');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId, role: 'atleta' }
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Atleta eliminato con successo');
      navigate('/admin/athletes');
    },
    onError: (error) => toast.error('Errore: ' + error.message)
  });

  const handleSaveEmail = () => {
    if (!emailValue.trim()) {
      toast.error('Email non valida');
      return;
    }
    updateProfileMutation.mutate({ field: 'email', value: emailValue.trim() });
  };

  const handleSavePhone = () => {
    updateProfileMutation.mutate({ field: 'phone', value: phoneValue.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Atleta non trovato</h2>
        <Button variant="ghost" onClick={() => navigate('/admin/athletes')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    );
  }

  const activeConnection = athlete.connections.find((c: { status: string }) => c.status === 'active');

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title={`${athlete.profile?.first_name || ''} ${athlete.profile?.last_name || ''}`}
        subtitle="Dettaglio profilo atleta"
        icon={<User className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Atleti', href: '/admin/athletes' },
          { label: athlete.profile?.first_name || 'Dettaglio' }
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/athletes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center pb-2">
            <Avatar className="h-24 w-24 mx-auto ring-4 ring-role-atleta/20">
              <AvatarImage src={athlete.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-role-atleta/10 text-role-atleta text-2xl">
                {athlete.profile?.first_name?.[0] || 'A'}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">
              {athlete.profile?.first_name} {athlete.profile?.last_name}
            </CardTitle>
            <div className="mt-2">
              <DashboardStatusBadge status={athlete.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            
            <div className="space-y-3 text-sm">
              {/* Editable Email */}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {editingEmail ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={handleSaveEmail}
                      disabled={updateProfileMutation.isPending}
                    >
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => setEditingEmail(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 group cursor-pointer" 
                    onClick={() => {
                      setEmailValue(athlete.profile?.email || '');
                      setEditingEmail(true);
                    }}
                  >
                    <span className="flex-1">{athlete.profile?.email || 'N/A'}</span>
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              
              {/* Editable Phone */}
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {editingPhone ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="tel"
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="+39 xxx xxx xxxx"
                      autoFocus
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={handleSavePhone}
                      disabled={updateProfileMutation.isPending}
                    >
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => setEditingPhone(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 group cursor-pointer" 
                    onClick={() => {
                      setPhoneValue(athlete.profile?.phone || '');
                      setEditingPhone(true);
                    }}
                  >
                    <span className="flex-1">{athlete.profile?.phone || 'N/A'}</span>
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              
              {/* Non-editable registration date */}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Registrato il {format(new Date(athlete.created_at), 'dd MMM yyyy', { locale: it })}
                </span>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{athlete.workoutsCount}</p>
                <p className="text-xs text-muted-foreground">Allenamenti totali</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{athlete.completedWorkouts}</p>
                <p className="text-xs text-muted-foreground">Completati</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Fitness Info */}
          <SectionCard title="Informazioni Fitness" icon={Activity} iconColor="primary">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Livello</label>
                <p className="mt-1 capitalize">{athlete.fitness_level || 'Non specificato'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Altezza</label>
                <p className="mt-1">{athlete.height_cm ? `${athlete.height_cm} cm` : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Peso</label>
                <p className="mt-1">{athlete.weight_kg ? `${athlete.weight_kg} kg` : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data di nascita</label>
                <p className="mt-1">
                  {athlete.date_of_birth 
                    ? format(new Date(athlete.date_of_birth), 'dd/MM/yyyy')
                    : 'N/A'}
                </p>
              </div>
            </div>

            {athlete.goals && athlete.goals.length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Obiettivi
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {athlete.goals.map((goal: string, i: number) => (
                    <Badge key={i} variant="secondary">{goal}</Badge>
                  ))}
                </div>
              </div>
            )}

            {athlete.health_notes && (
              <div className="mt-4">
                <label className="text-sm font-medium text-muted-foreground">Note salute</label>
                <p className="mt-1 text-sm">{athlete.health_notes}</p>
              </div>
            )}
          </SectionCard>

          {/* Connection */}
          <SectionCard title="Connessione PT" icon={Link2} iconColor="green">
            {activeConnection ? (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-role-pt/10 text-role-pt">
                      {activeConnection.ptProfile?.first_name?.[0] || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {activeConnection.ptProfile?.first_name} {activeConnection.ptProfile?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activeConnection.ptProfile?.email}
                    </p>
                  </div>
                </div>
                <DashboardStatusBadge status="active" />
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nessun PT collegato
              </p>
            )}

            {athlete.connections.filter((c: { status: string }) => c.status !== 'active').length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Storico connessioni</p>
                <div className="space-y-2">
                  {athlete.connections
                    .filter((c: { status: string }) => c.status !== 'active')
                    .slice(0, 3)
                    .map((conn: { id: string; status: string; ptProfile?: { first_name?: string; last_name?: string }; created_at: string }) => (
                      <div key={conn.id} className="flex items-center justify-between text-sm">
                        <span>{conn.ptProfile?.first_name} {conn.ptProfile?.last_name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{conn.status}</Badge>
                          <span className="text-muted-foreground">
                            {format(new Date(conn.created_at), 'dd/MM/yy')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Recent Workouts */}
          <SectionCard title="Ultimi Allenamenti" icon={Dumbbell} iconColor="yellow">
            <RecentWorkouts userId={userId!} />
          </SectionCard>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Elimina Atleta</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Stai per eliminare definitivamente <strong>{athlete.profile?.first_name} {athlete.profile?.last_name}</strong>.
              </p>
              <p className="text-destructive font-medium">
                Questa azione è irreversibile.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAtletaMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteAtletaMutation.mutate()}
              disabled={deleteAtletaMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAtletaMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminazione...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Elimina</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RecentWorkouts({ userId }: { userId: string }) {
  const { data: workouts, isLoading } = useQuery({
    queryKey: ['athlete-recent-workouts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, status, scheduled_date, completed_at')
        .eq('atleta_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="h-20 animate-pulse bg-muted rounded" />;
  }

  if (!workouts || workouts.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nessun allenamento trovato</p>;
  }

  return (
    <div className="space-y-2">
      {workouts.map((workout) => (
        <div key={workout.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="font-medium">{workout.title}</p>
            <p className="text-xs text-muted-foreground">
              {workout.scheduled_date 
                ? format(new Date(workout.scheduled_date), 'dd MMM yyyy', { locale: it })
                : 'Non programmato'}
            </p>
          </div>
          <DashboardStatusBadge 
            status={workout.status === 'completato' ? 'active' : workout.status === 'attivo' ? 'pending' : 'expired'} 
          />
        </div>
      ))}
    </div>
  );
}

export default AdminAthleteDetailPage;
