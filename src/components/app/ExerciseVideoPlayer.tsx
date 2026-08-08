import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveExerciseVideoUrl } from '@/lib/exerciseMedia';
import {
  getYouTubeEmbedUrl as buildYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getYouTubeVideoId,
} from '@/lib/youtube';

// =====================================================
// EXERCISE VIDEO PLAYER
// Autoplay all'ingresso esercizio; pausa/riprendi manuale.
// =====================================================

interface ExerciseVideoPlayerProps {
  videoUrl?: string | null;
  imageUrl?: string | null;
  exerciseName: string;
  setNumber?: number;
  totalSets?: number;
  coachAvatar?: string;
  coachName?: string;
  /** compact = fascia nel runner; hero = fullscreen stile Ladder */
  variant?: 'compact' | 'hero';
  className?: string;
  /** Se false, non mostra titolo sopra il video (il parent lo gestisce). */
  showTitle?: boolean;
  /** Se true (default), usa il video globale quando manca video_url. */
  useDefaultVideo?: boolean;
}

/** Autoplay mute (richiesto dai browser) + loop — runner esercizi. */
function getYouTubeEmbedUrl(videoId: string): string {
  return buildYouTubeEmbedUrl(videoId, {
    autoplay: true,
    mute: true,
    loop: true,
    controls: false,
  });
}

export function ExerciseVideoPlayer({
  videoUrl,
  imageUrl,
  exerciseName,
  setNumber,
  totalSets,
  coachAvatar,
  coachName,
  variant = 'compact',
  className,
  showTitle,
  useDefaultVideo = true,
}: ExerciseVideoPlayerProps) {
  const resolvedUrl = resolveExerciseVideoUrl(videoUrl, { allowDefault: useDefaultVideo });
  const youtubeId = resolvedUrl ? getYouTubeVideoId(resolvedUrl) : null;
  const isCompact = variant === 'compact';
  const titleVisible = showTitle ?? !isCompact;
  const isDirectVideo = !!resolvedUrl && !youtubeId;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  /** YouTube: iframe attivo (play) vs thumbnail ferma (pausa). */
  const [ytActive, setYtActive] = useState(true);
  /** Remount key per ri-autoplay dopo pausa. */
  const [ytPlayKey, setYtPlayKey] = useState(0);

  // Nuovo esercizio → autoplay immediato
  useEffect(() => {
    setIsPlaying(true);
    setYtActive(true);
    setYtPlayKey((k) => k + 1);
    setIsMuted(true);
  }, [resolvedUrl, exerciseName]);

  // File video nativo: sync play/pause
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isDirectVideo) return;
    if (isPlaying) {
      void el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [isPlaying, isDirectVideo, resolvedUrl, ytPlayKey]);

  const thumbnailUrl = youtubeId ? getYouTubeThumbnail(youtubeId) : imageUrl || undefined;

  const pause = () => {
    if (youtubeId) {
      setYtActive(false);
      setIsPlaying(false);
      return;
    }
    setIsPlaying(false);
  };

  const resume = () => {
    if (youtubeId) {
      setYtActive(true);
      setYtPlayKey((k) => k + 1);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (isPlaying) pause();
    else resume();
  };

  const openYouTube = () => {
    if (resolvedUrl) window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  };

  const hasMedia = !!(youtubeId || isDirectVideo || imageUrl);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-black',
        isCompact ? 'aspect-video max-h-[42vh] rounded-none' : 'h-full min-h-[400px]',
        className,
      )}
    >
      {youtubeId && ytActive ? (
        <iframe
          key={ytPlayKey}
          src={getYouTubeEmbedUrl(youtubeId)}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={exerciseName}
        />
      ) : youtubeId && thumbnailUrl ? (
        <div className="absolute inset-0">
          <img
            src={thumbnailUrl}
            alt={exerciseName}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* In pausa: tap per riprendere (niente autoplay bloccato) */}
          <button
            type="button"
            className="absolute inset-0 flex items-center justify-center bg-black/35"
            onClick={resume}
            aria-label="Riprendi video"
          >
            <div
              className={cn(
                'rounded-full bg-app-accent/95 flex items-center justify-center shadow-lg',
                isCompact ? 'h-12 w-12' : 'h-16 w-16',
              )}
            >
              <Play
                className={cn('text-app-accent-foreground ml-0.5', isCompact ? 'h-6 w-6' : 'h-8 w-8')}
                fill="currentColor"
              />
            </div>
          </button>
        </div>
      ) : isDirectVideo ? (
        <video
          key={resolvedUrl}
          ref={videoRef}
          src={resolvedUrl!}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : imageUrl ? (
        <img src={imageUrl} alt={exerciseName} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-app-accent/20">
              <Play className="h-6 w-6 text-app-accent" />
            </div>
            <p className="text-sm text-white/70">Video non disponibile</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

      {titleVisible && (
        <div className="absolute top-3 left-3 z-10 max-w-[80%]">
          {typeof setNumber === 'number' && typeof totalSets === 'number' && (
            <p className="text-xs font-semibold text-app-accent">
              Serie {setNumber} di {totalSets}
            </p>
          )}
          <h2 className={cn('font-bold text-white mt-0.5 truncate', isCompact ? 'text-lg' : 'text-2xl')}>
            {exerciseName}
          </h2>
        </div>
      )}

      {coachAvatar && (
        <div className="absolute bottom-3 right-3 z-10">
          <Avatar className="h-12 w-12 border-2 border-app-accent">
            <AvatarImage src={coachAvatar} />
            <AvatarFallback className="bg-app-muted text-app-foreground text-xs">
              {coachName
                ?.split(' ')
                .map((n) => n[0])
                .join('') || 'PT'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {hasMedia && (youtubeId || isDirectVideo) && (
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayPause}
            className="h-9 w-9 text-white hover:bg-white/20"
            aria-label={isPlaying ? 'Metti in pausa' : 'Riproduci'}
            title={isPlaying ? 'Pausa' : 'Play'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          {youtubeId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={openYouTube}
              className="h-9 w-9 text-white hover:bg-white/20"
              title="Apri su YouTube"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}

          {isDirectVideo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted((m) => !m)}
              className="h-9 w-9 text-white hover:bg-white/20"
              aria-label={isMuted ? 'Attiva audio' : 'Disattiva audio'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default ExerciseVideoPlayer;
