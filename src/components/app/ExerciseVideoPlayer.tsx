import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// EXERCISE VIDEO PLAYER - Fullscreen video with overlay
// Design reference: Ladder_iOS_62.png
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

  // Placeholder gradient background when no video
  const placeholderBg = 'bg-gradient-to-b from-gray-800 to-gray-900';

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-black">
      {/* Video/Image Background */}
      {videoUrl ? (
        <video
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted={isMuted}
          playsInline
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={exerciseName}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      {/* Set indicator top left */}
      <div className="absolute top-4 left-4">
        <p className="text-app-accent text-sm font-semibold">Set {setNumber} of {totalSets}</p>
        <h2 className="text-2xl font-bold text-white mt-1">{exerciseName}</h2>
      </div>

      {/* Coach avatar bottom right */}
      {coachAvatar && (
        <div className="absolute bottom-4 right-4">
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
      {videoUrl && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
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
        </div>
      )}
    </div>
  );
}

export default ExerciseVideoPlayer;
