import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { PageLoader } from '@/components/common/PageLoader';
import { ImageUpload } from '@/components/common/ImageUpload';
import { MultiSelectSearch } from '@/components/common/MultiSelectSearch';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { 
  Settings, User, Globe, MapPin, Award, Euro, Eye, Save, Clock, Package,
  Navigation, Loader2, CheckCircle2, Upload, FileText, Trash2, Plus, Lightbulb, X
} from 'lucide-react';
import { toast } from 'sonner';

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
  location_address: string | null;
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

interface Certificate {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

export function PTSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLocating, setIsLocating] = useState(false);
  const certFileRef = useRef<HTMLInputElement>(null);
  const [certName, setCertName] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'specialization' | 'certification'>('specialization');
  const [suggestionName, setSuggestionName] = useState('');

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
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
      const { data, error } = await supabase.from('pt_profiles').select('*').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as PTProfile | null;
    },
    enabled: !!user?.id,
  });

  // Fetch specializations catalog
  const { data: specCatalog = [] } = useQuery({
    queryKey: ['pt-specializations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pt_specializations').select('id, name').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch certifications catalog
  const { data: certCatalog = [] } = useQuery({
    queryKey: ['pt-certifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pt_certifications').select('id, name').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch PT's selected specializations
  const { data: selectedSpecs = [] } = useQuery({
    queryKey: ['pt-profile-specializations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('pt_profile_specializations').select('specialization_id').eq('pt_user_id', user.id);
      if (error) throw error;
      return (data || []).map(r => r.specialization_id);
    },
    enabled: !!user?.id,
  });

  // Fetch PT's selected certifications
  const { data: selectedCerts = [] } = useQuery({
    queryKey: ['pt-profile-certifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('pt_profile_certifications').select('certification_id').eq('pt_user_id', user.id);
      if (error) throw error;
      return (data || []).map(r => r.certification_id);
    },
    enabled: !!user?.id,
  });

  // Fetch certificates (uploaded docs)
  const { data: certificates = [] } = useQuery({
    queryKey: ['pt-certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('pt_certificates').select('*').eq('pt_user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Certificate[];
    },
    enabled: !!user?.id,
  });

  // Form state
  const [formData, setFormData] = useState<Partial<Omit<PTProfile, 'status'>>>({});

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
      const { error } = await supabase.from('pt_profiles').update(data).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-profile'] });
      toast.success('Profilo aggiornato con successo');
    },
    onError: () => toast.error("Errore durante l'aggiornamento"),
  });

  const handleSave = () => updateProfileMutation.mutate(formData);

  // Save specializations
  const saveSpecsMutation = useMutation({
    mutationFn: async (specIds: string[]) => {
      if (!user?.id) return;
      // Delete all, then insert new
      await supabase.from('pt_profile_specializations').delete().eq('pt_user_id', user.id);
      if (specIds.length > 0) {
        const rows = specIds.map(id => ({ pt_user_id: user.id, specialization_id: id }));
        const { error } = await supabase.from('pt_profile_specializations').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-profile-specializations'] });
      toast.success('Specializzazioni aggiornate');
    },
    onError: () => toast.error('Errore aggiornamento specializzazioni'),
  });

  // Save certifications
  const saveCertsMutation = useMutation({
    mutationFn: async (certIds: string[]) => {
      if (!user?.id) return;
      await supabase.from('pt_profile_certifications').delete().eq('pt_user_id', user.id);
      if (certIds.length > 0) {
        const rows = certIds.map(id => ({ pt_user_id: user.id, certification_id: id }));
        const { error } = await supabase.from('pt_profile_certifications').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-profile-certifications'] });
      toast.success('Certificazioni aggiornate');
    },
    onError: () => toast.error('Errore aggiornamento certificazioni'),
  });

  // Upload certificate document
  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato non supportato. Usa PDF, JPG o PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Il file deve essere inferiore a 10MB');
      return;
    }

    const name = certName.trim() || file.name.replace(/\.[^/.]+$/, '');
    setCertUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('pt-certificates').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('pt-certificates').getPublicUrl(path);
      const fileUrl = urlData.publicUrl;

      const { error: insertError } = await supabase.from('pt_certificates').insert({
        pt_user_id: user.id,
        name,
        file_url: fileUrl,
        file_type: file.type,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['pt-certificates'] });
      setCertName('');
      toast.success('Attestato caricato');
    } catch (err: any) {
      toast.error('Errore caricamento: ' + err.message);
    } finally {
      setCertUploading(false);
      if (certFileRef.current) certFileRef.current.value = '';
    }
  };

  // Delete certificate
  const deleteCertMutation = useMutation({
    mutationFn: async (cert: Certificate) => {
      // Extract path from URL
      const urlParts = cert.file_url.split('/pt-certificates/');
      if (urlParts[1]) {
        await supabase.storage.from('pt-certificates').remove([urlParts[1]]);
      }
      const { error } = await supabase.from('pt_certificates').delete().eq('id', cert.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-certificates'] });
      toast.success('Attestato eliminato');
    },
    onError: () => toast.error('Errore eliminazione'),
  });

  // Submit suggestion
  const submitSuggestion = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase.from('pt_category_suggestions').insert({
        pt_user_id: user.id,
        type: suggestionType,
        name: suggestionName.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Suggerimento inviato! L\'admin lo valuterà.');
      setSuggestionDialogOpen(false);
      setSuggestionName('');
    },
    onError: () => toast.error('Errore invio suggerimento'),
  });

  // GPS location
  const requestLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocalizzazione non supportata'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
          const data = await response.json();
          if (data.results?.[0]) {
            const ac = data.results[0].address_components;
            const city = ac.find((c: any) => c.types.includes('locality') || c.types.includes('administrative_area_level_3'))?.long_name;
            const country = ac.find((c: any) => c.types.includes('country'))?.long_name;
            setFormData({ ...formData, location_city: city || '', location_country: country || '', location_address: data.results[0].formatted_address, location_lat: latitude, location_lng: longitude });
            toast.success('Posizione aggiornata');
          } else {
            setFormData({ ...formData, location_lat: latitude, location_lng: longitude });
            toast.success('Coordinate GPS salvate');
          }
        } catch { setFormData({ ...formData, location_lat: latitude, location_lng: longitude }); toast.success('Coordinate GPS salvate'); }
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        const msgs: Record<number, string> = { 1: 'Permesso negato', 2: 'Posizione non disponibile', 3: 'Timeout' };
        toast.error(msgs[error.code] || 'Impossibile ottenere la posizione');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Avatar upload handler
  const handleAvatarUpload = async (url: string) => {
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
    if (error) { toast.error('Errore aggiornamento avatar'); return; }
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    toast.success('Foto profilo aggiornata');
  };

  if (isLoading) return <PageLoader text="Caricamento impostazioni..." />;

  const saveButton = (
    <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
      <Save className="h-4 w-4 mr-2" />Salva Modifiche
    </Button>
  );

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="Impostazioni" description="Gestisci il tuo profilo pubblico e le preferenze" icon={Settings} actions={saveButton} />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profilo Pubblico</TabsTrigger>
          <TabsTrigger value="packages" className="gap-2"><Package className="h-4 w-4" />Pacchetti</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2"><Euro className="h-4 w-4" />Prezzi</TabsTrigger>
          <TabsTrigger value="availability" className="gap-2"><Clock className="h-4 w-4" />Disponibilità</TabsTrigger>
          <TabsTrigger value="visibility" className="gap-2"><Eye className="h-4 w-4" />Visibilità</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Avatar + Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Informazioni Base</CardTitle>
              <CardDescription>Le informazioni base del tuo profilo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <ImageUpload
                  bucket="avatars"
                  filePath={`${user?.id}/avatar`}
                  currentUrl={profile?.avatar_url}
                  onUploadComplete={handleAvatarUpload}
                  variant="avatar"
                />
                <div>
                  <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-sm text-muted-foreground">Clicca sull'avatar per cambiare foto</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Nome</Label><Input value={profile?.first_name || ''} disabled /></div>
                <div className="space-y-2"><Label>Cognome</Label><Input value={profile?.last_name || ''} disabled /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input value={profile?.email || user?.email || ''} disabled /></div>
              <div className="space-y-2"><Label>Telefono</Label><Input value={profile?.phone || ''} disabled /></div>
              <p className="text-sm text-muted-foreground">Per modificare queste informazioni, contatta il supporto.</p>
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Bio e Descrizione</CardTitle>
              <CardDescription>Presenta te stesso e il tuo metodo di lavoro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" placeholder="Raccontati brevemente..." value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Metodo di Lavoro</Label>
                <Textarea id="method" placeholder="Descrivi il tuo approccio..." value={formData.method_description || ''} onChange={(e) => setFormData({ ...formData, method_description: e.target.value })} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Anni di Esperienza</Label>
                <Input id="experience" type="number" value={formData.experience_years ?? ''} onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })} />
              </div>
            </CardContent>
          </Card>

          {/* Specializations & Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Specializzazioni e Certificazioni</CardTitle>
              <CardDescription>Seleziona le tue competenze e qualifiche</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Specializzazioni</Label>
                <MultiSelectSearch
                  options={specCatalog}
                  selected={selectedSpecs}
                  onChange={(ids) => saveSpecsMutation.mutate(ids)}
                  placeholder="Seleziona specializzazioni..."
                  emptyText="Nessuna specializzazione trovata"
                />
              </div>
              <div className="space-y-2">
                <Label>Certificazioni</Label>
                <MultiSelectSearch
                  options={certCatalog}
                  selected={selectedCerts}
                  onChange={(ids) => saveCertsMutation.mutate(ids)}
                  placeholder="Seleziona certificazioni..."
                  emptyText="Nessuna certificazione trovata"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuggestionDialogOpen(true)}
                className="gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                Suggerisci nuova specializzazione o certificazione
              </Button>
            </CardContent>
          </Card>

          {/* Certificates Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Attestati e Documenti</CardTitle>
              <CardDescription>Carica i tuoi attestati e certificazioni (PDF, JPG, PNG)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome attestato (opzionale)"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="flex-1"
                />
                <input
                  ref={certFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleCertUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => certFileRef.current?.click()}
                  disabled={certUploading}
                  className="gap-2"
                >
                  {certUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Carica
                </Button>
              </div>

              {certificates.length > 0 && (
                <div className="space-y-2">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{cert.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(cert.created_at).toLocaleDateString('it-IT')}
                            {cert.file_type && ` • ${cert.file_type.split('/')[1]?.toUpperCase()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={cert.file_url} target="_blank" rel="noopener noreferrer">Apri</a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteCertMutation.mutate(cert)}
                          disabled={deleteCertMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Località</CardTitle>
              <CardDescription>Dove operi - gli atleti potranno trovarti più facilmente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={requestLocation} disabled={isLocating} className="w-full">
                {isLocating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Navigation className="h-4 w-4 mr-2" />}
                Usa la mia posizione
              </Button>
              <div className="text-center text-sm text-muted-foreground">oppure</div>
              <div className="space-y-2">
                <Label>Cerca indirizzo</Label>
                <PlacesAutocomplete
                  value={formData.location_address || formData.location_city || ''}
                  onChange={(value) => setFormData({ ...formData, location_address: value })}
                  onPlaceSelect={(place) => {
                    // Extract city from formatted address
                    const parts = place.formatted_address.split(',').map(s => s.trim());
                    const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
                    setFormData({
                      ...formData,
                      location_address: place.formatted_address,
                      location_city: city,
                      location_lat: place.geometry.location.lat,
                      location_lng: place.geometry.location.lng,
                    });
                  }}
                  placeholder="Cerca indirizzo o città..."
                  types={['geocode']}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Città</Label>
                  <Input id="city" placeholder="Es: Milano" value={formData.location_city || ''} onChange={(e) => setFormData({ ...formData, location_city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Paese</Label>
                  <Input id="country" placeholder="Es: Italia" value={formData.location_country || ''} onChange={(e) => setFormData({ ...formData, location_country: e.target.value })} />
                </div>
              </div>
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
        <TabsContent value="packages" className="space-y-6"><PTPackagesManager /></TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Euro className="h-5 w-5" />Tariffe</CardTitle><CardDescription>Imposta i tuoi prezzi indicativi</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hourly">Tariffa Oraria (€)</Label>
                <Input id="hourly" type="number" placeholder="Es: 50" value={formData.hourly_rate ?? ''} onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priceMin">Prezzo Minimo (€)</Label>
                  <Input id="priceMin" type="number" placeholder="Es: 30" value={formData.price_min ?? ''} onChange={(e) => setFormData({ ...formData, price_min: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceMax">Prezzo Massimo (€)</Label>
                  <Input id="priceMax" type="number" placeholder="Es: 100" value={formData.price_max ?? ''} onChange={(e) => setFormData({ ...formData, price_max: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Modalità di Servizio</CardTitle><CardDescription>Come offri i tuoi servizi</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Allenamento Online</Label><p className="text-sm text-muted-foreground">Offri sessioni online</p></div>
                <Switch checked={formData.offers_online ?? true} onCheckedChange={(checked) => setFormData({ ...formData, offers_online: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Allenamento di Persona</Label><p className="text-sm text-muted-foreground">Offri sessioni in presenza</p></div>
                <Switch checked={formData.offers_in_person ?? true} onCheckedChange={(checked) => setFormData({ ...formData, offers_in_person: checked })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-6"><PTAvailabilityManager /></TabsContent>

        {/* Visibility Tab */}
        <TabsContent value="visibility" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Visibilità Profilo</CardTitle><CardDescription>Controlla chi può vedere il tuo profilo</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Profilo Pubblico</Label><p className="text-sm text-muted-foreground">Permetti agli atleti di trovarti</p></div>
                <Switch checked={formData.is_discoverable ?? true} onCheckedChange={(checked) => setFormData({ ...formData, is_discoverable: checked })} />
              </div>
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-4">
                <p className="text-sm text-warning"><strong>Nota:</strong> La pubblicazione è soggetta ad approvazione dell'amministrazione.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Stato Profilo</CardTitle><CardDescription>Lo stato attuale del tuo profilo</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${ptProfile?.status === 'attivo' ? 'bg-green-500' : ptProfile?.status === 'in_attesa_approvazione' ? 'bg-yellow-500' : 'bg-muted-foreground'}`} />
                <span className="font-medium capitalize">{ptProfile?.status?.replace('_', ' ') || 'Non definito'}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suggestion Dialog */}
      <Dialog open={suggestionDialogOpen} onOpenChange={setSuggestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggerisci nuova categoria</DialogTitle>
            <DialogDescription>Non trovi quello che cerchi? Suggerisci una nuova specializzazione o certificazione all'amministratore.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button variant={suggestionType === 'specialization' ? 'default' : 'outline'} size="sm" onClick={() => setSuggestionType('specialization')}>Specializzazione</Button>
                <Button variant={suggestionType === 'certification' ? 'default' : 'outline'} size="sm" onClick={() => setSuggestionType('certification')}>Certificazione</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestion-name">Nome *</Label>
              <Input id="suggestion-name" placeholder="Es: Kinesiterapia, EQF Level 4..." value={suggestionName} onChange={(e) => setSuggestionName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestionDialogOpen(false)}>Annulla</Button>
            <Button onClick={() => submitSuggestion.mutate()} disabled={!suggestionName.trim() || submitSuggestion.isPending}>
              {submitSuggestion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Invia Suggerimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PTSettingsPage;
