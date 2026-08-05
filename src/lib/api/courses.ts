// =====================================================
// API: Corsi PT (step-based)
// Tabelle: pt_courses, pt_course_steps, pt_course_step_exercises
// Cast `as any` finché types.ts non viene rigenerato da Lovable.
// =====================================================

import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CourseStepType = 'exercises' | 'video';

export interface PtCourse {
  id: string;
  pt_user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  difficulty_level: CourseDifficulty | null;
  target_exercise: string | null;
  requires_sequential_steps: boolean;
  duration_minutes: number | null;
  price: number;
  is_free: boolean;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export interface PtCourseStepExercise {
  id: string;
  step_id: string;
  exercise_id: string;
  order_index: number;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  exercises?: {
    id: string;
    name: string;
    category: string | null;
    muscle_groups: string[] | null;
    image_url: string | null;
    video_url: string | null;
  } | null;
}

export interface PtCourseStep {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  step_type: CourseStepType;
  video_url: string | null;
  video_duration_minutes: number | null;
  completion_threshold: number;
  order_index: number;
  created_at?: string;
  updated_at?: string;
  pt_course_step_exercises?: PtCourseStepExercise[];
}

export interface PtCourseWithSteps extends PtCourse {
  pt_course_steps: PtCourseStep[];
  enrolled_count?: number;
  steps_count?: number;
}

export interface PtCourseListItem extends PtCourse {
  enrolled_count: number;
  steps_count: number;
}

export type StepProgressStatus = 'locked' | 'in_progress' | 'completed';
export type EnrollmentStatus = 'active' | 'completed' | 'cancelled';

export type EnrollmentAssignedBy = 'self' | 'pt';

export interface PtCourseEnrollment {
  id: string;
  course_id: string;
  atleta_user_id: string;
  status: EnrollmentStatus;
  progress_pct: number;
  enrolled_at: string;
  completed_at: string | null;
  assigned_by?: EnrollmentAssignedBy;
}

export interface PtCourseStepProgress {
  id: string;
  enrollment_id: string;
  step_id: string;
  atleta_user_id: string;
  status: StepProgressStatus;
  progress_pct: number;
  completed_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AtletaCourseCard extends PtCourse {
  steps_count: number;
  pt_name: string | null;
  enrollment?: PtCourseEnrollment | null;
}

export interface AtletaCourseDetail extends PtCourseWithSteps {
  pt_name: string | null;
  enrollment: PtCourseEnrollment | null;
  step_progress: PtCourseStepProgress[];
}

export const courseQueryKeys = {
  list: (userId: string) => ['pt-courses', userId] as const,
  detail: (courseId: string) => ['pt-course', courseId] as const,
  atletaList: (userId: string) => ['atleta-courses', userId] as const,
  atletaDetail: (userId: string, courseId: string) =>
    ['atleta-course', userId, courseId] as const,
};

export type CreateCourseInput = {
  ptUserId: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  target_exercise?: string | null;
  difficulty_level?: CourseDifficulty | null;
  requires_sequential_steps?: boolean;
  category?: string | null;
  is_free?: boolean;
  price?: number;
};

export type UpdateCourseInput = {
  title?: string;
  description?: string | null;
  cover_image_url?: string | null;
  target_exercise?: string | null;
  difficulty_level?: CourseDifficulty | null;
  requires_sequential_steps?: boolean;
  category?: string | null;
  status?: CourseStatus;
  is_free?: boolean;
  price?: number;
};

export type AddStepInput = {
  courseId: string;
  title: string;
  description?: string | null;
  step_type?: CourseStepType;
  video_url?: string | null;
  video_duration_minutes?: number | null;
  completion_threshold?: number;
  order_index?: number;
};

export type UpdateStepInput = {
  title?: string;
  description?: string | null;
  step_type?: CourseStepType;
  video_url?: string | null;
  video_duration_minutes?: number | null;
  completion_threshold?: number;
  order_index?: number;
};

export type AddExerciseToStepInput = {
  stepId: string;
  exerciseId: string;
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  notes?: string | null;
  order_index?: number;
};

export type UpdateStepExerciseInput = {
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  notes?: string | null;
  order_index?: number;
};

// =====================================================
// LIST / DETAIL
// =====================================================

export async function listPTCourses(ptUserId: string): Promise<PtCourseListItem[]> {
  const { data, error } = await db()
    .from('pt_courses')
    .select(`
      *,
      pt_course_steps(id)
    `)
    .eq('pt_user_id', ptUserId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Errore caricamento corsi: ' + error.message);

  const rows = (data || []) as any[];
  const courseIds = rows.map((row) => row.id as string).filter(Boolean);

  // Conteggio iscritti: preferisci RPC SECURITY DEFINER (scoped al PT),
  // fallback a SELECT diretto escludendo cancelled.
  const enrolledByCourse = new Map<string, number>();
  if (courseIds.length > 0) {
    const { data: rpcCounts, error: rpcError } = await db().rpc(
      'count_pt_course_enrollments',
      { _course_ids: courseIds },
    );

    if (!rpcError && Array.isArray(rpcCounts)) {
      for (const row of rpcCounts) {
        enrolledByCourse.set(
          row.course_id as string,
          Number(row.enrolled_count) || 0,
        );
      }
    } else {
      const { data: enrollments, error: enrollError } = await db()
        .from('pt_course_enrollments')
        .select('course_id')
        .in('course_id', courseIds)
        .neq('status', 'cancelled');

      if (enrollError) {
        throw new Error('Errore caricamento iscritti: ' + enrollError.message);
      }
      for (const row of enrollments || []) {
        const id = row.course_id as string;
        enrolledByCourse.set(id, (enrolledByCourse.get(id) || 0) + 1);
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    steps_count: Array.isArray(row.pt_course_steps) ? row.pt_course_steps.length : 0,
    enrolled_count: enrolledByCourse.get(row.id) || 0,
    pt_course_steps: undefined,
  })) as PtCourseListItem[];
}

export async function getCourseWithSteps(courseId: string): Promise<PtCourseWithSteps | null> {
  const { data, error } = await db()
    .from('pt_courses')
    .select(`
      *,
      pt_course_steps (
        *,
        pt_course_step_exercises (
          *,
          exercises:exercise_id (
            id, name, category, muscle_groups, image_url, video_url
          )
        )
      )
    `)
    .eq('id', courseId)
    .maybeSingle();

  if (error) throw new Error('Errore caricamento corso: ' + error.message);
  if (!data) return null;

  const steps = ((data.pt_course_steps || []) as PtCourseStep[])
    .map((step) => ({
      ...step,
      step_type: (step.step_type as CourseStepType) || 'exercises',
      video_url: step.video_url ?? null,
      video_duration_minutes: step.video_duration_minutes ?? null,
      pt_course_step_exercises: [...(step.pt_course_step_exercises || [])].sort(
        (a, b) => a.order_index - b.order_index,
      ),
    }))
    .sort((a, b) => a.order_index - b.order_index);

  return {
    ...(data as PtCourse),
    pt_course_steps: steps,
    steps_count: steps.length,
  };
}

// =====================================================
// COURSE CRUD
// =====================================================

export async function createCourse(input: CreateCourseInput): Promise<PtCourse> {
  const title = input.title.trim();
  if (!title) throw new Error('Il titolo è obbligatorio');

  const isFree = input.is_free ?? true;
  const price = isFree ? 0 : Math.max(0, Number(input.price ?? 0));

  const { data, error } = await db()
    .from('pt_courses')
    .insert({
      pt_user_id: input.ptUserId,
      title,
      description: input.description?.trim() || null,
      cover_image_url: input.cover_image_url || null,
      target_exercise: input.target_exercise?.trim() || null,
      difficulty_level: input.difficulty_level || 'beginner',
      requires_sequential_steps: input.requires_sequential_steps ?? false,
      category: input.category?.trim() || null,
      is_free: isFree,
      price,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error('Errore creazione corso: ' + error.message);
  return data as PtCourse;
}

export async function updateCourse(courseId: string, input: UpdateCourseInput): Promise<PtCourse> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('Il titolo è obbligatorio');
    payload.title = title;
  }
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.cover_image_url !== undefined) payload.cover_image_url = input.cover_image_url || null;
  if (input.target_exercise !== undefined) {
    payload.target_exercise = input.target_exercise?.trim() || null;
  }
  if (input.difficulty_level !== undefined) payload.difficulty_level = input.difficulty_level;
  if (input.requires_sequential_steps !== undefined) {
    payload.requires_sequential_steps = input.requires_sequential_steps;
  }
  if (input.category !== undefined) payload.category = input.category?.trim() || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.is_free !== undefined) {
    payload.is_free = input.is_free;
    if (input.is_free) payload.price = 0;
    else if (input.price !== undefined) payload.price = Math.max(0, Number(input.price));
  } else if (input.price !== undefined) {
    payload.price = Math.max(0, Number(input.price));
  }

  const { data, error } = await db()
    .from('pt_courses')
    .update(payload)
    .eq('id', courseId)
    .select()
    .single();

  if (error) throw new Error('Errore aggiornamento corso: ' + error.message);
  return data as PtCourse;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await db().from('pt_courses').delete().eq('id', courseId);
  if (error) throw new Error('Errore eliminazione corso: ' + error.message);
}

export async function publishCourse(courseId: string, published = true): Promise<PtCourse> {
  return updateCourse(courseId, { status: published ? 'published' : 'draft' });
}

// =====================================================
// STEPS
// =====================================================

export async function addStep(input: AddStepInput): Promise<PtCourseStep> {
  const title = input.title.trim();
  if (!title) throw new Error('Il titolo dello step è obbligatorio');

  let orderIndex = input.order_index;
  if (orderIndex === undefined) {
    const { data: existing } = await db()
      .from('pt_course_steps')
      .select('order_index')
      .eq('course_id', input.courseId)
      .order('order_index', { ascending: false })
      .limit(1);
    orderIndex = existing?.[0] ? (existing[0].order_index as number) + 1 : 0;
  }

  const stepType = input.step_type ?? 'exercises';
  const threshold = Math.min(100, Math.max(0, input.completion_threshold ?? 100));

  const { data, error } = await db()
    .from('pt_course_steps')
    .insert({
      course_id: input.courseId,
      title,
      description: input.description?.trim() || null,
      step_type: stepType,
      video_url: stepType === 'video' ? input.video_url?.trim() || null : null,
      video_duration_minutes:
        stepType === 'video' && input.video_duration_minutes != null
          ? Math.max(1, Math.round(input.video_duration_minutes))
          : null,
      completion_threshold: threshold,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) throw new Error('Errore creazione step: ' + error.message);
  return {
    ...(data as PtCourseStep),
    step_type: stepType,
    video_url: stepType === 'video' ? input.video_url?.trim() || null : null,
    video_duration_minutes:
      stepType === 'video' && input.video_duration_minutes != null
        ? Math.max(1, Math.round(input.video_duration_minutes))
        : null,
  };
}

export async function updateStep(stepId: string, input: UpdateStepInput): Promise<PtCourseStep> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('Il titolo dello step è obbligatorio');
    payload.title = title;
  }
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.step_type !== undefined) {
    payload.step_type = input.step_type;
    if (input.step_type === 'exercises') {
      payload.video_url = null;
      payload.video_duration_minutes = null;
    }
  }
  if (input.video_url !== undefined) payload.video_url = input.video_url?.trim() || null;
  if (input.video_duration_minutes !== undefined) {
    payload.video_duration_minutes =
      input.video_duration_minutes == null
        ? null
        : Math.max(1, Math.round(input.video_duration_minutes));
  }
  if (input.completion_threshold !== undefined) {
    payload.completion_threshold = Math.min(100, Math.max(0, input.completion_threshold));
  }
  if (input.order_index !== undefined) payload.order_index = input.order_index;

  const { data, error } = await db()
    .from('pt_course_steps')
    .update(payload)
    .eq('id', stepId)
    .select()
    .single();

  if (error) throw new Error('Errore aggiornamento step: ' + error.message);
  return data as PtCourseStep;
}

export async function deleteStep(stepId: string): Promise<void> {
  const { error } = await db().from('pt_course_steps').delete().eq('id', stepId);
  if (error) throw new Error('Errore eliminazione step: ' + error.message);
}

export async function reorderSteps(courseId: string, orderedStepIds: string[]): Promise<void> {
  const updates = orderedStepIds.map((id, order_index) =>
    db().from('pt_course_steps').update({ order_index }).eq('id', id).eq('course_id', courseId),
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) throw new Error('Errore riordino step: ' + firstError.message);
}

// =====================================================
// STEP EXERCISES
// =====================================================

export async function addExerciseToStep(input: AddExerciseToStepInput): Promise<PtCourseStepExercise> {
  let orderIndex = input.order_index;
  if (orderIndex === undefined) {
    const { data: existing } = await db()
      .from('pt_course_step_exercises')
      .select('order_index')
      .eq('step_id', input.stepId)
      .order('order_index', { ascending: false })
      .limit(1);
    orderIndex = existing?.[0] ? (existing[0].order_index as number) + 1 : 0;
  }

  const { data, error } = await db()
    .from('pt_course_step_exercises')
    .insert({
      step_id: input.stepId,
      exercise_id: input.exerciseId,
      order_index: orderIndex,
      sets: input.sets ?? 3,
      reps: input.reps ?? '8-12',
      rest_seconds: input.rest_seconds ?? 60,
      notes: input.notes?.trim() || null,
    })
    .select(`
      *,
      exercises:exercise_id (
        id, name, category, muscle_groups, image_url, video_url
      )
    `)
    .single();

  if (error) throw new Error('Errore aggiunta esercizio: ' + error.message);
  return data as PtCourseStepExercise;
}

export async function updateStepExercise(
  stepExerciseId: string,
  input: UpdateStepExerciseInput,
): Promise<PtCourseStepExercise> {
  const payload: Record<string, unknown> = {};
  if (input.sets !== undefined) payload.sets = input.sets;
  if (input.reps !== undefined) payload.reps = input.reps;
  if (input.rest_seconds !== undefined) payload.rest_seconds = input.rest_seconds;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
  if (input.order_index !== undefined) payload.order_index = input.order_index;

  const { data, error } = await db()
    .from('pt_course_step_exercises')
    .update(payload)
    .eq('id', stepExerciseId)
    .select(`
      *,
      exercises:exercise_id (
        id, name, category, muscle_groups, image_url, video_url
      )
    `)
    .single();

  if (error) throw new Error('Errore aggiornamento esercizio: ' + error.message);
  return data as PtCourseStepExercise;
}

export async function removeExerciseFromStep(stepExerciseId: string): Promise<void> {
  const { error } = await db().from('pt_course_step_exercises').delete().eq('id', stepExerciseId);
  if (error) throw new Error('Errore rimozione esercizio: ' + error.message);
}

// =====================================================
// ATLETA — discovery, enroll, step progress
// =====================================================

async function fetchPtNames(ptUserIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ptUserIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data, error } = await db()
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', unique);

  // Non bloccare la lista corsi se RLS nasconde alcuni profili
  if (error) return map;

  for (const row of data || []) {
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
    if (name) map.set(row.user_id, name);
  }
  return map;
}

function averageProgress(rows: Array<{ progress_pct?: number | null }>): number {
  if (!rows.length) return 0;
  const sum = rows.reduce((acc, r) => acc + (r.progress_pct ?? 0), 0);
  return Math.round(sum / rows.length);
}

export async function listPublishedCoursesForAthlete(
  atletaUserId: string,
): Promise<{ discover: AtletaCourseCard[]; enrolled: AtletaCourseCard[] }> {
  const { data: courses, error } = await db()
    .from('pt_courses')
    .select(`
      *,
      pt_course_steps(id)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Errore caricamento corsi: ' + error.message);

  const { data: enrollments, error: enrollError } = await db()
    .from('pt_course_enrollments')
    .select('*')
    .eq('atleta_user_id', atletaUserId)
    .neq('status', 'cancelled');

  if (enrollError) throw new Error('Errore caricamento iscrizioni: ' + enrollError.message);

  const enrollmentByCourse = new Map<string, PtCourseEnrollment>(
    ((enrollments || []) as PtCourseEnrollment[]).map((e) => [e.course_id, e]),
  );

  const ptNames = await fetchPtNames(
    ((courses || []) as PtCourse[]).map((c) => c.pt_user_id),
  );

  const discover: AtletaCourseCard[] = [];
  const enrolled: AtletaCourseCard[] = [];

  for (const row of (courses || []) as any[]) {
    const enrollment = enrollmentByCourse.get(row.id) || null;
    const card: AtletaCourseCard = {
      ...(row as PtCourse),
      steps_count: Array.isArray(row.pt_course_steps) ? row.pt_course_steps.length : 0,
      pt_name: ptNames.get(row.pt_user_id) || null,
      enrollment,
    };
    if (enrollment) enrolled.push(card);
    else discover.push(card);
  }

  enrolled.sort((a, b) => {
    const aDate = a.enrollment?.enrolled_at || '';
    const bDate = b.enrollment?.enrolled_at || '';
    return bDate.localeCompare(aDate);
  });

  return { discover, enrolled };
}

export async function getAthleteCourseDetail(
  courseId: string,
  atletaUserId: string,
): Promise<AtletaCourseDetail | null> {
  const course = await getCourseWithSteps(courseId);
  if (!course) return null;

  const { data: enrollment, error: enrollError } = await db()
    .from('pt_course_enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('atleta_user_id', atletaUserId)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (enrollError) throw new Error('Errore caricamento iscrizione: ' + enrollError.message);

  // Published courses are public; draft/archived only if already enrolled
  if (course.status !== 'published' && !enrollment) return null;

  const ptNames = await fetchPtNames([course.pt_user_id]);

  let stepProgress: PtCourseStepProgress[] = [];
  if (enrollment?.id) {
    const { data: progressRows, error: progressError } = await db()
      .from('pt_course_step_progress')
      .select('*')
      .eq('enrollment_id', enrollment.id);

    if (progressError) throw new Error('Errore caricamento progresso: ' + progressError.message);
    stepProgress = (progressRows || []) as PtCourseStepProgress[];
  }

  return {
    ...course,
    pt_name: ptNames.get(course.pt_user_id) || null,
    enrollment: (enrollment as PtCourseEnrollment) || null,
    step_progress: stepProgress,
  };
}

async function ensureEnrollmentWithStepProgress(params: {
  course: PtCourseWithSteps;
  atletaUserId: string;
  assignedBy: EnrollmentAssignedBy;
}): Promise<{ enrollment: PtCourseEnrollment; created: boolean }> {
  const { course, atletaUserId, assignedBy } = params;

  const { data: existing, error: existingError } = await db()
    .from('pt_course_enrollments')
    .select('*')
    .eq('course_id', course.id)
    .eq('atleta_user_id', atletaUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error('Errore iscrizione: ' + existingError.message);
  }

  if (existing && existing.status !== 'cancelled') {
    return { enrollment: existing as PtCourseEnrollment, created: false };
  }

  let enrollment: PtCourseEnrollment;
  let created = true;

  if (existing?.status === 'cancelled') {
    const { data, error } = await db()
      .from('pt_course_enrollments')
      .update({
        status: 'active',
        progress_pct: 0,
        enrolled_at: new Date().toISOString(),
        completed_at: null,
        assigned_by: assignedBy,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error('Errore iscrizione: ' + error.message);
    enrollment = data as PtCourseEnrollment;
    await db().from('pt_course_step_progress').delete().eq('enrollment_id', enrollment.id);
  } else {
    const { data, error } = await db()
      .from('pt_course_enrollments')
      .insert({
        course_id: course.id,
        atleta_user_id: atletaUserId,
        status: 'active',
        progress_pct: 0,
        assigned_by: assignedBy,
      })
      .select()
      .single();

    if (error) {
      // Race / unique (course_id, atleta_user_id): tratta come già iscritto
      if (error.code === '23505') {
        const { data: again, error: againError } = await db()
          .from('pt_course_enrollments')
          .select('*')
          .eq('course_id', course.id)
          .eq('atleta_user_id', atletaUserId)
          .maybeSingle();
        if (againError) throw new Error('Errore iscrizione: ' + againError.message);
        if (again && again.status !== 'cancelled') {
          return { enrollment: again as PtCourseEnrollment, created: false };
        }
      }
      throw new Error('Errore iscrizione: ' + error.message);
    }
    enrollment = data as PtCourseEnrollment;
  }

  const steps = [...(course.pt_course_steps || [])].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const sequential = !!course.requires_sequential_steps;

  if (steps.length > 0) {
    const progressRows = steps.map((step, index) => {
      const unlocked = !sequential || index === 0;
      return {
        enrollment_id: enrollment.id,
        step_id: step.id,
        atleta_user_id: atletaUserId,
        status: unlocked ? 'in_progress' : 'locked',
        progress_pct: 0,
        completed_at: null,
      };
    });

    const { error: progressError } = await db()
      .from('pt_course_step_progress')
      .insert(progressRows);

    // Progress già presente (re-assign): non far fallire l'iscrizione
    if (progressError && progressError.code !== '23505') {
      throw new Error('Errore inizializzazione progresso: ' + progressError.message);
    }
  }

  return { enrollment, created };
}

export async function enrollInCourse(
  courseId: string,
  atletaUserId: string,
): Promise<PtCourseEnrollment> {
  const course = await getCourseWithSteps(courseId);
  if (!course) throw new Error('Corso non trovato');
  if (course.status !== 'published') throw new Error('Il corso non è disponibile');
  if (!course.is_free) {
    throw new Error(
      'Questo corso è a pagamento. Chiedi al tuo Professionista di assegnartelo.',
    );
  }

  const { enrollment } = await ensureEnrollmentWithStepProgress({
    course,
    atletaUserId,
    assignedBy: 'self',
  });
  return enrollment;
}

export async function assignCourseToAthletes(
  courseId: string,
  athleteUserIds: string[],
): Promise<{ assigned: number; skipped: number }> {
  const uniqueIds = [...new Set(athleteUserIds.filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error('Seleziona almeno un atleta');

  const course = await getCourseWithSteps(courseId);
  if (!course) throw new Error('Corso non trovato');
  if (course.status === 'archived') {
    throw new Error('Non puoi assegnare un corso archiviato');
  }

  let assigned = 0;
  let skipped = 0;
  const newlyAssignedIds: string[] = [];

  for (const atletaUserId of uniqueIds) {
    const { created } = await ensureEnrollmentWithStepProgress({
      course,
      atletaUserId,
      assignedBy: 'pt',
    });
    if (created) {
      assigned += 1;
      newlyAssignedIds.push(atletaUserId);
    } else {
      skipped += 1;
    }
  }

  if (newlyAssignedIds.length > 0) {
    const notifications = newlyAssignedIds.map((atletaUserId) => ({
      user_id: atletaUserId,
      type: 'course_assigned',
      title: 'Nuovo corso disponibile!',
      body: `Il tuo Coach ti ha assegnato il corso "${course.title}"`,
      action_url: `/app/courses/${courseId}`,
      data: { pt_user_id: course.pt_user_id, course_id: courseId },
    }));
    // Non bloccare l'assegnazione se l'insert delle notifiche fallisce
    const { error: notifError } = await db().from('notifications').insert(notifications);
    if (notifError) {
      console.warn('Notifica assegnazione corso non inviata:', notifError.message);
    }
  }

  return { assigned, skipped };
}

export async function listCourseEnrolledAthleteIds(courseId: string): Promise<string[]> {
  const { data, error } = await db()
    .from('pt_course_enrollments')
    .select('atleta_user_id')
    .eq('course_id', courseId)
    .neq('status', 'cancelled');

  if (error) throw new Error('Errore caricamento iscritti: ' + error.message);
  return (data || []).map((row: { atleta_user_id: string }) => row.atleta_user_id);
}

/** True when the RPC is not yet applied on Lovable Cloud (PostgREST schema cache). */
export function isMissingCourseStepWorkoutRpc(error: unknown): boolean {
  const msg =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : '';
  return /schema cache|Could not find the function|PGRST202|start_course_step_workout/i.test(msg);
}

/**
 * Crea (o riprende) un workout dagli esercizi dello step via RPC.
 * Se la funzione non esiste ancora sul backend, ritorna `null` così il client
 * può usare il runner inline del corso.
 */
export async function startCourseStepWorkout(
  enrollmentId: string,
  stepId: string,
): Promise<string | null> {
  const { data, error } = await db().rpc('start_course_step_workout', {
    _enrollment_id: enrollmentId,
    _step_id: stepId,
  });

  if (error) {
    if (isMissingCourseStepWorkoutRpc(error)) return null;
    throw new Error(error.message || 'Errore avvio allenamento');
  }
  if (!data) {
    throw new Error('Errore avvio allenamento');
  }
  return data as string;
}

export async function completeCourseStep(
  enrollmentId: string,
  stepId: string,
  atletaUserId: string,
): Promise<{ enrollment: PtCourseEnrollment; step_progress: PtCourseStepProgress[] }> {
  const { data: enrollment, error: enrollError } = await db()
    .from('pt_course_enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .eq('atleta_user_id', atletaUserId)
    .single();

  if (enrollError || !enrollment) throw new Error('Iscrizione non trovata');

  const { data: stepRow, error: stepError } = await db()
    .from('pt_course_steps')
    .select('id, course_id, completion_threshold, order_index')
    .eq('id', stepId)
    .single();

  if (stepError || !stepRow) throw new Error('Step non trovato');
  if (stepRow.course_id !== enrollment.course_id) throw new Error('Step non appartenente al corso');

  const { data: progress, error: progressError } = await db()
    .from('pt_course_step_progress')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .eq('step_id', stepId)
    .single();

  if (progressError || !progress) throw new Error('Progresso step non trovato');
  if (progress.status === 'locked') throw new Error('Questo step è ancora bloccato');

  const now = new Date().toISOString();

  const { error: updateError } = await db()
    .from('pt_course_step_progress')
    .update({
      status: 'completed',
      progress_pct: 100,
      completed_at: now,
    })
    .eq('id', progress.id)
    .eq('atleta_user_id', atletaUserId);

  if (updateError) throw new Error('Errore completamento step: ' + updateError.message);

  const { data: course } = await db()
    .from('pt_courses')
    .select('requires_sequential_steps')
    .eq('id', enrollment.course_id)
    .single();

  if (course?.requires_sequential_steps) {
    const { data: allSteps } = await db()
      .from('pt_course_steps')
      .select('id, order_index')
      .eq('course_id', enrollment.course_id)
      .order('order_index', { ascending: true });

    const ordered = (allSteps || []) as Array<{ id: string; order_index: number }>;
    const currentIdx = ordered.findIndex((s) => s.id === stepId);
    const nextStep = currentIdx >= 0 ? ordered[currentIdx + 1] : undefined;

    if (nextStep) {
      await db()
        .from('pt_course_step_progress')
        .update({ status: 'in_progress' })
        .eq('enrollment_id', enrollmentId)
        .eq('step_id', nextStep.id)
        .eq('status', 'locked')
        .eq('atleta_user_id', atletaUserId);
    }
  }

  const { data: allProgress, error: allProgressError } = await db()
    .from('pt_course_step_progress')
    .select('*')
    .eq('enrollment_id', enrollmentId);

  if (allProgressError) throw new Error('Errore ricarica progresso: ' + allProgressError.message);

  const progressList = (allProgress || []) as PtCourseStepProgress[];
  const overallPct = averageProgress(progressList);

  const { data: stepsMeta } = await db()
    .from('pt_course_steps')
    .select('id, completion_threshold')
    .eq('course_id', enrollment.course_id);

  const thresholdByStep = new Map<string, number>(
    ((stepsMeta || []) as Array<{ id: string; completion_threshold: number }>).map((s) => [
      s.id,
      s.completion_threshold ?? 100,
    ]),
  );

  const allDone =
    progressList.length > 0 &&
    progressList.every((p) => {
      const need = thresholdByStep.get(p.step_id) ?? 100;
      return p.status === 'completed' || p.progress_pct >= need;
    });

  const enrollmentUpdate: Record<string, unknown> = {
    progress_pct: overallPct,
  };
  if (allDone) {
    enrollmentUpdate.status = 'completed';
    enrollmentUpdate.completed_at = now;
  }

  const { data: updatedEnrollment, error: enrollUpdateError } = await db()
    .from('pt_course_enrollments')
    .update(enrollmentUpdate)
    .eq('id', enrollmentId)
    .eq('atleta_user_id', atletaUserId)
    .select()
    .single();

  if (enrollUpdateError) throw new Error('Errore aggiornamento iscrizione: ' + enrollUpdateError.message);

  return {
    enrollment: updatedEnrollment as PtCourseEnrollment,
    step_progress: progressList,
  };
}
