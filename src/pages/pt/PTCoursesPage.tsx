import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Users,
  ListOrdered,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { CourseBuilder } from '@/components/pt/course-builder/CourseBuilder';
import { AssignCourseDialog } from '@/components/pt/course-builder/AssignCourseDialog';
import {
  courseQueryKeys,
  deleteCourse,
  listPTCourses,
  publishCourse,
  type CourseDifficulty,
  type PtCourseListItem,
} from '@/lib/api/courses';

const DIFFICULTY_LABEL: Record<CourseDifficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzato',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Bozza',
  published: 'Pubblicato',
  archived: 'Archiviato',
};

export default function PTCoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignCourse, setAssignCourse] = useState<PtCourseListItem | null>(null);

  const {
    data: courses = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: courseQueryKeys.list(user?.id || ''),
    queryFn: () => listPTCourses(user!.id),
    enabled: !!user?.id,
  });

  const invalidate = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.list(user.id) });
    }
  };

  const publishMutation = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      publishCourse(id, published),
    onSuccess: (_data, vars) => {
      invalidate();
      toast.success(vars.published ? 'Corso pubblicato' : 'Corso riportato in bozza');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      invalidate();
      toast.success('Corso eliminato');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setBuilderOpen(true);
  };

  const openEdit = (course: PtCourseListItem) => {
    setEditingId(course.id);
    setBuilderOpen(true);
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Corsi"
        subtitle="Crea percorsi step-by-step con esercizi per i tuoi atleti"
        icon={<GraduationCap className="h-5 w-5" />}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crea nuovo corso
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="text-center py-12 space-y-3">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Impossibile caricare i corsi</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Verifica che lo schema corsi (steps) sia applicato sul backend, poi riprova.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Riprova
            </Button>
          </CardContent>
        </Card>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun corso</h3>
            <p className="text-muted-foreground mb-4">
              Crea il primo corso con step ed esercizi per i tuoi atleti
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Crea nuovo corso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const isPublished = course.status === 'published';
            return (
              <Card key={course.id} className="flex flex-col overflow-hidden border-border">
                {course.cover_image_url ? (
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-10 w-10 text-primary/50" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={isPublished ? 'default' : 'secondary'}>
                          {STATUS_LABEL[course.status] || course.status}
                        </Badge>
                        <Badge variant="outline">
                          {course.is_free !== false
                            ? 'Gratuito'
                            : `€ ${Number(course.price || 0).toFixed(2)}`}
                        </Badge>
                      </div>
                      <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(course)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssignCourse(course)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assegna ad atleti
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            publishMutation.mutate({
                              id: course.id,
                              published: !isPublished,
                            })
                          }
                        >
                          {isPublished ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Metti in bozza
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Pubblica
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Eliminare il corso "${course.title}"? L'operazione non è reversibile.`,
                              )
                            ) {
                              deleteMutation.mutate(course.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 pt-0">
                  {course.target_exercise && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Obiettivo: </span>
                      <span className="font-medium">{course.target_exercise}</span>
                    </p>
                  )}
                  {course.difficulty_level && (
                    <p className="text-xs text-muted-foreground">
                      {DIFFICULTY_LABEL[course.difficulty_level as CourseDifficulty] ||
                        course.difficulty_level}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ListOrdered className="h-3.5 w-3.5" />
                      {course.steps_count} step
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {course.enrolled_count} iscritti
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(course)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Modifica
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignCourse(course)}
                      disabled={course.status === 'archived'}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Assegna
                    </Button>
                    <Button
                      size="sm"
                      variant={isPublished ? 'secondary' : 'default'}
                      onClick={() =>
                        publishMutation.mutate({
                          id: course.id,
                          published: !isPublished,
                        })
                      }
                      disabled={publishMutation.isPending}
                    >
                      {isPublished ? 'Bozza' : 'Pubblica'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CourseBuilder
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open);
          if (!open) {
            setEditingId(null);
            invalidate();
          }
        }}
        courseId={editingId}
      />

      <AssignCourseDialog
        open={!!assignCourse}
        onOpenChange={(open) => {
          if (!open) {
            setAssignCourse(null);
            invalidate();
          }
        }}
        course={assignCourse}
      />
    </div>
  );
}
