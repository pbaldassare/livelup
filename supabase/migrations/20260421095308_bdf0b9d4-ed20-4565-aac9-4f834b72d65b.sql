-- 1. Create favorites bridge table
CREATE TABLE public.pt_favorite_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id uuid NOT NULL,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id, exercise_id)
);

ALTER TABLE public.pt_favorite_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PT can view own favorites"
  ON public.pt_favorite_exercises FOR SELECT
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "PT can add own favorites"
  ON public.pt_favorite_exercises FOR INSERT
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "PT can remove own favorites"
  ON public.pt_favorite_exercises FOR DELETE
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Admins can view all favorites"
  ON public.pt_favorite_exercises FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_pt_favorite_exercises_pt_user ON public.pt_favorite_exercises(pt_user_id);
CREATE INDEX idx_pt_favorite_exercises_exercise ON public.pt_favorite_exercises(exercise_id);

-- 2. Data migration: auto-favorite for PT-created exercises
INSERT INTO public.pt_favorite_exercises (pt_user_id, exercise_id)
SELECT created_by, id FROM public.exercises
WHERE created_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Promote PT-private exercises to public archive
UPDATE public.exercises SET is_public = true
WHERE created_by IS NOT NULL AND is_public = false;

-- 4. Auto-favorite for exercises already used in PT templates
INSERT INTO public.pt_favorite_exercises (pt_user_id, exercise_id)
SELECT DISTINCT wt.pt_user_id, te.exercise_id
FROM public.template_exercises te
JOIN public.workout_templates wt ON wt.id = te.template_id
WHERE wt.pt_user_id IS NOT NULL
ON CONFLICT DO NOTHING;