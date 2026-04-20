-- 1. workout_programs: definizione del programma
CREATE TABLE public.workout_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pt_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER NOT NULL DEFAULT 4 CHECK (duration_weeks > 0 AND duration_weeks <= 52),
  frequency_per_week INTEGER NOT NULL DEFAULT 3 CHECK (frequency_per_week > 0 AND frequency_per_week <= 7),
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_programs_pt ON public.workout_programs(pt_user_id);

ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PT can manage own programs"
  ON public.workout_programs FOR ALL
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()))
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Admins can manage all programs"
  ON public.workout_programs FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_workout_programs_updated_at
  BEFORE UPDATE ON public.workout_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. program_schedules: schede dentro un programma
CREATE TABLE public.program_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Lun ... 7=Dom
  week_offset INTEGER NOT NULL DEFAULT 0 CHECK (week_offset >= 0), -- 0 = ripeti ogni settimana, oppure settimana specifica
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_schedules_program ON public.program_schedules(program_id);
CREATE INDEX idx_program_schedules_template ON public.program_schedules(template_id);

ALTER TABLE public.program_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PT can manage schedules of own programs"
  ON public.program_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_programs p
      WHERE p.id = program_schedules.program_id
        AND p.pt_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_programs p
      WHERE p.id = program_schedules.program_id
        AND p.pt_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all program schedules"
  ON public.program_schedules FOR ALL
  USING (public.is_admin(auth.uid()));

-- 3. program_assignments: assegnazione di un programma a un atleta
CREATE TYPE public.program_assignment_status AS ENUM ('active', 'completed', 'cancelled', 'paused');

CREATE TABLE public.program_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE RESTRICT,
  pt_user_id UUID NOT NULL,
  atleta_user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  weeks_generated INTEGER NOT NULL DEFAULT 0,
  status public.program_assignment_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_assignments_pt ON public.program_assignments(pt_user_id);
CREATE INDEX idx_program_assignments_atleta ON public.program_assignments(atleta_user_id);
CREATE INDEX idx_program_assignments_program ON public.program_assignments(program_id);

ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PT can manage own program assignments"
  ON public.program_assignments FOR ALL
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()))
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Atleta can view own program assignments"
  ON public.program_assignments FOR SELECT
  USING (auth.uid() = atleta_user_id);

CREATE POLICY "Admins can manage all program assignments"
  ON public.program_assignments FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_program_assignments_updated_at
  BEFORE UPDATE ON public.program_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();