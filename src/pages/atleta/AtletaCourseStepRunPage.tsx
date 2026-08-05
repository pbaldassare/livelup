import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExerciseVideoPlayer } from '@/components/app/ExerciseVideoPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import {
  completeCourseStep,
  courseQueryKeys,
  getAthleteCourseDetail,
  type PtCourseStepExercise,
} from '@/lib/api/courses';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function parseSets(ex: PtCourseStepExercise): number {
  return Math.max(1, ex.sets ?? 3);
}

function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AtletaCourseStepRunPage() {
  const { courseId, stepId } = useParams<{ courseId: string; stepId: string }>();
  const { user } = useAuth();
  const { isConnectedToPt } = useAtletaStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const completingRef = useRef(false);

  const { data: course, isLoading, error } = useQuery({
    queryKey: courseQueryKeys.atletaDetail(user?.id || '', courseId || ''),
    queryFn: () => getAthleteCourseDetail(courseId!, user!.id),
    enabled: !!user?.id && !!courseId,
  });

  const step = useMemo(
    () => (course?.pt_course_steps ?? []).find((s) => s.id === stepId) || null,
    [course, stepId],
  );

  const exercises = useMemo(() => {
    const list = [...(step?.pt_course_step_exercises || [])];
    list.sort((a, b) => a.order_index - b.order_index);
    return list;
  }, [step]);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const current = exercises[exerciseIndex] ?? null;
  const nextExercise = exercises[exerciseIndex + 1] ?? null;
  const setsTotal = current ? parseSets(current) : 0;
  const restSeconds = current?.rest_seconds ?? 60;

  const totalSets = exercises.reduce((acc, ex) => acc + parseSets(ex), 0);
  const completedSets = useMemo(() => {
    let n = 0;
    for (let i = 0; i < exerciseIndex; i++) n += parseSets(exercises[i]);
    if (!finished) n += Math.max(0, currentSet - 1);
    else n = totalSets;
    return n;
  }, [exerciseIndex, currentSet, exercises, finished, totalSets]);

  useEffect(() => {
    if (restLeft == null || restLeft <= 0) return;
    const id = window.setInterval(() => {
      setRestLeft((prev) => {
        if (prev == null) return null;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [restLeft]);

  const goBackToCourse = () => {
    if (courseId) {
      navigate(`/app/courses/${courseId}`, { replace: true });
    } else {
      navigate('/app/courses', { replace: true });
    }
  };

  const finishStepAndReturn = async () => {
    if (completingRef.current) return;
    const enrollmentId = course?.enrollment?.id;
    const uid = user?.id;
    const cid = courseId;
    const sid = stepId;

    if (!enrollmentId || !uid || !cid || !sid) {
      toast.error('Dati corso non disponibili');
      goBackToCourse();
      return;
    }

    completingRef.current = true;
    setIsCompleting(true);
    setFinished(true);
    setRestLeft(null);

    try {
      const result = await completeCourseStep(enrollmentId, sid, uid);
      // Aggiorna cache subito così il dettaglio non monta vuoto
      queryClient.setQueryData(
        courseQueryKeys.atletaDetail(uid, cid),
        (old: typeof course | undefined) => {
          if (!old) return old;
          return {
            ...old,
            enrollment: result.enrollment,
            step_progress: result.step_progress,
          };
        },
      );
      toast.success('Step completato!');
      navigate(`/app/courses/${cid}`, { replace: true });
      void queryClient.invalidateQueries({
        queryKey: courseQueryKeys.atletaDetail(uid, cid),
      });
      void queryClient.invalidateQueries({
        queryKey: courseQueryKeys.atletaList(uid),
      });
    } catch (err) {
      completingRef.current = false;
      setIsCompleting(false);
      toast.error(err instanceof Error ? err.message : 'Errore completamento');
    }
  };

  const advanceAfterSet = () => {
    if (!current) return;

    if (currentSet < setsTotal) {
      setCurrentSet((s) => s + 1);
      setRestLeft(restSeconds > 0 ? restSeconds : null);
      return;
    }

    if (exerciseIndex < exercises.length - 1) {
      setExerciseIndex((i) => i + 1);
      setCurrentSet(1);
      setRestLeft(restSeconds > 0 ? restSeconds : null);
      return;
    }

    void finishStepAndReturn();
  };

  const onCompleteSet = () => {
    if (restLeft != null && restLeft > 0) return;
    if (isCompleting) return;
    advanceAfterSet();
  };

  const skipRest = () => setRestLeft(0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-app-muted-foreground" />
      </div>
    );
  }

  if (error || !course || !step) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={goBackToCourse}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al corso
        </Button>
        <p className="text-app-muted-foreground">Step non trovato o non disponibile.</p>
      </div>
    );
  }

  if (!course.enrollment) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={goBackToCourse}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al corso
        </Button>
        <p className="text-app-muted-foreground">Devi essere iscritto al corso per avviare lo step.</p>
      </div>
    );
  }

  if (!isConnectedToPt(course.pt_user_id)) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={goBackToCourse}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al corso
        </Button>
        <div className="rounded-xl border border-app-border bg-app-muted/40 p-4 space-y-2">
          <p className="font-semibold text-app-foreground">Solo lettura</p>
          <p className="text-sm text-app-muted-foreground">
            Collaborazione terminata: non puoi più eseguire gli step di questo corso.
          </p>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={goBackToCourse}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al corso
        </Button>
        <p className="text-app-muted-foreground">Nessun esercizio in questo step.</p>
      </div>
    );
  }

  if (finished || isCompleting) {
    return (
      <div className="space-y-6 pb-8 pt-4 px-4">
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center">
            {isCompleting ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <CheckCircle2 className="h-8 w-8" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-app-foreground">
            {isCompleting ? 'Salvataggio…' : 'Allenamento completato'}
          </h1>
          <p className="text-sm text-app-muted-foreground">
            {isCompleting
              ? 'Stiamo aggiornando il progresso del corso.'
              : `Hai finito tutti gli esercizi di «${step.title}».`}
          </p>
        </div>
        {!isCompleting ? (
          <div className="space-y-2">
            <Button
              className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              onClick={() => void finishStepAndReturn()}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Riprova salvataggio
            </Button>
            <Button variant="outline" className="w-full border-app-border" onClick={goBackToCourse}>
              Torna al corso
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const name = current?.exercises?.name || 'Esercizio';
  const imageUrl = current?.exercises?.image_url;
  const videoUrl = current?.exercises?.video_url;
  const isResting = restLeft != null && restLeft > 0;
  const nextName = nextExercise?.exercises?.name;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={goBackToCourse}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-app-muted-foreground truncate">{course.title}</p>
          <h1 className="text-lg font-bold text-app-foreground">
            Esercizio {exerciseIndex + 1}/{exercises.length}
          </h1>
        </div>
      </div>

      <div className="rounded-xl border border-app-border bg-app-card px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-app-muted-foreground">Avanzamento</span>
          <span className="font-semibold text-app-foreground">
            {completedSets}/{totalSets} serie
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-app-muted overflow-hidden">
          <div
            className="h-full bg-app-accent transition-all"
            style={{ width: `${totalSets ? Math.round((completedSets / totalSets) * 100) : 0}%` }}
          />
        </div>
      </div>

      {isResting ? (
        <div className="rounded-xl border border-app-border bg-app-card p-6 space-y-4 text-center">
          <div className="mx-auto h-20 w-20 rounded-full border-4 border-app-accent flex items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-app-foreground">
              {formatRest(restLeft)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-app-muted-foreground flex items-center justify-center gap-2">
              <Timer className="h-4 w-4" />
              Recupero
            </p>
            <p className="mt-2 text-app-foreground font-semibold">
              Prossimo: serie {currentSet} · {name}
            </p>
            {nextName && currentSet === 1 ? (
              <p className="mt-1 text-sm text-app-muted-foreground">Nuovo esercizio</p>
            ) : null}
          </div>
          <Button variant="outline" className="w-full border-app-border" onClick={skipRest}>
            Salta recupero
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-app-border bg-app-card overflow-hidden">
          <ExerciseVideoPlayer
            key={`course-vid-${current?.id ?? exerciseIndex}`}
            videoUrl={videoUrl}
            imageUrl={imageUrl}
            exerciseName={name}
            setNumber={currentSet}
            totalSets={setsTotal}
            variant="compact"
            showTitle={false}
          />

          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-app-foreground">{name}</h2>
              <p className="text-sm text-app-muted-foreground mt-1">
                Serie {currentSet} di {setsTotal}
                {current?.reps ? ` · ${current.reps} rip` : ''}
                {restSeconds ? ` · recupero ${restSeconds}s` : ''}
              </p>
              {current?.notes ? (
                <p className="text-xs text-app-muted-foreground mt-2">{current.notes}</p>
              ) : null}
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: setsTotal }, (_, i) => {
                const n = i + 1;
                const done = n < currentSet;
                const active = n === currentSet;
                return (
                  <div
                    key={n}
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center text-sm font-semibold border',
                      done && 'bg-app-accent text-app-accent-foreground border-app-accent',
                      active && !done && 'border-app-accent text-app-accent bg-app-accent/10',
                      !done && !active && 'border-app-border text-app-muted-foreground',
                    )}
                  >
                    {n}
                  </div>
                );
              })}
            </div>

            <Button
              className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              onClick={onCompleteSet}
            >
              Completa serie
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>

            {nextExercise && currentSet === setsTotal ? (
              <p className="text-xs text-center text-app-muted-foreground">
                Dopo: {nextExercise.exercises?.name || 'esercizio successivo'}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="space-y-1.5 px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-app-muted-foreground">
          Ordine esercizi
        </p>
        {exercises.map((ex, i) => {
          const label = ex.exercises?.name || `Esercizio ${i + 1}`;
          const done = i < exerciseIndex;
          const active = i === exerciseIndex;
          return (
            <div
              key={ex.id}
              className={cn(
                'flex items-center gap-2 text-sm py-1',
                done && 'text-app-muted-foreground line-through',
                active && 'text-app-foreground font-semibold',
                !done && !active && 'text-app-muted-foreground',
              )}
            >
              <span className="w-5 text-center tabular-nums">{i + 1}</span>
              <span className="truncate">{label}</span>
              {active ? <span className="text-xs text-app-accent ml-auto">in corso</span> : null}
              {done ? <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-app-accent" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AtletaCourseStepRunPage;
