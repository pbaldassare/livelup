import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  extractChatId,
  isMessageNotification,
  remapNotificationActionUrl,
  type NotificationLinkInput,
} from '@/lib/notifications';

export async function resolveChatRoute(opts: {
  chatId: string;
  userId: string;
  role: string | null | undefined;
  pathname: string;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('chats')
    .select('pt_user_id, atleta_user_id')
    .eq('id', opts.chatId)
    .maybeSingle();
  if (error || !data) return null;

  const otherUserId =
    data.pt_user_id === opts.userId ? data.atleta_user_id : data.pt_user_id;

  if (opts.role === 'atleta') {
    return `/app/chat/${otherUserId}`;
  }
  if (opts.role === 'pt') {
    return opts.pathname.startsWith('/pt/app')
      ? `/pt/app/chat/${otherUserId}`
      : `/pt/messages?athlete=${otherUserId}`;
  }
  return null;
}

export function useNotificationNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();

  const openNotification = useCallback(
    async (notification: NotificationLinkInput) => {
      if (isMessageNotification(notification)) {
        const chatId = extractChatId(notification);
        if (chatId && user?.id) {
          const route = await resolveChatRoute({
            chatId,
            userId: user.id,
            role,
            pathname: location.pathname,
          });
          if (route) {
            navigate(route);
            return;
          }
        }
      }

      const url = remapNotificationActionUrl(notification.action_url, {
        role,
        pathname: location.pathname,
      });
      if (url) navigate(url);
    },
    [location.pathname, navigate, role, user?.id],
  );

  return { openNotification };
}
