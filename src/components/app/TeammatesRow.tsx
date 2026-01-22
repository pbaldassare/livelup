import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap } from 'lucide-react';

// =====================================================
// TEAMMATES ROW - Riga avatar teammate attivi
// Design: avatar con ring, counter cheers
// =====================================================

interface Teammate {
  id: string;
  name: string;
  avatarUrl?: string;
  initials?: string;
  cheers?: number;
  isActive?: boolean;
}

interface TeammatesRowProps {
  title?: string;
  subtitle?: string;
  teammates: Teammate[];
  onTeammatePress?: (teammate: Teammate) => void;
  className?: string;
}

export function TeammatesRow({
  title = 'TEAMMATES WORKING OUT',
  subtitle = 'Double tap or hold avatar to send cheers!',
  teammates,
  onTeammatePress,
  className,
}: TeammatesRowProps) {
  if (teammates.length === 0) return null;

  return (
    <div className={cn('px-4 py-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{title}</h3>
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>
      {subtitle && (
        <p className="text-xs text-white/50 mb-4">{subtitle}</p>
      )}

      {/* Avatars */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
        {teammates.map((teammate) => (
          <button
            key={teammate.id}
            onClick={() => onTeammatePress?.(teammate)}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="relative">
              <Avatar className={cn(
                'h-16 w-16 ring-2',
                teammate.isActive ? 'ring-app-accent' : 'ring-white/20'
              )}>
                <AvatarImage src={teammate.avatarUrl} />
                <AvatarFallback className="bg-gray-800 text-app-accent font-bold">
                  {teammate.initials || teammate.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Cheers Counter */}
              {teammate.cheers && teammate.cheers > 0 && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-app-accent text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  <span>{teammate.cheers}</span>
                  <Zap className="h-3 w-3" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TeammatesRow;
