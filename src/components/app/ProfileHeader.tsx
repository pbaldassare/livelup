import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// PROFILE HEADER - Header profilo con cover image
// Design reference: Ladder_iOS_117.png
// =====================================================

interface ProfileHeaderProps {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  streakCount?: number;
  subtitle?: string;
  onSendMessage?: () => void;
  className?: string;
}

export function ProfileHeader({
  name,
  initials,
  avatarUrl,
  coverUrl,
  streakCount = 0,
  subtitle,
  onSendMessage,
  className,
}: ProfileHeaderProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Cover Image */}
      <div className="h-48 w-full bg-app-muted overflow-hidden">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-app-muted to-app-background" />
        )}
      </div>

      {/* Avatar with streak badge */}
      <div className="relative -mt-16 ml-4">
        <div className="relative">
          <Avatar className="h-28 w-28 border-4 border-app-background">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-3xl font-bold bg-app-muted text-app-accent">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {/* Streak badge */}
          {streakCount > 0 && (
            <div className="absolute -bottom-1 right-0 bg-app-accent text-app-accent-foreground px-2 py-0.5 rounded-md flex items-center gap-1 text-sm font-bold">
              {streakCount}
              <Zap className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Name and subtitle */}
      <div className="px-4 pt-3">
        <h1 className="text-2xl font-bold text-app-foreground">{name}</h1>
        {subtitle && (
          <p className="text-sm text-app-muted-foreground flex items-center gap-1 mt-0.5">
            <span className="w-3 h-3 bg-app-accent rounded-sm" />
            {subtitle}
          </p>
        )}
      </div>

      {/* Send message button */}
      {onSendMessage && (
        <div className="px-4 pt-4">
          <Button 
            variant="outline" 
            className="w-full bg-app-muted border-app-border text-app-foreground hover:bg-app-muted/80"
            onClick={onSendMessage}
          >
            SEND MESSAGE
          </Button>
        </div>
      )}
    </div>
  );
}

export default ProfileHeader;
