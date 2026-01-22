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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  target_role: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number | null;
  currency: string;
  trial_days: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
}

export function AdminSubscriptionsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const queryClient = useQueryClient();

  // Fetch plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Fetch active subscriptions count
  const { data: subscriptionStats } = useQuery({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('subscription_type, status')
        .eq('status', 'attivo');

      if (error) throw error;
      return data;
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
      toast.success('Piano aggiornato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  const columns: Column<SubscriptionPlan>[] = [
    {
      key: 'name',
      header: 'Piano',
      cell: (plan) => (
        <div>
          <p className="font-medium">{plan.name}</p>
          <p className="text-xs text-muted-foreground">{plan.description}</p>
        </div>
      ),
    },
    {
      key: 'target_role',
      header: 'Target',
      cell: (plan) => (
        <StatusBadge 
          status={plan.target_role} 
          variant={plan.target_role === 'pt' ? 'success' : 'info'} 
        />
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
      cell: (plan) => `${plan.trial_days} giorni`,
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Piani e Abbonamenti"
        description="Gestisci i piani di abbonamento e visualizza le subscription attive"
        icon={CreditCard}
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
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
              {subscriptionStats?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entrate Stimate/Mese
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€ --</p>
            <p className="text-xs text-muted-foreground">Da calcolare</p>
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

      {/* Create/Edit Dialog placeholder */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Piano</DialogTitle>
            <DialogDescription>
              Crea un nuovo piano di abbonamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Piano</Label>
              <Input placeholder="Es. Premium PT" />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea placeholder="Descrizione del piano..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Personal Trainer</SelectItem>
                    <SelectItem value="atleta">Atleta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prezzo Mensile (€)</Label>
                <Input type="number" placeholder="29.99" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={() => {
              toast.info('Funzionalità da implementare');
              setIsDialogOpen(false);
            }}>
              Crea Piano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminSubscriptionsPage;
