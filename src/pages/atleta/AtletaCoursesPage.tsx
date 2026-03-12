import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExerciseVideoPlayer } from '@/components/app/ExerciseVideoPlayer';
import { GraduationCap, Play, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AtletaCoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['atleta-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['course-sessions-view', selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse?.id) return [];
      const { data, error } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', selectedCourse.id)
        .order('order_index');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourse?.id,
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user?.id) throw new Error('Not auth');
      const { error } = await supabase.from('course_enrollments').insert({ course_id: courseId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      toast.success('Iscritto al corso!');
    },
    onError: () => toast.error('Errore iscrizione'),
  });

  const getEnrollment = (courseId: string) => enrollments.find(e => e.course_id === courseId);

  if (selectedCourse) {
    const enrollment = getEnrollment(selectedCourse.id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCourse(null); setSelectedSession(null); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-app-foreground">{selectedCourse.title}</h1>
            <p className="text-sm text-app-muted-foreground">{sessions.length} sessioni · {selectedCourse.duration_minutes || '?'} min</p>
          </div>
        </div>

        {enrollment && (
          <Progress value={enrollment.progress_pct || 0} className="h-2" />
        )}

        {!enrollment && (
          <Button className="w-full" onClick={() => enrollMutation.mutate(selectedCourse.id)}>
            {selectedCourse.is_free ? 'Inizia Corso Gratuito' : `Acquista - €${selectedCourse.price}`}
          </Button>
        )}

        <div className="space-y-2">
          {sessions.map((session, i) => (
            <Card
              key={session.id}
              className="cursor-pointer hover:bg-app-muted/50 transition-colors"
              onClick={() => enrollment && setSelectedSession(session)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-app-muted text-app-foreground font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-app-foreground">{session.title}</h3>
                  <p className="text-xs text-app-muted-foreground">{session.duration_minutes || '?'} min</p>
                </div>
                {session.video_url && <Play className="h-4 w-4 text-app-muted-foreground" />}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Session detail dialog */}
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSession?.title}</DialogTitle>
            </DialogHeader>
            {selectedSession?.video_url && (
              <ExerciseVideoPlayer videoUrl={selectedSession.video_url} exerciseName={selectedSession.title} setNumber={1} totalSets={1} />
            )}
            {selectedSession?.content && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-app-foreground mt-4">
                {selectedSession.content}
              </div>
            )}
            {selectedSession?.description && (
              <p className="text-sm text-app-muted-foreground mt-2">{selectedSession.description}</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-app-accent" />
        <div>
          <h1 className="text-xl font-bold text-app-foreground">Corsi</h1>
          <p className="text-sm text-app-muted-foreground">Percorsi formativi per migliorare</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-app-muted-foreground" /></div>
      ) : courses.length === 0 ? (
        <Card className="bg-app-card border-app-border">
          <CardContent className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-app-foreground mb-2">Nessun corso disponibile</h3>
            <p className="text-sm text-app-muted-foreground">I corsi appariranno qui quando saranno pubblicati</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course, i) => {
            const enrollment = getEnrollment(course.id);
            return (
              <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className="bg-app-card border-app-border cursor-pointer hover:bg-app-muted/30 transition-colors"
                  onClick={() => setSelectedCourse(course)}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    {course.cover_image_url ? (
                      <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0">
                        <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-app-accent/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-6 w-6 text-app-accent" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-app-foreground">{course.title}</h3>
                      <p className="text-xs text-app-muted-foreground line-clamp-1">{course.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{course.is_free ? 'Gratuito' : `€${course.price}`}</Badge>
                        <span className="text-xs text-app-muted-foreground">{course.duration_minutes || '?'} min</span>
                        {enrollment && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AtletaCoursesPage;
