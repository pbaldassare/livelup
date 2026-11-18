import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { validateChatAttachment } from '@/lib/api/chatAttachments';
import { cn } from '@/lib/utils';

type Props = {
  selectedCount: number;
  onSend: (content: string, file: File | null) => Promise<void>;
  /** PWA: fixed bottom bar; web: inline card footer */
  variant?: 'fixed' | 'inline';
  className?: string;
};

export function BroadcastComposer({
  selectedCount,
  onSend,
  variant = 'fixed',
  className,
}: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const error = validateChatAttachment(f);
    if (error) {
      toast.error(error);
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    setIsSending(true);
    try {
      await onSend(text.trim(), file);
      setText('');
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore durante l'invio");
    } finally {
      setIsSending(false);
    }
  };

  const body = (
    <>
      <p className="text-xs text-muted-foreground font-medium">
        Invio a {selectedCount} {selectedCount === 1 ? 'atleta selezionato' : 'atleti selezionati'}
      </p>
      {file && (
        <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
          <span className="flex-1 text-xs truncate">{file.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setFile(null)}
            disabled={isSending}
          >
            <X className="h-3.5 w-3.5" />
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
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          placeholder="Scrivi un messaggio per tutti..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSending}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button size="icon" onClick={handleSend} disabled={isSending || (!text.trim() && !file)}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );

  if (variant === 'inline') {
    return (
      <div className={cn('border-t bg-muted/30 p-4 space-y-2', className)}>{body}</div>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-3 pb-[calc(0.75rem+var(--sab))] space-y-2 max-w-md mx-auto',
        className,
      )}
    >
      {body}
    </div>
  );
}