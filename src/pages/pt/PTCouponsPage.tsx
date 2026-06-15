import { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { Tag, Plus, Copy, MoreHorizontal, Trash2, Loader2, Share2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// =====================================================
// PT COUPONS PAGE - Coupons issued by PT to their athletes
// 2-step creation: pick template → fill constrained form
// =====================================================

type DiscountType = 'percentage' | 'fixed_amount' | 'free_months' | 'free_sessions';

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percentage: 'Sconto %',
  fixed_amount: 'Sconto fisso €',
  free_months: 'Mesi gratis',
  free_sessions: 'Sessioni gratis',
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
  pt_user_id: string | null;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  coupon_type: string;
  discount_value: number;
  free_months: number | null;
  free_sessions: number | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  template_id: string | null;
  pt_package_id: string | null;
  target_athlete_ids: string[] | null;
}

interface AthleteOption {
  user_id: string;
  full_name: string;
}

interface PackageOption {
  id: string;
  name: string;
}

function genCode(prefix = 'PT') {
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${r}`;
}

export function PTCouponsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=pick template, 2=form
  const [selectedTemplate, setSelectedTemplate] = useState<CouponTemplate | null>(null);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as DiscountType,
    discount_value: '10',
    free_months: '',
    free_sessions: '',
    pt_package_id: '' as string,
    target_athlete_ids: [] as string[],
    valid_until: '',
    max_uses: '',
  });
  const [shareCoupon, setShareCoupon] = useState<Coupon | null>(null);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplForm, setTplForm] = useState({
    id: '' as string,
    name: '',
    description: '',
    allowed_discount_types: ['percentage'] as DiscountType[],
    max_discount_percentage: '' as string,
    max_discount_amount: '' as string,
    max_free_months: '' as string,
    max_free_sessions: '' as string,
    max_validity_days: '' as string,
    one_per_athlete: false,
  });


  // Active connected athletes
  const { data: athletes = [] } = useQuery({
    queryKey: ['pt-connected-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id, profiles:atleta_user_id(first_name, last_name, email)')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        user_id: r.atleta_user_id,
        full_name: [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ') || r.profiles?.email || 'Atleta',
      })) as AthleteOption[];
    },
    enabled: !!user?.id,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['pt-packages-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pt_packages')
        .select('id, name')
        .eq('pt_user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as PackageOption[];
    },
    enabled: !!user?.id,
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['pt-coupon-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupon_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as CouponTemplate[];
    },
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['pt-coupons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!user?.id,
  });

  const athleteMap = useMemo(() => {
    const m = new Map<string, string>();
    athletes.forEach((a) => m.set(a.user_id, a.full_name));
    return m;
  }, [athletes]);

  const templateMap = useMemo(() => {
    const m = new Map<string, CouponTemplate>();
    templates.forEach((t) => m.set(t.id, t));
    return m;
  }, [templates]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || !user?.id) throw new Error('Template mancante');

      // Validate against template limits
      const dt = form.discount_type;
      const val = parseFloat(form.discount_value) || 0;
      if (dt === 'percentage' && selectedTemplate.max_discount_percentage != null && val > selectedTemplate.max_discount_percentage) {
        throw new Error(`Massimo ${selectedTemplate.max_discount_percentage}% per questa tipologia`);
      }
      if (dt === 'fixed_amount' && selectedTemplate.max_discount_amount != null && val > selectedTemplate.max_discount_amount) {
        throw new Error(`Massimo €${selectedTemplate.max_discount_amount} per questa tipologia`);
      }
      const fm = parseInt(form.free_months) || 0;
      if (dt === 'free_months' && selectedTemplate.max_free_months != null && fm > selectedTemplate.max_free_months) {
        throw new Error(`Massimo ${selectedTemplate.max_free_months} mesi gratis`);
      }
      const fs = parseInt(form.free_sessions) || 0;
      if (dt === 'free_sessions' && selectedTemplate.max_free_sessions != null && fs > selectedTemplate.max_free_sessions) {
        throw new Error(`Massimo ${selectedTemplate.max_free_sessions} sessioni gratis`);
      }

      let valid_until = form.valid_until || null;
      if (selectedTemplate.max_validity_days && !valid_until) {
        const d = new Date();
        d.setDate(d.getDate() + selectedTemplate.max_validity_days);
        valid_until = d.toISOString();
      }

      const code = (form.code || genCode()).toUpperCase();

      const payload: any = {
        code,
        description: form.description || selectedTemplate.name,
        coupon_type: dt === 'free_months' || dt === 'free_sessions' ? 'percentage' : dt,
        discount_value: dt === 'percentage' || dt === 'fixed_amount' ? val : 0,
        free_months: dt === 'free_months' ? fm : null,
        free_sessions: dt === 'free_sessions' ? fs : null,
        valid_until,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        max_uses_per_user: selectedTemplate.one_per_athlete ? 1 : null,
        pt_user_id: user.id,
        created_by: user.id,
        template_id: selectedTemplate.id,
        pt_package_id: form.pt_package_id || null,
        target_athlete_ids: form.target_athlete_ids.length > 0 ? form.target_athlete_ids : null,
        applicable_roles: ['atleta'],
        is_active: true,
      };

      const { data, error } = await supabase.from('coupons').insert([payload]).select().single();
      if (error) throw error;
      return data as Coupon;
    },
    onSuccess: async (c) => {
      queryClient.invalidateQueries({ queryKey: ['pt-coupons'] });
      toast.success('Coupon creato');

      // Auto-notify targeted athletes (or all connected if no target)
      try {
        const recipientIds: string[] = c.target_athlete_ids && c.target_athlete_ids.length > 0
          ? c.target_athlete_ids
          : (athletes ?? []).map((a: any) => a.user_id).filter(Boolean);

        if (recipientIds.length > 0) {
          const notif = recipientIds.map((uid) => ({
            user_id: uid,
            type: 'coupon',
            title: '🎁 Nuovo coupon disponibile',
            body: `Il tuo PT ti ha inviato un coupon: ${c.description || c.code}`,
            data: { coupon_id: c.id, coupon_code: c.code },
            action_url: '/app/coupons',
          }));
          await supabase.from('notifications').insert(notif);
        }
      } catch (e) {
        console.error('Coupon notification failed', e);
      }

      setStep(0);
      setSelectedTemplate(null);
      setForm({ code: '', description: '', discount_type: 'percentage', discount_value: '10', free_months: '', free_sessions: '', pt_package_id: '', target_athlete_ids: [], valid_until: '', max_uses: '' });
      setShareCoupon(c);
    },
    onError: (e: Error) => toast.error('Errore: ' + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-coupons'] });
    },
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
    onError: (e: Error) => toast.error('Errore: ' + e.message),
  });

  const saveTplMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!tplForm.name.trim()) throw new Error('Nome obbligatorio');
      if (tplForm.allowed_discount_types.length === 0) throw new Error('Seleziona almeno un tipo di sconto');
      const payload = {
        name: tplForm.name.trim(),
        description: tplForm.description || null,
        allowed_discount_types: tplForm.allowed_discount_types,
        max_discount_percentage: tplForm.max_discount_percentage ? parseFloat(tplForm.max_discount_percentage) : null,
        max_discount_amount: tplForm.max_discount_amount ? parseFloat(tplForm.max_discount_amount) : null,
        max_free_months: tplForm.max_free_months ? parseInt(tplForm.max_free_months) : null,
        max_free_sessions: tplForm.max_free_sessions ? parseInt(tplForm.max_free_sessions) : null,
        max_validity_days: tplForm.max_validity_days ? parseInt(tplForm.max_validity_days) : null,
        one_per_athlete: tplForm.one_per_athlete,
        is_active: true,
        pt_user_id: user.id,
      };
      if (tplForm.id) {
        const { error } = await supabase.from('coupon_templates').update(payload).eq('id', tplForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coupon_templates').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-coupon-templates'] });
      toast.success(tplForm.id ? 'Tipologia aggiornata' : 'Tipologia creata');
      setTplDialogOpen(false);
    },
    onError: (e: Error) => toast.error('Errore: ' + e.message),
  });

  const deleteTplMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupon_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-coupon-templates'] });
      toast.success('Tipologia eliminata');
    },
    onError: (e: Error) => toast.error('Errore: ' + e.message),
  });

  const openNewTpl = () => {
    setTplForm({ id: '', name: '', description: '', allowed_discount_types: ['percentage'], max_discount_percentage: '', max_discount_amount: '', max_free_months: '', max_free_sessions: '', max_validity_days: '', one_per_athlete: false });
    setTplDialogOpen(true);
  };

  const openEditTpl = (t: CouponTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setTplForm({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      allowed_discount_types: (t.allowed_discount_types as DiscountType[]) ?? ['percentage'],
      max_discount_percentage: t.max_discount_percentage?.toString() ?? '',
      max_discount_amount: t.max_discount_amount?.toString() ?? '',
      max_free_months: t.max_free_months?.toString() ?? '',
      max_free_sessions: t.max_free_sessions?.toString() ?? '',
      max_validity_days: t.max_validity_days?.toString() ?? '',
      one_per_athlete: t.one_per_athlete,
    });
    setTplDialogOpen(true);
  };

  const toggleTplType = (t: DiscountType, checked: boolean) => {
    setTplForm((f) => ({
      ...f,
      allowed_discount_types: checked
        ? Array.from(new Set([...f.allowed_discount_types, t]))
        : f.allowed_discount_types.filter((x) => x !== t),
    }));
  };

  const allDiscountTypes: DiscountType[] = ['percentage', 'fixed_amount', 'free_months', 'free_sessions'];



  const pickTemplate = (t: CouponTemplate) => {
    setSelectedTemplate(t);
    const firstType = (t.allowed_discount_types[0] ?? 'percentage') as DiscountType;
    setForm((f) => ({
      ...f,
      discount_type: firstType,
      code: genCode(),
      description: t.name,
    }));
    setStep(2);
  };

  const buildShareLink = (c: Coupon) => `${window.location.origin}/auth/atleta?coupon=${encodeURIComponent(c.code)}`;

  const copyShareLink = (c: Coupon) => {
    navigator.clipboard.writeText(buildShareLink(c));
    toast.success('Link copiato');
  };

  const formatDiscount = (c: Coupon) => {
    if (c.free_months) return `${c.free_months} mese/i gratis`;
    if (c.free_sessions) return `${c.free_sessions} sess. gratis`;
    return c.coupon_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value}`;
  };

  const targetLabel = (c: Coupon) => {
    if (!c.target_athlete_ids || c.target_athlete_ids.length === 0) return 'Tutti gli atleti';
    return c.target_athlete_ids.map((id) => athleteMap.get(id) ?? 'Atleta').join(', ');
  };

  const toggleAthlete = (id: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      target_athlete_ids: checked ? [...f.target_athlete_ids, id] : f.target_athlete_ids.filter((x) => x !== id),
    }));
  };

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="I Miei Coupon"
        subtitle="Crea offerte e codici sconto per i tuoi atleti"
        icon={<Tag className="h-6 w-6" />}
        breadcrumbs={[{ label: 'Dashboard', href: '/pt' }, { label: 'Coupon' }]}
        actions={
          <Button onClick={() => setStep(1)}>
            <Plus className="mr-2 h-4 w-4" /> Nuovo Coupon
          </Button>
        }
      />

      <SectionCard title="Lista Coupon" subtitle="Tutti i tuoi codici sconto e offerte" icon={Tag} iconColor="yellow">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Tipologia</TableHead>
                <TableHead>Sconto</TableHead>
                <TableHead>Destinatari</TableHead>
                <TableHead>Utilizzo</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Attivo</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><LoadingSpinner variant="dots" size="sm" /></TableCell></TableRow>
              ) : coupons.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nessun coupon creato. Clicca "Nuovo Coupon" per iniziare.</TableCell></TableRow>
              ) : (
                coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{c.code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Codice copiato'); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.template_id ? <Badge variant="secondary">{templateMap.get(c.template_id)?.name ?? '—'}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="font-medium">{formatDiscount(c)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{targetLabel(c)}</TableCell>
                    <TableCell>{c.current_uses}/{c.max_uses ?? '∞'}</TableCell>
                    <TableCell>{c.valid_until ? new Date(c.valid_until).toLocaleDateString('it-IT') : 'Nessuna'}</TableCell>
                    <TableCell>
                      <Switch checked={c.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: c.id, isActive: v })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setShareCoupon(c)} title="Condividi">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Eliminare?')) deleteMutation.mutate(c.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Elimina
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

      {/* Step 1: choose template */}
      <Dialog open={step === 1} onOpenChange={(o) => !o && setStep(0)}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scegli una tipologia</DialogTitle>
            <DialogDescription>Seleziona il tipo di coupon che vuoi creare per i tuoi atleti</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {loadingTemplates ? (
              <div className="col-span-2 text-center py-8"><LoadingSpinner variant="dots" size="sm" /></div>
            ) : templates.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">Nessuna tipologia disponibile. Contatta l'amministratore.</div>
            ) : (
              templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  className="text-left border rounded-lg p-4 hover:border-primary hover:bg-muted/30 transition"
                >
                  <div className="font-medium mb-1">{t.name}</div>
                  {t.description && <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{t.description}</div>}
                  <div className="flex flex-wrap gap-1">
                    {(t.allowed_discount_types as DiscountType[]).map((d) => (
                      <Badge key={d} variant="outline" className="text-[10px]">{DISCOUNT_TYPE_LABEL[d]}</Badge>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: form */}
      <Dialog open={step === 2} onOpenChange={(o) => !o && setStep(0)}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Codice</Label>
                <div className="flex gap-2">
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: genCode() })}>Genera</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>

              {selectedTemplate.allowed_discount_types.length > 1 && (
                <div className="space-y-2">
                  <Label>Tipo sconto</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as DiscountType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(selectedTemplate.allowed_discount_types as DiscountType[]).map((d) => (
                        <SelectItem key={d} value={d}>{DISCOUNT_TYPE_LABEL[d]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.discount_type === 'percentage' && (
                <div className="space-y-2">
                  <Label>Valore (%) {selectedTemplate.max_discount_percentage != null && <span className="text-xs text-muted-foreground">— max {selectedTemplate.max_discount_percentage}%</span>}</Label>
                  <Input type="number" value={form.discount_value} max={selectedTemplate.max_discount_percentage ?? undefined} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
                </div>
              )}
              {form.discount_type === 'fixed_amount' && (
                <div className="space-y-2">
                  <Label>Valore (€) {selectedTemplate.max_discount_amount != null && <span className="text-xs text-muted-foreground">— max €{selectedTemplate.max_discount_amount}</span>}</Label>
                  <Input type="number" value={form.discount_value} max={selectedTemplate.max_discount_amount ?? undefined} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
                </div>
              )}
              {form.discount_type === 'free_months' && (
                <div className="space-y-2">
                  <Label>Mesi gratis {selectedTemplate.max_free_months != null && <span className="text-xs text-muted-foreground">— max {selectedTemplate.max_free_months}</span>}</Label>
                  <Input type="number" value={form.free_months} max={selectedTemplate.max_free_months ?? undefined} onChange={(e) => setForm({ ...form, free_months: e.target.value })} />
                </div>
              )}
              {form.discount_type === 'free_sessions' && (
                <div className="space-y-2">
                  <Label>Sessioni gratis {selectedTemplate.max_free_sessions != null && <span className="text-xs text-muted-foreground">— max {selectedTemplate.max_free_sessions}</span>}</Label>
                  <Input type="number" value={form.free_sessions} max={selectedTemplate.max_free_sessions ?? undefined} onChange={(e) => setForm({ ...form, free_sessions: e.target.value })} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Pacchetto applicabile (opzionale)</Label>
                <Select value={form.pt_package_id || 'all'} onValueChange={(v) => setForm({ ...form, pt_package_id: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Tutti i pacchetti" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i pacchetti</SelectItem>
                    {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Destinatari</Label>
                <p className="text-xs text-muted-foreground">Lascia vuoto per renderlo disponibile a tutti i tuoi atleti collegati.</p>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {athletes.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">Nessun atleta collegato</div>
                  ) : athletes.map((a) => (
                    <label key={a.user_id} className="flex items-center gap-2 text-sm py-1">
                      <Checkbox
                        checked={form.target_athlete_ids.includes(a.user_id)}
                        onCheckedChange={(c) => toggleAthlete(a.user_id, c === true)}
                      />
                      {a.full_name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scadenza {selectedTemplate.max_validity_days && <span className="text-xs text-muted-foreground">— max {selectedTemplate.max_validity_days} gg</span>}</Label>
                  <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Max utilizzi totali</Label>
                  <Input type="number" placeholder="Illimitato" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(0)}>Annulla</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.code || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={!!shareCoupon} onOpenChange={(o) => !o && setShareCoupon(null)}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Condividi coupon</DialogTitle>
            <DialogDescription>Invia questo link ai tuoi atleti tramite chat, email o messaggio.</DialogDescription>
          </DialogHeader>
          {shareCoupon && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Codice</Label>
                <div className="flex gap-2">
                  <Input readOnly value={shareCoupon.code} className="font-mono" />
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(shareCoupon.code); toast.success('Codice copiato'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Link condivisibile</Label>
                <div className="flex gap-2">
                  <Input readOnly value={buildShareLink(shareCoupon)} className="text-xs" />
                  <Button variant="outline" onClick={() => copyShareLink(shareCoupon)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShareCoupon(null)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PTCouponsPage;
