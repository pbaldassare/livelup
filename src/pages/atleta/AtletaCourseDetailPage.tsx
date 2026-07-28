import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, GraduationCap, Loader2, Target, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourseProgressBar } from '@/components/app/CourseProgressBar';
import { CourseStepCard } from '@/components/app/CourseStepCard';
import { useAuth } from '@/hooks/useAuth';
import {
  completeCourseStep,
  courseQueryKeys,
  enrollInCourse,
  getAthleteCourseDetail,
  type CourseDifficulty,
  type PtCourseStepProgress,
} from '@/lib/api/courses';
import { toast } from 'sonner';

const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzato',
};

export function AtletaCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [completingStepId, setCompletingStepId] = useState<string | null>(null);

  const { data: course, isLoading, error } = useQuery({
    queryKey: courseQueryKeys.atletaDetail(user?.id || '', courseId || ''),
    queryFn: () => getAthleteCourseDetail(courseId!, user!.id),
    enabled: !!user?.id && !!courseId,
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(courseId!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: courseQueryKeys.atletaDetail(user!.id, courseId!),
      });
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.atletaList(user!.id) });
      toast.success('Iscritto al corso!');
    },
    onError: (err: Error) => toast.error(err.message || 'Errore iscrizione'),
  });

  const completeMutation = useMutation({
    mutationFn: (stepId: string) =>
      completeCourseStep(course!.enrollment!.id, stepId, user!.id),
    onMutate: (stepId) => setCompletingStepId(stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: courseQueryKeys.atletaDetail(user!.id, courseId!),
      });
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.atletaList(user!.id) });
      toast.success('Step completato!');
    },
    onError: (err: Error) => toast.error(err.message || 'Errore completamento'),
    onSettled: () => setCompletingStepId(null),
  });

  const progressByStep = useMemo(() => {
    const map = new Map<string, PtCourseStepProgress>();
    for (const row of course?.step_progress || []) {
      map.set(row.step_id, row);
    }
    return map;
  }, [course?.step_progress]);

  const overallPct = useMemo(() => {
    if (course?.enrollment?.progress_pct != null) return course.enrollment.progress_pct;
    const rows = course?.step_progress || [];
    if (!rows.length) return 0;
    return Math.round(rows.reduce((acc, r) => acc + (r.progress_pct || 0), 0) / rows.length);
  }, [course]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-app-muted-foreground" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-app-muted-foreground">Corso non trovato</p>
        <Button variant="outline" onClick={() => navigate('/app/courses')}>
          Torna ai corsi
        </Button>
      </div>
    );
  }

  const difficulty = course.difficulty_level
    ? DIFFICULTY_LABELS[course.difficulty_level]
    : null;
  const enrolled = !!course.enrollment;

  return (
    <div className="pb-8 -mx-4">
      {/* Hero */}
      <div className="relative">
        {course.cover_image_url ? (
          <div className="aspect-[16/10] w-full overflow-hidden bg-app-muted">
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-app-background via-app-background/40 to-transparent" />
          </div>
        ) : (
          <div className="aspect-[16/10] w-full bg-gradient-to-br from-app-muted to-app-background flex items-center justify-center">
            <GraduationCap className="h-16 w-16 text-app-accent/40" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-app-background/70 backdrop-blur text-app-foreground hover:bg-app-background"
          onClick={() => navigate('/app/courses')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-4 space-y-5 -mt-8 relative z-10">
        <div className="flex items-end gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-app-foreground">{course.title}</h1>
            {course.pt_name ? (
              <p className="text-sm text-app-muted-foreground mt-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {course.pt_name}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {difficulty ? (
                <Badge variant="outline" className="border-app-border text-app-muted-foreground">
                  {difficulty}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className={
                  course.is_free !== false
                    ? 'border-app-accent/40 text-app-accent'
                    : 'border-app-border text-app-muted-foreground'
                }
              >
                {course.is_free !== false
                  ? 'Gratuito'
                  : `€ ${Number(course.price || 0).toFixed(2)}`}
              </Badge>
              {course.target_exercise ? (
                <Badge className="bg-app-accent/15 text-app-accent border-0">
                  <Target className="h-3 w-3 mr-1" />
                  {course.target_exercise}
                </Badge>
              ) : null}
            </div>
          </div>

          {enrolled ? (
            <CourseProgressBar value={overallPct} size={88} strokeWidth={7} label="Completamento" />
          ) : null}
        </div>

        {course.description ? (
          <p className="text-sm text-app-muted-foreground leading-relaxed">{course.description}</p>
        ) : null}

        {!enrolled ? (
          course.is_free === false ? (
            <div className="rounded-xl border border-app-border bg-app-card p-4 text-center space-y-1">
              <p className="text-sm font-medium text-app-foreground">Corso a pagamento</p>
              <p className="text-xs text-app-muted-foreground">
                Chiedi al tuo Professionista di assegnarti questo corso
              </p>
            </div>
          ) : (
            <Button
              className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              disabled={enrollMutation.isPending}
              onClick={() => enrollMutation.mutate()}
            >
              {enrollMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Iscriviti al corso
            </Button>
          )
        ) : null}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider">
            Percorso ({course.pt_course_steps.length} step)
          </h2>

          {course.pt_course_steps.length === 0 ? (
            <p className="text-sm text-app-muted-foreground">Nessuno step disponibile.</p>
          ) : (
            course.pt_course_steps.map((step, index) => {
              const progress = progressByStep.get(step.id);
              // Preview without enrollment: all locked visually except expand disabled
              const effectiveProgress: PtCourseStepProgress | null = enrolled
                ? progress || {
                    id: '',
                    enrollment_id: course.enrollment!.id,
                    step_id: step.id,
                    atleta_user_id: user!.id,
                    status: course.requires_sequential_steps && index > 0 ? 'locked' : 'in_progress',
                    progress_pct: 0,
                    completed_at: null,
                  }
                : {
                    id: '',
                    enrollment_id: '',
                    step_id: step.id,
                    atleta_user_id: '',
                    status: 'locked',
                    progress_pct: 0,
                    completed_at: null,
                  };

              return (
                <CourseStepCard
                  key={step.id}
                  step={step}
                  stepNumber={index + 1}
                  progress={effectiveProgress}
                  isCompleting={completingStepId === step.id}
                  onComplete={
                    enrolled && effectiveProgress.status !== 'locked' && effectiveProgress.status !== 'completed'
                      ? () => completeMutation.mutate(step.id)
                      : undefined
                  }
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AtletaCourseDetailPage;
