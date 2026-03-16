import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { usePTAppStats } from '@/hooks/usePTAppStats';
import { usePTConnectionRequests } from '@/hooks/usePTConnectionRequests';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/app/AppHeader';
import { WeekCalendar } from '@/components/app/WeekCalendar';
import { CTABanner } from '@/components/app/CTABanner';
import { MobileNav } from '@/components/app/MobileNav';
import { PTConnectionRequests } from '@/components/app/PTConnectionRequests';
import { 
  Users, 
  Dumbbell, 
  MessageSquare, 
  Calendar,
  ChevronRight,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// PT APP HOME - Dashboard Mobile/PWA
// Design: dark theme, lime accent, quick stats
// Solo per ruolo: pt (app)
// =====================================================

export function PTAppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = usePTAppStats();
  const { pendingCount } = usePTConnectionRequests();

  // Fetch profile for name
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch today's events
  const { data: todayEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['pt-today-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_datetime, event_type, atleta_user_id')
        .eq('pt_user_id', user.id)
        .gte('start_datetime', startOfDay)
        .lte('start_datetime', endOfDay)
        .eq('is_cancelled', false)
        .order('start_datetime', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mock week data
  const weekDays = [
    { day: 'L', date: 20, isCompleted: true, isToday: false, isFuture: false },
    { day: 'M', date: 21, isCompleted: true, isToday: false, isFuture: false },
    { day: 'M', date: 22, isCompleted: false, isToday: false, isFuture: false },
    { day: 'G', date: 23, isCompleted: false, isToday: true, isFuture: false },
    { day: 'V', date: 24, isCompleted: false, isToday: false, isFuture: true },
    { day: 'S', date: 25, isCompleted: false, isToday: false, isFuture: true },
    { day: 'D', date: 26, isCompleted: false, isToday: false, isFuture: true },
  ];

  const avatarInitials = profile 
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() 
    : 'PT';

  return (
    <div className="min-h-screen bg-app-background text-app-foreground pb-20" data-tour="pt-greeting">
      {/* Header */}
      <AppHeader
        avatarUrl={profile?.avatar_url || undefined}
        avatarInitials={avatarInitials}
        showNotifications
        notificationCount={stats?.unreadMessages || 0}
        onAvatarPress={() => navigate('/pt/app/profile')}
        onNotificationPress={() => {}}
      >
        <WeekCalendar days={weekDays} />
      </AppHeader>

      <main className="px-4 space-y-4 pt-2">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3" data-tour="pt-stats-section">
          <StatCard 
            icon={Users} 
            label="Atleti Attivi" 
            value={statsLoading ? 0 : (stats?.activeAthletes || 0)}
            onClick={() => navigate('/pt/app/athletes')}
          />
          <StatCard 
            icon={Clock} 
            label="Richieste" 
            value={statsLoading ? 0 : (stats?.pendingRequests || 0)}
            highlight={(stats?.pendingRequests || 0) > 0}
            onClick={() => navigate('/pt/app/athletes')}
          />
          <StatCard 
            icon={Calendar} 
            label="Eventi Oggi" 
            value={statsLoading ? 0 : (stats?.todayEvents || 0)}
            onClick={() => navigate('/pt/app/calendar')}
          />
          <StatCard 
            icon={MessageSquare} 
            label="Messaggi" 
            value={statsLoading ? 0 : (stats?.unreadMessages || 0)}
            highlight={(stats?.unreadMessages || 0) > 0}
            onClick={() => navigate('/pt/app/chat')}
          />
        </div>

        {/* Pending Connection Requests */}
        {pendingCount > 0 && (
          <PTConnectionRequests maxItems={3} showEmpty={false} />
        )}

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Oggi
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-app-accent text-xs"
                onClick={() => navigate('/pt/app/calendar')}
              >
                Calendario
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {todayEvents.map((event) => (
              <div 
                key={event.id}
                className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3 border border-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent/20">
                  <Clock className="h-5 w-5 text-app-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{event.title}</p>
                  <p className="text-xs text-white/50">
                    {format(new Date(event.start_datetime), 'HH:mm', { locale: it })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <CTABanner
          title="Crea una nuova scheda"
          subtitle="Usa la dashboard web per creare schede complete"
          actionLabel="Vai alla Dashboard"
          icon={Dumbbell}
          onAction={() => window.open('/pt', '_blank')}
        />
      </main>

      {/* Bottom Navigation */}
      <MobileNav role="pt" />
    </div>
  );
}

// =====================================================
// STAT CARD - Card statistiche compatta
// =====================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  highlight?: boolean;
  onClick?: () => void;
}

function StatCard({ icon: Icon, label, value, highlight, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-4 border border-white/10 text-left active:scale-[0.98] transition-transform w-full"
    >
      <div className={`p-2.5 rounded-lg ${highlight ? 'bg-app-accent/20' : 'bg-gray-800'}`}>
        <Icon className={`h-5 w-5 ${highlight ? 'text-app-accent' : 'text-white/60'}`} />
      </div>
      <div>
        <p className={`text-2xl font-bold ${highlight ? 'text-app-accent' : 'text-white'}`}>
          {value}
        </p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </button>
  );
}

export default PTAppHome;
