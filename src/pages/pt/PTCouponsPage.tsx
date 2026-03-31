import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tag, Plus, Copy, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// =====================================================
// PT COUPONS PAGE - Gestione coupon del PT
// =====================================================

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  coupon_type: string;
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

export function PTCouponsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    coupon_type: 'percentage',
    discount_value: 10,
    valid_until: '',
    max_uses: '',
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['pt-coupons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('coupons').insert([{
        code: newCoupon.code.toUpperCase(),
        description: newCoupon.description || null,
        coupon_type: newCoupon.coupon_type as 'percentage' | 'fixed_amount',
        discount_value: newCoupon.discount_value,
        valid_until: newCoupon.valid_until || null,
        max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
        created_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-coupons'] });
      toast.success('Coupon creato');
      setIsDialogOpen(false);
      setNewCoupon({ code: '', description: '', coupon_type: 'percentage', discount_value: 10, valid_until: '', max_uses: '' });
    },
    onError: (error) => toast.error('Errore: ' + error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-coupons'] });
      toast.success('Coupon aggiornato');
    },
    onError: (error) => toast.error('Errore: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-coupons'] });
      toast.success('Coupon eliminato');
    },
    onError: (error) => toast.error('Errore: ' + error.message),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Codice copiato');
  };

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="I Miei Coupon"
        subtitle="Crea offerte e codici sconto per i tuoi atleti"
        icon={<Tag className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/pt' },
          { label: 'Coupon' },
        ]}
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Coupon
          </Button>
        }
      />

      <SectionCard
        title="Lista Coupon"
        subtitle="Tutti i tuoi codici sconto e offerte"
        icon={Tag}
        iconColor="yellow"
      >
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Sconto</TableHead>
                <TableHead>Utilizzo</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Attivo</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <LoadingSpinner variant="dots" size="sm" />
                  </TableCell>
                </TableRow>
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nessun coupon creato. Clicca "Nuovo Coupon" per iniziare.
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{coupon.code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(coupon.code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {coupon.description || '—'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {coupon.coupon_type === 'percentage' ? `${coupon.discount_value}%` : `€${coupon.discount_value}`}
                    </TableCell>
                    <TableCell>{coupon.current_uses}/{coupon.max_uses || '∞'}</TableCell>
                    <TableCell>
                      {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString('it-IT') : 'Nessuna'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: coupon.id, isActive: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(coupon.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo Coupon</DialogTitle>
            <DialogDescription>Crea un nuovo codice sconto per i tuoi atleti</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Codice</Label>
              <Input placeholder="Es. PRIMO-MESE" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea placeholder="Es. 1 mese gratis per nuovi atleti" value={newCoupon.description} onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newCoupon.coupon_type} onValueChange={(v) => setNewCoupon({ ...newCoupon, coupon_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentuale</SelectItem>
                    <SelectItem value="fixed_amount">Importo Fisso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valore {newCoupon.coupon_type === 'percentage' ? '(%)' : '(€)'}</Label>
                <Input type="number" value={newCoupon.discount_value} onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scadenza (opzionale)</Label>
                <Input type="date" value={newCoupon.valid_until} onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max utilizzi (opzionale)</Label>
                <Input type="number" placeholder="Illimitato" value={newCoupon.max_uses} onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annulla</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newCoupon.code || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PTCouponsPage;
