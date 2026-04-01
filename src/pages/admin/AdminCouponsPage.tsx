import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tag, Plus, Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  coupon_type: string;
  discount_value: number;
  free_months: number | null;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

export function AdminCouponsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    coupon_type: 'percentage',
    discount_value: 10,
    valid_until: '',
    max_uses: '',
  });
  const queryClient = useQueryClient();

  // Fetch coupons
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
  });

  // Create coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('coupons').insert([{
        code: newCoupon.code.toUpperCase(),
        description: newCoupon.description || null,
        coupon_type: newCoupon.coupon_type as 'percentage' | 'fixed_amount',
        discount_value: newCoupon.discount_value,
        valid_until: newCoupon.valid_until || null,
        max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon creato');
      setIsDialogOpen(false);
      setNewCoupon({
        code: '',
        description: '',
        coupon_type: 'percentage',
        discount_value: 10,
        valid_until: '',
        max_uses: '',
      });
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  // Toggle coupon active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon aggiornato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  // Delete coupon
  const deleteCouponMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon eliminato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Codice copiato');
  };

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Codice',
      cell: (coupon) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
            {coupon.code}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => copyCode(coupon.code)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Sconto',
      cell: (coupon) => (
        <span className="font-medium">
          {coupon.coupon_type === 'percentage'
            ? `${coupon.discount_value}%`
            : `€${coupon.discount_value}`}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Utilizzo',
      cell: (coupon) => (
        <span>
          {coupon.current_uses}/{coupon.max_uses || '∞'}
        </span>
      ),
    },
    {
      key: 'validity',
      header: 'Scadenza',
      cell: (coupon) =>
        coupon.valid_until
          ? new Date(coupon.valid_until).toLocaleDateString('it-IT')
          : 'Nessuna',
    },
    {
      key: 'is_active',
      header: 'Attivo',
      cell: (coupon) => (
        <Switch
          checked={coupon.is_active}
          onCheckedChange={(checked) =>
            toggleActiveMutation.mutate({ id: coupon.id, isActive: checked })
          }
        />
      ),
    },
  ];

  const actions = (coupon: Coupon) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => deleteCouponMutation.mutate(coupon.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Elimina
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupon e Promozioni"
        description="Crea e gestisci codici sconto"
        icon={Tag}
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Coupon
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={coupons || []}
        isLoading={isLoading}
        searchPlaceholder="Cerca codice..."
        emptyMessage="Nessun coupon creato"
        actions={actions}
      />

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo Coupon</DialogTitle>
            <DialogDescription>
              Crea un nuovo codice sconto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Codice</Label>
              <Input
                placeholder="Es. ESTATE2024"
                value={newCoupon.code}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, code: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                placeholder="Descrizione opzionale..."
                value={newCoupon.description}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newCoupon.coupon_type}
                  onValueChange={(v) =>
                    setNewCoupon({ ...newCoupon, coupon_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentuale</SelectItem>
                    <SelectItem value="fixed_amount">Importo Fisso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Valore {newCoupon.coupon_type === 'percentage' ? '(%)' : '(€)'}
                </Label>
                <Input
                  type="number"
                  value={newCoupon.discount_value}
                  onChange={(e) =>
                    setNewCoupon({
                      ...newCoupon,
                      discount_value: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scadenza (opzionale)</Label>
                <Input
                  type="date"
                  value={newCoupon.valid_until}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, valid_until: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max utilizzi (opzionale)</Label>
                <Input
                  type="number"
                  placeholder="Illimitato"
                  value={newCoupon.max_uses}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, max_uses: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => createCouponMutation.mutate()}
              disabled={!newCoupon.code || createCouponMutation.isPending}
            >
              Crea Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminCouponsPage;
