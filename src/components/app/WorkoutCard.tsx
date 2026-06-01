import { cn } from '@/lib/utils';
import { Star, Heart, Send, Grid3X3, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =====================================================
// WORKOUT CARD - Card allenamento con immagine
// Tutti i testi usano semantic tokens del dark theme
// =====================================================

interface WorkoutCardProps {
  title: string;
  subtitle?: string;
  duration?: number;
  category?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  rating?: number;
  completions?: number;
  dayLabel?: string;
  onPress?: () => void;
  onPreview?: () => void;
  className?: string;
}

export function WorkoutCard({
  title,
  duration,
  category,
  imageUrl,
  isFeatured = false,
  completions,
  dayLabel,
  onPress,
  onPreview,
  className,
}: WorkoutCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border-2 border-app-accent/30 bg-app-background cursor-pointer',
        'active:scale-[0.98] transition-transform',
        className,
      )}
      onClick={onPress}
    >
      {dayLabel && (
        <div className="absolute top-3 left-3 z-20 bg-app-accent text-app-accent-foreground text-xs font-bold px-3 py-1.5 rounded-lg">
          {dayLabel}
        </div>
      )}

      <div className="relative aspect-[4/3]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-app-muted to-app-card" />
        )}

        {/* Dark gradient overlay ensures light text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {isFeatured && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            </div>
          )}

          <h3 className="text-xl font-black uppercase text-app-foreground leading-tight">
            {title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-app-foreground/70">
            {duration && (
              <>
                <Clock className="h-4 w-4" />
                <span>{duration} min</span>
              </>
            )}
            {category && (
              <>
                <span>•</span>
                <span>{category}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <button className="text-app-foreground/60 hover:text-app-foreground transition-colors">
                <Heart className="h-5 w-5" />
              </button>
              <button className="text-app-foreground/60 hover:text-app-foreground transition-colors">
                <Send className="h-5 w-5" />
              </button>
              {completions && (
                <button className="flex items-center gap-1 text-app-foreground/60 hover:text-app-foreground transition-colors">
                  <Grid3X3 className="h-5 w-5" />
                  <span className="text-xs font-medium bg-app-accent/80 text-app-accent-foreground px-1.5 py-0.5 rounded">
                    {completions}
                  </span>
                </button>
              )}
            </div>

            {onPreview && (
              <Button
                size="sm"
                className="bg-app-accent hover:bg-app-accent/90 text-app-accent-foreground font-bold rounded-full px-4"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
              >
                PREVIEW
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// COMPACT WORKOUT CARD - Per liste più dense
// =====================================================

interface CompactWorkoutCardProps {
  title: string;
  coach?: string;
  coachAvatar?: string;
  duration?: number;
  category?: string;
  imageUrl?: string;
  rating?: number;
  completions?: number;
  onPress?: () => void;
  className?: string;
}

export function CompactWorkoutCard({
  title,
  coach,
  coachAvatar,
  duration,
  category,
  imageUrl,
  rating,
  completions,
  onPress,
  className,
}: CompactWorkoutCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-app-card border border-app-border cursor-pointer',
        'active:scale-[0.98] transition-transform',
        className,
      )}
      onClick={onPress}
    >
      <div className="relative aspect-[16/10]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-app-muted to-app-card" />
        )}

        {coach && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full pr-3">
            <div className="w-8 h-8 rounded-full bg-app-muted overflow-hidden">
              {coachAvatar && <img src={coachAvatar} alt={coach} className="w-full h-full object-cover" />}
            </div>
            <div className="text-xs">
              <p className="text-app-foreground font-medium">{coach}</p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-end justify-between">
            <div>
              {duration && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-black text-app-foreground">{duration}</span>
                  <span className="text-sm text-app-foreground/60">Min</span>
                </div>
              )}
              <h4 className="text-base font-bold text-app-foreground">{title}</h4>
              {category && <p className="text-sm text-app-foreground/60">{category}</p>}
            </div>

            {rating && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-app-accent">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-3 w-3',
                        i < Math.floor(rating) ? 'fill-current' : 'opacity-30',
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-app-foreground/60 mt-1">
                  {rating} rating {completions && `| ${completions.toLocaleString()} completions`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkoutCard;
