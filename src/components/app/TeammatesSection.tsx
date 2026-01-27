import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeammates, type Teammate } from '@/hooks/useTeammates';
import { Skeleton } from '@/components/ui/skeleton';

// =====================================================
// TEAMMATES SECTION - Compagni di allenamento attivi
// Include: presenza real-time, invio cheers con doppio tap
// =====================================================

interface TeammatesSectionProps {
  className?: string;
}

export function TeammatesSection({ className }: TeammatesSectionProps) {
  const { teammates, isLoading, sendCheer, onlineCount } = useTeammates();
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [lastTap, setLastTap] = useState<{ id: string; time: number } | null>(null);

  // Handle double tap
  const handleTap = useCallback((teammate: Teammate) => {
    const now = Date.now();
    
    if (lastTap && lastTap.id === teammate.id && now - lastTap.time < 300) {
      // Double tap detected
      handleSendCheer(teammate);
      setLastTap(null);
    } else {
      setLastTap({ id: teammate.id, time: now });
    }
  }, [lastTap]);

  // Handle long press
  const handleLongPress = useCallback((teammate: Teammate) => {
    handleSendCheer(teammate);
  }, []);

  const handleSendCheer = async (teammate: Teammate) => {
    if (sendingTo) return; // Prevent spam
    
    setSendingTo(teammate.id);
    await sendCheer(teammate.id);
    
    // Reset after animation
    setTimeout(() => setSendingTo(null), 500);
  };

  if (isLoading) {
    return (
      <div className={cn('px-4 py-4', className)}>
        <Skeleton className="h-4 w-48 mb-4" />
        <div className="flex gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-16 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  // Don't show if no teammates
  if (teammates.length === 0) return null;

  const activeTeammates = teammates.filter(t => t.isActive);

  return (
    <div className={cn('py-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">
          Compagni di allenamento
        </h3>
        {onlineCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-app-muted-foreground">{onlineCount} online</span>
          </div>
        )}
      </div>
      <p className="text-xs text-white/50 mb-4">
        Doppio tap o tieni premuto per incoraggiare!
      </p>

      {/* Avatars */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
        {teammates.map((teammate) => (
          <TeammateAvatar
            key={teammate.id}
            teammate={teammate}
            isSending={sendingTo === teammate.id}
            onTap={() => handleTap(teammate)}
            onLongPress={() => handleLongPress(teammate)}
          />
        ))}
      </div>
    </div>
  );
}

// =====================================================
// TEAMMATE AVATAR - Avatar singolo con animazione
// =====================================================

interface TeammateAvatarProps {
  teammate: Teammate;
  isSending: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

function TeammateAvatar({ teammate, isSending, onTap, onLongPress }: TeammateAvatarProps) {
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      onLongPress();
    }, 500);
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  return (
    <motion.button
      onClick={onTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className="flex-shrink-0 flex flex-col items-center gap-1 relative"
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative">
        <Avatar className={cn(
          'h-16 w-16 ring-2 transition-all duration-300',
          teammate.isActive ? 'ring-app-accent' : 'ring-white/20'
        )}>
          <AvatarImage src={teammate.avatarUrl} />
          <AvatarFallback className="bg-gray-800 text-app-accent font-bold">
            {teammate.initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Online indicator */}
        {teammate.isActive && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-app-background" />
        )}
        
        {/* Cheers Counter */}
        {teammate.cheers > 0 && (
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-app-accent text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          >
            <span>{teammate.cheers}</span>
            <Zap className="h-3 w-3" />
          </motion.div>
        )}
        
        {/* Send animation */}
        <AnimatePresence>
          {isSending && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Zap className="h-8 w-8 text-app-accent" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Name */}
      <span className="text-[10px] text-white/70 max-w-16 truncate">
        {teammate.name.split(' ')[0]}
      </span>
    </motion.button>
  );
}

export default TeammatesSection;
