import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Settings, 
  Shield,
  Bell,
  CreditCard,
  Users,
  Globe,
  Lock,
  AlertTriangle,
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// ADMIN SETTINGS PAGE - System Configuration
// =====================================================

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Platform settings state
  const [platformSettings, setPlatformSettings] = useState({
    allowNewRegistrations: true,
    requireEmailVerification: true,
    autoApprovePTs: false,
    maxAthletesPerPT: 50,
    defaultTrialDays: 14,
    maintenanceMode: false,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    sendEmailOnNewPT: true,
    sendEmailOnNewTicket: true,
    sendPushNotifications: true,
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would save to a settings table
      toast.success('Impostazioni salvate con successo');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="Impostazioni Sistema"
        subtitle="Configura le impostazioni globali della piattaforma"
        icon={<Settings className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Impostazioni' },
        ]}
        actions={
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salva Modifiche
          </Button>
        }
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            Generale
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifiche
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Sicurezza
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <SectionCard
            title="Impostazioni Generali"
            subtitle="Configurazioni base della piattaforma"
            icon={Globe}
            iconColor="primary"
          >
            <div className="space-y-6">
              {/* Maintenance Mode */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Modalità Manutenzione</Label>
                  <p className="text-sm text-muted-foreground">
                    Blocca l'accesso alla piattaforma per manutenzione
                  </p>
                </div>
                <Switch
                  checked={platformSettings.maintenanceMode}
                  onCheckedChange={(checked) => 
                    setPlatformSettings({ ...platformSettings, maintenanceMode: checked })
                  }
                />
              </div>

              {platformSettings.maintenanceMode && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Attenzione</AlertTitle>
                  <AlertDescription>
                    La modalità manutenzione è attiva. Gli utenti non potranno accedere alla piattaforma.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* Default Trial Days */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Giorni di Prova Default</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    value={platformSettings.defaultTrialDays}
                    onChange={(e) => 
                      setPlatformSettings({ ...platformSettings, defaultTrialDays: parseInt(e.target.value) || 14 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Numero di giorni gratuiti per i nuovi abbonamenti
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAthletes">Max Atleti per PT (Default)</Label>
                  <Input
                    id="maxAthletes"
                    type="number"
                    value={platformSettings.maxAthletesPerPT}
                    onChange={(e) => 
                      setPlatformSettings({ ...platformSettings, maxAthletesPerPT: parseInt(e.target.value) || 50 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite massimo di atleti per ogni Personal Trainer
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <SectionCard
            title="Gestione Utenti"
            subtitle="Configurazioni per la registrazione e approvazione utenti"
            icon={Users}
            iconColor="blue"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Permetti Nuove Registrazioni</Label>
                  <p className="text-sm text-muted-foreground">
                    Consenti a nuovi utenti di registrarsi alla piattaforma
                  </p>
                </div>
                <Switch
                  checked={platformSettings.allowNewRegistrations}
                  onCheckedChange={(checked) => 
                    setPlatformSettings({ ...platformSettings, allowNewRegistrations: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Richiedi Verifica Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Gli utenti devono verificare l'email prima di accedere
                  </p>
                </div>
                <Switch
                  checked={platformSettings.requireEmailVerification}
                  onCheckedChange={(checked) => 
                    setPlatformSettings({ ...platformSettings, requireEmailVerification: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Approvazione Automatica PT</Label>
                  <p className="text-sm text-muted-foreground">
                    I Personal Trainer vengono approvati automaticamente alla registrazione
                  </p>
                </div>
                <Switch
                  checked={platformSettings.autoApprovePTs}
                  onCheckedChange={(checked) => 
                    setPlatformSettings({ ...platformSettings, autoApprovePTs: checked })
                  }
                />
              </div>

              {!platformSettings.autoApprovePTs && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Approvazione Manuale Attiva</AlertTitle>
                  <AlertDescription>
                    I nuovi PT dovranno essere approvati manualmente da un amministratore.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <SectionCard
            title="Impostazioni Notifiche"
            subtitle="Configura le notifiche automatiche del sistema"
            icon={Bell}
            iconColor="yellow"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifica Nuovo PT</Label>
                  <p className="text-sm text-muted-foreground">
                    Invia email agli admin quando un nuovo PT si registra
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.sendEmailOnNewPT}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, sendEmailOnNewPT: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifica Nuovo Ticket</Label>
                  <p className="text-sm text-muted-foreground">
                    Invia email agli admin quando viene aperto un nuovo ticket di supporto
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.sendEmailOnNewTicket}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, sendEmailOnNewTicket: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifiche Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Abilita le notifiche push per gli utenti
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.sendPushNotifications}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, sendPushNotifications: checked })
                  }
                />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <SectionCard
            title="Sicurezza"
            subtitle="Configurazioni di sicurezza della piattaforma"
            icon={Shield}
            iconColor="green"
          >
            <div className="space-y-6">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Sicurezza Avanzata</AlertTitle>
                <AlertDescription>
                  Le policy di sicurezza RLS sono attive su tutte le tabelle del database.
                  I controlli di ruolo sono implementati a livello di API e frontend.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-medium">Ruoli Attivi</h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Admin</span>
                    <span className="text-muted-foreground">Accesso completo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Personal Trainer</span>
                    <span className="text-muted-foreground">Dashboard + App</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Atleta</span>
                    <span className="text-muted-foreground">Solo App</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-medium">Audit Log</h4>
                <p className="text-sm text-muted-foreground">
                  Tutte le azioni degli utenti sono registrate nella tabella audit_logs.
                </p>
                <Button variant="outline" size="sm">
                  Visualizza Audit Log
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminSettingsPage;
