import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PTGalleryUpload } from '@/components/pt/PTGalleryUpload';
import { PTReviewsManager } from '@/components/pt/PTReviewsManager';
import { PushNotificationToggle } from '@/components/settings/PushNotificationToggle';
import { 
  User, 
  LogOut, 
  ChevronRight,
  Star,
  Users,
  Eye,
  EyeOff,
  Settings,
  Bell,
  HelpCircle,
  Laptop,
  Award,
  MapPin
} from 'lucide-react';

// =====================================================
// PT APP PROFILE PAGE - Profilo PT (Mobile)
// =====================================================

export function PTAppProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

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

  // Fetch PT profile
  const { data: ptProfile } = useQuery({
    queryKey: ['pt-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('pt_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['pt-profile-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { athletes: 0, reviews: 0 };

      const { count: athleteCount } = await supabase
        .from('pt_atleta_connections')
        .select('*', { count: 'exact', head: true })
        .eq('pt_user_id', user.id)
        .eq('status', 'active');

      const { count: reviewCount } = await supabase
        .from('pt_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('pt_user_id', user.id)
        .eq('is_visible', true);

      return {
        athletes: athleteCount || 0,
        reviews: reviewCount || 0,
      };
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
  const initials = profile 
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}` 
    : user?.email?.[0]?.toUpperCase() || 'P';

  const menuItems = [
    { icon: Laptop, label: 'Dashboard Web', href: '/pt', external: false },
    { icon: Settings, label: 'Impostazioni profilo', href: '/pt/settings', external: false },
    { icon: Bell, label: 'Notifiche', href: '/pt/app/notifications', external: false },
    { icon: HelpCircle, label: 'Aiuto', href: '/pt/app/help', external: false },
  ];

  const statusLabel = {
    registrato: 'In attesa approvazione',
    attivo: 'Attivo',
    in_attesa_approvazione: 'In attesa approvazione',
    sospeso: 'Sospeso',
    premium: 'Premium',
  };

  const statusColor = {
    registrato: 'secondary',
    attivo: 'default',
    in_attesa_approvazione: 'secondary',
    sospeso: 'destructive',
    premium: 'default',
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-xl font-bold">{fullName || 'Personal Trainer'}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            
            {ptProfile?.status && (
              <Badge 
                variant={statusColor[ptProfile.status as keyof typeof statusColor] as any || 'secondary'}
                className="mt-2"
              >
                {statusLabel[ptProfile.status as keyof typeof statusLabel] || ptProfile.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{stats?.athletes || 0}</p>
              <p className="text-xs text-muted-foreground">Atleti</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Star className="h-5 w-5 mx-auto text-warning mb-1" />
              <p className="text-lg font-bold">{ptProfile?.rating_avg?.toFixed(1) || '--'}</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Award className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{stats?.reviews || 0}</p>
              <p className="text-xs text-muted-foreground">Recensioni</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Visibility toggle */}
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ptProfile?.is_discoverable ? (
                  <Eye className="h-5 w-5 text-primary" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Visibilità profilo</p>
                  <p className="text-sm text-muted-foreground">
                    {ptProfile?.is_discoverable 
                      ? 'Visibile agli atleti' 
                      : 'Nascosto dalla ricerca'}
                  </p>
                </div>
              </div>
              <Badge variant={ptProfile?.is_discoverable ? 'default' : 'secondary'}>
                {ptProfile?.is_discoverable ? 'ON' : 'OFF'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick info */}
      {(ptProfile?.location_city || ptProfile?.specializations?.length) && (
        <div className="px-4 mb-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              {ptProfile?.location_city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{ptProfile.location_city}</span>
                </div>
              )}
              {ptProfile?.specializations && ptProfile.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ptProfile.specializations.slice(0, 4).map((spec: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{spec}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
        </Card>
      </div>
    )}

    {/* Gallery Upload */}
    <div className="px-4 mb-4">
      <PTGalleryUpload />
    </div>

    {/* Reviews Manager */}
    <div className="px-4 mb-4">
      <PTReviewsManager />
    </div>

    {/* Push Notifications */}
    <div className="px-4 mb-4">
      <PushNotificationToggle />
    </div>

    {/* Menu items */}
      <div className="px-4 space-y-2">
        {menuItems.map((item) => (
          <Card 
            key={item.label}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Link to={item.href}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {/* View public profile */}
      <div className="px-4 mt-4">
        <Button variant="outline" className="w-full" asChild>
          <Link to={`/pts/${user?.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            Vedi profilo pubblico
          </Link>
        </Button>
      </div>

      {/* Logout */}
      <div className="px-4 mt-4">
        <Button 
          variant="outline" 
          className="w-full text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Esci
        </Button>
      </div>
    </div>
  );
}

export default PTAppProfilePage;
