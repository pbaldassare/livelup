-- Create event_comments table for comments on public events
CREATE TABLE public.event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view comments on public events"
  ON public.event_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM calendar_events 
    WHERE id = event_id AND is_public = true
  ));

CREATE POLICY "Authenticated users can add comments"
  ON public.event_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.event_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.event_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_event_comments_event_id ON public.event_comments(event_id);
CREATE INDEX idx_event_comments_created_at ON public.event_comments(created_at DESC);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_comments;