import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, MoreHorizontal, Edit, Trash2, Star, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlanForm, SubscriptionPlanFormData } from '@/components/admin/SubscriptionPlanForm';
import { Database } from '@/integrations/supabase/types';

type SubscriptionType = Database['public']['Enums']['subscription_type'];
type AppRole = Database['public']['Enums']['app_role'];

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  target_role: AppRole;
  plan_type: SubscriptionType;
  price_monthly: number;
  price_yearly: number | null;
  currency: string;
  trial_days: number | null;
  is_active: boolean;
  is_featured: boolean | null;
  features: unknown;
  max_athletes: number | null;
  includes_chat: boolean | null;
  includes_video_calls: boolean | null;
  includes_analytics: boolean | null;
  storage_gb: number | null;
  stripe_price_id: string | null;
  sort_order: number | null;
  created_at: string;
}

interface SubscriptionStats {
  subscription_type: SubscriptionType;
  price_monthly: number | null;
}

export function AdminSubscriptionsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('target_role', 'pt')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Fetch active subscriptions for stats
  const { data: activeSubscriptions } = useQuery({
    queryKey: ['active-subscriptions-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('subscription_type, price_monthly')
        .eq('status', 'attivo')
        .in('subscription_type', ['pt_base', 'pt_premium']);

      if (error) throw error;
      return data as SubscriptionStats[];
    },
  });

  // Calculate estimated monthly revenue
  const estimatedRevenue = activeSubscriptions?.reduce((sum, sub) => {
    return sum + (sub.price_monthly || 0);
  }, 0) || 0;

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: SubscriptionPlanFormData) => {
      const { error } = await supabase
        .from('subscription_plans')
        .insert({
          name: data.name,
          description: data.description || null,
          target_role: data.target_role,
          plan_type: data.plan_type,
          price_monthly: data.price_monthly,
          price_yearly: data.price_yearly,
          trial_days: data.trial_days,
          features: data.features,
          max_athletes: data.max_athletes,
          includes_chat: data.includes_chat,
          includes_video_calls: data.includes_video_calls,
          includes_analytics: data.includes_analytics,
          storage_gb: data.storage_gb,
          stripe_price_id: data.stripe_price_id || null,
          is_active: data.is_active,
          is_featured: data.is_featured,
          sort_order: data.sort_order,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Piano creato con successo');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SubscriptionPlanFormData }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: data.name,
          description: data.description || null,
          target_role: data.target_role,
          plan_type: data.plan_type,
          price_monthly: data.price_monthly,
          price_yearly: data.price_yearly,
          trial_days: data.trial_days,
          features: data.features,
          max_athletes: data.max_athletes,
          includes_chat: data.includes_chat,
          includes_video_calls: data.includes_video_calls,
          includes_analytics: data.includes_analytics,
          storage_gb: data.storage_gb,
          stripe_price_id: data.stripe_price_id || null,
          is_active: data.is_active,
          is_featured: data.is_featured,
          sort_order: data.sort_order,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Piano aggiornato');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Piano eliminato');
      setDeletePlanId(null);
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  // Toggle plan active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Stato aggiornato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  const handleSubmit = (data: SubscriptionPlanFormData) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const columns: Column<SubscriptionPlan>[] = [
    {
      key: 'name',
      header: 'Piano',
      cell: (plan) => (
        <div className="flex items-center gap-2">
          {plan.is_featured && <Star className="h-4 w-4 text-warning fill-warning" />}
          <div>
            <p className="font-medium">{plan.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{plan.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'plan_type',
      header: 'Tipo',
      cell: (plan) => (
        <Badge variant="outline" className="capitalize">
          {plan.plan_type.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'price',
      header: 'Prezzo',
      cell: (plan) => (
        <div>
          <p className="font-medium">€{plan.price_monthly}/mese</p>
          {plan.price_yearly && (
            <p className="text-xs text-muted-foreground">
              €{plan.price_yearly}/anno
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'trial',
      header: 'Trial',
      cell: (plan) => `${plan.trial_days || 0} giorni`,
    },
    {
      key: 'is_active',
      header: 'Attivo',
      cell: (plan) => (
        <Switch
          checked={plan.is_active}
          onCheckedChange={(checked) =>
            toggleActiveMutation.mutate({ id: plan.id, isActive: checked })
          }
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (plan) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenEdit(plan)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeletePlanId(plan.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Piani PT"
        description="Gestisci i piani di abbonamento per i Personal Trainer"
        icon={CreditCard}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Piano
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Piani Attivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {plans?.filter((p) => p.is_active).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abbonamenti Attivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {activeSubscriptions?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Entrate Stimate/Mese
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              €{estimatedRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <DataTable
        columns={columns}
        data={plans || []}
        isLoading={isLoading}
        emptyMessage="Nessun piano configurato"
        showPagination={false}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Modifica Piano' : 'Nuovo Piano'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Modifica i dettagli del piano di abbonamento'
                : 'Crea un nuovo piano di abbonamento per la piattaforma'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
            <SubscriptionPlanForm
              initialData={
                editingPlan
                  ? {
                      name: editingPlan.name,
                      description: editingPlan.description || '',
                      target_role: editingPlan.target_role,
                      plan_type: editingPlan.plan_type,
                      price_monthly: editingPlan.price_monthly,
                      price_yearly: editingPlan.price_yearly,
                      trial_days: editingPlan.trial_days || 14,
                      features: Array.isArray(editingPlan.features) ? editingPlan.features as string[] : [],
                      max_athletes: editingPlan.max_athletes,
                      includes_chat: editingPlan.includes_chat ?? true,
                      includes_video_calls: editingPlan.includes_video_calls ?? false,
                      includes_analytics: editingPlan.includes_analytics ?? false,
                      storage_gb: editingPlan.storage_gb || 1,
                      stripe_price_id: editingPlan.stripe_price_id || '',
                      is_active: editingPlan.is_active,
                      is_featured: editingPlan.is_featured ?? false,
                      sort_order: editingPlan.sort_order || 0,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={handleCloseDialog}
              isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il piano?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Il piano verrà eliminato permanentemente.
              Gli abbonamenti esistenti non saranno influenzati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlanId && deletePlanMutation.mutate(deletePlanId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminSubscriptionsPage;
