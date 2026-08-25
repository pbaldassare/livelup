import { useEffect, useState } from 'react';
import { ExternalLink, Video as VideoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?/\s]+)/,
  );
  return match ? match[1] : null;
}

function getVimeoVideoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function isVideoFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return path.includes('/exercise-videos/') || /\.(mp4|mov|webm)(\?|$)/.test(path);
  } catch {
    return /\.(mp4|mov|webm)(\?|$)/i.test(url);
  }
}

function StorageFileVideo({ url, title }: { url: string; title: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (error) {
    return (
      <video
        src={url}
        title={title}
        controls
        controlsList="nodownload"
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full bg-muted object-contain"
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }

  if (!src) {
    return <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Caricamento video…</div>;
  }

  return (
    <video
      src={src}
      title={title}
      controls
      controlsList="nodownload"
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full bg-muted object-contain [transform:translateZ(0)]"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

interface VideoEmbedProps {
  url: string;
  title: string;
  elevated?: boolean;
  className?: string;
}

export function VideoEmbed({ url, title, elevated = false, className }: VideoEmbedProps) {
  const youtubeId = getYouTubeVideoId(url);
  const vimeoId = getVimeoVideoId(url);
  const frameClass = cn(
    'relative aspect-video w-full overflow-hidden rounded-2xl border bg-muted shadow-sm',
    elevated && 'shadow-lg shadow-primary/10',
    className,
  );

  if (youtubeId) {
    return (
      <div className={frameClass}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div className={frameClass}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isVideoFileUrl(url)) {
    return (
      <div className={frameClass}>
        <StorageFileVideo url={url} title={title} />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border bg-muted/40 p-5 text-sm font-medium text-primary transition-colors hover:bg-muted hover:underline"
    >
      <VideoIcon className="h-4 w-4" />
      Apri video
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
