import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { 
  LogOut, 
  ChevronRight,
  Bell,
  Settings,
  HelpCircle,
  Edit,
  List,
  Award,
  Heart,
  Star,
  Download,
  Mail,
  Phone,
  Save,
  Ticket,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { ProfileHeader } from '@/components/app/ProfileHeader';
import { ProfileStats } from '@/components/app/ProfileStats';
import { BadgeCard } from '@/components/app/BadgeCard';
import { AtletaSharedPTNotes } from '@/components/app/AtletaSharedPTNotes';
import { AtletaDocumentExpiryBanner } from '@/components/app/AtletaDocumentExpiryBanner';
import { ActivityHistory } from '@/components/app/ActivityHistory';
import { AtletaReviewsHistory } from '@/components/reviews/AtletaReviewsHistory';
import { ProfilePageSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';
import { ThemePreferencePicker } from '@/components/settings/ThemePreferencePicker';
import { Palette } from 'lucide-react';

// =====================================================
// ATLETA PROFILE PAGE - Design reference: Ladder_iOS_117/118
// =====================================================

export function AtletaProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { status, connection, ptName } = useAtletaStatus();
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

  // Fetch all active badges
  const { data: allBadges } = useQuery({
    queryKey: ['all-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch earned badges
  const { data: earnedBadges } = useQuery({
    queryKey: ['atleta-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('atleta_badges')
        .select('*')
        .eq('atleta_user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Merge badges with earned status
  const earnedBadgeIds = new Set(earnedBadges?.map(eb => eb.badge_id) || []);
  const earnedBadgeMap = new Map(earnedBadges?.map(eb => [eb.badge_id, eb.earned_at]) || []);
  
  const badgesByCategory = (allBadges || []).reduce((acc, badge) => {
    const cat = badge.category || 'Altro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      earnedAt: earnedBadgeMap.get(badge.id),
    });
    return acc;
  }, {} as Record<string, Array<typeof allBadges[number] & { earned: boolean; earnedAt?: string }>>);

  // Find next milestone badge (first unearned workout badge)
  const nextMilestone = (allBadges || [])
    .filter(b => !earnedBadgeIds.has(b.id) && (b.criteria as any)?.type === 'workouts_completed')
    .sort((a, b) => ((a.criteria as any)?.count || 0) - ((b.criteria as any)?.count || 0))[0];

  const categoryLabels: Record<string, string> = {
    'Allenamento': '💪 Allenamento',
    'Streak': '🔥 Streak',
    'Social': '🤝 Social',
  };

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
    { icon: GraduationCap, label: 'Corsi', href: '/app/courses' },
    { icon: Ticket, label: 'I miei Coupon', href: '/app/coupons' },
    { icon: FileText, label: 'Documenti & Scadenze', href: '/app/documenti' },
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
    <div className="min-h-screen bg-app-background pb-20" data-tour="profile-page">
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
          <h2 className="text-xl font-bold text-app-foreground mb-4">
            I tuoi Badge
            <span className="text-sm font-normal text-app-muted-foreground ml-2">
              {earnedBadges?.length || 0}/{allBadges?.length || 0}
            </span>
          </h2>
          
          {/* Next milestone */}
          {nextMilestone && (
            <BadgeCard
              name={nextMilestone.name}
              description={nextMilestone.description}
              emoji={nextMilestone.icon_url || undefined}
              earned={false}
              variant="large"
              progress={{ 
                current: stats?.workouts || 0, 
                max: (nextMilestone.criteria as any)?.count || 50 
              }}
              className="mb-6"
            />
          )}

          {/* Badges by category */}
          {Object.entries(badgesByCategory).map(([category, categoryBadges]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-app-foreground/70 uppercase tracking-wider mb-3">
                {categoryLabels[category] || category}
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {categoryBadges
                  .sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0))
                  .map((badge) => (
                    <BadgeCard
                      key={badge.id}
                      name={badge.name}
                      description={badge.description}
                      emoji={badge.icon_url || undefined}
                      earned={badge.earned}
                      earnedAt={badge.earnedAt}
                      points={badge.points}
                    />
                  ))}
              </div>
            </div>
          ))}

          {(!allBadges || allBadges.length === 0) && (
            <div className="text-center py-12 text-app-muted-foreground">
              Nessun badge disponibile
            </div>
          )}
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

      <AtletaDocumentExpiryBanner />
      <AtletaSharedPTNotes />

      {/* Theme */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider mb-3">
          Aspetto
        </h2>
        <div className="bg-app-card rounded-xl border border-app-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-app-muted-foreground" />
            <span className="font-medium text-app-foreground">Tema</span>
          </div>
          <ThemePreferencePicker compact />
        </div>
      </div>

      {/* I miei Professionisti — apri il profilo PT per gestire la connessione */}
      {status === 'collegato' && connection?.pt_user_id && (
        <div className="px-4 mt-6">
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider mb-3">
            I miei Professionisti
          </h2>
          <button
            onClick={() => navigate(`/app/pt/${connection.pt_user_id}`)}
            className="w-full flex items-center justify-between p-4 bg-app-muted rounded-xl hover:bg-app-muted/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-app-muted-foreground" />
              <span className="font-medium text-app-foreground">
                {ptName || 'Professionista'}
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-app-muted-foreground" />
          </button>
        </div>
      )}

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
      </div>

      {/* Logout */}
      <div className="px-4 mt-6 mb-8">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full bg-transparent border-app-border text-red-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-app-card border-app-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-app-foreground">Vuoi uscire?</AlertDialogTitle>
              <AlertDialogDescription className="text-app-muted-foreground">
                Dovrai effettuare di nuovo l&apos;accesso per usare l&apos;app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-app-muted text-app-foreground border-app-border">Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignOut}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Esci
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
