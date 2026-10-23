import { useCallback, useEffect, useRef, useState } from 'react';
import {
  subscribeToChatTyping,
  type ChatTypingHandle,
} from '@/lib/api/messages';

export function useChatTyping(chatId?: string | null, userId?: string | null) {
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const handleRef = useRef<ChatTypingHandle | null>(null);

  useEffect(() => {
    setIsPeerTyping(false);
    if (!chatId || !userId) return;
    const handle = subscribeToChatTyping(chatId, userId, setIsPeerTyping);
    handleRef.current = handle;
    return () => {
      handle.unsubscribe();
      handleRef.current = null;
    };
  }, [chatId, userId]);

  const setTyping = useCallback((typing: boolean) => {
    handleRef.current?.setTyping(typing);
  }, []);

  return { isPeerTyping, setTyping };
}
