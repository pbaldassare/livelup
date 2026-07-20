import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { syncAppointmentToGoogleCalendar } from '@/lib/api/googleCalendarSync';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { AthleteLite } from './types';

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athletes: AthleteLite[];
  initialDate: Date | null;
}

function toLocalInput(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function NewAppointmentDialog({ open, onOpenChange, athletes, initialDate }: NewAppointmentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [athleteId, setAthleteId] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [title, setTitle] = useState('Sessione di allenamento');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    const base = initialDate ?? new Date();
    const s = new Date(base);
    if (!initialDate) s.setMinutes(0, 0, 0);
    const e = new Date(s);
    e.setHours(e.getHours() + 1);
    setStart(toLocalInput(s));
    setEnd(toLocalInput(e));
    setTitle('Sessione di allenamento');
    setNotes('');
    setAthleteId('');
  }, [open, initialDate]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!athleteId) throw new Error('Seleziona un atleta');
      if (!start || !end) throw new Error('Orario non valido');
      const startIso = new Date(start).toISOString();
      const endIso = new Date(end).toISOString();
      if (new Date(end) <= new Date(start)) throw new Error('La fine deve essere dopo l\'inizio');

      // Overlap check (PT side)
      const { data: overlap } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('pt_user_id', user.id)
        .eq('is_cancelled', false)
        .lt('start_datetime', endIso)
        .gt('end_datetime', startIso);
      if (overlap && overlap.length > 0) {
        throw new Error('Hai già un impegno in questa fascia oraria');
      }

      const { data: created, error } = await supabase
        .from('calendar_events')
        .insert({
          creator_user_id: user.id,
          pt_user_id: user.id,
          atleta_user_id: athleteId,
          title: title || 'Sessione di allenamento',
          description: notes || null,
          event_type: 'allenamento',
          category: 'appuntamento',
          start_datetime: startIso,
          end_datetime: endIso,
          is_public: false,
          visibility: 'connected_only',
        })
        .select('id')
        .single();
      if (error) throw error;

      // Notify athlete
      await supabase.from('notifications').insert({
        user_id: athleteId,
        type: 'booking',
        title: 'Nuovo appuntamento',
        body: `Il tuo PT ha fissato un appuntamento il ${format(new Date(startIso), 'dd MMM HH:mm')}`,
        data: { date: startIso },
        action_url: '/app/programma',
      });

      // Best-effort Google Calendar sync (no-op if not connected / function missing)
      if (created?.id) {
        void syncAppointmentToGoogleCalendar(created.id, 'create');
      }
    },
    onSuccess: () => {
      toast.success('Appuntamento creato');
      queryClient.invalidateQueries({ queryKey: ['pt-calendar'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Nuovo appuntamento</DialogTitle>
          <DialogDescription>Fissa una sessione 1‑a‑1 con un atleta collegato.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Atleta</Label>
            <Select value={athleteId} onValueChange={setAthleteId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un atleta collegato" />
              </SelectTrigger>
              <SelectContent>
                {athletes.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nessun atleta collegato</div>
                ) : (
                  athletes.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Inizio</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fine</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titolo</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opzionale…" />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !athleteId}>
            Crea appuntamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
