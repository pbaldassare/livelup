import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ArrowLeft,
  Bell,
  MessageSquare,
  Dumbbell,
  Award,
  UserPlus,
  CheckCheck,
  Trash2
} from 'lucide-react';

// =====================================================
// ATLETA NOTIFICATIONS PAGE - Lista notifiche
// =====================================================

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'message':
      return MessageSquare;
    case 'workout':
      return Dumbbell;
    case 'badge':
    case 'achievement':
      return Award;
    case 'connection':
      return UserPlus;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'message':
      return 'text-blue-400 bg-blue-400/10';
    case 'workout':
      return 'text-app-accent bg-app-accent/10';
    case 'badge':
    case 'achievement':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'connection':
      return 'text-green-400 bg-green-400/10';
    default:
      return 'text-app-muted-foreground bg-app-muted';
  }
};

export function AtletaNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Tutte le notifiche segnate come lette');
    },
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notifica eliminata');
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="min-h-screen bg-app-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur-sm border-b border-app-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-app-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-app-foreground">Notifiche</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-app-muted-foreground">
                  {unreadCount} non lette
                </p>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-app-accent hover:text-app-accent hover:bg-app-accent/10"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Segna tutte
            </Button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-app-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const colorClass = getNotificationColor(notification.type);
            
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`relative flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors
                  ${notification.is_read ? 'bg-app-card' : 'bg-app-muted'}
                  hover:bg-app-muted/80`}
              >
                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-app-accent" />
                )}
                
                {/* Icon */}
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className={`font-medium text-app-foreground ${!notification.is_read ? 'font-semibold' : ''}`}>
                    {notification.title}
                  </h3>
                  {notification.body && (
                    <p className="text-sm text-app-muted-foreground line-clamp-2 mt-0.5">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-xs text-app-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { 
                      addSuffix: true,
                      locale: it 
                    })}
                  </p>
                </div>
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(notification.id);
                  }}
                  className="absolute top-4 right-8 p-1 text-app-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-app-muted flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-app-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-app-foreground mb-1">
              Nessuna notifica
            </h3>
            <p className="text-sm text-app-muted-foreground">
              Qui appariranno le tue notifiche
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AtletaNotificationsPage;
