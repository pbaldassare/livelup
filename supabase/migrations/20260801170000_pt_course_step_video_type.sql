-- =====================================================
-- PT Courses — video step type
-- Adds step_type discriminator ('exercises' | 'video')
-- and optional video_url / video_duration_minutes on steps.
-- =====================================================

ALTER TABLE public.pt_course_steps
  ADD COLUMN IF NOT EXISTS step_type TEXT NOT NULL DEFAULT 'exercises'
    CHECK (step_type IN ('exercises', 'video'));

ALTER TABLE public.pt_course_steps
  ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE public.pt_course_steps
  ADD COLUMN IF NOT EXISTS video_duration_minutes INTEGER
    CHECK (video_duration_minutes IS NULL OR video_duration_minutes > 0);

COMMENT ON COLUMN public.pt_course_steps.step_type IS
  'Tipo step: exercises (lista esercizi) o video (contenuto video).';
COMMENT ON COLUMN public.pt_course_steps.video_url IS
  'URL video per step_type = video (storage o link esterno).';
COMMENT ON COLUMN public.pt_course_steps.video_duration_minutes IS
  'Durata indicativa del video in minuti (opzionale).';
