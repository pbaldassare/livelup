// =====================================================
// NEXT EXERCISE PREVIEW
// hero: metà schermo in recupero prima del prossimo esercizio
// card: mini card slide-up (legacy)
// =====================================================

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Dumbbell, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NextExerciseInfo {
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  sets?: number | null;
  repsLabel?: string | null;
  protocolType?: string | null;
}

interface NextExercisePreviewProps {
  show?: boolean;
  next: NextExerciseInfo | null;
  variant?: 'card' | 'hero';
  className?: string;
}

const PROTOCOL_BADGES: Record<string, string> = {
  EMOM: 'EMOM',
  AMRAP: 'AMRAP',
  HIIT: 'HIIT',
  TABATA: 'TABATA',
  SUPERSET: 'Superset',
  RAMPING: 'Ramping',
};

function protocolBadge(protocolType?: string | null): string | null {
  if (!protocolType) return null;
  return PROTOCOL_BADGES[protocolType.toUpperCase()] ?? protocolType;
}

function PreviewMeta({ next }: { next: NextExerciseInfo }) {
  const badge = protocolBadge(next.protocolType);
  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      {next.category && (
        <span className="text-sm text-app-muted-foreground truncate">{next.category}</span>
      )}
      {badge ? (
        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-app-accent text-app-accent-foreground">
          {badge}
        </span>
      ) : (
        next.sets != null &&
        next.repsLabel && (
          <span className="text-sm text-app-muted-foreground tabular-nums">
            {next.sets}×{next.repsLabel}
          </span>
        )
      )}
    </div>
  );
}

function PreviewThumbnail({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  return (
    <div className="relative h-24 w-24 shrink-0 rounded-2xl overflow-hidden bg-app-muted flex items-center justify-center border border-app-border">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <Dumbbell className="h-10 w-10 text-app-muted-foreground/60" />
      )}
    </div>
  );
}

export function NextExercisePreview({
  show = true,
  next,
  variant = 'card',
  className,
}: NextExercisePreviewProps) {
  if (variant === 'hero') {
    if (!next) return null;
    return (
      <section
        className={cn('flex-1 flex flex-col justify-center px-6 py-8 bg-app-background', className)}
        role="status"
        aria-live="polite"
      >
        <p className="text-3xl font-black text-app-foreground mb-4">Prossimo:</p>
        <div className="flex items-start gap-4">
          <PreviewThumbnail imageUrl={next.imageUrl} name={next.name} />
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start gap-2">
              <h2 className="text-2xl font-bold text-app-foreground leading-tight">{next.name}</h2>
              <Info className="h-5 w-5 shrink-0 text-app-muted-foreground mt-1" aria-hidden />
            </div>
            <PreviewMeta next={next} />
          </div>
        </div>
      </section>
    );
  }

  const visible = show && !!next;

  return (
    <AnimatePresence>
      {visible && next && (
        <motion.div
          key="next-exercise-preview"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className={cn('absolute left-3 right-3 bottom-3 z-20', className)}
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
              <p className="text-sm font-bold text-app-foreground truncate">{next.name}</p>
              <PreviewMeta next={next} />
            </div>

            <ArrowRight className="h-5 w-5 text-app-accent shrink-0" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NextExercisePreview;
