import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  User,
  Eye,
  Share2,
  Trash2,
  ChevronRight,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { useTour } from '@/components/AppTourContext';
import { safeRemove } from '@/lib/safeStorage';
import { ThemePreferencePicker } from '@/components/settings/ThemePreferencePicker';
import { Palette } from 'lucide-react';

// =====================================================
// ATLETA SETTINGS PAGE - Impostazioni e Privacy
// =====================================================

export function AtletaSettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [shareData, setShareData] = useState(true);
  const { startTour } = useTour();

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleDeleteAccount = async () => {
    if (!user?.email || deleteConfirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      toast.error('Email non corretta');
      return;
    }

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessione scaduta, effettua nuovamente il login');
        return;
      }

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id, role: 'atleta' },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Errore durante l\'eliminazione');
      }

      toast.success('Account eliminato con successo');
      await signOut();
      navigate('/auth');
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast.error(error.message || 'Errore durante l\'eliminazione dell\'account');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur-sm border-b border-app-border">
        <div className="flex items-center gap-3 p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-app-foreground" />
          </button>
          <h1 className="text-xl font-bold text-app-foreground">Impostazioni</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Account Section */}
        <section>
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider mb-3">
            Account
          </h2>
          <div className="bg-app-card rounded-xl overflow-hidden divide-y divide-app-border">
            <button
              onClick={() => navigate('/app/profile')}
              className="w-full flex items-center justify-between p-4 hover:bg-app-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-app-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium text-app-foreground">Profilo</p>
                  <p className="text-sm text-app-muted-foreground">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-app-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Privacy Section */}
        <section>
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider mb-3">
            Privacy
          </h2>
          <div className="bg-app-card rounded-xl overflow-hidden divide-y divide-app-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-app-muted-foreground" />
                <div>
                  <p className="font-medium text-app-foreground">Visibilità profilo</p>
                  <p className="text-sm text-app-muted-foreground">
                    Il tuo PT può vedere i tuoi progressi
                  </p>
                </div>
              </div>
              <Switch
                checked={profileVisibility}
                onCheckedChange={setProfileVisibility}
              />
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Share2 className="h-5 w-5 text-app-muted-foreground" />
                <div>
                  <p className="font-medium text-app-foreground">Condivisione dati</p>
                  <p className="text-sm text-app-muted-foreground">
                    Condividi statistiche anonime
                  </p>
                </div>
              </div>
              <Switch
                checked={shareData}
                onCheckedChange={setShareData}
              />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider mb-3">
            Aspetto
          </h2>
          <div className="bg-app-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-app-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-app-foreground">Tema</p>
                <p className="text-sm text-app-muted-foreground">
                  Chiaro, scuro o in base al dispositivo
                </p>
              </div>
            </div>
            <ThemePreferencePicker />
          </div>
        </section>

        {/* Tour Section */}
        <section>
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider mb-3">
            Assistenza
          </h2>
          <div className="bg-app-card rounded-xl overflow-hidden">
            <button
              onClick={async () => {
                safeRemove('livellapp_tour_done');
                safeRemove('livellapp_tour_dismissed');
                if (user?.id) {
                  const { data } = await supabase
                    .from('profiles')
                    .select('notification_preferences')
                    .eq('user_id', user.id)
                    .maybeSingle();
                  const current = (data?.notification_preferences as Record<string, unknown> | null) ?? {};
                  await supabase
                    .from('profiles')
                    .update({ notification_preferences: { ...current, tour_dismissed: false } })
                    .eq('user_id', user.id);
                }
                startTour();
                toast.success('Tour riavviato!');
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-app-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-app-accent" />
                <div className="text-left">
                  <p className="font-medium text-app-foreground">Rifai il tour guidato</p>
                  <p className="text-sm text-app-muted-foreground">
                    Rivedi la guida introduttiva dell'app
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-app-muted-foreground" />
            </button>
          </div>
        </section>


        <section>
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
            Zona pericolosa
          </h2>
          <div className="bg-app-card rounded-xl overflow-hidden border border-red-500/20">
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-red-400" />
                <div className="text-left">
                  <p className="font-medium text-red-400">Elimina account</p>
                  <p className="text-sm text-app-muted-foreground">
                    Questa azione è irreversibile
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-app-card border-app-border max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <AlertDialogTitle className="text-app-foreground">
                Eliminare l'account?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-app-muted-foreground">
              Questa azione è <strong className="text-red-400">irreversibile</strong>. 
              Tutti i tuoi dati, workout, progressi e connessioni verranno eliminati permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="confirm-email" className="text-app-foreground">
              Scrivi la tua email per confermare
            </Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder={user?.email}
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              className="mt-2 bg-app-muted border-app-border text-app-foreground"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-app-muted text-app-foreground border-app-border hover:bg-app-muted/80"
              disabled={isDeleting}
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmEmail.toLowerCase() !== user?.email?.toLowerCase()}
              className="bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AtletaSettingsPage;
