import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfDay, isSameDay, setHours, setMinutes } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// ATLETA BOOKING PAGE - Book sessions with connected PT
// =====================================================

interface TimeSlot {
  start: string;
  end: string;
  dayOfWeek: number;
}

export function AtletaBookingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Fetch connected PT
  const { data: connection } = useQuery({
    queryKey: ['atleta-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('*')
        .eq('atleta_user_id', user.id)
        .eq('status', 'active')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch PT profile
  const { data: ptProfile } = useQuery({
    queryKey: ['booking-pt-profile', connection?.pt_user_id],
    queryFn: async () => {
      if (!connection?.pt_user_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', connection.pt_user_id)
        .single();
      return data;
    },
    enabled: !!connection?.pt_user_id,
  });

  // Fetch PT availability
  const { data: availability } = useQuery({
    queryKey: ['pt-availability', connection?.pt_user_id],
    queryFn: async () => {
      if (!connection?.pt_user_id) return [];
      const { data, error } = await supabase
        .from('pt_availability')
        .select('*')
        .eq('pt_user_id', connection.pt_user_id)
        .eq('is_available', true)
        .order('day_of_week');
      if (error) throw error;
      return data || [];
    },
    enabled: !!connection?.pt_user_id,
  });

  // Fetch existing events for the selected date (to exclude booked slots)
  const { data: existingEvents } = useQuery({
    queryKey: ['booking-events', connection?.pt_user_id, selectedDate],
    queryFn: async () => {
      if (!connection?.pt_user_id) return [];
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = startOfDay(addDays(selectedDate, 1)).toISOString();
      const { data, error } = await supabase
        .from('calendar_events')
        .select('start_datetime, end_datetime')
        .eq('pt_user_id', connection.pt_user_id)
        .eq('is_cancelled', false)
        .gte('start_datetime', dayStart)
        .lt('start_datetime', dayEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!connection?.pt_user_id && !!selectedDate,
  });

  // Create booking mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !connection?.pt_user_id || !selectedSlot) {
        throw new Error('Dati mancanti');
      }

      const [startH, startM] = selectedSlot.start.split(':').map(Number);
      const [endH, endM] = selectedSlot.end.split(':').map(Number);
      
      const startDatetime = setMinutes(setHours(selectedDate, startH), startM);
      const endDatetime = setMinutes(setHours(selectedDate, endH), endM);

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          creator_user_id: user.id,
          title: 'Sessione di allenamento',
          event_type: 'allenamento',
          start_datetime: startDatetime.toISOString(),
          end_datetime: endDatetime.toISOString(),
          pt_user_id: connection.pt_user_id,
          atleta_user_id: user.id,
          is_public: false,
        });

      if (error) throw error;

      // Send notification to PT
      await supabase.from('notifications').insert({
        user_id: connection.pt_user_id,
        type: 'booking',
        title: 'Nuova prenotazione',
        body: `${ptProfile?.first_name || 'Un atleta'} ha prenotato una sessione per ${format(startDatetime, 'dd MMM HH:mm', { locale: it })}`,
        data: { date: startDatetime.toISOString() },
        action_url: '/pt/app/calendar',
      });
    },
    onSuccess: () => {
      toast.success('Sessione prenotata! 🎉');
      queryClient.invalidateQueries({ queryKey: ['booking-events'] });
      setSelectedSlot(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Generate available slots for selected date
  const availableSlots = useMemo(() => {
    if (!availability) return [];
    
    const dayOfWeek = selectedDate.getDay(); // 0=Sun, 1=Mon...
    const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);
    
    // Generate 1-hour slots from each availability window
    const slots: TimeSlot[] = [];
    dayAvailability.forEach(avail => {
      const [startH] = avail.start_time.split(':').map(Number);
      const [endH] = avail.end_time.split(':').map(Number);
      
      for (let h = startH; h < endH; h++) {
        const slotStart = `${h.toString().padStart(2, '0')}:00`;
        const slotEnd = `${(h + 1).toString().padStart(2, '0')}:00`;
        
        // Check if slot is already booked
        const isBooked = existingEvents?.some(event => {
          const eventStart = new Date(event.start_datetime);
          return eventStart.getHours() === h && isSameDay(eventStart, selectedDate);
        });
        
        if (!isBooked) {
          slots.push({ start: slotStart, end: slotEnd, dayOfWeek });
        }
      }
    });
    
    return slots;
  }, [availability, selectedDate, existingEvents]);

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  if (!connection) {
    return (
      <div className="min-h-screen bg-app-background p-4">
        <div className="text-center pt-20">
          <Calendar className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-app-foreground mb-2">Nessun PT collegato</h2>
          <p className="text-app-muted-foreground mb-4">Collegati a un Personal Trainer per prenotare sessioni</p>
          <Button onClick={() => navigate('/app/discover')} className="bg-app-accent text-app-accent-foreground">
            Cerca un PT
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-app-background/95 backdrop-blur border-b border-app-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-app-muted rounded-lg">
            <ArrowLeft className="h-5 w-5 text-app-foreground" />
          </button>
          <div>
            <h1 className="font-semibold text-app-foreground">Prenota sessione</h1>
            <p className="text-sm text-app-muted-foreground">
              con {ptProfile?.first_name} {ptProfile?.last_name}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Date selector */}
        <div>
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider mb-3">
            Seleziona data
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {dates.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                  className={cn(
                    'flex flex-col items-center min-w-[60px] py-3 px-2 rounded-xl transition-colors',
                    isSelected
                      ? 'bg-app-accent text-app-accent-foreground'
                      : 'bg-app-card border border-app-border text-app-foreground hover:bg-app-muted'
                  )}
                >
                  <span className="text-xs font-medium">
                    {isToday ? 'Oggi' : format(date, 'EEE', { locale: it })}
                  </span>
                  <span className="text-lg font-bold">{format(date, 'd')}</span>
                  <span className="text-xs">{format(date, 'MMM', { locale: it })}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider mb-3">
            Orari disponibili
          </h2>
          
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <motion.button
                    key={slot.start}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      'p-3 rounded-xl border text-center transition-colors',
                      isSelected
                        ? 'bg-app-accent text-app-accent-foreground border-app-accent'
                        : 'bg-app-card border-app-border text-app-foreground hover:bg-app-muted'
                    )}
                  >
                    <Clock className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-sm font-medium">{slot.start}</span>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <Card className="border-app-border bg-app-card">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto text-app-muted-foreground mb-2" />
                <p className="text-app-muted-foreground">
                  Nessuno slot disponibile per questa data
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Booking confirmation */}
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="border-app-accent/30 bg-app-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-app-accent" />
                  <div>
                    <p className="font-medium text-app-foreground">
                      {format(selectedDate, 'EEEE d MMMM', { locale: it })}
                    </p>
                    <p className="text-sm text-app-muted-foreground">
                      {selectedSlot.start} - {selectedSlot.end}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending}
              className="w-full h-12 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full"
            >
              {bookMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Calendar className="h-5 w-5 mr-2" />
              )}
              Conferma prenotazione
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default AtletaBookingPage;
