import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Loader2, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CourseListCard } from '@/components/app/CourseListCard';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  courseQueryKeys,
  enrollInCourse,
  listPublishedCoursesForAthlete,
  type AtletaCourseCard,
} from '@/lib/api/courses';
import { toast } from 'sonner';

const EMPTY_COURSES: AtletaCourseCard[] = [];

export function AtletaCoursesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { connection } = useAtletaStatus();
  const connectedPtUserId = connection?.pt_user_id ?? null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'discover' | 'mine'>('discover');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState('');
  const debouncedCourseSearch = useDebouncedValue(courseSearch, 300);

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

  const discover = data?.discover ?? EMPTY_COURSES;
  const enrolled = data?.enrolled ?? EMPTY_COURSES;

  const courseMatchesQuery = useMemo(() => {
    const q = debouncedCourseSearch.trim().toLowerCase();
    if (!q) return () => true;
    return (c: AtletaCourseCard) => {
      const hay = [
        c.title,
        c.pt_name,
        c.target_exercise,
        c.category,
        c.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    };
  }, [debouncedCourseSearch]);

  const discoverFiltered = useMemo(
    () => discover.filter(courseMatchesQuery),
    [discover, courseMatchesQuery],
  );
  const enrolledFiltered = useMemo(
    () => enrolled.filter(courseMatchesQuery),
    [enrolled, courseMatchesQuery],
  );

  const discoverFromMyPt = connectedPtUserId
    ? discoverFiltered.filter((c) => c.pt_user_id === connectedPtUserId)
    : [];
  const discoverOthers = connectedPtUserId
    ? discoverFiltered.filter((c) => c.pt_user_id !== connectedPtUserId)
    : discoverFiltered;

  return (
    // Da sola (/app/courses) fa da pagina: margini come le altre; dentro Scopri li ha gia'.
    <div className={embedded ? 'space-y-4 pb-4' : 'space-y-4 p-4'}>
      {!embedded && (
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-app-accent" />
          <div>
            <h1 className="text-xl font-bold text-app-foreground">Corsi</h1>
            <p className="text-sm text-app-muted-foreground">Scopri percorsi e segui i tuoi progressi</p>
          </div>
        </div>
      )}

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

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted-foreground" />
          <Input
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            placeholder="Cerca per titolo, coach, obiettivo…"
            className="h-11 border-app-border bg-app-card pl-9 text-app-foreground placeholder:text-app-muted-foreground"
          />
        </div>

        <TabsContent value="discover" className="mt-4 space-y-5">
          {isLoading ? (
            <LoadingState />
          ) : discover.length === 0 ? (
            <EmptyState
              title="Nessun corso da scoprire"
              description="I corsi pubblicati dai Professionisti appariranno qui"
            />
          ) : (
            <>
              {discoverFromMyPt.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-accent">
                    Corsi del tuo PT
                  </p>
                  {discoverFromMyPt.map((course, i) => (
                    <CourseListCard
                      key={course.id}
                      course={course}
                      index={i}
                      mode="discover"
                      enrolling={enrollingId === course.id}
                      isFromConnectedPt
                      onOpen={() => navigate(`/app/courses/${course.id}`)}
                      onEnroll={() => enrollMutation.mutate(course.id)}
                    />
                  ))}
                </div>
              )}
              {discoverOthers.length > 0 && (
                <div className="space-y-3">
                  {discoverFromMyPt.length > 0 && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-app-muted-foreground">
                      Altri corsi
                    </p>
                  )}
                  {discoverOthers.map((course, i) => (
                    <CourseListCard
                      key={course.id}
                      course={course}
                      index={i}
                      mode="discover"
                      enrolling={enrollingId === course.id}
                      onOpen={() => navigate(`/app/courses/${course.id}`)}
                      onEnroll={() => enrollMutation.mutate(course.id)}
                    />
                  ))}
                </div>
              )}
              {debouncedCourseSearch.trim() &&
                discoverFiltered.length === 0 &&
                discover.length > 0 && (
                  <p className="text-center text-sm text-app-muted-foreground py-4">
                    Nessun corso corrisponde alla ricerca.
                  </p>
                )}
            </>
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
          ) : enrolledFiltered.length === 0 ? (
            <p className="text-center text-sm text-app-muted-foreground py-8">
              Nessun corso corrisponde alla ricerca.
            </p>
          ) : (
            enrolledFiltered.map((course, i) => (
              <CourseListCard
                key={course.id}
                course={course}
                index={i}
                mode="mine"
                isFromConnectedPt={!!connectedPtUserId && course.pt_user_id === connectedPtUserId}
                onOpen={() => navigate(`/app/courses/${course.id}`)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
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
