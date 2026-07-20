import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarDays, Check, Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type GCalConnection = {
  id: string;
  pt_user_id: string;
  google_email: string | null;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  last_error: string | null;
};

interface GoogleCalendarConnectButtonProps {
  /** PT web uses default tokens; PT app can pass app-* classes */
  variant?: 'web' | 'app';
  className?: string;
}

export function GoogleCalendarConnectButton({
  variant = 'web',
  className,
}: GoogleCalendarConnectButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: connection, isLoading } = useQuery({
    queryKey: ['pt-gcal-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from('pt_google_calendar_connections')
        .select('id, pt_user_id, google_email, status, last_error')
        .eq('pt_user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as GCalConnection | null) ?? null;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const gcal = searchParams.get('gcal');
    if (!gcal) return;
    if (gcal === 'connected') {
      toast.success('Google Calendar collegato');
      queryClient.invalidateQueries({ queryKey: ['pt-gcal-connection'] });
    } else if (gcal === 'error') {
      toast.error('Collegamento Google Calendar non riuscito');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('gcal');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const returnTo =
        variant === 'app' ? '/pt/app/calendar' : '/pt/calendar/appuntamenti';
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'start', return_to: returnTo },
      });
      if (error) throw error;
      return data as { configured?: boolean; url?: string; message?: string };
    },
    onSuccess: (data) => {
      if (!data?.configured || !data.url) {
        toast.error(
          data?.message ||
            'Google Calendar non è ancora configurato. Imposta GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET sulle Edge Functions.',
        );
        return;
      }
      window.location.href = data.url;
    },
    onError: () => {
      toast.error(
        'Impossibile avviare il collegamento. Verifica che la funzione google-calendar-oauth sia attiva su Lovable Cloud.',
      );
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'disconnect' },
      });
      if (error) {
        // Fallback: delete via RLS if edge function unavailable
        const { error: delErr } = await (supabase as any)
          .from('pt_google_calendar_connections')
          .delete()
          .eq('pt_user_id', user!.id);
        if (delErr) throw error;
        return { ok: true };
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-gcal-connection'] });
      toast.success('Google Calendar scollegato');
    },
    onError: () => toast.error('Errore durante lo scollegamento'),
  });

  const isConnected = connection?.status === 'connected';
  const isPending = connection?.status === 'pending';
  const busy = isLoading || connectMutation.isPending || disconnectMutation.isPending;

  const appOutline =
    variant === 'app'
      ? 'border-app-border text-app-foreground hover:bg-app-card'
      : undefined;

  if (isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', appOutline, className)}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-success" />
            )}
            <span className="hidden sm:inline">Google Calendar</span>
            <span className="sm:hidden">Google</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-xs text-muted-foreground max-w-[220px]">
            {connection?.google_email
              ? `Collegato: ${connection.google_email}`
              : 'Account collegato'}
            <br />
            Gli appuntamenti nuovi vengono sincronizzati in automatico
          </div>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive gap-2"
            onClick={() => disconnectMutation.mutate()}
          >
            <Unplug className="h-4 w-4" />
            Scollega
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('gap-2', appOutline, className)}
      onClick={() => connectMutation.mutate()}
      disabled={busy}
      title="Collega Google Calendar (OAuth)"
    >
      {busy || isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CalendarDays className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Collega Google Calendar</span>
      <span className="sm:hidden">Google</span>
    </Button>
  );
}

export default GoogleCalendarConnectButton;
