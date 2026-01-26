-- Create event_participants table to track event registrations
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'registered',
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own registrations"
  ON public.event_participants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view event participants"
  ON public.event_participants FOR SELECT
  USING (true);

-- Add index for better performance
CREATE INDEX idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON public.event_participants(user_id);