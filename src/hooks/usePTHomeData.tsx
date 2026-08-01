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
import { getPTConnectionsWithPtActive } from '@/lib/api/connections';
import { addDays, endOfDay, startOfDay } from 'date-fns';

export type AthleteWorkoutStatus = 'active' | 'in_session' | 'inactive';

export interface PTHomeAthlete {
  id: string;
  user_id: string;
  connection_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  last_activity_at: string | null;
  /** PT-managed roster status (manual toggle) */
  is_pt_active: boolean;
  /** Display badge: mirrors is_pt_active */
  status: AthleteWorkoutStatus;
  /** No workout/message activity within threshold while PT-active */
  low_engagement: boolean;
  missed_workouts: number;
  priority: number; // più alto = più critico
}

export interface PTHomeAlert {
  id: string;
  type:
    | 'inactive_athlete'
    | 'subscription_expiring'
    | 'workout_expiring'
    | 'connection_pending'
    | 'appointment_soon';
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

export interface PTHomeAppointment {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  atleta_user_id: string | null;
  atleta_name: string | null;
  is_today: boolean;
}

interface PTHomeData {
  athletes: PTHomeAthlete[];
  alerts: PTHomeAlert[];
  appointments: PTHomeAppointment[];
  appointments_scope: 'today' | 'upcoming';
  analytics: PTHomeAnalytics;
}

const INACTIVE_DAYS_THRESHOLD = 7;
const EXPIRING_SUB_DAYS = 14;
const WORKOUT_DUE_DAYS = 3;
const APPOINTMENT_SOON_MINUTES = 60;

function latestTimestamp(...values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestTs = 0;
  for (const value of values) {
    if (!value) continue;
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts) || ts <= bestTs) continue;
    bestTs = ts;
    best = value;
  }
  return best;
}

export function usePTHomeData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pt-home-data', user?.id],
    queryFn: async (): Promise<PTHomeData> => {
      if (!user?.id) {
        return {
          athletes: [],
          alerts: [],
          appointments: [],
          appointments_scope: 'today' as const,
          analytics: { monthly_revenue: 0, pending_payments: 0, workout_completion_pct: 0 },
        };
      }

      // 1) Connessioni attive (incluso flag PT attivo/disattivo, con fallback pre-migration)
      const connections = await getPTConnectionsWithPtActive(user.id, {
        status: 'active',
        columns: 'list',
      });

      const athleteIds = connections.map((c) => c.atleta_user_id);
      const ptActiveMap = new Map(
        connections.map((c) => [c.atleta_user_id, c.is_pt_active !== false]),
      );
      const connectionIdMap = new Map(
        connections.map((c) => [c.atleta_user_id, c.id ?? null]),
      );

      // 2) Profili atleti
      let profilesMap = new Map<string, { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null; updated_at: string }>();
      if (athleteIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, avatar_url, updated_at')
          .in('user_id', athleteIds);
        (profiles || []).forEach((p) => profilesMap.set(p.user_id, p));
      }

      // 3) Ultime attività atleti: workout completati + messaggi (fallback)
      const lastActivityMap = new Map<string, string>();
      if (athleteIds.length > 0) {
        const [{ data: lastWorkouts }, { data: lastMsgs }] = await Promise.all([
          supabase
            .from('workouts')
            .select('atleta_user_id, completed_at')
            .eq('pt_user_id', user.id)
            .in('atleta_user_id', athleteIds)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(500),
          supabase
            .from('messages')
            .select('sender_user_id, created_at')
            .in('sender_user_id', athleteIds)
            .order('created_at', { ascending: false })
            .limit(500),
        ]);

        (lastWorkouts || []).forEach((w) => {
          if (!w.completed_at) return;
          const current = lastActivityMap.get(w.atleta_user_id);
          lastActivityMap.set(
            w.atleta_user_id,
            latestTimestamp(current, w.completed_at) ?? w.completed_at,
          );
        });

        (lastMsgs || []).forEach((m) => {
          const current = lastActivityMap.get(m.sender_user_id);
          lastActivityMap.set(
            m.sender_user_id,
            latestTimestamp(current, m.created_at) ?? m.created_at,
          );
        });
      }

      const now = Date.now();
      const inactiveCutoff = now - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;

      // Costruzione lista atleti con stato PT-manuale + engagement secondario
      const athletes: PTHomeAthlete[] = athleteIds.map((aid) => {
        const profile = profilesMap.get(aid);
        const lastActivity = lastActivityMap.get(aid) || profile?.updated_at || null;
        const lastActivityTs = lastActivity ? new Date(lastActivity).getTime() : 0;
        const isPtActive = ptActiveMap.get(aid) !== false;
        const lowEngagement =
          isPtActive &&
          (lastActivityTs === 0 || lastActivityTs < inactiveCutoff);

        let priority = 0;
        if (!isPtActive) {
          priority = 6;
        } else if (lowEngagement) {
          priority = 10;
        } else {
          priority = 1;
        }

        return {
          id: aid,
          user_id: aid,
          connection_id: connectionIdMap.get(aid) ?? null,
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          email: profile?.email ?? null,
          avatar_url: profile?.avatar_url ?? null,
          last_activity_at: lastActivity,
          is_pt_active: isPtActive,
          status: isPtActive ? 'active' : 'inactive',
          low_engagement: lowEngagement,
          missed_workouts: 0,
          priority,
        };
      });

      athletes.sort((a, b) => b.priority - a.priority);

      // 4) Alert
      const alerts: PTHomeAlert[] = [];

      // 4a) Atleti disattivati manualmente dal PT
      const ptInactiveAthletes = athletes.filter((a) => !a.is_pt_active);
      if (ptInactiveAthletes.length > 0) {
        alerts.push({
          id: 'pt-inactive-athletes',
          type: 'inactive_athlete',
          severity: 'info',
          title: `${ptInactiveAthletes.length} atleti disattivati`,
          description: 'Hai marcato questi atleti come disattivi',
          action_url: '/pt/app/athletes',
        });
      }

      // 4a-bis) Atleti attivi senza engagement recente
      const lowEngagementAthletes = athletes.filter((a) => a.low_engagement);
      if (lowEngagementAthletes.length > 0) {
        alerts.push({
          id: 'low-engagement-athletes',
          type: 'inactive_athlete',
          severity: 'warning',
          title: `${lowEngagementAthletes.length} atleti poco attivi`,
          description: `Nessun allenamento o messaggio da oltre ${INACTIVE_DAYS_THRESHOLD} giorni`,
          action_url: '/pt/app/athletes',
        });
      }

      // 4b) Abbonamenti in scadenza
      const expCutoff = new Date(now + EXPIRING_SUB_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: expiringSubs } = await supabase
        .from('atleta_pt_subscriptions')
        .select('id, expires_at')
        .eq('pt_user_id', user.id)
        .eq('status', 'attivo')
        .not('expires_at', 'is', null)
        .lte('expires_at', expCutoff)
        .gte('expires_at', new Date(now).toISOString());

      if (expiringSubs && expiringSubs.length > 0) {
        alerts.push({
          id: 'subs-expiring',
          type: 'subscription_expiring',
          severity: 'critical',
          title: `${expiringSubs.length} abbonamenti in scadenza`,
          description: `Rinnovi entro ${EXPIRING_SUB_DAYS} giorni`,
          action_url: '/pt/app/athletes',
        });
      }

      // 4c) Schede in scadenza o scadute
      const workoutDueCutoff = new Date(now + WORKOUT_DUE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: expiringWorkouts } = await supabase
        .from('workouts')
        .select('id, atleta_user_id, due_date, status')
        .eq('pt_user_id', user.id)
        .in('status', ['attivo', 'scaduto'])
        .not('due_date', 'is', null)
        .lte('due_date', workoutDueCutoff)
        .order('due_date', { ascending: true });

      if (expiringWorkouts && expiringWorkouts.length > 0) {
        const overdueCount = expiringWorkouts.filter(
          (w) => w.due_date && new Date(w.due_date).getTime() < now,
        ).length;
        const firstAthleteId = expiringWorkouts[0]?.atleta_user_id;
        alerts.push({
          id: 'workouts-expiring',
          type: 'workout_expiring',
          severity: overdueCount > 0 ? 'critical' : 'warning',
          title:
            overdueCount > 0
              ? `${expiringWorkouts.length} schede da completare`
              : `${expiringWorkouts.length} schede in scadenza`,
          description:
            overdueCount > 0
              ? `${overdueCount} già scadute, altre entro ${WORKOUT_DUE_DAYS} giorni`
              : `Scadenza entro ${WORKOUT_DUE_DAYS} giorni`,
          action_url: firstAthleteId ? `/pt/app/athlete/${firstAthleteId}` : '/pt/app/athletes',
        });
      }

      // 4d) Richieste di connessione in attesa (PT deve rispondere)
      const { data: pendingConnections } = await supabase
        .from('pt_atleta_connections')
        .select('id, atleta_user_id, requested_by')
        .eq('pt_user_id', user.id)
        .eq('status', 'pending');

      const ptActionPending = (pendingConnections || []).filter(
        (c) => !c.requested_by || c.requested_by !== user.id,
      );

      if (ptActionPending.length > 0) {
        alerts.push({
          id: 'connections-pending',
          type: 'connection_pending',
          severity: 'info',
          title:
            ptActionPending.length === 1
              ? '1 richiesta di connessione'
              : `${ptActionPending.length} richieste di connessione`,
          description: 'Atleti in attesa di approvazione',
          action_url: '/pt/app/athletes?tab=pending',
        });
      }

      // 4e) Appuntamenti: oggi, altrimenti prossimi 3 entro 7 giorni
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const weekEnd = endOfDay(addDays(todayStart, 7));

      const { data: todayApptsRaw } = await supabase
        .from('calendar_events')
        .select('id, title, start_datetime, end_datetime, location, atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('category', 'appuntamento')
        .eq('is_cancelled', false)
        .gte('start_datetime', todayStart.toISOString())
        .lte('start_datetime', todayEnd.toISOString())
        .order('start_datetime', { ascending: true })
        .limit(5);

      let appointmentsScope: 'today' | 'upcoming' = 'today';
      let apptsRaw = todayApptsRaw ?? [];

      if (apptsRaw.length === 0) {
        const { data: upcomingRaw } = await supabase
          .from('calendar_events')
          .select('id, title, start_datetime, end_datetime, location, atleta_user_id')
          .eq('pt_user_id', user.id)
          .eq('category', 'appuntamento')
          .eq('is_cancelled', false)
          .gt('start_datetime', todayEnd.toISOString())
          .lte('start_datetime', weekEnd.toISOString())
          .order('start_datetime', { ascending: true })
          .limit(3);
        apptsRaw = upcomingRaw ?? [];
        appointmentsScope = 'upcoming';
      }

      // 4f) Appuntamento entro 60 minuti (solo oggi)
      const appointmentSoonCutoff = now + APPOINTMENT_SOON_MINUTES * 60 * 1000;
      const soonAppts = (todayApptsRaw ?? []).filter((a) => {
        const startTs = new Date(a.start_datetime).getTime();
        return startTs >= now && startTs <= appointmentSoonCutoff;
      });

      if (soonAppts.length > 0) {
        const nextAppt = soonAppts[0];
        const minutesUntil = Math.max(
          1,
          Math.round((new Date(nextAppt.start_datetime).getTime() - now) / 60000),
        );
        alerts.push({
          id: 'appointment-soon',
          type: 'appointment_soon',
          severity: minutesUntil <= 15 ? 'critical' : 'warning',
          title: soonAppts.length === 1 ? 'Appuntamento imminente' : `${soonAppts.length} appuntamenti imminenti`,
          description:
            soonAppts.length === 1
              ? `"${nextAppt.title}" tra ${minutesUntil} min`
              : `Il prossimo tra ${minutesUntil} min — ${nextAppt.title}`,
          action_url: '/pt/app/calendar?view=appuntamenti',
        });
      }

      const apptAthleteIds = [
        ...new Set(apptsRaw.map((a) => a.atleta_user_id).filter(Boolean)),
      ] as string[];
      const apptProfileMap = new Map<string, string>();
      if (apptAthleteIds.length > 0) {
        const { data: apptProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', apptAthleteIds);
        (apptProfiles ?? []).forEach((p) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          if (name) apptProfileMap.set(p.user_id, name);
        });
      }

      const appointments: PTHomeAppointment[] = apptsRaw.map((a) => {
        const start = new Date(a.start_datetime);
        return {
          id: a.id,
          title: a.title,
          start_datetime: a.start_datetime,
          end_datetime: a.end_datetime,
          location: a.location,
          atleta_user_id: a.atleta_user_id,
          atleta_name: a.atleta_user_id ? apptProfileMap.get(a.atleta_user_id) ?? null : null,
          is_today: start >= todayStart && start <= todayEnd,
        };
      });

      // 5) Analytics
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: paidPayments } = await supabase
        .from('payments')
        .select('amount, status, paid_at')
        .eq('user_id', user.id)
        .gte('paid_at', startOfMonth.toISOString())
        .eq('status', 'completed');

      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      const monthly_revenue = (paidPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const pending_payments = (pendingPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const analytics: PTHomeAnalytics = {
        monthly_revenue,
        pending_payments,
        workout_completion_pct: 0, // TODO: calcolare quando avremo log workout consolidati
      };

      const severityOrder = { critical: 0, warning: 1, info: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      return { athletes, alerts, appointments, appointments_scope: appointmentsScope, analytics };
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });
}

export default usePTHomeData;
