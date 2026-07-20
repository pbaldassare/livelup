import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// PT AVAILABILITY MANAGER
// Gestisce la disponibilità settimanale del PT + flag prenotazioni atleti
// =====================================================

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domenica' },
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
];

interface PTAvailabilityManagerProps {
  /** Compact layout for embedding under calendar */
  compact?: boolean;
}

export function PTAvailabilityManager({ compact = false }: PTAvailabilityManagerProps = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: slots = [] } = useQuery({
    queryKey: ['pt-availability', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_availability')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!user?.id,
  });

  const { data: bookable = false } = useQuery({
    queryKey: ['pt-availability-bookable', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await (supabase as any)
        .from('pt_profiles')
        .select('availability_bookable')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.availability_bookable);
    },
    enabled: !!user?.id,
  });

  const bookableMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error('Non autenticato');
      const { error } = await (supabase as any)
        .from('pt_profiles')
        .update({ availability_bookable: enabled })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['pt-availability-bookable'] });
      toast.success(
        enabled
          ? 'Gli atleti collegati possono ora prenotare nei tuoi slot'
          : 'Prenotazioni atleti disattivate',
      );
    },
    onError: () => toast.error('Errore aggiornamento visibilità'),
  });

  const addSlotMutation = useMutation({
    mutationFn: async (dayOfWeek: number) => {
      if (!user?.id) throw new Error('Non autenticato');

      const { error } = await supabase.from('pt_availability').insert({
        pt_user_id: user.id,
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '18:00',
        is_available: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-availability'] });
      toast.success('Slot aggiunto');
    },
    onError: () => {
      toast.error("Errore durante l'aggiunta");
    },
  });

  const updateSlotMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AvailabilitySlot> & { id: string }) => {
      const { error } = await supabase.from('pt_availability').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-availability'] });
    },
    onError: () => {
      toast.error("Errore durante l'aggiornamento");
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pt_availability').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-availability'] });
      toast.success('Slot rimosso');
    },
    onError: () => {
      toast.error('Errore durante la rimozione');
    },
  });

  const slotsByDay = slots.reduce(
    (acc, slot) => {
      if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
      acc[slot.day_of_week].push(slot);
      return acc;
    },
    {} as Record<number, AvailabilitySlot[]>,
  );

  return (
    <Card className={compact ? 'border-dashed' : undefined}>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Disponibilità Settimanale
            </CardTitle>
            <CardDescription>
              Configura i tuoi orari. Con il toggle attivo, gli atleti collegati possono prenotare.
            </CardDescription>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2 sm:min-w-[280px]">
            <div className="space-y-0.5 pr-2">
              <Label htmlFor="availability-bookable" className="text-sm font-medium">
                Visibile agli atleti per prenotare
              </Label>
              <p className="text-xs text-muted-foreground">
                Consenti prenotazioni agli atleti collegati
              </p>
            </div>
            <Switch
              id="availability-bookable"
              checked={bookable}
              onCheckedChange={(checked) => bookableMutation.mutate(checked)}
              disabled={bookableMutation.isPending}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {DAYS_OF_WEEK.map((day) => {
          const daySlots = slotsByDay[day.value] || [];

          return (
            <div key={day.value} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{day.label}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addSlotMutation.mutate(day.value)}
                  disabled={addSlotMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>

              {daySlots.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-4">Nessuna disponibilità impostata</p>
              ) : (
                <div className="space-y-2 pl-4">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <Switch
                        checked={slot.is_available}
                        onCheckedChange={(checked) =>
                          updateSlotMutation.mutate({ id: slot.id, is_available: checked })
                        }
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Input
                          type="time"
                          value={slot.start_time?.slice(0, 5) || slot.start_time}
                          onChange={(e) =>
                            updateSlotMutation.mutate({ id: slot.id, start_time: e.target.value })
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                          type="time"
                          value={slot.end_time?.slice(0, 5) || slot.end_time}
                          onChange={(e) =>
                            updateSlotMutation.mutate({ id: slot.id, end_time: e.target.value })
                          }
                          className="w-32"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteSlotMutation.mutate(slot.id)}
                        disabled={deleteSlotMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default PTAvailabilityManager;
