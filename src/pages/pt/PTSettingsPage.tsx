import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  User,
  Globe,
  MapPin,
  Award,
  Euro,
  Eye,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// PT SETTINGS PAGE - Profilo Pubblico e Impostazioni
// Solo per ruolo: pt (web dashboard)
// =====================================================

interface PTProfile {
  id: string;
  user_id: string;
  bio: string | null;
  specializations: string[] | null;
  certifications: string[] | null;
  method_description: string | null;
  experience_years: number | null;
  hourly_rate: number | null;
  price_min: number | null;
  price_max: number | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  location_city: string | null;
  location_country: string | null;
  is_discoverable: boolean | null;
  status: string;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export function PTSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  // Fetch PT profile
  const { data: ptProfile, isLoading } = useQuery({
    queryKey: ['pt-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('pt_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as PTProfile | null;
    },
    enabled: !!user?.id,
  });

  // Form state
  const [formData, setFormData] = useState<Partial<Omit<PTProfile, 'status'>>>({});

  // Initialize form data when ptProfile loads
  useEffect(() => {
    if (ptProfile) {
      const { status, ...rest } = ptProfile;
      setFormData(rest);
    }
  }, [ptProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<Omit<PTProfile, 'status'>>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('pt_profiles')
        .update(data)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-profile'] });
      toast.success('Profilo aggiornato con successo');
    },
    onError: () => {
      toast.error('Errore durante l\'aggiornamento del profilo');
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const saveButton = (
    <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
      <Save className="h-4 w-4 mr-2" />
      Salva Modifiche
    </Button>
  );

  if (isLoading) {
    return <PageLoader text="Caricamento impostazioni..." />;
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Impostazioni"
        description="Gestisci il tuo profilo pubblico e le preferenze"
        icon={Settings}
        actions={saveButton}
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profilo Pubblico
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <Euro className="h-4 w-4" />
            Prezzi
          </TabsTrigger>
          <TabsTrigger value="visibility" className="gap-2">
            <Eye className="h-4 w-4" />
            Visibilità
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informazioni Base
              </CardTitle>
              <CardDescription>
                Le informazioni base del tuo profilo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={profile?.first_name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Cognome</Label>
                  <Input value={profile?.last_name || ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input value={profile?.phone || ''} disabled />
              </div>
              <p className="text-sm text-muted-foreground">
                Per modificare queste informazioni, contatta il supporto.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Bio e Descrizione
              </CardTitle>
              <CardDescription>
                Presenta te stesso e il tuo metodo di lavoro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Raccontati brevemente..."
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Metodo di Lavoro</Label>
                <Textarea
                  id="method"
                  placeholder="Descrivi il tuo approccio all'allenamento..."
                  value={formData.method_description || ''}
                  onChange={(e) => setFormData({ ...formData, method_description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Anni di Esperienza</Label>
                <Input
                  id="experience"
                  type="number"
                  value={formData.experience_years ?? ''}
                  onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Specializzazioni e Certificazioni
              </CardTitle>
              <CardDescription>
                Le tue competenze e qualifiche
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specializations">Specializzazioni (separate da virgola)</Label>
                <Input
                  id="specializations"
                  placeholder="Es: Bodybuilding, Calisthenics, Yoga"
                  value={(formData.specializations || []).join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specializations: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certificazioni (separate da virgola)</Label>
                <Input
                  id="certifications"
                  placeholder="Es: CONI, FIF, ACSM"
                  value={(formData.certifications || []).join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Località
              </CardTitle>
              <CardDescription>
                Dove operi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Città</Label>
                  <Input
                    id="city"
                    placeholder="Es: Milano"
                    value={formData.location_city || ''}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Paese</Label>
                  <Input
                    id="country"
                    placeholder="Es: Italia"
                    value={formData.location_country || ''}
                    onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Tariffe
              </CardTitle>
              <CardDescription>
                Imposta i tuoi prezzi indicativi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hourly">Tariffa Oraria (€)</Label>
                <Input
                  id="hourly"
                  type="number"
                  placeholder="Es: 50"
                  value={formData.hourly_rate ?? ''}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priceMin">Prezzo Minimo (€)</Label>
                  <Input
                    id="priceMin"
                    type="number"
                    placeholder="Es: 30"
                    value={formData.price_min ?? ''}
                    onChange={(e) => setFormData({ ...formData, price_min: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceMax">Prezzo Massimo (€)</Label>
                  <Input
                    id="priceMax"
                    type="number"
                    placeholder="Es: 100"
                    value={formData.price_max ?? ''}
                    onChange={(e) => setFormData({ ...formData, price_max: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modalità di Servizio</CardTitle>
              <CardDescription>
                Come offri i tuoi servizi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allenamento Online</Label>
                  <p className="text-sm text-muted-foreground">
                    Offri sessioni di allenamento online
                  </p>
                </div>
                <Switch
                  checked={formData.offers_online ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, offers_online: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allenamento di Persona</Label>
                  <p className="text-sm text-muted-foreground">
                    Offri sessioni di allenamento in presenza
                  </p>
                </div>
                <Switch
                  checked={formData.offers_in_person ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, offers_in_person: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visibility Tab */}
        <TabsContent value="visibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visibilità Profilo
              </CardTitle>
              <CardDescription>
                Controlla chi può vedere il tuo profilo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Profilo Pubblico</Label>
                  <p className="text-sm text-muted-foreground">
                    Permetti agli atleti di trovarti nella ricerca
                  </p>
                </div>
                <Switch
                  checked={formData.is_discoverable ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_discoverable: checked })}
                />
              </div>
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-4">
                <p className="text-sm text-warning">
                  <strong>Nota:</strong> La pubblicazione del profilo è soggetta ad approvazione da parte dell'amministrazione.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stato Profilo</CardTitle>
              <CardDescription>
                Lo stato attuale del tuo profilo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  ptProfile?.status === 'attivo' ? 'bg-success' :
                  ptProfile?.status === 'in_attesa_approvazione' ? 'bg-warning' :
                  'bg-muted-foreground'
                }`} />
                <span className="font-medium capitalize">
                  {ptProfile?.status?.replace('_', ' ') || 'Non definito'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PTSettingsPage;
