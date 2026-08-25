import { supabase } from '@/integrations/supabase/client';

export type PTPlanSlug = 'starter' | 'growth' | 'pro' | 'unlimited';

export interface PTBillingPlan {
  id: string;
  name: string;
  description: string | null;
  slug: PTPlanSlug | string | null;
  min_athletes: number | null;
  max_athletes: number | null;
  price_monthly: number;
  price_yearly: number | null;
  currency: string;
  features: unknown;
  is_featured: boolean | null;
  sort_order: number | null;
  stripe_price_id: string | null;
}

export interface PTBillingSubscription {
  id: string;
  user_id: string;
  status: string;
  subscription_type: string;
  plan_id: string | null;
  required_plan_id: string | null;
  pending_plan_id: string | null;
  scheduled_downgrade_plan_id: string | null;
  billed_athlete_count: number;
  current_athlete_count: number;
  price_monthly: number | null;
  currency: string;
  started_at: string;
  expires_at: string | null;
  next_billing_at: string | null;
  past_due_since: string | null;
  grace_period_ends_at: string | null;
}

export interface PTBillingOverview {
  athlete_count: number;
  can_accept: boolean;
  subscription: PTBillingSubscription | null;
  current_plan: PTBillingPlan | null;
  required_plan: PTBillingPlan | null;
  pending_plan: PTBillingPlan | null;
  plans: PTBillingPlan[];
}

export interface AdminPTBillingReport {
  mrr: number;
  by_plan: Array<{
    slug: string;
    name: string;
    price_monthly: number;
    subscribers: number;
    mrr: number;
  }>;
  blocked: number;
  grace: number;
  pending_payments: number;
  failed_this_month: number;
  near_limit: Array<{
    user_id: string;
    current_athlete_count: number;
    max_athletes: number | null;
    slug: string;
    plan_name: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }>;
}

export function formatEur(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(amount);
}

export function planAthleteLabel(plan: Pick<PTBillingPlan, 'min_athletes' | 'max_athletes'> | null) {
  if (!plan) return '—';
  if (plan.max_athletes == null) return `${plan.min_athletes ?? 51}+ atleti`;
  if ((plan.min_athletes ?? 0) <= 0) return `Fino a ${plan.max_athletes} atleti`;
  return `${plan.min_athletes}–${plan.max_athletes} atleti`;
}

export function needsPaidUpgrade(
  current: PTBillingPlan | null,
  required: PTBillingPlan | null,
) {
  return (required?.price_monthly ?? 0) > (current?.price_monthly ?? 0);
}

export async function fetchPTBillingOverview(ptUserId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_pt_billing_overview', {
    _pt_user_id: ptUserId ?? null,
  });
  if (error) throw error;
  return data as PTBillingOverview;
}

export async function startPTCheckout(planId: string) {
  const { data, error } = await supabase.functions.invoke('create-pt-checkout', {
    body: { plan_id: planId },
  });
  if (error) throw error;
  const url = (data as { url?: string; error?: string })?.url;
  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }
  if (!url) throw new Error('Checkout non disponibile');
  window.location.href = url;
}

export async function requestPTPlanUpgrade(planId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('request_pt_plan_upgrade', {
    _plan_id: planId,
  });
  if (error) throw error;
  return data as { payment_id: string; plan_id: string; status: string };
}

export async function fetchAdminPTBillingReport() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_admin_pt_billing_report');
  if (error) throw error;
  return data as AdminPTBillingReport;
}

export async function adminCompletePTPayment(paymentId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('admin_complete_pt_payment', {
    _payment_id: paymentId,
  });
  if (error) throw error;
}

export async function adminUnblockPTBilling(ptUserId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('admin_unblock_pt_billing', {
    _pt_user_id: ptUserId,
  });
  if (error) throw error;
}

export async function adminEnforcePTPastDue() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('enforce_pt_past_due');
  if (error) throw error;
  return Number(data ?? 0);
}

export async function fetchOwnPayments(userId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOwnBillingEvents(userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('pt_billing_events') as any)
    .select('*')
    .eq('pt_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
