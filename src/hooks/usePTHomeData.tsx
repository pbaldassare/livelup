// =====================================================
// HOOK: PT Home Data
// Fornisce dati operativi per la nuova Home Coach:
// - Lista atleti attivi con ultimo accesso e stato
// - Alert (atleti inattivi, abbonamenti in scadenza)
// - Analytics rapide (fatturato mese, pagamenti pending)
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AthleteWorkoutStatus = 'active' | 'in_session' | 'inactive';

export interface PTHomeAthlete {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  last_activity_at: string | null;
  status: AthleteWorkoutStatus;
  missed_workouts: number;
  priority: number; // più alto = più critico
}

export interface PTHomeAlert {
  id: string;
  type: 'inactive_athlete' | 'subscription_expiring' | 'workout_expiring';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action_url?: string;
}

export interface PTHomeAnalytics {
  monthly_revenue: number;
  pending_payments: number;
  workout_completion_pct: number;
}

interface PTHomeData {
  athletes: PTHomeAthlete[];
  alerts: PTHomeAlert[];
  analytics: PTHomeAnalytics;
}

const INACTIVE_DAYS_THRESHOLD = 7;
const EXPIRING_DAYS_THRESHOLD = 14;

export function usePTHomeData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pt-home-data', user?.id],
    queryFn: async (): Promise<PTHomeData> => {
      if (!user?.id) {
        return { athletes: [], alerts: [], analytics: { monthly_revenue: 0, pending_payments: 0, workout_completion_pct: 0 } };
      }

      // 1) Connessioni attive
      const { data: connections } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');

      const athleteIds = (connections || []).map((c) => c.atleta_user_id);

      // 2) Profili atleti
      let profilesMap = new Map<string, { first_name: string | null; last_name: string | null; avatar_url: string | null; updated_at: string }>();
      if (athleteIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url, updated_at')
          .in('user_id', athleteIds);
        (profiles || []).forEach((p) => profilesMap.set(p.user_id, p));
      }

      // 3) Ultime attività atleti (ultimi messaggi inviati come proxy di "ultimo accesso")
      const lastActivityMap = new Map<string, string>();
      if (athleteIds.length > 0) {
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('sender_user_id, created_at')
          .in('sender_user_id', athleteIds)
          .order('created_at', { ascending: false })
          .limit(500);
        (lastMsgs || []).forEach((m) => {
          if (!lastActivityMap.has(m.sender_user_id)) {
            lastActivityMap.set(m.sender_user_id, m.created_at);
          }
        });
      }

      const now = Date.now();
      const inactiveCutoff = now - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;

      // Costruzione lista atleti con stato
      const athletes: PTHomeAthlete[] = athleteIds.map((aid) => {
        const profile = profilesMap.get(aid);
        const lastActivity = lastActivityMap.get(aid) || profile?.updated_at || null;
        const lastActivityTs = lastActivity ? new Date(lastActivity).getTime() : 0;

        let status: AthleteWorkoutStatus = 'inactive';
        let priority = 0;

        if (lastActivityTs > 0) {
          if (lastActivityTs >= inactiveCutoff) {
            status = 'active';
            priority = 1;
          } else {
            status = 'inactive';
            priority = 10; // critico
          }
        } else {
          status = 'inactive';
          priority = 8;
        }

        return {
          id: aid,
          user_id: aid,
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          last_activity_at: lastActivity,
          status,
          missed_workouts: 0,
          priority,
        };
      });

      athletes.sort((a, b) => b.priority - a.priority);

      // 4) Alert
      const alerts: PTHomeAlert[] = [];

      // 4a) Atleti inattivi
      const inactiveAthletes = athletes.filter((a) => a.status === 'inactive');
      if (inactiveAthletes.length > 0) {
        alerts.push({
          id: 'inactive-athletes',
          type: 'inactive_athlete',
          severity: 'warning',
          title: `${inactiveAthletes.length} atleti inattivi`,
          description: `Nessuna attività da oltre ${INACTIVE_DAYS_THRESHOLD} giorni`,
          action_url: '/pt/app/athletes',
        });
      }

      // 4b) Abbonamenti in scadenza
      const expCutoff = new Date(now + EXPIRING_DAYS_THRESHOLD * 24 * 60 * 60 * 1000).toISOString();
      const { data: expiringSubs } = await supabase
        .from('atleta_pt_subscriptions')
        .select('id, expires_at')
        .eq('pt_user_id', user.id)
        .eq('status', 'active')
        .not('expires_at', 'is', null)
        .lte('expires_at', expCutoff)
        .gte('expires_at', new Date(now).toISOString());

      if (expiringSubs && expiringSubs.length > 0) {
        alerts.push({
          id: 'subs-expiring',
          type: 'subscription_expiring',
          severity: 'critical',
          title: `${expiringSubs.length} abbonamenti in scadenza`,
          description: `Rinnovi entro ${EXPIRING_DAYS_THRESHOLD} giorni`,
          action_url: '/pt/app/athletes',
        });
      }

      // 5) Analytics
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: paidPayments } = await supabase
        .from('payments')
        .select('amount, status, paid_at')
        .gte('paid_at', startOfMonth.toISOString())
        .eq('status', 'paid');

      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'pending');

      const monthly_revenue = (paidPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const pending_payments = (pendingPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const analytics: PTHomeAnalytics = {
        monthly_revenue,
        pending_payments,
        workout_completion_pct: 0, // TODO: calcolare quando avremo log workout consolidati
      };

      return { athletes, alerts, analytics };
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });
}

export default usePTHomeData;
