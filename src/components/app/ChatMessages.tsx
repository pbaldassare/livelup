import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Image, Send, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// CHAT MESSAGES - Conversation view
// Design reference: Ladder_iOS_126.png, Ladder_iOS_111.png
// =====================================================

interface Message {
  id: string;
  content: string;
  senderUserId: string;
  senderName: string;
  senderAvatar?: string | null;
  createdAt: string;
  isRead: boolean;
  isPinned?: boolean;
  replyTo?: {
    senderName: string;
    content: string;
  };
}

interface ChatMessagesProps {
  recipientName: string;
  recipientAvatar?: string | null;
  messages: Message[];
  currentUserId: string;
  onBack: () => void;
  onSend: (content: string) => void;
  onAttach?: () => void;
  isLoading?: boolean;
  showPinnedButton?: boolean;
}

export function ChatMessages({
  recipientName,
  recipientAvatar,
  messages,
  currentUserId,
  onBack,
  onSend,
  onAttach,
  isLoading,
  showPinnedButton,
}: ChatMessagesProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initials = recipientName.split(' ').map(n => n[0]).join('').slice(0, 2);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSend(inputValue.trim());
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-app-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-app-foreground hover:bg-app-muted"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarImage src={recipientAvatar || undefined} />
          <AvatarFallback className="bg-app-muted text-app-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        <h2 className="flex-1 font-semibold text-app-foreground">{recipientName}</h2>

        {showPinnedButton && (
          <Button
            variant="outline"
            size="sm"
            className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 border-none"
          >
            <Pin className="h-4 w-4 mr-1" />
            Coach Pins
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-app-muted-foreground">Inizia una conversazione</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderUserId === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-app-border">
        <div className="flex items-center gap-2">
          {onAttach && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAttach}
              className="text-app-muted-foreground hover:bg-app-muted"
            >
              <Image className="h-5 w-5" />
            </Button>
          )}

          <div className="flex-1 relative">
            <Input
              placeholder="Type a Message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground pr-10 rounded-full"
            />
          </div>

          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const initials = message.senderName.split(' ').map(n => n[0]).join('').slice(0, 2);
  const time = format(new Date(message.createdAt), 'h:mm a');

  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      {!isOwn && (
        <Avatar className="h-8 w-8 mt-auto">
          <AvatarImage src={message.senderAvatar || undefined} />
          <AvatarFallback className="bg-app-muted text-app-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('max-w-[75%] space-y-1', isOwn && 'items-end')}>
        {!isOwn && (
          <div className="flex items-center gap-2 text-xs text-app-muted-foreground">
            <span className="font-medium text-app-foreground">{message.senderName}</span>
            <span>{time}</span>
          </div>
        )}

        {/* Reply quote */}
        {message.replyTo && (
          <div className="bg-app-muted/50 border-l-2 border-app-accent px-3 py-1.5 rounded text-sm">
            <span className="font-medium text-app-accent">{message.replyTo.senderName}</span>
            <p className="text-app-muted-foreground line-clamp-2">{message.replyTo.content}</p>
          </div>
        )}

        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl',
            isOwn
              ? 'bg-purple-600 text-white rounded-br-md'
              : 'bg-app-muted text-app-foreground rounded-bl-md'
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {isOwn && (
          <p className="text-xs text-app-muted-foreground text-right">{time}</p>
        )}
      </div>
    </div>
  );
}

export default ChatMessages;
