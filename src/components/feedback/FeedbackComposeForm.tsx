import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Paperclip, Loader2, X } from 'lucide-react';
import {
  PT_FEEDBACK_CATEGORIES,
  PT_FEEDBACK_CATEGORY_LABELS,
  type PtFeedbackCategory,
} from '@/lib/feedbackTickets';
import { validateFeedbackAttachment } from '@/lib/api/feedbackAttachments';
import { toast } from 'sonner';

interface FeedbackComposeFormProps {
  onSubmit: (data: {
    category: PtFeedbackCategory;
    body: string;
    subject?: string;
    files: File[];
  }) => Promise<void>;
  submitting?: boolean;
  compact?: boolean;
}

export function FeedbackComposeForm({ onSubmit, submitting, compact }: FeedbackComposeFormProps) {
  const [category, setCategory] = useState<PtFeedbackCategory>('pt_suggestion');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      const err = validateFeedbackAttachment(f);
      if (err) {
        toast.error(err);
        continue;
      }
      if (next.length >= 5) {
        toast.error('Massimo 5 allegati');
        break;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const handleSubmit = async () => {
    if (!body.trim()) {
      toast.error('Scrivi il messaggio');
      return;
    }
    await onSubmit({
      category,
      body,
      subject: subject.trim() || undefined,
      files,
    });
    setBody('');
    setSubject('');
    setFiles([]);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as PtFeedbackCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PT_FEEDBACK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {PT_FEEDBACK_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!compact && (
          <div className="space-y-2">
            <Label>Oggetto (opzionale)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Es. Modifica calendario"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Messaggio</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Descrivi il suggerimento o la modifica che vorresti…"
          rows={compact ? 5 : 6}
          className="resize-none"
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <span className="max-w-[140px] truncate">{f.name}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                aria-label="Rimuovi allegato"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip className="mr-2 h-4 w-4" />
          Allega
        </Button>
        <Button type="button" className="ml-auto" disabled={submitting} onClick={handleSubmit}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Invia
        </Button>
      </div>
    </div>
  );
}
