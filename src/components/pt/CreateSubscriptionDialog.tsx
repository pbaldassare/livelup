import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  Loader2,
  Package,
  User,
  CreditCard,
  Ticket,
  Check,
  X,
} from 'lucide-react';
import { validateCoupon, recordCouponUse, type ValidatableCoupon, type CouponEffect } from '@/lib/coupons';

// =====================================================
// CREATE SUBSCRIPTION DIALOG - PT crea abbonamento
// =====================================================

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConnectedAthlete {
  atleta_user_id: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

interface PTPackage {
  id: string;
  name: string;
  package_type: string;
  price: number;
  sessions_count: number | null;
  duration_days: number | null;
  currency: string;
}

export function CreateSubscriptionDialog({ open, onOpenChange }: CreateSubscriptionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customSessions, setCustomSessions] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: ValidatableCoupon; effect: CouponEffect } | null>(null);
  const [couponError, setCouponError] = useState<string>('');
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);

  // Fetch connected athletes
  const { data: athletes = [] } = useQuery({
    queryKey: ['pt-connected-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      // Fetch profiles
      const athletesWithProfiles = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, email')
            .eq('user_id', conn.atleta_user_id)
            .maybeSingle();

          return {
            atleta_user_id: conn.atleta_user_id,
            profiles: profile,
          };
        })
      );

      return athletesWithProfiles as ConnectedAthlete[];
    },
    enabled: !!user?.id && open,
  });

  // Fetch PT packages
  const { data: packages = [] } = useQuery({
    queryKey: ['pt-packages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_packages')
        .select('id, name, package_type, price, sessions_count, duration_days, currency')
        .eq('pt_user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PTPackage[];
    },
    enabled: !!user?.id && open,
  });

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const isSessionBased = selectedPackage?.package_type === 'sessioni';

  // Create subscription mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedAthleteId || !selectedPackageId) {
        throw new Error('Dati mancanti');
      }

      const pkg = packages.find((p) => p.id === selectedPackageId);
      if (!pkg) throw new Error('Pacchetto non trovato');

      const basePrice = customPrice ? parseFloat(customPrice) : pkg.price;
      let finalPrice = basePrice;
      let sessionsTotal = isSessionBased
        ? (customSessions ? parseInt(customSessions) : pkg.sessions_count)
        : null;

      // Calculate expiry date for non-session packages
      let calculatedExpiry = expiryDate;
      if (!isSessionBased && !expiryDate && pkg.duration_days) {
        calculatedExpiry = addDays(startDate, pkg.duration_days);
      }

      // Apply coupon effects
      if (appliedCoupon) {
        finalPrice = Math.max(0, basePrice - appliedCoupon.effect.priceDiscount);
        if (appliedCoupon.effect.bonusSessions && sessionsTotal != null) {
          sessionsTotal += appliedCoupon.effect.bonusSessions;
        }
        if (appliedCoupon.effect.bonusMonths) {
          const base = calculatedExpiry ?? addDays(startDate, 30);
          calculatedExpiry = addMonths(base, appliedCoupon.effect.bonusMonths);
        }
      }

      const { error } = await supabase.from('atleta_pt_subscriptions').insert({
        atleta_user_id: selectedAthleteId,
        pt_user_id: user.id,
        package_id: selectedPackageId,
        status: 'attivo',
        sessions_total: sessionsTotal,
        sessions_used: 0,
        expires_at: calculatedExpiry?.toISOString() || null,
        started_at: startDate.toISOString(),
        price_paid: finalPrice,
        currency: pkg.currency,
        notes: notes || null,
      });

      if (error) throw error;

      // Record coupon usage
      if (appliedCoupon) {
        try {
          await recordCouponUse({
            couponId: appliedCoupon.coupon.id,
            userId: selectedAthleteId,
            discountApplied: appliedCoupon.effect.priceDiscount,
            currentUses: appliedCoupon.coupon.current_uses,
          });
        } catch (e) {
          console.error('Coupon use logging failed', e);
        }
      }

      // Send notification to athlete
      const discountNote = appliedCoupon ? ` (coupon ${appliedCoupon.coupon.code} applicato: ${appliedCoupon.effect.summary})` : '';
      await supabase.from('notifications').insert({
        user_id: selectedAthleteId,
        type: 'subscription_created',
        title: 'Nuovo abbonamento attivato!',
        body: `Il tuo PT ha attivato il pacchetto "${pkg.name}"${discountNote}`,
        data: { package_id: selectedPackageId, coupon_code: appliedCoupon?.coupon.code ?? null },
        action_url: '/app/subscription',
      });
    },
    onSuccess: () => {
      toast.success('Abbonamento creato con successo');
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-subscriptions'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante la creazione');
    },
  });

  const resetForm = () => {
    setSelectedAthleteId('');
    setSelectedPackageId('');
    setStartDate(new Date());
    setCustomPrice('');
    setCustomSessions('');
    setExpiryDate(undefined);
    setNotes('');
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handleVerifyCoupon = async () => {
    if (!user?.id || !selectedAthleteId || !selectedPackageId) {
      setCouponError('Seleziona prima atleta e pacchetto');
      return;
    }
    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (!pkg) return;
    const basePrice = customPrice ? parseFloat(customPrice) : pkg.price;
    setVerifyingCoupon(true);
    setCouponError('');
    const result = await validateCoupon(couponCode, {
      ptUserId: user.id,
      athleteUserId: selectedAthleteId,
      packageId: selectedPackageId,
      basePrice,
    });
    setVerifyingCoupon(false);
    if ('error' in result) {
      setAppliedCoupon(null);
      setCouponError(result.error);
      return;
    }
    setAppliedCoupon(result);
    toast.success(`Coupon applicato: ${result.effect.summary}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthleteId) {
      toast.error('Seleziona un atleta');
      return;
    }
    if (!selectedPackageId) {
      toast.error('Seleziona un pacchetto');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Crea Abbonamento
          </DialogTitle>
          <DialogDescription>
            Attiva manualmente un abbonamento per un atleta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Athlete Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Atleta
            </Label>
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona atleta" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete) => {
                  const name =
                    `${athlete.profiles?.first_name || ''} ${athlete.profiles?.last_name || ''}`.trim() ||
                    athlete.profiles?.email ||
                    'Atleta';
                  const initials = `${athlete.profiles?.first_name?.[0] || ''}${athlete.profiles?.last_name?.[0] || ''}`;
                  return (
                    <SelectItem key={athlete.atleta_user_id} value={athlete.atleta_user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={athlete.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{initials || 'A'}</AvatarFallback>
                        </Avatar>
                        <span>{name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Package Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pacchetto
            </Label>
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona pacchetto" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span>{pkg.name}</span>
                      <Badge variant="outline" className="text-xs">
                        €{pkg.price}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPackage && (
              <p className="text-xs text-muted-foreground">
                {selectedPackage.package_type === 'sessioni'
                  ? `${selectedPackage.sessions_count} sessioni`
                  : selectedPackage.duration_days
                  ? `${selectedPackage.duration_days} giorni`
                  : 'Durata personalizzata'}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Data inizio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP', { locale: it }) : 'Seleziona data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Conditional fields based on package type */}
          {selectedPackage && isSessionBased && (
            <div className="space-y-2">
              <Label>Sessioni totali (opzionale)</Label>
              <Input
                type="number"
                min={1}
                placeholder={`Default: ${selectedPackage.sessions_count}`}
                value={customSessions}
                onChange={(e) => setCustomSessions(e.target.value)}
              />
            </div>
          )}

          {selectedPackage && !isSessionBased && (
            <div className="space-y-2">
              <Label>Data scadenza</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !expiryDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate 
                      ? format(expiryDate, 'PPP', { locale: it }) 
                      : selectedPackage.duration_days
                      ? `Auto: ${format(addDays(startDate, selectedPackage.duration_days), 'PPP', { locale: it })}`
                      : 'Seleziona data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Custom Price */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Prezzo (opzionale)
            </Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder={selectedPackage ? `Default: €${selectedPackage.price}` : 'Prezzo'}
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Note (opzionale)</Label>
            <Textarea
              placeholder="Note interne sull'abbonamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </form>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !selectedAthleteId || !selectedPackageId}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crea Abbonamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateSubscriptionDialog;
