import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AthleteSubscriptionsTab } from '@/components/pt/AthleteSubscriptionsTab';
import { 
  Users, 
  Search, 
  MessageSquare, 
  Dumbbell,
  ChevronRight,
  Clock,
  CheckCircle2,
  UserPlus,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// PT APP ATHLETES PAGE - Lista atleti (Mobile)
// =====================================================

export function PTAppAthletesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch connections
  const { data: connections, isLoading } = useQuery({
    queryKey: ['pt-connections', user?.id, activeTab],
    queryFn: async () => {
      if (!user?.id) return [];

      const status = activeTab === 'active' ? 'active' : 'pending';

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, atleta_user_id, status, created_at, accepted_at')
        .eq('pt_user_id', user.id)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each connection
      const connectionsWithProfiles = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, email')
            .eq('user_id', conn.atleta_user_id)
            .single();

          const { data: atletaProfile } = await supabase
            .from('atleta_profiles')
            .select('fitness_level, goals')
            .eq('user_id', conn.atleta_user_id)
            .single();

          return {
            ...conn,
            profiles: profile,
            atleta_profiles: atletaProfile,
          };
        })
      );

      return connectionsWithProfiles;
    },
    enabled: !!user?.id,
  });

  // Filter by search
  const filteredConnections = connections?.filter(conn => {
    if (!searchQuery) return true;
    const name = `${conn.profiles?.first_name || ''} ${conn.profiles?.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const activeCount = connections?.length || 0;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">I miei atleti</h1>
          <Badge variant="secondary">{activeCount}</Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Attivi</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">Richieste</TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex-1 gap-1">
            <Package className="h-3 w-3" />
            Abbonamenti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : filteredConnections && filteredConnections.length > 0 ? (
            filteredConnections.map((conn) => (
              <AthleteCard key={conn.id} connection={conn} type="active" />
            ))
          ) : (
            <EmptyState type="active" />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : filteredConnections && filteredConnections.length > 0 ? (
            filteredConnections.map((conn) => (
              <AthleteCard key={conn.id} connection={conn} type="pending" />
            ))
          ) : (
            <EmptyState type="pending" />
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <AthleteSubscriptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AthleteCard({ connection, type }: { connection: any; type: 'active' | 'pending' }) {
  const name = `${connection.profiles?.first_name || ''} ${connection.profiles?.last_name || ''}`.trim() || 'Atleta';
  const initials = `${connection.profiles?.first_name?.[0] || ''}${connection.profiles?.last_name?.[0] || ''}`;

  return (
    <Link to={`/pt/app/athlete/${connection.atleta_user_id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={connection.profiles?.avatar_url || undefined} />
              <AvatarFallback>{initials || 'A'}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate">{name}</h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                {connection.atleta_profiles?.fitness_level && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {connection.atleta_profiles.fitness_level}
                  </Badge>
                )}
                {type === 'pending' && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    In attesa
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {type === 'active' && (
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link to={`/pt/app/chat/${connection.atleta_user_id}`} onClick={(e) => e.stopPropagation()}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Chat
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link to={`/pt/app/athlete/${connection.atleta_user_id}/workouts`} onClick={(e) => e.stopPropagation()}>
                  <Dumbbell className="h-4 w-4 mr-1" />
                  Schede
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ type }: { type: 'active' | 'pending' }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        {type === 'active' ? (
          <>
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nessun atleta attivo</h3>
            <p className="text-sm text-muted-foreground">
              I tuoi atleti collegati appariranno qui
            </p>
          </>
        ) : (
          <>
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nessuna richiesta</h3>
            <p className="text-sm text-muted-foreground">
              Le richieste di connessione appariranno qui
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PTAppAthletesPage;
