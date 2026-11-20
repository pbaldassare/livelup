import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/** Ordine di tentativi: il hook Resend manda `type=signup`, GoTrue a volte accetta solo `email`. */
export function otpTypesToTry(type: string): EmailOtpType[] {
  const primary = (type || 'email') as EmailOtpType;
  const extras: EmailOtpType[] =
    primary === 'recovery'
      ? []
      : primary === 'signup' || primary === 'invite'
        ? ['email', 'signup', 'invite']
        : primary === 'email'
          ? ['signup', 'invite']
          : ['email', 'signup'];
  const seen = new Set<string>();
  const out: EmailOtpType[] = [];
  for (const t of [primary, ...extras]) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export async function verifyAuthEmailOtp(tokenHash: string, type: string) {
  let lastError: { message?: string } | null = null;
  for (const otpType of otpTypesToTry(type)) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (!error) return { data, error: null };
    lastError = error;
    const msg = (error.message || '').toLowerCase();
    const retryable = msg.includes('invalid') || msg.includes('expired') || msg.includes('otp');
    if (!retryable) return { data: null, error };
  }
  return { data: null, error: lastError };
}