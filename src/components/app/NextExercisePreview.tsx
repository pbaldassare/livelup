// =====================================================
// NEXT EXERCISE PREVIEW
// Slide-up card shown during the LAST rest of the current
// exercise. Previews the upcoming exercise to keep the
// athlete mentally prepared. Dark theme + lime accent.
// =====================================================

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Dumbbell } from 'lucide-react';

export interface NextExerciseInfo {
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  sets?: number | null;
  repsLabel?: string | null;
  protocolType?: string | null;
}

interface NextExercisePreviewProps {
  show: boolean;
  next: NextExerciseInfo | null;
}

const PROTOCOL_BADGES: Record<string, string> = {
  EMOM: 'EMOM',
  AMRAP: 'AMRAP',
  HIIT: 'HIIT',
  TABATA: 'TABATA',
  SUPERSET: 'SUPERSET',
  RAMPING: 'RAMPING',
};

export function NextExercisePreview({ show, next }: NextExercisePreviewProps) {
  const visible = show && !!next;
  const protocolBadge =
    next?.protocolType && PROTOCOL_BADGES[next.protocolType.toUpperCase()]
      ? PROTOCOL_BADGES[next.protocolType.toUpperCase()]
      : null;

  return (
    <AnimatePresence>
      {visible && next && (
        <motion.div
          key="next-exercise-preview"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="absolute left-3 right-3 bottom-3 z-20"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-2xl border border-app-accent/40 bg-app-card/95 backdrop-blur shadow-[0_8px_28px_-12px_rgba(0,0,0,0.6)] p-3 flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-app-muted flex items-center justify-center">
              {next.imageUrl ? (
                <img
                  src={next.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Dumbbell className="h-6 w-6 text-app-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-app-accent font-semibold">
                Prossimo esercizio
              </p>
              <p className="text-sm font-bold text-app-foreground truncate">
                {next.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {next.category && (
                  <span className="text-[11px] text-app-muted-foreground truncate">
                    {next.category}
                  </span>
                )}
                {protocolBadge ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-app-accent text-app-accent-foreground">
                    {protocolBadge}
                  </span>
                ) : (
                  next.sets != null && next.repsLabel && (
                    <span className="text-[11px] text-app-muted-foreground">
                      {next.sets}×{next.repsLabel}
                    </span>
                  )
                )}
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-app-accent shrink-0" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NextExercisePreview;
