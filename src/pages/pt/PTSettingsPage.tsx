import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { PageLoader } from '@/components/common/PageLoader';
import { PTAvailabilityManager } from '@/components/pt/PTAvailabilityManager';
import { PTPackagesManager } from '@/components/pt/PTPackagesManager';
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';
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
  Save,
  Clock,
  Package,
  Navigation,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// PT SETTINGS PAGE - Profilo Pubblico e Impostazioni
// Include geolocalizzazione con Google Maps API
// Solo per ruolo: pt (web dashboard)
// =====================================================

const GOOGLE_MAPS_API_KEY = 'AIzaSyA76iVcQpSnl76_G6bJVnEeOUmWVd7278I';

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
  location_lat: number | null;
  location_lng: number | null;
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
  const [isLocating, setIsLocating] = useState(false);

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

  // Request GPS location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalizzazione non supportata dal browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocoding to get city name
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();

          if (data.results && data.results[0]) {
            const addressComponents = data.results[0].address_components;
            const city = addressComponents.find(
              (c: any) => c.types.includes('locality') || c.types.includes('administrative_area_level_3')
            )?.long_name;
            const country = addressComponents.find(
              (c: any) => c.types.includes('country')
            )?.long_name;

            setFormData({
              ...formData,
              location_city: city || formData.location_city || '',
              location_country: country || formData.location_country || '',
              location_lat: latitude,
              location_lng: longitude,
            });

            toast.success('Posizione aggiornata');
          } else {
            // Still save coordinates even without city name
            setFormData({
              ...formData,
              location_lat: latitude,
              location_lng: longitude,
            });
            toast.success('Coordinate GPS salvate');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          // Save coordinates anyway
          setFormData({
            ...formData,
            location_lat: latitude,
            location_lng: longitude,
          });
          toast.success('Coordinate GPS salvate');
        }

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Permesso di geolocalizzazione negato');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Posizione non disponibile');
            break;
          case error.TIMEOUT:
            toast.error('Timeout richiesta posizione');
            break;
          default:
            toast.error('Impossibile ottenere la posizione');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
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
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profilo Pubblico
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-2">
            <Package className="h-4 w-4" />
            Pacchetti
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <Euro className="h-4 w-4" />
            Prezzi
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <Clock className="h-4 w-4" />
            Disponibilità
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
                Dove operi - gli atleti potranno trovarti più facilmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* GPS Button */}
              <Button
                variant="outline"
                onClick={requestLocation}
                disabled={isLocating}
                className="w-full"
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Usa la mia posizione
              </Button>

              <div className="text-center text-sm text-muted-foreground">oppure</div>

              {/* Places Autocomplete */}
              <div className="space-y-2">
                <Label>Cerca città</Label>
                <PlacesAutocomplete
                  value={formData.location_city || ''}
                  onChange={(value) => setFormData({ ...formData, location_city: value })}
                  onPlaceSelect={(place) => {
                    setFormData({
                      ...formData,
                      location_city: place.name,
                      location_lat: place.geometry.location.lat,
                      location_lng: place.geometry.location.lng,
                    });
                  }}
                  placeholder="Cerca la tua città..."
                />
              </div>

              {/* Manual fields */}
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

              {/* GPS coordinates indicator */}
              {formData.location_lat && formData.location_lng && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Coordinate GPS salvate ({formData.location_lat.toFixed(4)}, {formData.location_lng.toFixed(4)})</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-6">
          <PTPackagesManager />
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

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-6">
          <PTAvailabilityManager />
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
