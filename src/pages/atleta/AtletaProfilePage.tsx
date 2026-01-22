import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import { terminateConnection } from '@/lib/api/connections';
import { toast } from 'sonner';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronRight,
  Star,
  Dumbbell,
  Target,
  Bell,
  Shield,
  HelpCircle,
  Users,
  Edit,
  LinkIcon,
  Unlink
} from 'lucide-react';

// =====================================================
// ATLETA PROFILE PAGE - Profilo e impostazioni
// =====================================================

export function AtletaProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { status, connection, ptName, refetch } = useAtletaStatus();
  const queryClient = useQueryClient();
  const [showEditSheet, setShowEditSheet] = useState(false);

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

  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
  const initials = profile 
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}` 
    : user?.email?.[0]?.toUpperCase() || 'U';

  const menuItems = [
    { icon: Bell, label: 'Notifiche', href: '/app/notifications' },
    { icon: Target, label: 'Obiettivi', href: '/app/goals' },
    { icon: Shield, label: 'Privacy', href: '/app/privacy' },
    { icon: HelpCircle, label: 'Aiuto', href: '/app/help' },
  ];

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
            <h1 className="text-xl font-bold">{fullName || 'Atleta'}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            
            <Badge 
              variant={status === 'collegato' ? 'default' : status === 'pending' ? 'secondary' : 'outline'}
              className="mt-2"
            >
              {status === 'collegato' ? (
                <>
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Collegato
                </>
              ) : status === 'pending' ? (
                'Richiesta in attesa'
              ) : (
                'Non collegato'
              )}
            </Badge>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setShowEditSheet(true)}>
            <Edit className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* PT Connection Card */}
      <div className="p-4">
        <Card className={status === 'collegato' ? 'border-primary/30 bg-primary/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Il mio Personal Trainer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'collegato' && connection ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={connection.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(connection.profiles?.first_name?.[0] || '') + (connection.profiles?.last_name?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{ptName}</p>
                    {connection.pt_profiles?.rating_avg && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {connection.pt_profiles.rating_avg.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Unlink className="h-4 w-4 mr-2" />
                      Termina connessione
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Terminare la connessione?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Perderai accesso alle schede di allenamento e alla chat con {ptName}. 
                        Potrai cercare un nuovo PT dopo la disconnessione.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => terminateMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Termina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : status === 'pending' ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Hai una richiesta di connessione in attesa di approvazione
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Non sei ancora collegato a un Personal Trainer
                </p>
                <Button asChild>
                  <a href="/app/discover">Trova un PT</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      {atletaProfile && (
        <div className="grid grid-cols-2 gap-3 px-4 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-medium capitalize">{atletaProfile.fitness_level || 'N/D'}</p>
              <p className="text-xs text-muted-foreground">Livello</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Target className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-medium">{atletaProfile.goals?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Obiettivi</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Menu items */}
      <div className="px-4 space-y-2">
        {menuItems.map((item) => (
          <Card 
            key={item.label}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(item.href)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Logout */}
      <div className="px-4 mt-6">
        <Button 
          variant="outline" 
          className="w-full text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Esci
        </Button>
      </div>

      {/* Edit profile sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Modifica profilo</SheetTitle>
          </SheetHeader>
          <div className="py-4 text-center text-muted-foreground">
            Funzionalità in arrivo
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default AtletaProfilePage;
