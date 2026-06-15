import { supabase } from '@/integrations/supabase/client';

// =====================================================
// COUPON VALIDATION & APPLICATION HELPERS
// =====================================================

export interface ValidatableCoupon {
  id: string;
  code: string;
  description: string | null;
  coupon_type: string;
  discount_value: number;
  free_months: number | null;
  free_sessions: number | null;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number | null;
  max_uses_per_user: number | null;
  is_active: boolean;
  pt_user_id: string | null;
  pt_package_id: string | null;
  target_athlete_ids: string[] | null;
}

export interface CouponEffect {
  priceDiscount: number; // amount to subtract from price
  bonusSessions: number; // sessions to add
  bonusMonths: number;   // months to add to expiry
  finalPrice: number;
  summary: string;
}

export interface ValidationContext {
  ptUserId: string;
  athleteUserId: string;
  packageId: string;
  basePrice: number;
}

export async function validateCoupon(
  code: string,
  ctx: ValidationContext
): Promise<{ coupon: ValidatableCoupon; effect: CouponEffect } | { error: string }> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: 'Inserisci un codice' };

  const { data, error } = await supabase
    .from('coupons')
    .select('id, code, description, coupon_type, discount_value, free_months, free_sessions, valid_from, valid_until, max_uses, current_uses, max_uses_per_user, is_active, pt_user_id, pt_package_id, target_athlete_ids')
    .eq('code', normalized)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: 'Coupon non trovato' };

  const c = data as ValidatableCoupon;
  const now = new Date();

  if (!c.is_active) return { error: 'Coupon non attivo' };
  if (c.valid_from && new Date(c.valid_from) > now) return { error: 'Coupon non ancora valido' };
  if (c.valid_until && new Date(c.valid_until) < now) return { error: 'Coupon scaduto' };
  if (c.pt_user_id && c.pt_user_id !== ctx.ptUserId) return { error: 'Coupon non appartenente a questo PT' };
  if (c.pt_package_id && c.pt_package_id !== ctx.packageId) return { error: 'Coupon non valido per questo pacchetto' };
  if (c.target_athlete_ids && c.target_athlete_ids.length > 0 && !c.target_athlete_ids.includes(ctx.athleteUserId)) {
    return { error: 'Coupon non destinato a questo atleta' };
  }
  if (c.max_uses != null && (c.current_uses ?? 0) >= c.max_uses) {
    return { error: 'Coupon esaurito' };
  }

  // Per-user usage check
  if (c.max_uses_per_user != null) {
    const { count, error: useErr } = await supabase
      .from('coupon_uses')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', c.id)
      .eq('user_id', ctx.athleteUserId);
    if (useErr) return { error: useErr.message };
    if ((count ?? 0) >= c.max_uses_per_user) {
      return { error: 'Coupon già utilizzato da questo atleta' };
    }
  }

  // Compute effect
  let priceDiscount = 0;
  let bonusSessions = 0;
  let bonusMonths = 0;
  let summary = '';

  if (c.free_months && c.free_months > 0) {
    bonusMonths = c.free_months;
    summary = `+${c.free_months} mesi gratis`;
  } else if (c.free_sessions && c.free_sessions > 0) {
    bonusSessions = c.free_sessions;
    summary = `+${c.free_sessions} sessioni gratis`;
  } else if (c.coupon_type === 'percentage') {
    priceDiscount = +(ctx.basePrice * (c.discount_value / 100)).toFixed(2);
    summary = `-${c.discount_value}% (€${priceDiscount.toFixed(2)})`;
  } else if (c.coupon_type === 'fixed_amount') {
    priceDiscount = Math.min(c.discount_value, ctx.basePrice);
    summary = `-€${priceDiscount.toFixed(2)}`;
  }

  const finalPrice = Math.max(0, +(ctx.basePrice - priceDiscount).toFixed(2));

  return {
    coupon: c,
    effect: { priceDiscount, bonusSessions, bonusMonths, finalPrice, summary },
  };
}

export async function recordCouponUse(params: {
  couponId: string;
  userId: string;
  discountApplied: number;
  currentUses: number | null;
}) {
  const { couponId, userId, discountApplied, currentUses } = params;

  const { error: useErr } = await supabase.from('coupon_uses').insert({
    coupon_id: couponId,
    user_id: userId,
    discount_applied: discountApplied,
  });
  if (useErr) throw useErr;

  const { error: updErr } = await supabase
    .from('coupons')
    .update({ current_uses: (currentUses ?? 0) + 1 })
    .eq('id', couponId);
  if (updErr) throw updErr;
}
