import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AtletaSubscriptionHistory } from '@/components/atleta/AtletaSubscriptionHistory';
import { 
  CreditCard, 
  Check, 
  Star, 
  Crown, 
  ChevronLeft,
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// ATLETA SUBSCRIPTION PAGE - Abbonamento
// Design: dark theme, lime accent
// =====================================================

interface Subscription {
  id: string;
  status: string;
  subscription_type: string;
  started_at: string;
  expires_at: string | null;
  next_billing_at: string | null;
  trial_ends_at: string | null;
  price_monthly: number | null;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  is_featured: boolean;
}

export function AtletaSubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('abbonamenti');

  // Fetch current subscription
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['atleta-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Subscription | null;
    },
    enabled: !!user?.id,
  });

  // Fetch available plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans-atleta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('target_role', 'atleta')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
      })) as Plan[];
    },
  });

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async (planId: string) => {
      // In a real app, this would redirect to Stripe Checkout
      toast.info('Integrazione pagamenti in arrivo!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atleta-subscription'] });
    },
  });

  const isLoading = subLoading || plansLoading;
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isTrial = subscription?.status === 'trialing';
  const isExpired = subscription?.status === 'expired' || subscription?.status === 'cancelled';

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    active: { label: 'Attivo', color: 'bg-green-500', icon: Check },
    trialing: { label: 'Prova gratuita', color: 'bg-blue-500', icon: Clock },
    expired: { label: 'Scaduto', color: 'bg-red-500', icon: AlertTriangle },
    cancelled: { label: 'Cancellato', color: 'bg-gray-500', icon: AlertTriangle },
    pending: { label: 'In attesa', color: 'bg-yellow-500', icon: Clock },
  };

  const currentStatus = subscription?.status ? statusConfig[subscription.status] : null;

  return (
    <div className="min-h-screen bg-app-background text-app-foreground pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-app-background/95 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white/60"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold">Abbonamento</h1>
        </div>
      </div>

      <main className="px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full bg-white/10" />
            <Skeleton className="h-64 w-full bg-white/10" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-white/5">
              <TabsTrigger value="abbonamenti" className="flex-1 gap-1">
                <Package className="h-4 w-4" />
                I miei PT
              </TabsTrigger>
              <TabsTrigger value="piani" className="flex-1 gap-1">
                <Crown className="h-4 w-4" />
                Piani app
              </TabsTrigger>
            </TabsList>

            {/* PT Subscriptions Tab */}
            <TabsContent value="abbonamenti" className="mt-4">
              <AtletaSubscriptionHistory />
            </TabsContent>

            {/* App Plans Tab */}
            <TabsContent value="piani" className="mt-4 space-y-6">
              {/* Current Subscription Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-app-accent" />
                        Il tuo abbonamento app
                      </CardTitle>
                      {currentStatus && (
                        <Badge 
                          className={`${currentStatus.color} text-white`}
                        >
                          {currentStatus.label}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {subscription ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-white/50">Piano</p>
                            <p className="font-medium text-white capitalize">
                              {subscription.subscription_type?.replace('_', ' ') || 'Free'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50">Prezzo</p>
                            <p className="font-medium text-white">
                              {subscription.price_monthly 
                                ? `€${subscription.price_monthly}/mese` 
                                : 'Gratuito'}
                            </p>
                          </div>
                        </div>

                        {isTrial && subscription.trial_ends_at && (
                          <Alert className="bg-blue-500/10 border-blue-500/20">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <AlertTitle className="text-blue-400">Periodo di prova</AlertTitle>
                            <AlertDescription className="text-blue-300/80">
                              Scade il {format(new Date(subscription.trial_ends_at), "d MMMM yyyy", { locale: it })}
                            </AlertDescription>
                          </Alert>
                        )}

                        {isExpired && (
                          <Alert className="bg-red-500/10 border-red-500/20">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <AlertTitle className="text-red-400">Abbonamento scaduto</AlertTitle>
                            <AlertDescription className="text-red-300/80">
                              Rinnova il tuo abbonamento per continuare ad utilizzare tutte le funzionalità.
                            </AlertDescription>
                          </Alert>
                        )}

                        {subscription.next_billing_at && (
                          <div className="text-sm text-white/50">
                            Prossimo rinnovo: {format(new Date(subscription.next_billing_at), "d MMMM yyyy", { locale: it })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-white/60">Nessun abbonamento attivo</p>
                        <p className="text-sm text-white/40 mt-1">
                          Scegli un piano per sbloccare tutte le funzionalità
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Available Plans */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Piani disponibili</h2>
                
                {plans.length === 0 ? (
                  <Card className="bg-gray-900/60 border-white/10">
                    <CardContent className="py-8 text-center">
                      <p className="text-white/50">Nessun piano disponibile al momento</p>
                    </CardContent>
                  </Card>
                ) : (
                  plans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card 
                        className={`bg-gray-900/60 border transition-all cursor-pointer ${
                          plan.is_featured 
                            ? 'border-app-accent ring-1 ring-app-accent/50' 
                            : 'border-white/10 hover:border-white/20'
                        } ${selectedPlan === plan.id ? 'ring-2 ring-app-accent' : ''}`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-white flex items-center gap-2">
                              {plan.is_featured && <Crown className="h-5 w-5 text-app-accent" />}
                              {plan.name}
                            </CardTitle>
                            {plan.is_featured && (
                              <Badge className="bg-app-accent text-black">Consigliato</Badge>
                            )}
                          </div>
                          {plan.description && (
                            <CardDescription className="text-white/60">
                              {plan.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-3xl font-bold text-white">€{plan.price_monthly}</span>
                            <span className="text-white/50">/mese</span>
                          </div>

                          <div className="space-y-2">
                            {plan.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                                <Check className="h-4 w-4 text-app-accent flex-shrink-0" />
                                <span>{String(feature)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className={`w-full ${
                              plan.is_featured 
                                ? 'bg-app-accent hover:bg-app-accent/90 text-black' 
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              upgradeMutation.mutate(plan.id);
                            }}
                            disabled={upgradeMutation.isPending}
                          >
                            {subscription?.subscription_type === plan.name.toLowerCase() 
                              ? 'Piano attuale' 
                              : 'Scegli questo piano'
                            }
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Security Note */}
              <div className="flex items-center gap-2 text-xs text-white/40 justify-center">
                <Shield className="h-4 w-4" />
                <span>Pagamenti sicuri con Stripe</span>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default AtletaSubscriptionPage;
