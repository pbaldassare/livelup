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
  Tag, Plus, Pencil, Loader2, Award, CheckCircle2, XCircle, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Suggestion {
  id: string;
  pt_user_id: string;
  type: string;
  name: string;
  status: string;
  created_at: string;
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

// Generic CRUD table component for catalog items
function CatalogManager({ 
  title, subtitle, items, isLoading, 
  onAdd, onEdit, onToggleActive 
}: { 
  title: string; subtitle: string; items: CatalogItem[]; isLoading: boolean;
  onAdd: () => void; onEdit: (item: CatalogItem) => void; 
  onToggleActive: (id: string, active: boolean) => void;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle} icon={Tag} iconColor="primary">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={onAdd} size="sm"><Plus className="h-4 w-4 mr-2" />Aggiungi</Button>
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
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nessun elemento</TableCell></TableRow>
              ) : items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.description || '—'}</TableCell>
                  <TableCell><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Attiva' : 'Disattivata'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Switch checked={item.is_active} onCheckedChange={(checked) => onToggleActive(item.id, checked)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SectionCard>
  );
}

export function AdminSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [platformSettings, setPlatformSettings] = useState(DEFAULT_PLATFORM);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATIONS);

  // Generic catalog dialog state
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [catalogDialogTable, setCatalogDialogTable] = useState<'pt_types' | 'pt_specializations' | 'pt_certifications' | 'event_types'>('pt_types');
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');

  // Categories sub-tab
  const [categoryTab, setCategoryTab] = useState('types');

  // Fetch settings
  const { data: dbSettings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('key, value');
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => { map[row.key] = row.value; });
      return map;
    },
  });

  // Fetch catalogs
  const { data: ptTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['admin-pt-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pt_types').select('*').order('sort_order');
      if (error) throw error;
      return (data || []) as CatalogItem[];
    },
  });

  const { data: specializations = [], isLoading: loadingSpecs } = useQuery({
    queryKey: ['admin-pt-specializations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pt_specializations').select('*').order('sort_order');
      if (error) throw error;
      return (data || []) as CatalogItem[];
    },
  });

  const { data: certifications = [], isLoading: loadingCerts } = useQuery({
    queryKey: ['admin-pt-certifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pt_certifications').select('*').order('sort_order');
      if (error) throw error;
      return (data || []) as CatalogItem[];
    },
  });

  const { data: eventTypes = [], isLoading: loadingEventTypes } = useQuery({
    queryKey: ['admin-event-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('event_types').select('*').order('sort_order');
      if (error) throw error;
      return (data || []) as CatalogItem[];
    },
  });

  // Fetch suggestions
  const { data: suggestions = [], isLoading: loadingSuggestions } = useQuery({
    queryKey: ['admin-pt-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_category_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Suggestion[];
    },
  });

  useEffect(() => {
    if (dbSettings) {
      if (dbSettings.platform) setPlatformSettings({ ...DEFAULT_PLATFORM, ...dbSettings.platform });
      if (dbSettings.notifications) setNotificationSettings({ ...DEFAULT_NOTIFICATIONS, ...dbSettings.notifications });
    }
  }, [dbSettings]);

  // Save platform settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = [
        { key: 'platform', value: platformSettings, updated_at: new Date().toISOString(), updated_by: user?.id },
        { key: 'notifications', value: notificationSettings, updated_at: new Date().toISOString(), updated_by: user?.id },
      ];
      for (const row of upserts) {
        const { error } = await supabase.from('platform_settings').upsert(row, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['platform-settings'] }); toast.success('Impostazioni salvate'); },
    onError: () => toast.error('Errore salvataggio'),
  });

  // Save/create catalog item (generic)
  const saveCatalogMutation = useMutation({
    mutationFn: async () => {
      const table = catalogDialogTable;
      const items = table === 'pt_types' ? ptTypes : table === 'pt_specializations' ? specializations : table === 'pt_certifications' ? certifications : eventTypes;
      if (editingItem) {
        const { error } = await supabase.from(table).update({ name: itemName, description: itemDescription || null }).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const maxSort = items.length > 0 ? Math.max(...items.map(t => t.sort_order)) + 1 : 1;
        const { error } = await supabase.from(table).insert({ name: itemName, description: itemDescription || null, sort_order: maxSort });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`admin-${catalogDialogTable.replace('pt_', 'pt-')}`] });
      queryClient.invalidateQueries({ queryKey: ['admin-event-types'] });
      queryClient.invalidateQueries({ queryKey: ['pt-types'] });
      queryClient.invalidateQueries({ queryKey: ['pt-specializations'] });
      queryClient.invalidateQueries({ queryKey: ['pt-certifications'] });
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      toast.success(editingItem ? 'Aggiornato' : 'Creato');
      closeCatalogDialog();
    },
    onError: (e) => toast.error('Errore: ' + e.message),
  });

  // Toggle active (generic)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ table, id, is_active }: { table: 'pt_types' | 'pt_specializations' | 'pt_certifications' | 'event_types'; id: string; is_active: boolean }) => {
      const { error } = await supabase.from(table).update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pt-types'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pt-specializations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pt-certifications'] });
      toast.success('Stato aggiornato');
    },
    onError: (e) => toast.error('Errore: ' + e.message),
  });

  // Approve/reject suggestion
  const handleSuggestion = useMutation({
    mutationFn: async ({ suggestion, action }: { suggestion: Suggestion; action: 'approved' | 'rejected' }) => {
      // Update suggestion status
      const { error: updateError } = await supabase
        .from('pt_category_suggestions')
        .update({ status: action })
        .eq('id', suggestion.id);
      if (updateError) throw updateError;

      // If approved, create the item in the corresponding table
      if (action === 'approved') {
        const table = suggestion.type === 'specialization' ? 'pt_specializations' : 'pt_certifications';
        const items = suggestion.type === 'specialization' ? specializations : certifications;
        const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 1;
        const { error } = await supabase.from(table).insert({ name: suggestion.name, sort_order: maxSort });
        if (error) throw error;
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pt-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pt-specializations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pt-certifications'] });
      toast.success(action === 'approved' ? 'Suggerimento approvato e aggiunto' : 'Suggerimento rifiutato');
    },
    onError: (e) => toast.error('Errore: ' + e.message),
  });

  const openCatalogDialog = (table: 'pt_types' | 'pt_specializations' | 'pt_certifications', item?: CatalogItem) => {
    setCatalogDialogTable(table);
    setEditingItem(item || null);
    setItemName(item?.name || '');
    setItemDescription(item?.description || '');
    setCatalogDialogOpen(true);
  };

  const closeCatalogDialog = () => {
    setCatalogDialogOpen(false);
    setEditingItem(null);
    setItemName('');
    setItemDescription('');
  };

  const catalogDialogTitle = {
    pt_types: 'Tipologia PT',
    pt_specializations: 'Specializzazione',
    pt_certifications: 'Certificazione',
  }[catalogDialogTable];

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="Impostazioni Sistema"
        subtitle="Configura le impostazioni globali della piattaforma"
        icon={<Settings className="h-6 w-6" />}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Impostazioni' }]}
        actions={
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
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
                  <AlertDescription>La modalità manutenzione è attiva.</AlertDescription>
                </Alert>
              )}
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Giorni di Prova Default</Label>
                  <Input id="trialDays" type="number" value={platformSettings.defaultTrialDays} onChange={(e) => setPlatformSettings({ ...platformSettings, defaultTrialDays: parseInt(e.target.value) || 14 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAthletes">Max Atleti per PT (Default)</Label>
                  <Input id="maxAthletes" type="number" value={platformSettings.maxAthletesPerPT} onChange={(e) => setPlatformSettings({ ...platformSettings, maxAthletesPerPT: parseInt(e.target.value) || 50 })} />
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Tabs value={categoryTab} onValueChange={setCategoryTab}>
            <TabsList>
              <TabsTrigger value="types">Tipologie PT</TabsTrigger>
              <TabsTrigger value="specializations">Specializzazioni</TabsTrigger>
              <TabsTrigger value="certifications">Certificazioni</TabsTrigger>
              <TabsTrigger value="suggestions" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Suggerimenti
                {suggestions.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {suggestions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="types" className="mt-4">
              <CatalogManager
                title="Tipologie Personal Trainer"
                subtitle="Categorie di PT disponibili sulla piattaforma"
                items={ptTypes}
                isLoading={loadingTypes}
                onAdd={() => openCatalogDialog('pt_types')}
                onEdit={(item) => openCatalogDialog('pt_types', item)}
                onToggleActive={(id, active) => toggleActiveMutation.mutate({ table: 'pt_types', id, is_active: active })}
              />
            </TabsContent>

            <TabsContent value="specializations" className="mt-4">
              <CatalogManager
                title="Specializzazioni"
                subtitle="Le specializzazioni selezionabili dai PT"
                items={specializations}
                isLoading={loadingSpecs}
                onAdd={() => openCatalogDialog('pt_specializations')}
                onEdit={(item) => openCatalogDialog('pt_specializations', item)}
                onToggleActive={(id, active) => toggleActiveMutation.mutate({ table: 'pt_specializations', id, is_active: active })}
              />
            </TabsContent>

            <TabsContent value="certifications" className="mt-4">
              <CatalogManager
                title="Certificazioni"
                subtitle="Le certificazioni selezionabili dai PT"
                items={certifications}
                isLoading={loadingCerts}
                onAdd={() => openCatalogDialog('pt_certifications')}
                onEdit={(item) => openCatalogDialog('pt_certifications', item)}
                onToggleActive={(id, active) => toggleActiveMutation.mutate({ table: 'pt_certifications', id, is_active: active })}
              />
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <SectionCard title="Suggerimenti dai PT" subtitle="Nuove specializzazioni e certificazioni proposte" icon={Lightbulb} iconColor="yellow">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingSuggestions ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : suggestions.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nessun suggerimento in attesa</TableCell></TableRow>
                      ) : suggestions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {s.type === 'specialization' ? 'Specializzazione' : 'Certificazione'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString('it-IT')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleSuggestion.mutate({ suggestion: s, action: 'approved' })}
                                disabled={handleSuggestion.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleSuggestion.mutate({ suggestion: s, action: 'rejected' })}
                                disabled={handleSuggestion.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <SectionCard title="Gestione Utenti" subtitle="Configurazioni per la registrazione e approvazione utenti" icon={Users} iconColor="blue">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Permetti Nuove Registrazioni</Label>
                  <p className="text-sm text-muted-foreground">Consenti a nuovi utenti di registrarsi</p>
                </div>
                <Switch checked={platformSettings.allowNewRegistrations} onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, allowNewRegistrations: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Richiedi Verifica Email</Label>
                  <p className="text-sm text-muted-foreground">Gli utenti devono verificare l'email</p>
                </div>
                <Switch checked={platformSettings.requireEmailVerification} onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, requireEmailVerification: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Approvazione Automatica PT</Label>
                  <p className="text-sm text-muted-foreground">I PT vengono approvati automaticamente</p>
                </div>
                <Switch checked={platformSettings.autoApprovePTs} onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, autoApprovePTs: checked })} />
              </div>
              {!platformSettings.autoApprovePTs && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Approvazione Manuale Attiva</AlertTitle>
                  <AlertDescription>I nuovi PT dovranno essere approvati manualmente.</AlertDescription>
                </Alert>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <SectionCard title="Impostazioni Notifiche" subtitle="Configura le notifiche automatiche" icon={Bell} iconColor="yellow">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifica Nuovo PT</Label>
                  <p className="text-sm text-muted-foreground">Invia email quando un nuovo PT si registra</p>
                </div>
                <Switch checked={notificationSettings.sendEmailOnNewPT} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, sendEmailOnNewPT: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifica Nuovo Ticket</Label>
                  <p className="text-sm text-muted-foreground">Invia email per nuovi ticket di supporto</p>
                </div>
                <Switch checked={notificationSettings.sendEmailOnNewTicket} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, sendEmailOnNewTicket: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notifiche Push</Label>
                  <p className="text-sm text-muted-foreground">Abilita le notifiche push</p>
                </div>
                <Switch checked={notificationSettings.sendPushNotifications} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, sendPushNotifications: checked })} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <SectionCard title="Sicurezza" subtitle="Configurazioni di sicurezza" icon={Shield} iconColor="green">
            <div className="space-y-6">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Sicurezza Avanzata</AlertTitle>
                <AlertDescription>Le policy RLS sono attive su tutte le tabelle.</AlertDescription>
              </Alert>
              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-medium">Ruoli Attivi</h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm"><span>Admin</span><span className="text-muted-foreground">Accesso completo</span></div>
                  <div className="flex items-center justify-between text-sm"><span>Personal Trainer</span><span className="text-muted-foreground">Dashboard + App</span></div>
                  <div className="flex items-center justify-between text-sm"><span>Atleta</span><span className="text-muted-foreground">Solo App</span></div>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Generic Catalog Dialog */}
      <Dialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? `Modifica ${catalogDialogTitle}` : `Nuova ${catalogDialogTitle}`}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modifica nome e descrizione' : `Aggiungi una nuova ${catalogDialogTitle?.toLowerCase()}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nome *</Label>
              <Input id="item-name" placeholder="Nome..." value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-desc">Descrizione</Label>
              <Input id="item-desc" placeholder="Descrizione opzionale" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCatalogDialog}>Annulla</Button>
            <Button onClick={() => saveCatalogMutation.mutate()} disabled={!itemName.trim() || saveCatalogMutation.isPending}>
              {saveCatalogMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Salva' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminSettingsPage;
