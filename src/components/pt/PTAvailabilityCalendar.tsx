import { motion } from 'framer-motion';
import { Clock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// PT AVAILABILITY CALENDAR - Visualizzazione disponibilità settimanale
// =====================================================

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface PTAvailabilityCalendarProps {
  availability: AvailabilitySlot[];
}

const DAYS = [
  { short: 'Lun', full: 'Lunedì', index: 1 },
  { short: 'Mar', full: 'Martedì', index: 2 },
  { short: 'Mer', full: 'Mercoledì', index: 3 },
  { short: 'Gio', full: 'Giovedì', index: 4 },
  { short: 'Ven', full: 'Venerdì', index: 5 },
  { short: 'Sab', full: 'Sabato', index: 6 },
  { short: 'Dom', full: 'Domenica', index: 0 },
];

export function PTAvailabilityCalendar({ availability }: PTAvailabilityCalendarProps) {
  // Group availability by day
  const availabilityByDay = availability.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Disponibilità Settimanale</h3>
      </div>

      {/* Desktop view */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {DAYS.map((day, i) => {
          const slots = availabilityByDay[day.index] || [];
          const hasSlots = slots.length > 0;

          return (
            <motion.div
              key={day.index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-lg p-3 text-center border transition-colors",
                hasSlots 
                  ? "bg-success/10 border-success/30" 
                  : "bg-muted/50 border-border"
              )}
            >
              <div className="font-medium text-sm mb-2">{day.short}</div>
              
              {hasSlots ? (
                <div className="space-y-1">
                  {slots.map((slot) => (
                    <div key={slot.id} className="text-xs text-muted-foreground">
                      {formatTime(slot.start_time)}-{formatTime(slot.end_time)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">-</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-2">
        {DAYS.map((day, i) => {
          const slots = availabilityByDay[day.index] || [];
          const hasSlots = slots.length > 0;

          return (
            <motion.div
              key={day.index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center justify-between rounded-lg p-3 border",
                hasSlots 
                  ? "bg-success/10 border-success/30" 
                  : "bg-muted/30 border-border"
              )}
            >
              <div className="flex items-center gap-3">
                {hasSlots ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">{day.full}</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {hasSlots ? (
                  slots.map((slot, idx) => (
                    <span key={slot.id}>
                      {idx > 0 && ', '}
                      {formatTime(slot.start_time)}-{formatTime(slot.end_time)}
                    </span>
                  ))
                ) : (
                  'Non disponibile'
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default PTAvailabilityCalendar;
