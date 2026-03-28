
-- Create event_types table (managed by admin)
CREATE TABLE public.event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage event_types" ON public.event_types FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can view active event_types" ON public.event_types FOR SELECT TO authenticated USING (is_active = true);

-- Seed initial event types
INSERT INTO public.event_types (name, description, sort_order) VALUES
  ('Raduno', 'Incontro di gruppo', 1),
  ('Evento', 'Evento generico', 2),
  ('Gara', 'Competizione sportiva', 3),
  ('Allenamento', 'Sessione di allenamento', 4),
  ('Altro', 'Altro tipo di evento', 5);

-- Add new columns to calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN event_type_id uuid REFERENCES public.event_types(id),
  ADD COLUMN visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN is_closed_number boolean NOT NULL DEFAULT false,
  ADD COLUMN max_participants integer;
