import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// PT AVAILABILITY MANAGER
// Gestisce la disponibilità settimanale del PT
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

export function PTAvailabilityManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [localSlots, setLocalSlots] = useState<AvailabilitySlot[]>([]);

  // Fetch availability
  const { data: slots = [], isLoading } = useQuery({
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

  // Initialize local slots when data loads
  const handleEditStart = () => {
    setLocalSlots([...slots]);
    setEditMode(true);
  };

  // Add slot mutation
  const addSlotMutation = useMutation({
    mutationFn: async (dayOfWeek: number) => {
      if (!user?.id) throw new Error('Non autenticato');

      const { error } = await supabase
        .from('pt_availability')
        .insert({
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
      toast.error('Errore durante l\'aggiunta');
    },
  });

  // Update slot mutation
  const updateSlotMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AvailabilitySlot> & { id: string }) => {
      const { error } = await supabase
        .from('pt_availability')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-availability'] });
    },
    onError: () => {
      toast.error('Errore durante l\'aggiornamento');
    },
  });

  // Delete slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pt_availability')
        .delete()
        .eq('id', id);

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

  // Save all changes
  const handleSave = async () => {
    try {
      for (const slot of localSlots) {
        await updateSlotMutation.mutateAsync(slot);
      }
      setEditMode(false);
      toast.success('Disponibilità salvata');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    }
  };

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Disponibilità Settimanale
            </CardTitle>
            <CardDescription>
              Configura i tuoi orari di disponibilità
            </CardDescription>
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
                <p className="text-sm text-muted-foreground pl-4">
                  Nessuna disponibilità impostata
                </p>
              ) : (
                <div className="space-y-2 pl-4">
                  {daySlots.map((slot) => (
                    <div 
                      key={slot.id} 
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card"
                    >
                      <Switch
                        checked={slot.is_available}
                        onCheckedChange={(checked) => 
                          updateSlotMutation.mutate({ id: slot.id, is_available: checked })
                        }
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => 
                            updateSlotMutation.mutate({ id: slot.id, start_time: e.target.value })
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                          type="time"
                          value={slot.end_time}
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
