import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { PTMapView } from '@/components/app/PTMapView';
import { 
  Search, 
  MapPin, 
  Star, 
  Euro, 
  Wifi, 
  Users,
  ChevronRight,
  SlidersHorizontal,
  Navigation,
  Loader2,
  Map,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA DISCOVER PAGE - Ricerca PT con GPS & Filtri
// Design: dark theme + lime accent
// =====================================================

const GOOGLE_MAPS_API_KEY = 'AIzaSyA76iVcQpSnl76_G6bJVnEeOUmWVd7278I';

const SPECIALIZATIONS = [
  'Bodybuilding',
  'Crossfit',
  'Yoga',
  'Pilates',
  'Functional Training',
  'Cardio',
  'HIIT',
  'Calisthenics',
  'Powerlifting',
  'Rehab',
];

interface UserLocation {
  lat: number;
  lng: number;
}

interface PTWithDistance {
  id: string;
  user_id: string;
  bio: string | null;
  specializations: string[] | null;
  hourly_rate: number | null;
  rating_avg: number | null;
  review_count: number | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  location_city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  experience_years: number | null;
  is_discoverable: boolean | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  distance?: number | null;
}

// Calculate distance between two points in km (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function AtletaDiscoverPage() {
  const { isConnected } = useAtletaStatus();
  
  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Map state
  const [selectedPT, setSelectedPT] = useState<PTWithDistance | null>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState([0, 150]);
  const [distanceRange, setDistanceRange] = useState(50);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [inPersonOnly, setInPersonOnly] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price'>('rating');

  // Get user location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalizzazione non supportata');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        setLocationError('Impossibile ottenere la posizione');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Fetch PTs
  const { data: pts, isLoading } = useQuery({
    queryKey: ['discover-pts', priceRange, onlineOnly, inPersonOnly],
    queryFn: async () => {
      let query = supabase
        .from('pt_profiles')
        .select(`
          id, 
          user_id, 
          bio, 
          specializations, 
          hourly_rate, 
          rating_avg, 
          review_count, 
          offers_online, 
          offers_in_person, 
          location_city, 
          location_lat, 
          location_lng,
          experience_years, 
          is_discoverable
        `)
        .eq('is_discoverable', true)
        .eq('status', 'attivo');

      // Price filter
      if (priceRange[1] < 150) {
        query = query.lte('hourly_rate', priceRange[1]);
      }
      if (priceRange[0] > 0) {
        query = query.gte('hourly_rate', priceRange[0]);
      }

      // Online/in-person filter
      if (onlineOnly) {
        query = query.eq('offers_online', true);
      }
      if (inPersonOnly) {
        query = query.eq('offers_in_person', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles for each PT
      const ptsWithProfiles = await Promise.all(
        (data || []).map(async (pt) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', pt.user_id)
            .single();
          return { ...pt, profiles: profile };
        })
      );

      return ptsWithProfiles;
    },
  });

  // Filter and sort PTs
  const filteredPts = useMemo((): PTWithDistance[] => {
    if (!pts) return [];

    let filtered: PTWithDistance[] = pts.map(pt => ({ ...pt, distance: undefined }));

    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(pt => {
        const name = `${pt.profiles?.first_name || ''} ${pt.profiles?.last_name || ''}`.toLowerCase();
        const specs = (pt.specializations || []).join(' ').toLowerCase();
        const city = (pt.location_city || '').toLowerCase();
        return name.includes(lowerQuery) || specs.includes(lowerQuery) || city.includes(lowerQuery);
      });
    }

    // Specialization filter
    if (selectedSpecs.length > 0) {
      filtered = filtered.filter(pt => 
        selectedSpecs.some(spec => 
          (pt.specializations || []).some((s: string) => 
            s.toLowerCase().includes(spec.toLowerCase())
          )
        )
      );
    }

    // Distance filter (only if user location available and not online only)
    if (userLocation && !onlineOnly) {
      filtered = filtered.map(pt => {
        if (pt.location_lat && pt.location_lng) {
          const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            pt.location_lat, pt.location_lng
          );
          return { ...pt, distance };
        }
        return { ...pt, distance: null };
      }).filter(pt => 
        pt.offers_online || (pt.distance !== null && pt.distance !== undefined && pt.distance <= distanceRange)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          if (a.distance === null || a.distance === undefined) return 1;
          if (b.distance === null || b.distance === undefined) return -1;
          return (a.distance || 0) - (b.distance || 0);
        case 'price':
          return (a.hourly_rate || 0) - (b.hourly_rate || 0);
        case 'rating':
        default:
          return (b.rating_avg || 0) - (a.rating_avg || 0);
      }
    });

    return filtered;
  }, [pts, searchQuery, selectedSpecs, userLocation, distanceRange, sortBy, onlineOnly]);

  const toggleSpec = (spec: string) => {
    setSelectedSpecs(prev => 
      prev.includes(spec) 
        ? prev.filter(s => s !== spec)
        : [...prev, spec]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPriceRange([0, 150]);
    setDistanceRange(50);
    setOnlineOnly(false);
    setInPersonOnly(false);
    setSelectedSpecs([]);
  };

  const hasActiveFilters = priceRange[0] > 0 || priceRange[1] < 150 || onlineOnly || inPersonOnly || selectedSpecs.length > 0 || distanceRange < 50;

  if (isConnected) {
    return (
      <div className="min-h-screen bg-app-background p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Users className="h-12 w-12 mx-auto text-app-accent mb-4" />
          <h2 className="text-xl font-bold text-app-foreground mb-2">Sei già collegato a un PT</h2>
          <p className="text-app-muted-foreground mb-4">
            Puoi cercare nuovi PT solo dopo aver terminato la connessione attuale
          </p>
          <Button variant="outline" asChild className="border-app-border text-app-foreground">
            <Link to="/app">Torna alla Home</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-background pb-4">
      {/* Header with search */}
      <div className="sticky top-0 z-40 bg-app-background/95 backdrop-blur border-b border-app-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-app-foreground">Trova il tuo PT</h1>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')}>
            <TabsList className="bg-app-muted">
              <TabsTrigger value="list" className="data-[state=active]:bg-app-card">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="map" className="data-[state=active]:bg-app-card">
                <Map className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
            <Input
              placeholder="Cerca per nome, città o skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
            />
          </div>
          
          {/* Location button */}
          <Button
            variant="outline"
            size="icon"
            onClick={requestLocation}
            disabled={isLocating}
            className={cn(
              "border-app-border",
              userLocation && "bg-app-accent text-app-accent-foreground border-app-accent"
            )}
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
          
          {/* Filters */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative border-app-border">
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-app-accent rounded-full" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] bg-app-background border-app-border">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between text-app-foreground">
                  Filtri
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-app-accent">
                      Cancella
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 py-4 overflow-auto">
                {/* Sort */}
                <div className="space-y-3">
                  <Label className="text-app-foreground">Ordina per</Label>
                  <div className="flex gap-2">
                    {[
                      { id: 'rating', label: 'Valutazione' },
                      { id: 'distance', label: 'Distanza' },
                      { id: 'price', label: 'Prezzo' },
                    ].map(opt => (
                      <Button
                        key={opt.id}
                        variant={sortBy === opt.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy(opt.id as any)}
                        className={sortBy === opt.id ? 'bg-app-accent text-app-accent-foreground' : 'border-app-border text-app-foreground'}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Distance range */}
                {userLocation && (
                  <div className="space-y-3">
                    <Label className="text-app-foreground">
                      Distanza massima: {distanceRange} km
                    </Label>
                    <Slider
                      value={[distanceRange]}
                      onValueChange={([val]) => setDistanceRange(val)}
                      min={5}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-app-muted-foreground">
                      <span>5 km</span>
                      <span>50 km</span>
                      <span>100 km</span>
                    </div>
                  </div>
                )}

                {/* Price range */}
                <div className="space-y-3">
                  <Label className="text-app-foreground">
                    Prezzo orario: €{priceRange[0]} - €{priceRange[1] === 150 ? '150+' : priceRange[1]}
                  </Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={150}
                    step={10}
                    className="mt-2"
                  />
                </div>

                {/* Modality */}
                <div className="space-y-3">
                  <Label className="text-app-foreground">Modalità</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="online" className="font-normal text-app-foreground">Solo online</Label>
                      <Switch id="online" checked={onlineOnly} onCheckedChange={setOnlineOnly} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="inperson" className="font-normal text-app-foreground">Solo in presenza</Label>
                      <Switch id="inperson" checked={inPersonOnly} onCheckedChange={setInPersonOnly} />
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                <div className="space-y-3">
                  <Label className="text-app-foreground">Specializzazioni</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map((spec) => (
                      <Badge
                        key={spec}
                        variant={selectedSpecs.includes(spec) ? 'default' : 'outline'}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedSpecs.includes(spec) 
                            ? 'bg-app-accent text-app-accent-foreground' 
                            : 'border-app-border text-app-foreground hover:bg-app-muted'
                        )}
                        onClick={() => toggleSpec(spec)}
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Location status */}
        {userLocation && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 text-sm text-app-accent"
          >
            <Navigation className="h-3 w-3" />
            <span>Posizione attiva - risultati ordinati per distanza</span>
          </motion.div>
        )}

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {(priceRange[0] > 0 || priceRange[1] < 150) && (
              <Badge variant="secondary" className="bg-app-muted text-app-foreground">
                €{priceRange[0]}-{priceRange[1]}
              </Badge>
            )}
            {distanceRange < 50 && userLocation && (
              <Badge variant="secondary" className="bg-app-muted text-app-foreground">
                Entro {distanceRange}km
              </Badge>
            )}
            {onlineOnly && <Badge variant="secondary" className="bg-app-muted text-app-foreground">Online</Badge>}
            {inPersonOnly && <Badge variant="secondary" className="bg-app-muted text-app-foreground">In presenza</Badge>}
            {selectedSpecs.map(spec => (
              <Badge key={spec} variant="secondary" className="bg-app-muted text-app-foreground">{spec}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="h-[60vh]">
          <PTMapView 
            pts={filteredPts}
            userLocation={userLocation}
            selectedPT={selectedPT}
            onPTSelect={setSelectedPT}
          />
        </div>
      )}

      {/* Results */}
      <AnimatePresence mode="popLayout">
        <div className="p-4 space-y-3">
          {/* Results count */}
          <p className="text-sm text-app-muted-foreground">
            {filteredPts.length} PT trovati
          </p>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="bg-app-card border-app-border">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-full bg-app-muted" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32 bg-app-muted" />
                      <Skeleton className="h-4 w-48 bg-app-muted" />
                      <Skeleton className="h-4 w-24 bg-app-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredPts.length > 0 ? (
            filteredPts.map((pt, index) => (
              <motion.div
                key={pt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/app/pt/${pt.user_id}`}>
                  <Card className="bg-app-card border-app-border hover:border-app-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Avatar className="h-16 w-16 border-2 border-app-border">
                          <AvatarImage src={pt.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-app-muted text-app-foreground text-lg">
                            {(pt.profiles?.first_name?.[0] || '') + (pt.profiles?.last_name?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-app-foreground truncate">
                              {pt.profiles?.first_name} {pt.profiles?.last_name}
                            </h3>
                            <ChevronRight className="h-5 w-5 text-app-muted-foreground flex-shrink-0" />
                          </div>
                          
                          {/* Rating & Reviews */}
                          {pt.rating_avg && pt.rating_avg > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 fill-app-accent text-app-accent" />
                              <span className="font-medium text-app-foreground">{pt.rating_avg.toFixed(1)}</span>
                              <span className="text-app-muted-foreground">({pt.review_count})</span>
                            </div>
                          )}
                          
                          {/* Location, Distance & Price */}
                          <div className="flex items-center gap-3 text-sm text-app-muted-foreground mt-1">
                            {pt.location_city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {pt.location_city}
                              </span>
                            )}
                            {pt.distance !== undefined && pt.distance !== null && (
                              <span className="flex items-center gap-1 text-app-accent">
                                <Navigation className="h-3 w-3" />
                                {pt.distance.toFixed(1)} km
                              </span>
                            )}
                            {pt.hourly_rate && (
                              <span className="flex items-center gap-1">
                                <Euro className="h-3 w-3" />
                                {pt.hourly_rate}/h
                              </span>
                            )}
                            {pt.offers_online && (
                              <Wifi className="h-3 w-3 text-app-accent" />
                            )}
                          </div>
                          
                          {/* Specializations */}
                          {pt.specializations && pt.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pt.specializations.slice(0, 3).map((spec: string, i: number) => (
                                <Badge 
                                  key={i} 
                                  variant="secondary" 
                                  className="text-xs bg-app-muted text-app-foreground"
                                >
                                  {spec}
                                </Badge>
                              ))}
                              {pt.specializations.length > 3 && (
                                <Badge variant="secondary" className="text-xs bg-app-muted text-app-foreground">
                                  +{pt.specializations.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Search className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
              <h3 className="font-semibold text-app-foreground mb-2">Nessun PT trovato</h3>
              <p className="text-app-muted-foreground text-sm">
                Prova a modificare i filtri di ricerca
              </p>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
}

export default AtletaDiscoverPage;
