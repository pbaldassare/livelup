import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Dumbbell,
  Video
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// PT APP CALENDAR PAGE - Calendario (Mobile)
// =====================================================

const EVENT_TYPE_CONFIG = {
  allenamento: { label: 'Allenamento', icon: Dumbbell, color: 'bg-primary' },
  appuntamento: { label: 'Appuntamento', icon: Users, color: 'bg-info' },
  video_call: { label: 'Video call', icon: Video, color: 'bg-warning' },
  altro: { label: 'Altro', icon: CalendarIcon, color: 'bg-muted' },
};

export function PTAppCalendarPage() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch events for the week
  const { data: events, isLoading } = useQuery({
    queryKey: ['pt-events', user?.id, weekStart.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('pt_user_id', user.id)
        .eq('is_cancelled', false)
        .gte('start_datetime', weekStart.toISOString())
        .lte('start_datetime', weekEnd.toISOString())
        .order('start_datetime', { ascending: true });

      if (error) throw error;

      // Fetch athlete profiles for events with athletes
      const eventsWithProfiles = await Promise.all(
        (data || []).map(async (event) => {
          if (event.atleta_user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', event.atleta_user_id)
              .single();
            return { ...event, atletaProfile: profile };
          }
          return event;
        })
      );

      return eventsWithProfiles;
    },
    enabled: !!user?.id,
  });

  // Filter events for selected date
  const selectedDateEvents = events?.filter(event => 
    isSameDay(new Date(event.start_datetime), selectedDate)
  ) || [];

  // Count events per day for indicators
  const eventCountByDay = weekDays.map(day => ({
    date: day,
    count: events?.filter(e => isSameDay(new Date(e.start_datetime), day)).length || 0,
  }));

  const goToPrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => {
    setCurrentWeek(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Calendario</h1>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Oggi
          </Button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-medium">
            {format(weekStart, 'd', { locale: it })} - {format(weekEnd, 'd MMMM yyyy', { locale: it })}
          </span>
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Week days */}
        <div className="grid grid-cols-7 gap-1 mt-4">
          {weekDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const eventCount = eventCountByDay[i].count;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'flex flex-col items-center py-2 rounded-lg transition-colors',
                  isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : isTodayDate 
                      ? 'bg-primary/10' 
                      : 'hover:bg-muted'
                )}
              >
                <span className="text-xs text-muted-foreground">
                  {format(day, 'EEE', { locale: it })}
                </span>
                <span className={cn(
                  'text-lg font-semibold',
                  isSelected && 'text-primary-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                {eventCount > 0 && (
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1',
                    isSelected ? 'bg-primary-foreground' : 'bg-primary'
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events for selected date */}
      <div className="p-4 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {isToday(selectedDate) 
            ? 'Oggi' 
            : format(selectedDate, 'EEEE d MMMM', { locale: it })}
        </h2>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : selectedDateEvents.length > 0 ? (
          selectedDateEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nessun evento per questa data
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const config = EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.altro;
  const Icon = config.icon;
  const atletaName = event.atletaProfile 
    ? `${event.atletaProfile.first_name || ''} ${event.atletaProfile.last_name || ''}`.trim()
    : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center text-white',
            config.color
          )}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold">{event.title}</h3>
            
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(event.start_datetime), 'HH:mm')}
                {event.end_datetime && ` - ${format(new Date(event.end_datetime), 'HH:mm')}`}
              </span>
              
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </span>
              )}
            </div>

            {atletaName && (
              <Badge variant="secondary" className="mt-2 text-xs">
                <Users className="h-3 w-3 mr-1" />
                {atletaName}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PTAppCalendarPage;
