import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseListCard } from '@/components/app/CourseListCard';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { courseQueryKeys, enrollInCourse, listPublishedCoursesForAthlete } from '@/lib/api/courses';
import { toast } from 'sonner';

export function AtletaCoursesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { connection } = useAtletaStatus();
  const connectedPtUserId = connection?.pt_user_id ?? null;
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
  const discoverFromMyPt = connectedPtUserId
    ? discover.filter((c) => c.pt_user_id === connectedPtUserId)
    : [];
  const discoverOthers = connectedPtUserId
    ? discover.filter((c) => c.pt_user_id !== connectedPtUserId)
    : discover;

  return (
    <div className="space-y-4 pb-4">
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
          ) : (
            enrolled.map((course, i) => (
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
