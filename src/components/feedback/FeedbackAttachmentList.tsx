import { useEffect, useMemo, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import {
  parseFeedbackAttachmentPaths,
  signedFeedbackAttachmentUrl,
} from '@/lib/api/feedbackAttachments';

interface FeedbackAttachmentListProps {
  paths: unknown;
  className?: string;
}

export function FeedbackAttachmentList({ paths: pathsInput, className }: FeedbackAttachmentListProps) {
  const paths = useMemo(() => parseFeedbackAttachmentPaths(pathsInput), [pathsInput]);
  const pathsKey = paths.join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pathsKey) {
      setUrls({});
      setFailed([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed([]);

    (async () => {
      const next: Record<string, string> = {};
      const errors: string[] = [];
      for (const p of paths) {
        const { url, error } = await signedFeedbackAttachmentUrl(p);
        if (url) next[p] = url;
        else errors.push(error ?? p);
      }
      if (!cancelled) {
        setUrls(next);
        setFailed(errors);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathsKey]);

  if (!paths.length) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Caricamento allegati…
      </div>
    );
  }

  const fileName = (p: string) => {
    const base = p.split('/').pop() ?? 'allegato';
    return base.length > 28 ? `${base.slice(0, 14)}…${base.slice(-10)}` : base;
  };

  return (
    <div className={className ?? 'mt-2 space-y-2'}>
      {failed.length > 0 && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Impossibile aprire {failed.length} allegato/i (permessi o file mancante).
        </p>
      )}
      <ul className="flex flex-wrap gap-2">
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
                className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
              >
                {isPdf ? (
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{isPdf ? 'PDF' : 'Immagine'} · {fileName(p)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
