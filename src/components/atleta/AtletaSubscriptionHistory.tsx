import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Dumbbell,
} from 'lucide-react';

// =====================================================
// ATLETA SUBSCRIPTION HISTORY - Dashboard abbonamenti
// =====================================================

interface PTSubscription {
  id: string;
  pt_user_id: string;
  package_id: string | null;
  status: 'attivo' | 'completato' | 'scaduto' | 'cancellato';
  sessions_total: number | null;
  sessions_used: number | null;
  expires_at: string | null;
  started_at: string;
  price_paid: number;
  currency: string;
  notes: string | null;
  created_at: string;
  pt_packages: {
    name: string;
    package_type: string;
    sessions_count: number | null;
    duration_days: number | null;
  } | null;
  pt_profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function AtletaSubscriptionHistory() {
  const { user } = useAuth();

  // Fetch subscriptions
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['atleta-pt-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('atleta_pt_subscriptions')
        .select(`
          *,
          pt_packages (name, package_type, sessions_count, duration_days)
        `)
        .eq('atleta_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch PT profiles for each subscription
      const subscriptionsWithProfiles = await Promise.all(
        (data || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', sub.pt_user_id)
            .maybeSingle();

          return {
            ...sub,
            pt_profile: profile,
          };
        })
      );

      return subscriptionsWithProfiles as PTSubscription[];
    },
    enabled: !!user?.id,
  });

  const activeSubscriptions = subscriptions?.filter((s) => s.status === 'attivo') || [];
  const historySubscriptions = subscriptions?.filter((s) => s.status !== 'attivo') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attivo':
        return (
          <Badge className="bg-app-accent/20 text-app-accent border-app-accent/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Attivo
          </Badge>
        );
      case 'completato':
        return (
          <Badge className="bg-white/10 text-white/70 border-white/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completato
          </Badge>
        );
      case 'scaduto':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Scaduto
          </Badge>
        );
      case 'cancellato':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Cancellato
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full bg-white/10" />
        <Skeleton className="h-32 w-full bg-white/10" />
        <Skeleton className="h-32 w-full bg-white/10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-app-accent" />
              <span className="text-2xl font-bold text-white">{subscriptions?.length || 0}</span>
            </div>
            <p className="text-xs text-white/50 mt-1">Totali</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-app-accent" />
              <span className="text-2xl font-bold text-white">{activeSubscriptions.length}</span>
            </div>
            <p className="text-xs text-white/50 mt-1">Attivi</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Abbonamenti attivi
          </h3>
          {activeSubscriptions.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} getStatusBadge={getStatusBadge} featured />
          ))}
        </div>
      )}

      {/* History */}
      {historySubscriptions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <History className="h-4 w-4" />
            Storico
          </h3>
          {historySubscriptions.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} getStatusBadge={getStatusBadge} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!subscriptions || subscriptions.length === 0) && (
        <Card className="border-dashed border-white/10 bg-white/5">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-white/30 mb-4" />
            <h3 className="font-semibold text-white mb-2">Nessun abbonamento</h3>
            <p className="text-sm text-white/50">
              Quando acquisterai un pacchetto dal tuo PT, apparirà qui
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubscriptionCard({
  subscription: sub,
  getStatusBadge,
  featured = false,
}: {
  subscription: PTSubscription;
  getStatusBadge: (status: string) => React.ReactNode;
  featured?: boolean;
}) {
  const ptName =
    `${sub.pt_profile?.first_name || ''} ${sub.pt_profile?.last_name || ''}`.trim() || 'Personal Trainer';
  const ptInitials = `${sub.pt_profile?.first_name?.[0] || ''}${sub.pt_profile?.last_name?.[0] || ''}`;
  const isSessionBased = sub.sessions_total !== null;
  const sessionsRemaining = isSessionBased ? (sub.sessions_total || 0) - (sub.sessions_used || 0) : null;
  const progressPercent =
    isSessionBased && sub.sessions_total ? ((sub.sessions_used || 0) / sub.sessions_total) * 100 : 0;

  return (
    <Card className={`${featured ? 'bg-gradient-to-br from-app-accent/10 to-app-accent/5 border-app-accent/20' : 'bg-white/5 border-white/10'}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          {/* PT info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={sub.pt_profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-white/10 text-white">{ptInitials || 'PT'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-white truncate">{ptName}</h4>
              <p className="text-sm text-white/50 truncate">
                {sub.pt_packages?.name || 'Pacchetto custom'}
              </p>
            </div>
          </div>

          {getStatusBadge(sub.status)}
        </div>

        {/* Details */}
        <div className="mt-4 space-y-3">
          {isSessionBased ? (
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/50">Sessioni</span>
                <span className="font-medium text-white">
                  {sub.sessions_used || 0} / {sub.sessions_total}
                  <span className="text-white/50 ml-1">({sessionsRemaining} rimanenti)</span>
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-white/10" />
            </div>
          ) : sub.expires_at ? (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Calendar className="h-4 w-4 text-white/50" />
              <span>Scade il {format(new Date(sub.expires_at), 'dd MMM yyyy', { locale: it })}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-white/50">
              <Clock className="h-4 w-4" />
              <span>Dal {format(new Date(sub.started_at), 'dd MMM yyyy', { locale: it })}</span>
            </div>
            <span className="font-semibold text-white">€{sub.price_paid.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AtletaSubscriptionHistory;
