import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  MapPin, 
  Star, 
  Euro, 
  Filter,
  Globe,
  User,
  Award,
  ChevronRight,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

// =====================================================
// PT DISCOVERY PAGE - Ricerca Personal Trainer
// Pagina pubblica accessibile a tutti
// =====================================================

interface PTProfile {
  id: string;
  user_id: string;
  bio: string | null;
  specializations: string[] | null;
  certifications: string[] | null;
  experience_years: number | null;
  hourly_rate: number | null;
  price_min: number | null;
  price_max: number | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  location_city: string | null;
  location_country: string | null;
  rating_avg: number | null;
  review_count: number | null;
  is_discoverable: boolean | null;
  status: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

const SPECIALIZATIONS = [
  'Bodybuilding',
  'Calisthenics',
  'Functional Training',
  'HIIT',
  'Pilates',
  'Powerlifting',
  'Yoga',
  'Weight Loss',
  'Strength Training',
  'Cardio',
  'Flexibility',
];

export function PTDiscoveryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [inPersonOnly, setInPersonOnly] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price_low' | 'price_high' | 'experience'>('rating');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch discoverable PTs
  const { data: pts = [], isLoading } = useQuery({
    queryKey: ['discoverable-pts'],
    queryFn: async () => {
      const { data: ptData, error } = await supabase
        .from('pt_profiles')
        .select('*')
        .eq('is_discoverable', true)
        .eq('status', 'attivo');

      if (error) throw error;

      // Fetch profiles for each PT
      const enrichedPts = await Promise.all(
        (ptData || []).map(async (pt) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', pt.user_id)
            .single();

          return {
            ...pt,
            profile,
          };
        })
      );

      return enrichedPts as PTProfile[];
    },
  });

  // Filter and sort PTs
  const filteredPts = useMemo(() => {
    let result = pts.filter((pt) => {
      // Search filter
      const fullName = `${pt.profile?.first_name || ''} ${pt.profile?.last_name || ''}`.toLowerCase();
      const bio = (pt.bio || '').toLowerCase();
      const matchesSearch = 
        searchTerm === '' ||
        fullName.includes(searchTerm.toLowerCase()) ||
        bio.includes(searchTerm.toLowerCase()) ||
        pt.specializations?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

      // Specialization filter
      const matchesSpecialization = 
        selectedSpecializations.length === 0 ||
        selectedSpecializations.some(spec => 
          pt.specializations?.map(s => s.toLowerCase()).includes(spec.toLowerCase())
        );

      // Price filter
      const ptMinPrice = pt.price_min || pt.hourly_rate || 0;
      const matchesPrice = ptMinPrice >= priceRange[0] && ptMinPrice <= priceRange[1];

      // Online/In-person filter
      const matchesOnline = !onlineOnly || pt.offers_online;
      const matchesInPerson = !inPersonOnly || pt.offers_in_person;

      // City filter
      const matchesCity = 
        cityFilter === '' ||
        pt.location_city?.toLowerCase().includes(cityFilter.toLowerCase());

      return matchesSearch && matchesSpecialization && matchesPrice && matchesOnline && matchesInPerson && matchesCity;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating_avg || 0) - (a.rating_avg || 0);
        case 'price_low':
          return (a.price_min || a.hourly_rate || 0) - (b.price_min || b.hourly_rate || 0);
        case 'price_high':
          return (b.price_min || b.hourly_rate || 0) - (a.price_min || a.hourly_rate || 0);
        case 'experience':
          return (b.experience_years || 0) - (a.experience_years || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [pts, searchTerm, selectedSpecializations, priceRange, onlineOnly, inPersonOnly, cityFilter, sortBy]);

  const toggleSpecialization = (spec: string) => {
    setSelectedSpecializations(prev =>
      prev.includes(spec)
        ? prev.filter(s => s !== spec)
        : [...prev, spec]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecializations([]);
    setPriceRange([0, 200]);
    setOnlineOnly(false);
    setInPersonOnly(false);
    setCityFilter('');
  };

  const hasActiveFilters = 
    searchTerm !== '' ||
    selectedSpecializations.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 200 ||
    onlineOnly ||
    inPersonOnly ||
    cityFilter !== '';

  return (
    <PublicLayout>
      <div className="container-wide py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Trova il tuo Personal Trainer</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Scopri i migliori personal trainer nella tua zona o online. Filtra per specializzazione, prezzo e disponibilità.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, specializzazione o parola chiave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtri
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Cancella
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* City */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Città
                  </Label>
                  <Input
                    placeholder="Es: Milano"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                  />
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Fascia di prezzo (€/h)
                  </Label>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    max={200}
                    step={10}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>€{priceRange[0]}</span>
                    <span>€{priceRange[1]}+</span>
                  </div>
                </div>

                {/* Availability */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Disponibilità
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Solo Online</span>
                      <Switch
                        checked={onlineOnly}
                        onCheckedChange={setOnlineOnly}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Solo di Persona</span>
                      <Switch
                        checked={inPersonOnly}
                        onCheckedChange={setInPersonOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Specializzazioni
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map((spec) => (
                      <Badge
                        key={spec}
                        variant={selectedSpecializations.includes(spec) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleSpecialization(spec)}
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  className="lg:hidden"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtri
                </Button>
                <p className="text-muted-foreground">
                  {filteredPts.length} Personal Trainer trovati
                </p>
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Migliori Valutazioni</SelectItem>
                  <SelectItem value="price_low">Prezzo: Basso → Alto</SelectItem>
                  <SelectItem value="price_high">Prezzo: Alto → Basso</SelectItem>
                  <SelectItem value="experience">Esperienza</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PT Cards */}
            {isLoading ? (
              <div className="grid gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nessun risultato</h3>
                  <p className="text-muted-foreground">
                    Prova a modificare i filtri di ricerca
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                      Cancella filtri
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredPts.map((pt) => (
                  <Card key={pt.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Avatar */}
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-role-pt/10 text-role-pt text-2xl font-bold">
                          {pt.profile?.first_name?.[0]}{pt.profile?.last_name?.[0]}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <h3 className="text-lg font-semibold">
                                {pt.profile?.first_name} {pt.profile?.last_name}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                {pt.location_city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {pt.location_city}
                                  </span>
                                )}
                                {pt.experience_years && (
                                  <span>{pt.experience_years} anni exp.</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(pt.rating_avg ?? 0) > 0 && (
                                <div className="flex items-center gap-1 bg-warning/10 text-warning px-2 py-1 rounded-md">
                                  <Star className="h-4 w-4 fill-current" />
                                  <span className="font-medium">{pt.rating_avg?.toFixed(1)}</span>
                                  <span className="text-xs text-muted-foreground">({pt.review_count})</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bio */}
                          {pt.bio && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {pt.bio}
                            </p>
                          )}

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {pt.offers_online && (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                Online
                              </Badge>
                            )}
                            {pt.offers_in_person && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                Di Persona
                              </Badge>
                            )}
                            {pt.specializations?.slice(0, 3).map((spec) => (
                              <Badge key={spec} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {(pt.specializations?.length ?? 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(pt.specializations?.length ?? 0) - 3}
                              </Badge>
                            )}
                          </div>

                          {/* Price and Action */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div>
                              {pt.hourly_rate || pt.price_min ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="text-lg font-bold">
                                    €{pt.hourly_rate || pt.price_min}
                                  </span>
                                  <span className="text-sm text-muted-foreground">/ora</span>
                                  {pt.price_max && pt.price_max !== pt.price_min && (
                                    <span className="text-sm text-muted-foreground">
                                      - €{pt.price_max}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Prezzo su richiesta</span>
                              )}
                            </div>
                            <Button asChild>
                              <Link to={`/pts/${pt.user_id}`}>
                                Vedi Profilo
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default PTDiscoveryPage;
