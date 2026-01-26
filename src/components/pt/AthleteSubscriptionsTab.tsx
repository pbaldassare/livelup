import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Package,
  Calendar,
  Clock,
  MoreVertical,
  Plus,
  CalendarPlus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  PlusCircle,
} from 'lucide-react';
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog';

// =====================================================
// ATHLETE SUBSCRIPTIONS TAB - Gestione abbonamenti PT
// =====================================================

interface AthleteSubscription {
  id: string;
  atleta_user_id: string;
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
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

export function AthleteSubscriptionsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{
    type: 'add_sessions' | 'extend' | 'complete' | 'cancel' | null;
    subscription: AthleteSubscription | null;
  }>({ type: null, subscription: null });
  const [actionValue, setActionValue] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Fetch subscriptions
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['pt-athlete-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('atleta_pt_subscriptions')
        .select(`
          *,
          pt_packages (name, package_type, sessions_count, duration_days)
        `)
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each subscription
      const subscriptionsWithProfiles = await Promise.all(
        (data || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, email')
            .eq('user_id', sub.atleta_user_id)
            .maybeSingle();

          return {
            ...sub,
            profiles: profile,
          };
        })
      );

      return subscriptionsWithProfiles as AthleteSubscription[];
    },
    enabled: !!user?.id,
  });

  // Update subscription mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from('atleta_pt_subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Abbonamento aggiornato');
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-subscriptions'] });
      setActionDialog({ type: null, subscription: null });
      setActionValue('');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleAction = () => {
    if (!actionDialog.subscription) return;

    const { type, subscription } = actionDialog;

    switch (type) {
      case 'add_sessions':
        const sessionsToAdd = parseInt(actionValue);
        if (isNaN(sessionsToAdd) || sessionsToAdd <= 0) {
          toast.error('Inserisci un numero valido di sessioni');
          return;
        }
        updateMutation.mutate({
          id: subscription.id,
          updates: {
            sessions_total: (subscription.sessions_total || 0) + sessionsToAdd,
            status: 'attivo', // Riattiva se era completato
          },
        });
        break;

      case 'extend':
        const daysToAdd = parseInt(actionValue);
        if (isNaN(daysToAdd) || daysToAdd <= 0) {
          toast.error('Inserisci un numero valido di giorni');
          return;
        }
        const currentExpiry = subscription.expires_at
          ? new Date(subscription.expires_at)
          : new Date();
        currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
        updateMutation.mutate({
          id: subscription.id,
          updates: {
            expires_at: currentExpiry.toISOString(),
            status: 'attivo', // Riattiva se era scaduto
          },
        });
        break;

      case 'complete':
        updateMutation.mutate({
          id: subscription.id,
          updates: { status: 'completato' },
        });
        break;

      case 'cancel':
        updateMutation.mutate({
          id: subscription.id,
          updates: { status: 'cancellato' },
        });
        break;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attivo':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Attivo
          </Badge>
        );
      case 'completato':
        return (
          <Badge variant="secondary">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completato
          </Badge>
        );
      case 'scaduto':
        return (
          <Badge variant="destructive" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Scaduto
          </Badge>
        );
      case 'cancellato':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancellato
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeCount = subscriptions?.filter((s) => s.status === 'attivo').length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{subscriptions?.length || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Totali</p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{activeCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Attivi</p>
            </CardContent>
          </Card>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nuovo Abbonamento
        </Button>
      </div>

      {/* Subscriptions list */}
      {subscriptions && subscriptions.length > 0 ? (
        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const name =
              `${sub.profiles?.first_name || ''} ${sub.profiles?.last_name || ''}`.trim() ||
              'Atleta';
            const initials = `${sub.profiles?.first_name?.[0] || ''}${sub.profiles?.last_name?.[0] || ''}`;
            const isSessionBased = sub.sessions_total !== null;
            const sessionsRemaining = isSessionBased
              ? (sub.sessions_total || 0) - (sub.sessions_used || 0)
              : null;
            const progressPercent = isSessionBased && sub.sessions_total
              ? ((sub.sessions_used || 0) / sub.sessions_total) * 100
              : 0;

            return (
              <Card key={sub.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Athlete info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={sub.profiles?.avatar_url || undefined} />
                        <AvatarFallback>{initials || 'A'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate">{name}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {sub.pt_packages?.name || 'Pacchetto custom'}
                        </p>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(sub.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isSessionBased && (
                            <DropdownMenuItem
                              onClick={() =>
                                setActionDialog({ type: 'add_sessions', subscription: sub })
                              }
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Aggiungi sessioni
                            </DropdownMenuItem>
                          )}
                          {!isSessionBased && (
                            <DropdownMenuItem
                              onClick={() =>
                                setActionDialog({ type: 'extend', subscription: sub })
                              }
                            >
                              <CalendarPlus className="h-4 w-4 mr-2" />
                              Estendi scadenza
                            </DropdownMenuItem>
                          )}
                          {sub.status === 'attivo' && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  setActionDialog({ type: 'complete', subscription: sub })
                                }
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Segna completato
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setActionDialog({ type: 'cancel', subscription: sub })
                                }
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Annulla
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {isSessionBased ? (
                      <div className="col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-muted-foreground">Sessioni</span>
                          <span className="font-medium">
                            {sub.sessions_used || 0} / {sub.sessions_total}
                            <span className="text-muted-foreground ml-1">
                              ({sessionsRemaining} rimanenti)
                            </span>
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    ) : sub.expires_at ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Scade il{' '}
                          {format(new Date(sub.expires_at), 'dd MMM yyyy', { locale: it })}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Dal {format(new Date(sub.started_at), 'dd MMM yyyy', { locale: it })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-semibold">
                        €{sub.price_paid.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nessun abbonamento</h3>
            <p className="text-sm text-muted-foreground">
              Gli abbonamenti dei tuoi atleti appariranno qui
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.type !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ type: null, subscription: null });
            setActionValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'add_sessions' && 'Aggiungi Sessioni'}
              {actionDialog.type === 'extend' && 'Estendi Scadenza'}
              {actionDialog.type === 'complete' && 'Conferma Completamento'}
              {actionDialog.type === 'cancel' && 'Conferma Annullamento'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'add_sessions' &&
                'Aggiungi sessioni bonus a questo abbonamento'}
              {actionDialog.type === 'extend' &&
                'Estendi la data di scadenza di questo abbonamento'}
              {actionDialog.type === 'complete' &&
                'Vuoi segnare questo abbonamento come completato?'}
              {actionDialog.type === 'cancel' &&
                'Vuoi annullare questo abbonamento?'}
            </DialogDescription>
          </DialogHeader>

          {(actionDialog.type === 'add_sessions' || actionDialog.type === 'extend') && (
            <div className="py-4">
              <Label>
                {actionDialog.type === 'add_sessions'
                  ? 'Numero sessioni da aggiungere'
                  : 'Giorni da aggiungere'}
              </Label>
              <Input
                type="number"
                min={1}
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                placeholder={actionDialog.type === 'add_sessions' ? 'Es: 5' : 'Es: 30'}
                className="mt-2"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ type: null, subscription: null });
                setActionValue('');
              }}
            >
              Annulla
            </Button>
            <Button
              onClick={handleAction}
              disabled={updateMutation.isPending}
              variant={actionDialog.type === 'cancel' ? 'destructive' : 'default'}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Subscription Dialog */}
      <CreateSubscriptionDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}

export default AthleteSubscriptionsTab;
