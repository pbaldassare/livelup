import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Bell,
  MessageSquare,
  Dumbbell,
  Award,
  UserPlus,
  CreditCard,
  Star,
  Calendar,
  ShoppingBag,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// =====================================================
// NOTIFICATION PREFERENCES PAGE
// Solo impostazioni permessi, niente lista notifiche
// =====================================================

interface NotificationPreferences {
  messages: boolean;
  workouts: boolean;
  connections: boolean;
  subscriptions: boolean;
  purchases: boolean;
  reviews: boolean;
  badges: boolean;
  calendar: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  workouts: true,
  connections: true,
  subscriptions: true,
  purchases: true,
  reviews: true,
  badges: true,
  calendar: true
};

const NOTIFICATION_CATEGORIES = [
  {
    key: 'messages' as const,
    label: 'Messaggi',
    description: 'Nuovi messaggi dal tuo PT',
    icon: MessageSquare,
    colorClass: 'text-blue-400 bg-blue-400/10'
  },
  {
    key: 'workouts' as const,
    label: 'Workout',
    description: 'Nuovi allenamenti assegnati',
    icon: Dumbbell,
    colorClass: 'text-app-accent bg-app-accent/10'
  },
  {
    key: 'connections' as const,
    label: 'Connessioni',
    description: 'Richieste e aggiornamenti',
    icon: UserPlus,
    colorClass: 'text-green-400 bg-green-400/10'
  },
  {
    key: 'subscriptions' as const,
    label: 'Abbonamenti',
    description: 'Rinnovi e nuovi piani',
    icon: CreditCard,
    colorClass: 'text-purple-400 bg-purple-400/10'
  },
  {
    key: 'purchases' as const,
    label: 'Acquisti',
    description: 'Richieste pacchetti e pagamenti',
    icon: ShoppingBag,
    colorClass: 'text-orange-400 bg-orange-400/10'
  },
  {
    key: 'reviews' as const,
    label: 'Recensioni',
    description: 'Risposte alle tue recensioni',
    icon: Star,
    colorClass: 'text-pink-400 bg-pink-400/10'
  },
  {
    key: 'badges' as const,
    label: 'Badge',
    description: 'Traguardi e obiettivi raggiunti',
    icon: Award,
    colorClass: 'text-yellow-400 bg-yellow-400/10'
  },
  {
    key: 'calendar' as const,
    label: 'Promemoria',
    description: 'Eventi e reminder calendario',
    icon: Calendar,
    colorClass: 'text-cyan-400 bg-cyan-400/10'
  }
];

export function AtletaNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    isLoading: pushLoading, 
    toggle: togglePush 
  } = usePushNotifications();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data?.notification_preferences) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...(data.notification_preferences as Partial<NotificationPreferences>)
          });
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setIsLoadingPrefs(false);
      }
    };

    fetchPreferences();
  }, [user]);

  // Save preferences with debounce
  const savePreferences = useCallback(async (newPrefs: NotificationPreferences) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: JSON.parse(JSON.stringify(newPrefs)) })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Preferenze salvate');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  // Handle category toggle
  const handleToggle = (key: keyof NotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    savePreferences(updated);
  };

  // Handle push toggle
  const handlePushToggle = async () => {
    await togglePush();
  };

  return (
    <div className="min-h-screen bg-app-background text-app-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur-sm border-b border-app-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-app-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Notifiche</h1>
          </div>
          {isSaving && (
            <Loader2 className="h-4 w-4 animate-spin text-app-muted-foreground" />
          )}
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Push Notifications Section */}
        <Card className="bg-app-card border-app-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-app-muted-foreground uppercase tracking-wider">
              Push
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-app-accent/10">
                  <Bell className="h-5 w-5 text-app-accent" />
                </div>
                <div>
                  <p className="font-medium text-app-foreground">Notifiche Push</p>
                  <p className="text-sm text-app-muted-foreground">
                    Ricevi notifiche anche ad app chiusa
                  </p>
                </div>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={handlePushToggle}
                disabled={pushLoading || !isSupported}
                className="data-[state=checked]:bg-app-accent"
              />
            </div>
            
            {/* Permission status messages */}
            {!isSupported && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-app-muted/50">
                <AlertCircle className="h-4 w-4 text-app-muted-foreground mt-0.5" />
                <p className="text-sm text-app-muted-foreground">
                  Le notifiche push non sono supportate su questo dispositivo/browser.
                </p>
              </div>
            )}
            
            {isSupported && permission === 'denied' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                <p className="text-sm text-red-400">
                  Permesso negato. Modifica le impostazioni del browser per abilitare le notifiche.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories Section */}
        <Card className="bg-app-card border-app-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-app-muted-foreground uppercase tracking-wider">
              Categorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPrefs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-app-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1">
                {NOTIFICATION_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div
                      key={category.key}
                      className="flex items-center justify-between py-3 border-b border-app-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${category.colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-app-foreground">{category.label}</p>
                          <p className="text-sm text-app-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences[category.key]}
                        onCheckedChange={() => handleToggle(category.key)}
                        disabled={isSaving}
                        className="data-[state=checked]:bg-app-accent"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info note */}
        <p className="text-xs text-app-muted-foreground text-center px-4">
          Le preferenze vengono salvate automaticamente. Le notifiche disabilitate non verranno mostrate nell'app.
        </p>
      </div>
    </div>
  );
}

export default AtletaNotificationsPage;
