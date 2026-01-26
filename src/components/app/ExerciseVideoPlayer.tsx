import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// EXERCISE VIDEO PLAYER - Fullscreen video with overlay
// Design reference: Ladder_iOS_62.png
// Supports: YouTube URLs, direct video URLs, and images
// =====================================================

interface ExerciseVideoPlayerProps {
  videoUrl?: string;
  imageUrl?: string;
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  coachAvatar?: string;
  coachName?: string;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

// Helper to extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?\/\s]+)/
  );
  return match ? match[1] : null;
}

// Get YouTube thumbnail URL
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Get YouTube embed URL
function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1`;
}

export function ExerciseVideoPlayer({
  videoUrl,
  imageUrl,
  exerciseName,
  setNumber,
  totalSets,
  coachAvatar,
  coachName,
  isPlaying = false,
  onTogglePlay,
}: ExerciseVideoPlayerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  // Check if URL is YouTube
  const youtubeId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
  
  // Determine the thumbnail to show
  const thumbnailUrl = youtubeId 
    ? getYouTubeThumbnail(youtubeId)
    : imageUrl;

  // Placeholder gradient background when no video
  const placeholderBg = 'bg-gradient-to-b from-gray-800 to-gray-900';

  const handlePlayClick = () => {
    if (youtubeId) {
      setShowVideo(true);
    }
    onTogglePlay?.();
  };

  const openYouTube = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-black">
      {/* Video/Image Background */}
      {showVideo && youtubeId ? (
        // YouTube embedded player
        <iframe
          src={getYouTubeEmbedUrl(youtubeId)}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={exerciseName}
        />
      ) : youtubeId && thumbnailUrl ? (
        // YouTube thumbnail with play button overlay
        <div className="absolute inset-0">
          <img
            src={thumbnailUrl}
            alt={exerciseName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // Fallback to hqdefault if maxresdefault doesn't exist
              const target = e.target as HTMLImageElement;
              if (target.src.includes('maxresdefault')) {
                target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
              }
            }}
          />
          {/* Play button overlay for YouTube */}
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 hover:bg-black/30 transition-colors"
            onClick={handlePlayClick}
          >
            <div className="w-20 h-20 rounded-full bg-app-accent/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Play className="h-10 w-10 text-white ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
      ) : videoUrl && !youtubeId ? (
        // Direct video URL (non-YouTube)
        <video
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted={isMuted}
          playsInline
        />
      ) : imageUrl ? (
        // Static image
        <img
          src={imageUrl}
          alt={exerciseName}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        // Placeholder when no video/image
        <div className={cn('absolute inset-0', placeholderBg)}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-app-accent/20 flex items-center justify-center mx-auto mb-4">
                <Play className="h-10 w-10 text-app-accent" />
              </div>
              <p className="text-app-muted-foreground">Video non disponibile</p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

      {/* Set indicator top left */}
      <div className="absolute top-4 left-4 z-10">
        <p className="text-app-accent text-sm font-semibold">Set {setNumber} of {totalSets}</p>
        <h2 className="text-2xl font-bold text-white mt-1">{exerciseName}</h2>
      </div>

      {/* Coach avatar bottom right */}
      {coachAvatar && (
        <div className="absolute bottom-4 right-4 z-10">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-app-accent">
              <AvatarImage src={coachAvatar} />
              <AvatarFallback className="bg-app-muted text-app-foreground">
                {coachName?.split(' ').map(n => n[0]).join('') || 'PT'}
              </AvatarFallback>
            </Avatar>
            {/* Animated ring */}
            <div className="absolute inset-0 border-2 border-app-accent rounded-full animate-ping opacity-50" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
        {youtubeId && !showVideo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayClick}
            className="text-white hover:bg-white/20"
          >
            <Play className="h-5 w-5" />
          </Button>
        )}

        {youtubeId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={openYouTube}
            className="text-white hover:bg-white/20"
            title="Apri su YouTube"
          >
            <ExternalLink className="h-5 w-5" />
          </Button>
        )}

        {videoUrl && !youtubeId && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default ExerciseVideoPlayer;
