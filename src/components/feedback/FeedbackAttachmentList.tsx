import { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { signedFeedbackAttachmentUrl } from '@/lib/api/feedbackAttachments';

interface FeedbackAttachmentListProps {
  paths: string[];
  className?: string;
}

export function FeedbackAttachmentList({ paths, className }: FeedbackAttachmentListProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const p of paths) {
        const url = await signedFeedbackAttachmentUrl(p);
        if (url) next[p] = url;
      }
      if (!cancelled) {
        setUrls(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (!paths.length) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Caricamento allegati…
      </div>
    );
  }

  return (
    <ul className={className ?? 'flex flex-wrap gap-2 mt-2'}>
      {paths.map((p) => {
        const url = urls[p];
        const isPdf = p.toLowerCase().endsWith('.pdf');
        if (!url) return null;
        return (
          <li key={p}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
            >
              {isPdf ? <FileText className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {isPdf ? 'PDF' : 'Immagine'}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
