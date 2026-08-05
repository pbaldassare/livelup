import { motion } from 'framer-motion';
import { GraduationCap, Loader2, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CourseProgressBar } from '@/components/app/CourseProgressBar';
import { FollowStarButton } from '@/components/app/FollowStarButton';
import { cn } from '@/lib/utils';
import type { AtletaCourseCard, CourseDifficulty } from '@/lib/api/courses';

const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzato',
};

interface CourseListCardProps {
  course: AtletaCourseCard;
  index?: number;
  mode: 'discover' | 'mine';
  enrolling?: boolean;
  onOpen: () => void;
  onEnroll?: () => void;
  /** True quando il corso è del PT a cui l'atleta è collegato — mostra badge "Il tuo PT" */
  isFromConnectedPt?: boolean;
}

export function CourseListCard({
  course,
  index = 0,
  mode,
  enrolling,
  onOpen,
  onEnroll,
  isFromConnectedPt = false,
}: CourseListCardProps) {
  const difficulty = course.difficulty_level ? DIFFICULTY_LABELS[course.difficulty_level] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'rounded-xl border bg-app-card overflow-hidden',
        isFromConnectedPt ? 'border-app-accent/50' : 'border-app-border',
      )}
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex gap-3 p-3">
          {course.cover_image_url ? (
            <div className="h-20 w-20 rounded-lg overflow-hidden shrink-0">
              <img
                src={course.cover_image_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-lg bg-app-accent/10 flex items-center justify-center shrink-0">
              <GraduationCap className="h-7 w-7 text-app-accent" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-app-foreground truncate">{course.title}</h3>
              <FollowStarButton targetType="course" targetId={course.id} size="sm" className="shrink-0 -mt-1 -mr-1" />
            </div>
            {course.pt_name ? (
              <p className="text-xs text-app-muted-foreground mt-0.5 flex items-center gap-1.5">
                con {course.pt_name}
                {isFromConnectedPt && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-app-accent/50 text-app-accent"
                  >
                    Il tuo PT
                  </Badge>
                )}
              </p>
            ) : null}
            {course.target_exercise ? (
              <p className="text-xs text-app-accent mt-1 flex items-center gap-1">
                <Target className="h-3 w-3" />
                <span className="truncate">{course.target_exercise}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {difficulty ? (
                <Badge variant="outline" className="text-[10px] border-app-border text-app-muted-foreground">
                  {difficulty}
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px] border-app-border text-app-muted-foreground">
                {course.steps_count} step
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] border-app-border',
                  course.is_free !== false
                    ? 'text-app-accent border-app-accent/40'
                    : 'text-app-muted-foreground',
                )}
              >
                {course.is_free !== false
                  ? 'Gratuito'
                  : `€ ${Number(course.price || 0).toFixed(2)}`}
              </Badge>
            </div>
          </div>

          {mode === 'mine' ? (
            <CourseProgressBar
              value={course.enrollment?.progress_pct ?? 0}
              size={52}
              strokeWidth={5}
              className="shrink-0 self-center"
            />
          ) : null}
        </div>
      </button>

      {mode === 'discover' && onEnroll ? (
        <div className="px-3 pb-3">
          {course.is_free === false ? (
            <p className="text-xs text-app-muted-foreground text-center mb-2">
              Corso a pagamento — chiedi al Professionista di assegnartelo
            </p>
          ) : null}
          <Button
            className={cn('w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90')}
            disabled={enrolling || course.is_free === false}
            onClick={(e) => {
              e.stopPropagation();
              onEnroll();
            }}
          >
            {enrolling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {course.is_free === false ? 'Solo su assegnazione' : 'Iscriviti'}
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}

export default CourseListCard;
