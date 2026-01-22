import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Loader2, AlertTriangle } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

// =====================================================
// PUSH NOTIFICATION TOGGLE - Toggle per abilitare/disabilitare push
// =====================================================

export function PushNotificationToggle() {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    isLoading, 
    toggle 
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium">Notifiche push non supportate</p>
              <p className="text-sm text-muted-foreground">
                Il tuo browser non supporta le notifiche push.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isDenied = permission === 'denied';

  return (
    <Card className={cn(isDenied && "border-destructive/30 bg-destructive/5")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-base">Notifiche Push</CardTitle>
              <CardDescription>
                {isDenied 
                  ? 'Permesso negato. Modifica le impostazioni del browser.'
                  : isSubscribed 
                    ? 'Riceverai notifiche anche quando l\'app è chiusa'
                    : 'Abilita per ricevere notifiche in tempo reale'
                }
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={toggle}
              disabled={isLoading || isDenied}
            />
          </div>
        </div>
      </CardHeader>
      
      {isDenied && (
        <CardContent className="pt-0">
          <p className="text-sm text-destructive">
            Hai negato il permesso per le notifiche. Per abilitarle, modifica le impostazioni del browser per questo sito.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default PushNotificationToggle;
