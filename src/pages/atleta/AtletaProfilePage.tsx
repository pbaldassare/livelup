import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import { terminateConnection } from '@/lib/api/connections';
import { toast } from 'sonner';
import { 
  LogOut, 
  ChevronRight,
  Bell,
  Settings,
  HelpCircle,
  Edit,
  Unlink,
  List,
  Award,
  Heart,
  Star,
  Download,
  Mail,
  Phone,
  MapPin,
  Save
} from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { ProfileHeader } from '@/components/app/ProfileHeader';
import { ProfileStats } from '@/components/app/ProfileStats';
import { BadgeCard } from '@/components/app/BadgeCard';
import { ActivityHistory } from '@/components/app/ActivityHistory';
import { AtletaReviewsHistory } from '@/components/reviews/AtletaReviewsHistory';
import { ProfilePageSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA PROFILE PAGE - Design reference: Ladder_iOS_117/118
// =====================================================

export function AtletaProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { status, connection, ptName, refetch } = useAtletaStatus();
  const queryClient = useQueryClient();
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [activeTab, setActiveTab] = useState('badges');
  const { isInstalled, isInstallable, isIOS } = useInstallPrompt();
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const showInstallOption = !isInstalled && (isInstallable || isIOS);

  // Fetch profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch atleta profile
  const { data: atletaProfile } = useQuery({
    queryKey: ['atleta-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('atleta_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch workout stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['atleta-workout-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { workouts: 0, minutes: 0, calories: 0, cheers: 0 };
      
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, completed_at')
        .eq('atleta_user_id', user.id)
        .eq('status', 'completato');

      return {
        workouts: workouts?.length || 0,
        minutes: (workouts?.length || 0) * 35, // Estimated
        calories: (workouts?.length || 0) * 180, // Estimated
        cheers: 0,
      };
    },
    enabled: !!user?.id,
  });

  // Loading state
  const isLoading = isLoadingProfile || isLoadingStats;

  // Fetch badges
  const { data: badges } = useQuery({
    queryKey: ['atleta-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('atleta_badges')
        .select('*, badges(*)')
        .eq('atleta_user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Terminate connection mutation
  const terminateMutation = useMutation({
    mutationFn: async () => {
      if (!connection?.id) throw new Error('Nessuna connessione attiva');
      return terminateConnection(connection.id);
    },
    onSuccess: () => {
      toast.success('Connessione terminata');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['atleta-connection'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSendMessage = () => {
    if (connection?.pt_user_id) {
      navigate(`/app/chat/${connection.pt_user_id}`);
    }
  };

  const handleOpenEditSheet = () => {
    setEditForm({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
    });
    setShowEditSheet(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profilo aggiornato!');
      setShowEditSheet(false);
    } catch (error: any) {
      toast.error(error.message || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Atleta';
  const initials = profile 
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}` 
    : user?.email?.[0]?.toUpperCase() || 'U';

  const profileStats = [
    { value: stats?.workouts || 0, label: 'Workouts', color: 'blue' as const, progress: 75 },
    { value: stats?.minutes ? `${(stats.minutes / 1000).toFixed(1)}K` : '0', label: 'Minutes', color: 'blue' as const, progress: 60 },
    { value: stats?.calories ? `${(stats.calories / 1000).toFixed(1)}K` : '0', label: 'Calories', color: 'orange' as const, progress: 80 },
    { value: stats?.cheers || 0, label: 'Cheers', color: 'pink' as const, progress: 0 },
  ];

  const menuItems = [
    ...(showInstallOption ? [{ icon: Download, label: 'Installa App', href: '/install' }] : []),
    { icon: Bell, label: 'Notifiche', href: '/app/notifications' },
    { icon: Settings, label: 'Impostazioni', href: '/app/settings' },
    { icon: HelpCircle, label: 'Aiuto', href: '/app/help' },
  ];

  // Calculate streak (mock for now)
  const streakCount = stats?.workouts ? Math.min(stats.workouts, 30) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-background pb-20">
        <ProfilePageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-background pb-20">
      {/* Profile Header */}
      <ProfileHeader
        name={fullName}
        initials={initials}
        avatarUrl={profile?.avatar_url}
        coverUrl={profile?.cover_url}
        streakCount={streakCount}
        subtitle={status === 'collegato' ? ptName || 'Elevate' : undefined}
        onSendMessage={status === 'collegato' ? handleSendMessage : undefined}
        editable={true}
        editableCover={true}
      />

      {/* Stats */}
      <ProfileStats stats={profileStats} className="border-b border-app-border" />

      {/* Personal Data Section */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider">
            I tuoi dati
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenEditSheet}
            className="text-app-accent hover:text-app-accent hover:bg-app-accent/10 -mr-2"
          >
            <Edit className="h-4 w-4 mr-1" />
            Modifica
          </Button>
        </div>
        
        <div className="bg-app-card rounded-xl overflow-hidden divide-y divide-app-border">
          <div className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-app-muted-foreground" />
            <div>
              <p className="text-xs text-app-muted-foreground">Email</p>
              <p className="text-app-foreground">{profile?.email || user?.email || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Phone className="h-5 w-5 text-app-muted-foreground" />
            <div>
              <p className="text-xs text-app-muted-foreground">Telefono</p>
              <p className="text-app-foreground">{profile?.phone || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
        <TabsList className="w-full bg-transparent border-b border-app-border rounded-none p-0 h-auto">
          <TabsTrigger 
            value="activity" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3"
          >
            <List className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="badges" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3"
          >
            <Award className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="favorites" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3"
          >
            <Heart className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="reviews" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3"
          >
            <Star className="h-5 w-5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-0 p-4">
          <h2 className="text-xl font-bold text-app-foreground mb-6">Your Badges</h2>
          
          {/* Main badge with progress */}
          <BadgeCard
            name="Total Workouts"
            value={stats?.workouts || 0}
            variant="large"
            progress={{ current: stats?.workouts || 0, max: 50 }}
            className="mb-8"
          />

          {/* Milestones grid */}
          <h3 className="text-lg font-bold text-app-foreground mb-4">Workout Milestones</h3>
          <div className="grid grid-cols-3 gap-4">
            <BadgeCard name="Workout Minutes" value={`${stats?.minutes || 0}`} />
            <BadgeCard name="Weekly Streaks" value={Math.floor((stats?.workouts || 0) / 7)} />
            <BadgeCard name="Calories Burned" value={`${stats?.calories || 0}`} />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 p-4">
          <h2 className="text-xl font-bold text-app-foreground mb-4">Attività recente</h2>
          <ActivityHistory />
        </TabsContent>

        <TabsContent value="favorites" className="mt-0 p-4">
          <h2 className="text-xl font-bold text-app-foreground mb-4">Preferiti</h2>
          <div className="text-center py-12 text-app-muted-foreground">
            Nessun workout nei preferiti
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-0 p-4">
          <AtletaReviewsHistory />
        </TabsContent>
      </Tabs>

      {/* Settings menu */}
      <div className="px-4 mt-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.href)}
            className="w-full flex items-center justify-between p-4 bg-app-muted rounded-xl hover:bg-app-muted/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-app-muted-foreground" />
              <span className="font-medium text-app-foreground">{item.label}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-app-muted-foreground" />
          </button>
        ))}

        {/* Terminate connection */}
        {status === 'collegato' && connection && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 bg-app-muted rounded-xl hover:bg-app-muted/80 transition-colors">
                <div className="flex items-center gap-3">
                  <Unlink className="h-5 w-5 text-red-400" />
                  <span className="font-medium text-red-400">Termina connessione PT</span>
                </div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-app-card border-app-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-app-foreground">Terminare la connessione?</AlertDialogTitle>
                <AlertDialogDescription className="text-app-muted-foreground">
                  Perderai accesso alle schede di allenamento e alla chat con {ptName}. 
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-app-muted text-app-foreground border-app-border">Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => terminateMutation.mutate()}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Termina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Logout */}
      <div className="px-4 mt-6 mb-8">
        <Button 
          variant="outline" 
          className="w-full bg-transparent border-app-border text-red-400 hover:bg-red-500/10 hover:text-red-400"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Esci
        </Button>
      </div>

      {/* Edit profile sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] bg-app-background border-app-border">
          <SheetHeader>
            <SheetTitle className="text-app-foreground">Modifica dati</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" className="text-app-foreground">Nome</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                  className="mt-1 bg-app-muted border-app-border text-app-foreground"
                />
              </div>
              <div>
                <Label htmlFor="last_name" className="text-app-foreground">Cognome</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                  className="mt-1 bg-app-muted border-app-border text-app-foreground"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email" className="text-app-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                disabled
                className="mt-1 bg-app-muted/50 border-app-border text-app-muted-foreground"
              />
              <p className="text-xs text-app-muted-foreground mt-1">L'email non può essere modificata</p>
            </div>
            
            <div>
              <Label htmlFor="phone" className="text-app-foreground">Telefono</Label>
              <Input
                id="phone"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+39 333 1234567"
                className="mt-1 bg-app-muted border-app-border text-app-foreground"
              />
            </div>
            
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default AtletaProfilePage;
