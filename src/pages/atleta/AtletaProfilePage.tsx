import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  Shield,
  HelpCircle,
  Edit,
  Unlink,
  List,
  Award,
  Heart,
  FileText
} from 'lucide-react';
import { ProfileHeader } from '@/components/app/ProfileHeader';
import { ProfileStats } from '@/components/app/ProfileStats';
import { BadgeCard } from '@/components/app/BadgeCard';
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

  // Fetch profile
  const { data: profile } = useQuery({
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
  const { data: stats } = useQuery({
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
    { icon: Bell, label: 'Notifiche', href: '/app/notifications' },
    { icon: Shield, label: 'Privacy', href: '/app/privacy' },
    { icon: HelpCircle, label: 'Aiuto', href: '/app/help' },
  ];

  // Calculate streak (mock for now)
  const streakCount = stats?.workouts ? Math.min(stats.workouts, 30) : 0;

  return (
    <div className="min-h-screen bg-app-background pb-20">
      {/* Profile Header */}
      <ProfileHeader
        name={fullName}
        initials={initials}
        avatarUrl={profile?.avatar_url}
        coverUrl={null}
        streakCount={streakCount}
        subtitle={status === 'collegato' ? ptName || 'Elevate' : undefined}
        onSendMessage={status === 'collegato' ? handleSendMessage : undefined}
      />

      {/* Stats */}
      <ProfileStats stats={profileStats} className="border-b border-app-border" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            value="journal" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground py-3"
          >
            <FileText className="h-5 w-5" />
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
          <div className="text-center py-12 text-app-muted-foreground">
            Nessuna attività recente
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="mt-0 p-4">
          <h2 className="text-xl font-bold text-app-foreground mb-4">Preferiti</h2>
          <div className="text-center py-12 text-app-muted-foreground">
            Nessun workout nei preferiti
          </div>
        </TabsContent>

        <TabsContent value="journal" className="mt-0 p-4">
          <h2 className="text-xl font-bold text-app-foreground mb-4">Diario</h2>
          <div className="text-center py-12 text-app-muted-foreground">
            Inizia a scrivere il tuo diario
          </div>
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
        <SheetContent side="bottom" className="h-[60vh] bg-app-background border-app-border">
          <SheetHeader>
            <SheetTitle className="text-app-foreground">Modifica profilo</SheetTitle>
          </SheetHeader>
          <div className="py-4 text-center text-app-muted-foreground">
            Funzionalità in arrivo
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default AtletaProfilePage;
