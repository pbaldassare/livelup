import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  Euro, 
  Wifi, 
  Users,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA DISCOVER PAGE - Ricerca PT (Mobile)
// =====================================================

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

export function AtletaDiscoverPage() {
  const { isConnected } = useAtletaStatus();
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState([0, 150]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [inPersonOnly, setInPersonOnly] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  // Fetch PTs
  const { data: pts, isLoading } = useQuery({
    queryKey: ['discover-pts', searchQuery, priceRange, onlineOnly, inPersonOnly, selectedSpecs],
    queryFn: async () => {
      let query = supabase
        .from('pt_profiles')
        .select('id, user_id, bio, specializations, hourly_rate, rating_avg, review_count, offers_online, offers_in_person, location_city, experience_years, is_discoverable')
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

      const { data, error } = await query.order('rating_avg', { ascending: false });

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

      // Client-side filtering for search and specializations
      let filtered = ptsWithProfiles;
      
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(pt => {
          const name = `${pt.profiles?.first_name || ''} ${pt.profiles?.last_name || ''}`.toLowerCase();
          const specs = (pt.specializations || []).join(' ').toLowerCase();
          return name.includes(lowerQuery) || specs.includes(lowerQuery);
        });
      }

      if (selectedSpecs.length > 0) {
        filtered = filtered.filter(pt => 
          selectedSpecs.some(spec => 
            (pt.specializations || []).some((s: string) => 
              s.toLowerCase().includes(spec.toLowerCase())
            )
          )
        );
      }

      return filtered;
    },
  });

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
    setOnlineOnly(false);
    setInPersonOnly(false);
    setSelectedSpecs([]);
  };

  const hasActiveFilters = priceRange[0] > 0 || priceRange[1] < 150 || onlineOnly || inPersonOnly || selectedSpecs.length > 0;

  if (isConnected) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-xl font-bold mb-2">Sei già collegato a un PT</h2>
          <p className="text-muted-foreground mb-4">
            Puoi cercare nuovi PT solo dopo aver terminato la connessione attuale
          </p>
          <Button variant="outline" asChild>
            <Link to="/app">Torna alla Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header with search */}
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4 space-y-3">
        <h1 className="text-xl font-bold">Trova il tuo PT</h1>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o specializzazione..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  Filtri
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Cancella
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 py-4 overflow-auto">
                {/* Price range */}
                <div className="space-y-3">
                  <Label>Prezzo orario: €{priceRange[0]} - €{priceRange[1] === 150 ? '150+' : priceRange[1]}</Label>
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
                  <Label>Modalità</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="online" className="font-normal">Solo online</Label>
                      <Switch id="online" checked={onlineOnly} onCheckedChange={setOnlineOnly} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="inperson" className="font-normal">Solo in presenza</Label>
                      <Switch id="inperson" checked={inPersonOnly} onCheckedChange={setInPersonOnly} />
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                <div className="space-y-3">
                  <Label>Specializzazioni</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map((spec) => (
                      <Badge
                        key={spec}
                        variant={selectedSpecs.includes(spec) ? 'default' : 'outline'}
                        className="cursor-pointer"
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

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {priceRange[0] > 0 || priceRange[1] < 150 ? (
              <Badge variant="secondary">
                €{priceRange[0]}-{priceRange[1]}
              </Badge>
            ) : null}
            {onlineOnly && <Badge variant="secondary">Online</Badge>}
            {inPersonOnly && <Badge variant="secondary">In presenza</Badge>}
            {selectedSpecs.map(spec => (
              <Badge key={spec} variant="secondary">{spec}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : pts && pts.length > 0 ? (
          pts.map((pt) => (
            <Link key={pt.id} to={`/app/pt/${pt.user_id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={pt.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {(pt.profiles?.first_name?.[0] || '') + (pt.profiles?.last_name?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold truncate">
                          {pt.profiles?.first_name} {pt.profiles?.last_name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      {/* Rating & Reviews */}
                      {pt.rating_avg && pt.rating_avg > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="font-medium">{pt.rating_avg.toFixed(1)}</span>
                          <span className="text-muted-foreground">({pt.review_count})</span>
                        </div>
                      )}
                      
                      {/* Location & Price */}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {pt.location_city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {pt.location_city}
                          </span>
                        )}
                        {pt.hourly_rate && (
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {pt.hourly_rate}/h
                          </span>
                        )}
                        {pt.offers_online && (
                          <Wifi className="h-3 w-3" />
                        )}
                      </div>
                      
                      {/* Specializations */}
                      {pt.specializations && pt.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pt.specializations.slice(0, 3).map((spec: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {pt.specializations.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
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
          ))
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nessun PT trovato</h3>
            <p className="text-muted-foreground text-sm">
              Prova a modificare i filtri di ricerca
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AtletaDiscoverPage;
