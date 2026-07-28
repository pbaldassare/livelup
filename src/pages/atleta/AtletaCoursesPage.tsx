import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GraduationCap, Loader2, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseProgressBar } from '@/components/app/CourseProgressBar';
import { FollowStarButton } from '@/components/app/FollowStarButton';
import { useAuth } from '@/hooks/useAuth';
import {
  courseQueryKeys,
  enrollInCourse,
  listPublishedCoursesForAthlete,
  type AtletaCourseCard,
  type CourseDifficulty,
} from '@/lib/api/courses';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzato',
};

export function AtletaCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'discover' | 'mine'>('discover');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: courseQueryKeys.atletaList(user?.id || ''),
    queryFn: () => listPublishedCoursesForAthlete(user!.id),
    enabled: !!user?.id,
  });

  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollInCourse(courseId, user!.id),
    onMutate: (courseId) => setEnrollingId(courseId),
    onSuccess: (_enrollment, courseId) => {
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.atletaList(user!.id) });
      toast.success('Iscritto al corso!');
      navigate(`/app/courses/${courseId}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Errore iscrizione');
    },
    onSettled: () => setEnrollingId(null),
  });

  const discover = data?.discover || [];
  const enrolled = data?.enrolled || [];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-app-accent" />
        <div>
          <h1 className="text-xl font-bold text-app-foreground">Corsi</h1>
          <p className="text-sm text-app-muted-foreground">Scopri percorsi e segui i tuoi progressi</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'discover' | 'mine')}>
        <TabsList className="w-full bg-app-muted/50">
          <TabsTrigger
            value="discover"
            className="flex-1 data-[state=active]:bg-app-accent data-[state=active]:text-app-accent-foreground"
          >
            Scopri
          </TabsTrigger>
          <TabsTrigger
            value="mine"
            className="flex-1 data-[state=active]:bg-app-accent data-[state=active]:text-app-accent-foreground"
          >
            I miei corsi
            {enrolled.length > 0 ? (
              <span className="ml-1.5 text-xs opacity-80">({enrolled.length})</span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-4 space-y-3">
          {isLoading ? (
            <LoadingState />
          ) : discover.length === 0 ? (
            <EmptyState
              title="Nessun corso da scoprire"
              description="I corsi pubblicati dai Professionisti appariranno qui"
            />
          ) : (
            discover.map((course, i) => (
              <CourseListCard
                key={course.id}
                course={course}
                index={i}
                mode="discover"
                enrolling={enrollingId === course.id}
                onOpen={() => navigate(`/app/courses/${course.id}`)}
                onEnroll={() => enrollMutation.mutate(course.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4 space-y-3">
          {isLoading ? (
            <LoadingState />
          ) : enrolled.length === 0 ? (
            <EmptyState
              title="Nessun corso attivo"
              description="Iscriviti da Scopri per iniziare un percorso"
            />
          ) : (
            enrolled.map((course, i) => (
              <CourseListCard
                key={course.id}
                course={course}
                index={i}
                mode="mine"
                onOpen={() => navigate(`/app/courses/${course.id}`)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CourseListCard({
  course,
  index,
  mode,
  enrolling,
  onOpen,
  onEnroll,
}: {
  course: AtletaCourseCard;
  index: number;
  mode: 'discover' | 'mine';
  enrolling?: boolean;
  onOpen: () => void;
  onEnroll?: () => void;
}) {
  const difficulty = course.difficulty_level
    ? DIFFICULTY_LABELS[course.difficulty_level]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-app-border bg-app-card overflow-hidden"
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
              <p className="text-xs text-app-muted-foreground mt-0.5">con {course.pt_name}</p>
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
            className={cn(
              'w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90',
            )}
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

function LoadingState() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-app-muted-foreground" />
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-card text-center py-12 px-4">
      <GraduationCap className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-app-foreground mb-2">{title}</h3>
      <p className="text-sm text-app-muted-foreground">{description}</p>
    </div>
  );
}

export default AtletaCoursesPage;
