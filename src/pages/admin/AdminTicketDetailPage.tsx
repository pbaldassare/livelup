import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Ticket, 
  ArrowLeft, 
  Send, 
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Aperto' },
  { value: 'in_progress', label: 'In lavorazione' },
  { value: 'resolved', label: 'Risolto' },
  { value: 'closed', label: 'Chiuso' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

export function AdminTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [replyMessage, setReplyMessage] = useState('');

  // Fetch ticket details
  const { data: ticket, isLoading } = useQuery({
    queryKey: ['admin-ticket-detail', ticketId],
    queryFn: async () => {
      if (!ticketId) throw new Error('Ticket ID required');

      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();

      if (ticketError) throw ticketError;

      // Get user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', ticketData?.user_id)
        .maybeSingle();

      // Get messages
      const { data: messages, error: msgError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      // Get sender profiles for messages
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', senderIds);

      const sendersMap = new Map(senderProfiles?.map(p => [p.user_id, p]) || []);

      return {
        ...ticketData,
        userProfile,
        messages: messages?.map(m => ({
          ...m,
          senderProfile: sendersMap.get(m.sender_id)
        })) || []
      };
    },
    enabled: !!ticketId
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async (updates: Partial<{ status: TicketStatus; priority: TicketPriority }>) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', ticketId] });
      toast.success('Ticket aggiornato');
    },
    onError: (error) => toast.error('Errore: ' + error.message)
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user?.id,
          message,
          is_internal: false
        });
      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (ticket?.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', ticketId] });
      setReplyMessage('');
      toast.success('Risposta inviata');
    },
    onError: (error) => toast.error('Errore: ' + error.message)
  });

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    sendReplyMutation.mutate(replyMessage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Ticket non trovato</h2>
        <Button variant="ghost" onClick={() => navigate('/admin/support')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title={ticket.subject}
        subtitle={`Ticket #${ticket.id.slice(0, 8)}`}
        icon={<Ticket className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Supporto', href: '/admin/support' },
          { label: `Ticket #${ticket.id.slice(0, 8)}` }
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate('/admin/support')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Ticket Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Informazioni Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Stato</label>
              <Select
                value={ticket.status}
                onValueChange={(value) => updateTicketMutation.mutate({ status: value as TicketStatus })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Priorità</label>
              <Select
                value={ticket.priority}
                onValueChange={(value) => updateTicketMutation.mutate({ priority: value as TicketPriority })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Categoria</label>
              <p className="mt-1">{ticket.category || 'Generale'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Creato da</label>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {ticket.userProfile?.first_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {ticket.userProfile?.first_name} {ticket.userProfile?.last_name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{ticket.userProfile?.email}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Creato il</label>
              <p className="mt-1 text-sm">
                {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Ultimo aggiornamento</label>
              <p className="mt-1 text-sm">
                {format(new Date(ticket.updated_at), 'dd MMM yyyy HH:mm', { locale: it })}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => updateTicketMutation.mutate({ status: 'resolved' })}
                disabled={ticket.status === 'resolved' || ticket.status === 'closed'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Segna come risolto
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => updateTicketMutation.mutate({ status: 'closed' })}
                disabled={ticket.status === 'closed'}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Chiudi ticket
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conversation */}
        <div className="md:col-span-2 space-y-6">
          {/* Original Message */}
          <SectionCard title="Descrizione" icon={Ticket} iconColor="primary">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </SectionCard>

          {/* Messages Thread */}
          <SectionCard title="Conversazione" icon={Clock} iconColor="muted">
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {ticket.messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nessuna risposta ancora
                </p>
              ) : (
                ticket.messages.map((msg: {
                  id: string;
                  sender_id: string;
                  message: string;
                  is_internal: boolean;
                  created_at: string;
                  senderProfile?: { first_name?: string; last_name?: string };
                }) => {
                  const isAdmin = msg.sender_id !== ticket.user_id;
                  return (
                    <div 
                      key={msg.id}
                      className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={isAdmin ? 'bg-primary text-primary-foreground' : ''}>
                          {msg.senderProfile?.first_name?.[0] || (isAdmin ? 'A' : 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 max-w-[80%] ${isAdmin ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {msg.senderProfile?.first_name} {msg.senderProfile?.last_name}
                            {isAdmin && ' (Admin)'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                        <div className={`rounded-lg p-3 ${
                          isAdmin 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Form */}
            {ticket.status !== 'closed' && (
              <div className="mt-4 pt-4 border-t">
                <Textarea
                  placeholder="Scrivi una risposta..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <Button 
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || sendReplyMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Invia risposta
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default AdminTicketDetailPage;
