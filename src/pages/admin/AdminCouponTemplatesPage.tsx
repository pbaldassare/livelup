import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Layers, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// =====================================================
// ADMIN COUPON TEMPLATES - Catalog of coupon types for PTs
// =====================================================

type DiscountType = 'percentage' | 'fixed_amount' | 'free_months' | 'free_sessions';

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percentage: 'Percentuale',
  fixed_amount: 'Importo Fisso (€)',
  free_months: 'Mesi Gratis',
  free_sessions: 'Sessioni Gratis',
};

interface CouponTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  allowed_discount_types: string[];
  max_discount_percentage: number | null;
  max_discount_amount: number | null;
  max_free_months: number | null;
  max_free_sessions: number | null;
  max_validity_days: number | null;
  requires_active_connection: boolean;
  one_per_athlete: boolean;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = {
  id: '' as string | null,
  name: '',
  description: '',
  icon: 'tag',
  allowed_discount_types: ['percentage'] as DiscountType[],
  max_discount_percentage: '' as string,
  max_discount_amount: '' as string,
  max_free_months: '' as string,
  max_free_sessions: '' as string,
  max_validity_days: '' as string,
  requires_active_connection: true,
  one_per_athlete: false,
  is_active: true,
  sort_order: 0,
};

export function AdminCouponTemplatesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-coupon-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupon_templates')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as CouponTemplate[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        icon: form.icon || null,
        allowed_discount_types: form.allowed_discount_types,
        max_discount_percentage: form.max_discount_percentage ? parseFloat(form.max_discount_percentage) : null,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
        max_free_months: form.max_free_months ? parseInt(form.max_free_months) : null,
        max_free_sessions: form.max_free_sessions ? parseInt(form.max_free_sessions) : null,
        max_validity_days: form.max_validity_days ? parseInt(form.max_validity_days) : null,
        requires_active_connection: form.requires_active_connection,
        one_per_athlete: form.one_per_athlete,
        is_active: form.is_active,
        sort_order: form.sort_order || 0,
      };
      if (form.id) {
        const { error } = await supabase.from('coupon_templates').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coupon_templates').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-templates'] });
      toast.success(form.id ? 'Tipologia aggiornata' : 'Tipologia creata');
      setIsOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error('Errore: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupon_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-templates'] });
      toast.success('Tipologia eliminata');
    },
    onError: (e: Error) => toast.error('Errore: ' + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('coupon_templates').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupon-templates'] }),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (t: CouponTemplate) => {
    setForm({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      icon: t.icon ?? 'tag',
      allowed_discount_types: (t.allowed_discount_types as DiscountType[]) ?? ['percentage'],
      max_discount_percentage: t.max_discount_percentage?.toString() ?? '',
      max_discount_amount: t.max_discount_amount?.toString() ?? '',
      max_free_months: t.max_free_months?.toString() ?? '',
      max_free_sessions: t.max_free_sessions?.toString() ?? '',
      max_validity_days: t.max_validity_days?.toString() ?? '',
      requires_active_connection: t.requires_active_connection,
      one_per_athlete: t.one_per_athlete,
      is_active: t.is_active,
      sort_order: t.sort_order,
    });
    setIsOpen(true);
  };

  const toggleDiscountType = (type: DiscountType, checked: boolean) => {
    setForm((f) => ({
      ...f,
      allowed_discount_types: checked
        ? Array.from(new Set([...f.allowed_discount_types, type]))
        : f.allowed_discount_types.filter((t) => t !== type),
    }));
  };

  const allTypes: DiscountType[] = ['percentage', 'fixed_amount', 'free_months', 'free_sessions'];

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="Catalogo Tipologie Coupon"
        subtitle="Definisci le tipologie di coupon che i PT possono emettere verso i loro atleti"
        icon={<Layers className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Catalogo Coupon' },
        ]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nuova Tipologia
          </Button>
        }
      />

      <SectionCard title="Tipologie disponibili" subtitle="I PT vedranno solo le tipologie attive" icon={Layers} iconColor="primary">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipi sconto</TableHead>
                <TableHead>Limiti</TableHead>
                <TableHead>Validità max</TableHead>
                <TableHead>Attivo</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8"><LoadingSpinner variant="dots" size="sm" /></TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nessuna tipologia. Crea la prima per iniziare.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      {t.description && <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(t.allowed_discount_types as DiscountType[]).map((d) => (
                          <Badge key={d} variant="secondary" className="text-xs">{DISCOUNT_TYPE_LABEL[d]}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground space-y-0.5">
                      {t.max_discount_percentage != null && <div>max {t.max_discount_percentage}%</div>}
                      {t.max_discount_amount != null && <div>max €{t.max_discount_amount}</div>}
                      {t.max_free_months != null && <div>max {t.max_free_months} mesi</div>}
                      {t.max_free_sessions != null && <div>max {t.max_free_sessions} sessioni</div>}
                      {!t.max_discount_percentage && !t.max_discount_amount && !t.max_free_months && !t.max_free_sessions && '—'}
                    </TableCell>
                    <TableCell>{t.max_validity_days ? `${t.max_validity_days} gg` : '—'}</TableCell>
                    <TableCell>
                      <Switch checked={t.is_active} onCheckedChange={(c) => toggleMutation.mutate({ id: t.id, is_active: c })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Eliminare questa tipologia?')) deleteMutation.mutate(t.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifica Tipologia' : 'Nuova Tipologia Coupon'}</DialogTitle>
            <DialogDescription>Definisci nome, tipi di sconto consentiti e limiti</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Es. Mese Omaggio" />
              </div>
              <div className="space-y-2">
                <Label>Ordine</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Spiega quando usare questa tipologia" />
            </div>

            <div className="space-y-2">
              <Label>Tipi di sconto consentiti</Label>
              <div className="grid grid-cols-2 gap-2">
                {allTypes.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.allowed_discount_types.includes(t)}
                      onCheckedChange={(c) => toggleDiscountType(t, c === true)}
                    />
                    {DISCOUNT_TYPE_LABEL[t]}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max percentuale (%)</Label>
                <Input type="number" value={form.max_discount_percentage} onChange={(e) => setForm({ ...form, max_discount_percentage: e.target.value })} placeholder="Es. 30" />
              </div>
              <div className="space-y-2">
                <Label>Max importo fisso (€)</Label>
                <Input type="number" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} placeholder="Es. 50" />
              </div>
              <div className="space-y-2">
                <Label>Max mesi gratis</Label>
                <Input type="number" value={form.max_free_months} onChange={(e) => setForm({ ...form, max_free_months: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max sessioni gratis</Label>
                <Input type="number" value={form.max_free_sessions} onChange={(e) => setForm({ ...form, max_free_sessions: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Validità max (giorni)</Label>
                <Input type="number" value={form.max_validity_days} onChange={(e) => setForm({ ...form, max_validity_days: e.target.value })} placeholder="Es. 30" />
              </div>
              <div className="space-y-2">
                <Label>Icona (lucide)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="tag" />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.requires_active_connection} onCheckedChange={(c) => setForm({ ...form, requires_active_connection: c })} />
                Richiede connessione attiva PT–Atleta
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.one_per_athlete} onCheckedChange={(c) => setForm({ ...form, one_per_athlete: c })} />
                Una sola volta per atleta
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                Tipologia attiva
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Annulla</Button>
            <Button
              onClick={() => upsertMutation.mutate()}
              disabled={!form.name || form.allowed_discount_types.length === 0 || upsertMutation.isPending}
            >
              {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? 'Salva' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminCouponTemplatesPage;
