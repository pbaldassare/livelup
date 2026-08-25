import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getMyGroups, searchGroups } from '@/lib/api/groups';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupDisciplinePicker } from '@/components/groups/GroupDisciplinePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Plus, Search, Users, Navigation, Loader2, ChevronLeft } from 'lucide-react';
import { ListSkeleton } from '@/components/skeletons';

interface GroupsHubPageProps {
  basePath: string;
}

export function GroupsHubPage({ basePath }: GroupsHubPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPtApp = basePath.startsWith('/pt/app');
  const isAtletaSurface = basePath.startsWith('/app');
  const [tab, setTab] = useState('mine');
  const [query, setQuery] = useState('');
  const [disciplineIds, setDisciplineIds] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(50);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: myGroups = [], isLoading: mineLoading } = useQuery({
    queryKey: ['my-groups', user?.id],
    queryFn: () => getMyGroups(user!.id),
    enabled: !!user?.id,
  });

  const { data: discoverGroups = [], isLoading: discoverLoading } = useQuery({
    queryKey: ['search-groups', query, disciplineIds, userLocation, maxDistance],
    queryFn: () =>
      searchGroups(
        {
          query,
          disciplineIds: disciplineIds.length ? disciplineIds : undefined,
          userLat: userLocation?.lat,
          userLng: userLocation?.lng,
          maxDistanceKm: userLocation ? maxDistance : undefined,
        },
        user?.id,
      ),
    enabled: tab === 'discover',
    placeholderData: keepPreviousData,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
    );
  };

  return (
    <div className="min-h-screen bg-app-background pb-24">
      <div className="sticky top-0 z-40 bg-app-background/95 backdrop-blur border-b border-app-border p-4 safe-top">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 min-w-0">
            {isPtApp && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 -ml-2 text-app-foreground hover:text-app-accent"
                aria-label="Indietro"
                onClick={() => navigate('/pt/app')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-app-foreground">Gruppi</h1>
              <p className="text-xs text-app-muted-foreground">
                Crea, cerca e unisciti a community sportive
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-app-accent text-black shrink-0">
            <Link to={`${basePath}/new`}>
              <Plus className="h-4 w-4 mr-1" />
              Crea
            </Link>
          </Button>
        </div>
      </div>

      <div className="p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="mine" className="gap-1">
              <Users className="h-4 w-4" />
              I miei
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-1">
              <Search className="h-4 w-4" />
              Scopri
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="space-y-4">
            {mineLoading && <ListSkeleton count={3} type="chat" />}
            {!mineLoading && myGroups.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <Users className="h-12 w-12 mx-auto text-app-muted-foreground" />
                <p className="text-app-muted-foreground">Non fai parte di nessun gruppo</p>
                <Button asChild variant="outline">
                  <Link to={`${basePath}/new`}>Crea il primo gruppo</Link>
                </Button>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {myGroups.map((g) => (
                <GroupCard key={g.id} group={g} basePath={basePath} showFollowStar={isAtletaSurface} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca per nome..."
                  className="pl-9 bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Discipline</Label>
                <GroupDisciplinePicker value={disciplineIds} onChange={setDisciplineIds} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-app-foreground">Raggio: {maxDistance} km</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={requestLocation}
                    disabled={locating}
                  >
                    {locating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Navigation className="h-3 w-3" />
                    )}
                    <span className="ml-1">{userLocation ? 'Aggiorna posizione' : 'Usa posizione'}</span>
                  </Button>
                </div>
                <Slider
                  value={[maxDistance]}
                  onValueChange={([v]) => {
                    if (typeof v === 'number') setMaxDistance(v);
                  }}
                  min={5}
                  max={200}
                  step={5}
                  aria-label="Raggio di ricerca in chilometri"
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-app-muted-foreground">
                  <span>5 km</span>
                  <span>200 km</span>
                </div>
                <p className="text-[10px] text-app-muted-foreground">
                  {userLocation
                    ? `Gruppi entro ${maxDistance} km dalla tua posizione`
                    : 'Scegli il raggio, poi tocca «Usa posizione» per filtrare i gruppi vicini'}
                </p>
              </div>
            </div>

            {discoverLoading && <ListSkeleton count={3} type="chat" />}
            {!discoverLoading && discoverGroups.length === 0 && (
              <p className="text-center text-app-muted-foreground py-8">
                Nessun gruppo trovato
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {discoverGroups.map((g) => (
                <GroupCard key={g.id} group={g} basePath={basePath} showFollowStar={isAtletaSurface} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
