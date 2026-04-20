import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CalendarDays, Users, CheckCircle2, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import {
  assignProgramToAthlete,
  getProgram,
  describeRotation,
} from '@/lib/api/programs';

const WEEKDAYS = [
  { iso: 1, label: 'Lun' },
  { iso: 2, label: 'Mar' },
  { iso: 3, label: 'Mer' },
  { iso: 4, label: 'Gio' },
  { iso: 5, label: 'Ven' },
  { iso: 6, label: 'Sab' },
  { iso: 7, label: 'Dom' },
];

interface AssignProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string | null;
  preselectedAthleteId?: string;
}

export function AssignProgramDialog({
  open,
  onOpenChange,
  programId,
  preselectedAthleteId,
}: AssignProgramDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [athleteId, setAthleteId] = useState(preselectedAthleteId || '');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [activeDays, setActiveDays] = useState<number[]>([1, 3, 5]);

  useEffect(() => {
    if (open) {
      setAthleteId(preselectedAthleteId || '');
      setStartDate(new Date());
    }
  }, [open, preselectedAthleteId]);

  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => getProgram(programId!),
    enabled: !!programId && open,
  });

  // Sincronizza i giorni attivi col programma quando cambia
  useEffect(() => {
    if (program && open) {
      const programDays = (program as any).active_days as number[] | undefined;
      if (programDays && programDays.length > 0) {
        setActiveDays(programDays);
      }
    }
  }, [program, open]);

  const toggleDay = (iso: number) => {
    setActiveDays((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
    );
  };

  const { data: athletes = [] } = useQuery({
    queryKey: ['connected-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');
      const enriched = await Promise.all(
        (data || []).map(async (c) => {
          const { data: p } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', c.atleta_user_id)
            .single();
          return { atleta_user_id: c.atleta_user_id, profile: p };
        }),
      );
      return enriched;
    },
    enabled: !!user?.id && open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!programId) throw new Error('Programma non valido');
      if (!athleteId) throw new Error('Seleziona un atleta');
      if (!startDate) throw new Error('Seleziona la data di inizio');
      if (activeDays.length === 0)
        throw new Error('Seleziona almeno un giorno di allenamento');
      return assignProgramToAthlete({
        ptUserId: user.id,
        atletaUserId: athleteId,
        programId,
        startDate,
        activeDays,
      });
    },
    onSuccess: ({ created, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ['pt-program-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['pt-workouts'] });
      const msg =
        created > 0
          ? `Programma assegnato — ${created} allenamenti creati per la prima settimana${
              skipped > 0 ? ` (${skipped} saltati)` : ''
            }`
          : 'Programma assegnato (date già occupate)';
      toast.success(msg);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Errore'),
  });

  // Anteprima rotazione
  const rotationPreview = (() => {
    if (!program) return '';
    const schedules = ((program as any).program_schedules || []) as any[];
    if (schedules.length === 0) return '';
    return describeRotation(schedules, 2);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="h-5 w-5 text-primary" />
            Assegna Programma
          </DialogTitle>
          <DialogDescription>
            Verrà generata la prima settimana di allenamenti
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {program && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-primary font-medium">
                  Stai assegnando
                </p>
                <p className="font-semibold truncate">{program.name}</p>
                <p className="text-xs text-muted-foreground">
                  {program.duration_weeks} settimane · {activeDays.length}x/sett.
                </p>
              </div>
              <Badge variant="outline" className="flex-shrink-0">
                {(program as any).program_schedules?.length || 0} schede
              </Badge>
            </div>
          )}

          {rotationPreview && (
            <div className="rounded-lg bg-muted/50 border p-3 text-sm">
              <div className="flex items-center gap-2 text-foreground font-medium mb-1">
                <Repeat className="h-4 w-4 text-primary" />
                Rotazione schede
              </div>
              <p className="text-muted-foreground break-words text-xs">
                {rotationPreview}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Atleta <span className="text-destructive">*</span>
            </Label>
            <Select value={athleteId} onValueChange={setAthleteId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Seleziona atleta..." />
              </SelectTrigger>
              <SelectContent>
                {athletes.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun atleta collegato</p>
                  </div>
                ) : (
                  athletes.map((a) => (
                    <SelectItem key={a.atleta_user_id} value={a.atleta_user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={a.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {a.profile?.first_name?.[0]}
                            {a.profile?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {a.profile?.first_name || 'Atleta'} {a.profile?.last_name || ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Data inizio <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full h-11 justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate
                    ? format(startDate, 'd MMMM yyyy', { locale: it })
                    : 'Seleziona...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  locale={it}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Il primo giorno è sempre la data scelta e prende la prima scheda della rotazione.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Giorni di allenamento <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <Toggle
                  key={d.iso}
                  pressed={activeDays.includes(d.iso)}
                  onPressedChange={() => toggleDay(d.iso)}
                  variant="outline"
                  size="sm"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {d.label}
                </Toggle>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Le schede ruotano in modo continuo: la sequenza non si resetta tra settimane.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending || !athleteId || !startDate}
          >
            {assignMutation.isPending ? 'Assegnazione...' : 'Assegna programma'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
