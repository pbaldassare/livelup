import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Package,
  Star,
  MessageSquare,
  Video,
  Calendar,
  Dumbbell,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Ticket,
  ChevronRight,
} from 'lucide-react';

// =====================================================
// PT PACKAGES SECTION - Visualizzazione pacchetti atleta
// =====================================================

interface PTPackagesSectionProps {
  ptUserId: string;
  isConnected: boolean;
}

export function PTPackagesSection({ ptUserId, isConnected }: PTPackagesSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch PT packages
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['pt-packages-public', ptUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_packages')
        .select('*')
        .eq('pt_user_id', ptUserId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!ptUserId && isConnected,
  });

  // Fetch active subscription with this PT
  const { data: activeSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['atleta-pt-subscription', user?.id, ptUserId],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('atleta_pt_subscriptions')
        .select(`
          *,
          pt_packages (name, package_type, sessions_count, duration_days)
        `)
        .eq('atleta_user_id', user.id)
        .eq('pt_user_id', ptUserId)
        .eq('status', 'attivo')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!ptUserId && isConnected,
  });

  // Coupons available from this PT (RLS-scoped)
  const { data: availableCoupons = [] } = useQuery({
    queryKey: ['pt-available-coupons', ptUserId, user?.id],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, valid_until')
        .eq('pt_user_id', ptUserId)
        .eq('is_active', true)
        .lte('valid_from', nowIso);
      if (error) throw error;
      return (data || []).filter((c) => !c.valid_until || new Date(c.valid_until) > new Date());
    },
    enabled: !!user?.id && !!ptUserId && isConnected,
  });

  // Request purchase mutation
  const requestPurchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      if (!user?.id) throw new Error('Utente non autenticato');

      // Get package details for notification
      const pkg = packages?.find((p) => p.id === packageId);

      // Create notification for PT
      const { error } = await supabase.from('notifications').insert({
        user_id: ptUserId,
        type: 'package_purchase_request',
        title: 'Richiesta acquisto pacchetto',
        body: `Un atleta vuole acquistare: ${pkg?.name || 'Pacchetto'}`,
        data: { package_id: packageId, atleta_user_id: user.id },
        action_url: '/pt/athletes?tab=subscriptions',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Richiesta inviata al tuo PT!');
      queryClient.invalidateQueries({ queryKey: ['atleta-pt-subscription'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante la richiesta');
    },
  });

  // Don't show if not connected
  if (!isConnected) {
    return null;
  }

  const isLoading = packagesLoading || subscriptionLoading;

  if (isLoading) {
    return (
      <Card className="mx-4 mb-4 bg-app-card border-app-border">
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-app-muted" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full bg-app-muted" />
          <Skeleton className="h-24 w-full bg-app-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-4 mb-4 space-y-4">
      {/* Active Subscription Banner */}
      {activeSubscription && (
        <Card className="bg-app-accent/10 border-app-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-app-foreground">
              <CheckCircle2 className="h-4 w-4 text-app-accent" />
              Il tuo abbonamento attivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-app-foreground">
                  {activeSubscription.pt_packages?.name || 'Pacchetto custom'}
                </span>
                <Badge className="bg-app-accent text-app-accent-foreground">
                  Attivo
                </Badge>
              </div>

              {activeSubscription.sessions_total !== null ? (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-app-muted-foreground">Sessioni utilizzate</span>
                    <span className="font-medium text-app-foreground">
                      {activeSubscription.sessions_used || 0} / {activeSubscription.sessions_total}
                    </span>
                  </div>
                  <Progress
                    value={
                      ((activeSubscription.sessions_used || 0) /
                        activeSubscription.sessions_total) *
                      100
                    }
                    className="h-2 bg-app-muted [&>div]:bg-app-accent"
                  />
                  <p className="text-xs text-app-muted-foreground mt-1">
                    {(activeSubscription.sessions_total || 0) -
                      (activeSubscription.sessions_used || 0)}{' '}
                    sessioni rimanenti
                  </p>
                </div>
              ) : activeSubscription.expires_at ? (
                <div className="flex items-center gap-2 text-sm text-app-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Scade il{' '}
                    {format(new Date(activeSubscription.expires_at), 'dd MMMM yyyy', {
                      locale: it,
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Packages */}
      {packages && packages.length > 0 && (
        <Card className="bg-app-card border-app-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-app-foreground">
              <Package className="h-4 w-4 text-app-accent" />
              Pacchetti disponibili
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {packages.map((pkg) => {
              const isSessionBased = pkg.package_type === 'sessioni';

              return (
                <div
                  key={pkg.id}
                  className="border border-app-border bg-app-muted/50 rounded-xl p-4 space-y-3 relative"
                >
                  {/* Featured badge */}
                  {pkg.is_featured && (
                    <Badge
                      className="absolute -top-2 -right-2 bg-app-accent text-app-accent-foreground"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      In evidenza
                    </Badge>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-app-foreground">{pkg.name}</h4>
                      <p className="text-sm text-app-muted-foreground">
                        {isSessionBased
                          ? `${pkg.sessions_count} sessioni`
                          : pkg.duration_days
                          ? `${pkg.duration_days} giorni`
                          : pkg.package_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-app-foreground">€{pkg.price}</span>
                      {!isSessionBased && pkg.duration_days && (
                        <p className="text-xs text-app-muted-foreground">
                          {(pkg.price / (pkg.duration_days / 30)).toFixed(0)}€/mese
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <p className="text-sm text-app-muted-foreground">{pkg.description}</p>
                  )}

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {pkg.includes_chat && (
                      <Badge variant="outline" className="text-xs border-app-border text-app-muted-foreground">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Chat inclusa
                      </Badge>
                    )}
                    {pkg.includes_video_calls && (
                      <Badge variant="outline" className="text-xs border-app-border text-app-muted-foreground">
                        <Video className="h-3 w-3 mr-1" />
                        Video call
                      </Badge>
                    )}
                    {pkg.max_workouts_per_week && (
                      <Badge variant="outline" className="text-xs border-app-border text-app-muted-foreground">
                        <Dumbbell className="h-3 w-3 mr-1" />
                        Max {pkg.max_workouts_per_week}/sett
                      </Badge>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                    onClick={() => requestPurchaseMutation.mutate(pkg.id)}
                    disabled={requestPurchaseMutation.isPending || !!activeSubscription}
                  >
                    {requestPurchaseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : activeSubscription ? (
                      <Clock className="h-4 w-4 mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {activeSubscription ? 'Abbonamento attivo' : 'Richiedi acquisto'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Empty state if no packages */}
      {(!packages || packages.length === 0) && !activeSubscription && (
        <Card className="border-dashed border-app-border bg-app-card/50">
          <CardContent className="py-8 text-center">
            <Package className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
            <p className="text-sm text-app-muted-foreground">
              Nessun pacchetto disponibile al momento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PTPackagesSection;
