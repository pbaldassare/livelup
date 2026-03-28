import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { 
  Settings, Shield, Bell, Users, Globe, Lock, AlertTriangle, Save, RefreshCw, 
  Tag, Plus, Pencil, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// ADMIN SETTINGS PAGE - Persistent System Configuration
// =====================================================

interface PTType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

const DEFAULT_PLATFORM = {
  allowNewRegistrations: true,
  requireEmailVerification: true,
  autoApprovePTs: false,
  maxAthletesPerPT: 50,
  defaultTrialDays: 14,
  maintenanceMode: false,
};

const DEFAULT_NOTIFICATIONS = {
  sendEmailOnNewPT: true,
  sendEmailOnNewTicket: true,
  sendPushNotifications: true,
};

export function AdminSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [platformSettings, setPlatformSettings] = useState(DEFAULT_PLATFORM);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATIONS);

  // PT Type dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PTType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeDescription, setTypeDescription] = useState('');

  // Fetch settings from DB
  const { data: dbSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => { map[row.key] = row.value; });
      return map;
    },
  });

  // Fetch PT types
  const { data: ptTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['admin-pt-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_types')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PTType[];
    },
  });

  // Populate state from DB on load
  useEffect(() => {
    if (dbSettings) {
      if (dbSettings.platform) setPlatformSettings({ ...DEFAULT_PLATFORM, ...dbSettings.platform });
      if (dbSettings.notifications) setNotificationSettings({ ...DEFAULT_NOTIFICATIONS, ...dbSettings.notifications });
    }
  }, [dbSettings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = [
        { key: 'platform', value: platformSettings, updated_at: new Date().toISOString(), updated_by: user?.id },
        { key: 'notifications', value: notificationSettings, updated_at: new Date().toISOString(), updated_by: user?.id },
      ];

      for (const row of upserts) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(row, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Impostazioni salvate con successo');
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  });

  // Save/create PT type
  const saveTypeMutation = useMutation({
    mutationFn: async () => {
      if (editingType) {
        const { error } = await supabase
          .from('pt_types')
          .update({ name: typeName, description: typeDescription || null })
          .eq('id', editingType.id);
        if (error) throw error;
      } else {
        const maxSort = ptTypes.length > 0 ? Math.max(...ptTypes.map(t => t.sort_order)) + 1 : 1;
        const { error } = await supabase
          .from('pt_types')
          .insert({ name: typeName, description: typeDescription || null, sort_order: maxSort });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pt-types'] });
      queryClient.invalidateQueries({ queryKey: ['pt-types'] });
      toast.success(editingType ? 'Tipologia aggiornata' : 'Tipologia creata');
      closeTypeDialog();
    },
    onError: (e) => toast.error('Errore: ' + e.message),
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('pt_types')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pt-types'] });
      queryClient.invalidateQueries({ queryKey: ['pt-types'] });
      toast.success('Stato aggiornato');
    },
    onError: (e) => toast.error('Errore: ' + e.message),
  });

  const openCreateType = () => {
    setEditingType(null);
    setTypeName('');
    setTypeDescription('');
    setTypeDialogOpen(true);
  };

  const openEditType = (t: PTType) => {
    setEditingType(t);
    setTypeName(t.name);
    setTypeDescription(t.description || '');
    setTypeDialogOpen(true);
  };

  const closeTypeDialog = () => {
    setTypeDialogOpen(false);
    setEditingType(null);
    setTypeName('');
    setTypeDescription('');
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
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
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
          <TabsTrigger value="general" className="gap-2"><Globe className="h-4 w-4" />Generale</TabsTrigger>
          <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4" />Categorie</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Utenti</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Notifiche</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" />Sicurezza</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <SectionCard title="Impostazioni Generali" subtitle="Configurazioni base della piattaforma" icon={Globe} iconColor="primary">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Modalità Manutenzione</Label>
                  <p className="text-sm text-muted-foreground">Blocca l'accesso alla piattaforma per manutenzione</p>
                </div>
                <Switch checked={platformSettings.maintenanceMode} onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, maintenanceMode: checked })} />
              </div>
              {platformSettings.maintenanceMode && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Attenzione</AlertTitle>
                  <AlertDescription>La modalità manutenzione è attiva. Gli utenti non potranno accedere alla piattaforma.</AlertDescription>
                </Alert>
              )}
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Giorni di Prova Default</Label>
                  <Input id="trialDays" type="number" value={platformSettings.defaultTrialDays} onChange={(e) => setPlatformSettings({ ...platformSettings, defaultTrialDays: parseInt(e.target.value) || 14 })} />
                  <p className="text-xs text-muted-foreground">Numero di giorni gratuiti per i nuovi abbonamenti</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAthletes">Max Atleti per PT (Default)</Label>
                  <Input id="maxAthletes" type="number" value={platformSettings.maxAthletesPerPT} onChange={(e) => setPlatformSettings({ ...platformSettings, maxAthletesPerPT: parseInt(e.target.value) || 50 })} />
                  <p className="text-xs text-muted-foreground">Limite massimo di atleti per ogni Personal Trainer</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <SectionCard 
            title="Tipologie Personal Trainer" 
            subtitle="Gestisci le categorie di PT disponibili sulla piattaforma" 
            icon={Tag} 
            iconColor="primary"
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={openCreateType} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Tipologia
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTypes ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : ptTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nessuna tipologia configurata
                        </TableCell>
                      </TableRow>
                    ) : (
                      ptTypes.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-muted-foreground">{t.description || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={t.is_active ? 'default' : 'secondary'}>
                              {t.is_active ? 'Attiva' : 'Disattivata'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditType(t)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Switch
                                checked={t.is_active}
                                onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: t.id, is_active: checked })}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <SectionCard title="Gestione Utenti" subtitle="Configurazioni per la registrazione e approvazione utenti" icon={Users} iconColor="blue">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Permetti Nuove Registrazioni</Label>
                  <p className="text-sm text-muted-foreground">Consenti a nuovi utenti di registrarsi alla piattaforma</p>
                </div>
                <Switch checked={platformSettings.allowNewRegistrations} onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, allowNewRegistrations: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Richiedi Verifica Email</Label>
                  <p className="text-sm text-muted-foreground">Gli utenti devono verificare l'email prima di accedere</p>
                </div>
                <Switch checked={platformSettings.requireEmailVerification} onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, requireEmailVerification: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Approvazione Automatica PT</Label>
                  <p className="text-sm text-muted-foreground">I Personal Trainer vengono approvati automaticamente alla registrazione</p>
                </div>
                <Switch checked={platformSettings.autoApprovePTs} onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, autoApprovePTs: checked })} />
              </div>
              {!platformSettings.autoApprovePTs && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Approvazione Manuale Attiva</AlertTitle>
                  <AlertDescription>I nuovi PT dovranno essere approvati manualmente da un amministratore.</AlertDescription>
                </Alert>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <SectionCard title="Impostazioni Notifiche" subtitle="Configura le notifiche automatiche del sistema" icon={Bell} iconColor="yellow">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifica Nuovo PT</Label>
                  <p className="text-sm text-muted-foreground">Invia email agli admin quando un nuovo PT si registra</p>
                </div>
                <Switch checked={notificationSettings.sendEmailOnNewPT} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, sendEmailOnNewPT: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifica Nuovo Ticket</Label>
                  <p className="text-sm text-muted-foreground">Invia email agli admin quando viene aperto un nuovo ticket di supporto</p>
                </div>
                <Switch checked={notificationSettings.sendEmailOnNewTicket} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, sendEmailOnNewTicket: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifiche Push</Label>
                  <p className="text-sm text-muted-foreground">Abilita le notifiche push per gli utenti</p>
                </div>
                <Switch checked={notificationSettings.sendPushNotifications} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, sendPushNotifications: checked })} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <SectionCard title="Sicurezza" subtitle="Configurazioni di sicurezza della piattaforma" icon={Shield} iconColor="green">
            <div className="space-y-6">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Sicurezza Avanzata</AlertTitle>
                <AlertDescription>Le policy di sicurezza RLS sono attive su tutte le tabelle del database. I controlli di ruolo sono implementati a livello di API e frontend.</AlertDescription>
              </Alert>
              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-medium">Ruoli Attivi</h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm"><span>Admin</span><span className="text-muted-foreground">Accesso completo</span></div>
                  <div className="flex items-center justify-between text-sm"><span>Personal Trainer</span><span className="text-muted-foreground">Dashboard + App</span></div>
                  <div className="flex items-center justify-between text-sm"><span>Atleta</span><span className="text-muted-foreground">Solo App</span></div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-medium">Audit Log</h4>
                <p className="text-sm text-muted-foreground">Tutte le azioni degli utenti sono registrate nella tabella audit_logs.</p>
                <Button variant="outline" size="sm">Visualizza Audit Log</Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* PT Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? 'Modifica Tipologia' : 'Nuova Tipologia PT'}</DialogTitle>
            <DialogDescription>
              {editingType ? 'Modifica nome e descrizione della tipologia' : 'Aggiungi una nuova categoria di Personal Trainer'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type-name">Nome *</Label>
              <Input
                id="type-name"
                placeholder="Es. Yoga, CrossFit..."
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-desc">Descrizione</Label>
              <Input
                id="type-desc"
                placeholder="Descrizione opzionale"
                value={typeDescription}
                onChange={(e) => setTypeDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTypeDialog}>Annulla</Button>
            <Button 
              onClick={() => saveTypeMutation.mutate()} 
              disabled={!typeName.trim() || saveTypeMutation.isPending}
            >
              {saveTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingType ? 'Salva' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminSettingsPage;