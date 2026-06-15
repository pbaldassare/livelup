import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Ticket, Copy, Check, Gift, Calendar as CalendarIcon, Package as PackageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// ATLETA COUPONS PAGE - Coupon ricevuti dal proprio PT
// =====================================================

interface AvailableCoupon {
  id: string;
  code: string;
  description: string | null;
  coupon_type: string;
  discount_value: number;
  free_months: number | null;
  free_sessions: number | null;
  valid_from: string;
  valid_until: string | null;
  pt_user_id: string | null;
  pt_package_id: string | null;
  target_athlete_ids: string[] | null;
  is_active: boolean;
}

function formatDiscount(c: AvailableCoupon): string {
  switch (c.coupon_type) {
    case 'percentage':
      return `-${c.discount_value}%`;
    case 'fixed_amount':
      return `-€${c.discount_value}`;
    case 'free_months':
      return `${c.free_months ?? c.discount_value} mesi gratis`;
    case 'free_sessions':
      return `${c.free_sessions ?? c.discount_value} sessioni gratis`;
    default:
      return `-${c.discount_value}`;
  }
}

export default function AtletaCouponsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['atleta-available-coupons', user?.id],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      // RLS already filters to "PT coupons available to this athlete"
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, description, coupon_type, discount_value, free_months, free_sessions, valid_from, valid_until, pt_user_id, pt_package_id, target_athlete_ids, is_active')
        .not('pt_user_id', 'is', null)
        .eq('is_active', true)
        .lte('valid_from', nowIso)
        .order('valid_from', { ascending: false });

      if (error) throw error;

      const list = (data || []) as AvailableCoupon[];
      // Filter expired client-side (some have no expiry)
      return list.filter((c) => !c.valid_until || new Date(c.valid_until) > new Date());
    },
    enabled: !!user?.id,
  });

  // Fetch package names to show context
  const packageIds = Array.from(new Set(coupons.map((c) => c.pt_package_id).filter(Boolean) as string[]));
  const { data: packagesMap = {} } = useQuery({
    queryKey: ['coupon-packages', packageIds],
    queryFn: async () => {
      if (packageIds.length === 0) return {};
      const { data, error } = await supabase
        .from('pt_packages')
        .select('id, name')
        .in('id', packageIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((p) => (map[p.id] = p.name));
      return map;
    },
    enabled: packageIds.length > 0,
  });

  // Fetch already-used coupons by me
  const { data: usedIds = new Set<string>() } = useQuery({
    queryKey: ['atleta-coupon-uses', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data, error } = await supabase
        .from('coupon_uses')
        .select('coupon_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return new Set((data || []).map((r) => r.coupon_id));
    },
    enabled: !!user?.id,
  });

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Codice copiato');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Impossibile copiare');
    }
  };

  return (
    <div className="min-h-screen bg-app-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur-sm border-b border-app-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 text-app-foreground hover:bg-app-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-app-foreground flex items-center gap-2">
              <Ticket className="h-5 w-5 text-app-accent" />
              I miei Coupon
            </h1>
            <p className="text-xs text-app-muted-foreground">
              Coupon ricevuti dal tuo Personal Trainer
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-32 w-full bg-app-muted rounded-xl" />
            <Skeleton className="h-32 w-full bg-app-muted rounded-xl" />
          </>
        ) : coupons.length === 0 ? (
          <Card className="border-dashed border-app-border bg-app-card/50">
            <CardContent className="py-12 text-center">
              <Gift className="h-12 w-12 mx-auto text-app-muted-foreground mb-3" />
              <p className="text-app-foreground font-medium mb-1">Nessun coupon disponibile</p>
              <p className="text-sm text-app-muted-foreground">
                Quando il tuo PT ti invierà un coupon, lo troverai qui.
              </p>
            </CardContent>
          </Card>
        ) : (
          coupons.map((c, idx) => {
            const used = usedIds.has(c.id);
            const targeted = c.target_athlete_ids && c.target_athlete_ids.length > 0;
            const pkgName = c.pt_package_id ? packagesMap[c.pt_package_id] : null;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className={`bg-app-card border-app-border overflow-hidden ${used ? 'opacity-60' : ''}`}>
                  <div className="flex">
                    {/* Left ribbon */}
                    <div className="w-24 bg-app-accent/15 border-r border-dashed border-app-border flex flex-col items-center justify-center py-4">
                      <span className="text-xl font-bold text-app-accent leading-none">
                        {formatDiscount(c)}
                      </span>
                      {targeted && (
                        <Badge variant="secondary" className="mt-2 text-[10px]">Personale</Badge>
                      )}
                    </div>

                    {/* Body */}
                    <CardContent className="flex-1 py-3 px-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-app-foreground truncate">
                            {c.description || 'Coupon sconto'}
                          </p>
                          {pkgName && (
                            <p className="text-xs text-app-muted-foreground flex items-center gap-1 mt-0.5">
                              <PackageIcon className="h-3 w-3" />
                              Valido su: {pkgName}
                            </p>
                          )}
                        </div>
                      </div>

                      {c.valid_until && (
                        <p className="text-xs text-app-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          Scade il {format(new Date(c.valid_until), 'dd MMM yyyy', { locale: it })}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <code className="flex-1 text-xs font-mono bg-app-muted px-2 py-1.5 rounded text-app-foreground border border-app-border">
                          {c.code}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copy(c.code)}
                          disabled={used}
                          className="border-app-border text-app-foreground hover:bg-app-muted"
                        >
                          {copiedCode === c.code ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>

                      {used && (
                        <p className="text-xs text-app-muted-foreground italic">Già utilizzato</p>
                      )}
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}

        <p className="text-xs text-app-muted-foreground text-center pt-2">
          Per usare un coupon, comunicalo al tuo PT al momento dell'acquisto del pacchetto.
        </p>
      </div>
    </div>
  );
}
