import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Paperclip, Send, Pin, X, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  detectChatAttachmentKind,
  validateChatAttachment,
  type ChatAttachmentKind,
} from '@/lib/api/chatAttachments';
import { SharedExerciseChatCard } from '@/components/exercises/SharedExerciseChatCard';
import { isExerciseShareAttachment } from '@/lib/exerciseShare';

// =====================================================
// CHAT MESSAGES - Conversation view (1:1 e gruppi)
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
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  replyTo?: {
    senderName: string;
    content: string;
  };
}

interface ChatMessagesProps {
  recipientName: string;
  recipientAvatar?: string | null;
  /** Sottotitolo opzionale sotto il nome (es. "4 membri" per i gruppi) */
  subtitle?: string;
  messages: Message[];
  currentUserId: string;
  onBack: () => void;
  /** Invia testo e/o un allegato (immagine/video). Deve restituire una Promise per gestire lo stato di invio. */
  onSend: (content: string, file?: File | null) => Promise<unknown> | void;
  isLoading?: boolean;
  showPinnedButton?: boolean;
  /** Azione extra nell'header (es. bottone "Gestisci" per i gruppi PT) */
  headerAction?: React.ReactNode;
}

export function ChatMessages({
  recipientName,
  recipientAvatar,
  subtitle,
  messages,
  currentUserId,
  onBack,
  onSend,
  isLoading,
  showPinnedButton,
  headerAction,
}: ChatMessagesProps) {
  const [inputValue, setInputValue] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<ChatAttachmentKind | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initials = recipientName.split(' ').map(n => n[0]).join('').slice(0, 2);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setPendingKind(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateChatAttachment(file);
    if (error) {
      toast.error(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
    setPendingKind(detectChatAttachmentKind(file));
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed && !pendingFile) return;
    setIsSubmitting(true);
    try {
      await onSend(trimmed, pendingFile);
      setInputValue('');
      clearPendingFile();
    } catch {
      // L'errore è già gestito/mostrato dal chiamante (toast su mutation onError)
    } finally {
      setIsSubmitting(false);
    }
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

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-app-foreground truncate">{recipientName}</h2>
          {subtitle && (
            <p className="text-xs text-app-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

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

        {headerAction}
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
      <div className="p-4 border-t border-app-border space-y-2">
        {pendingFile && (
          <div className="flex items-center gap-2 bg-app-muted rounded-lg p-2">
            {pendingKind === 'image' ? (
              <img src={pendingPreviewUrl || undefined} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-app-background flex items-center justify-center">
                <Play className="h-5 w-5 text-app-muted-foreground" />
              </div>
            )}
            <span className="flex-1 text-xs text-app-muted-foreground truncate">{pendingFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-app-muted-foreground hover:bg-app-background"
              onClick={clearPendingFile}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="text-app-muted-foreground hover:bg-app-muted shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <Input
              placeholder="Scrivi un messaggio..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground pr-10 rounded-full"
            />
          </div>

          <Button
            size="icon"
            onClick={handleSend}
            disabled={isSubmitting || (!inputValue.trim() && !pendingFile)}
            className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ url, type }: { url: string; type: string | null | undefined }) {
  if (type === 'video') {
    return (
      <video
        src={url}
        controls
        className="rounded-lg max-w-full max-h-72 mb-1"
      />
    );
  }
  return (
    <img
      src={url}
      alt="Allegato"
      className="rounded-lg max-w-full max-h-72 object-cover mb-1 cursor-pointer"
      onClick={() => window.open(url, '_blank')}
    />
  );
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const initials = message.senderName.split(' ').map(n => n[0]).join('').slice(0, 2);
  const time = format(new Date(message.createdAt), 'HH:mm', { locale: it });
  const isExerciseShare = isExerciseShareAttachment(message.attachmentType);

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

        {isExerciseShare ? (
          <div className="space-y-1.5">
            {message.content && (
              <p
                className="text-sm leading-relaxed px-1 text-app-muted-foreground"
              >
                {message.content}
              </p>
            )}
            <SharedExerciseChatCard
              attachmentType={message.attachmentType}
              attachmentUrl={message.attachmentUrl}
            />
          </div>
        ) : (
          <div
            className={cn(
              'px-3 py-2 rounded-2xl',
              message.attachmentUrl && !message.content && 'p-1.5',
              isOwn
                ? 'bg-purple-600 text-white rounded-br-md'
                : 'bg-app-muted text-app-foreground rounded-bl-md'
            )}
          >
            {message.attachmentUrl && (
              <AttachmentPreview url={message.attachmentUrl} type={message.attachmentType} />
            )}
            {message.content && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap px-1">{message.content}</p>
            )}
          </div>
        )}

        {isOwn && (
          <p className="text-xs text-app-muted-foreground text-right">{time}</p>
        )}
      </div>
    </div>
  );
}

export default ChatMessages;
