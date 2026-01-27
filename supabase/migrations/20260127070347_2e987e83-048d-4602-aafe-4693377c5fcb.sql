-- Create cheers table for teammate encouragement
CREATE TABLE public.cheers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_user_id UUID NOT NULL,
  receiver_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Prevent self-cheering
  CONSTRAINT no_self_cheer CHECK (sender_user_id != receiver_user_id)
);

-- Create index for efficient querying
CREATE INDEX idx_cheers_receiver ON public.cheers(receiver_user_id, created_at DESC);
CREATE INDEX idx_cheers_sender ON public.cheers(sender_user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.cheers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Athletes can send cheers to teammates (same PT)
CREATE POLICY "Athletes can send cheers to teammates"
ON public.cheers
FOR INSERT
WITH CHECK (
  auth.uid() = sender_user_id 
  AND is_atleta(auth.uid())
  AND EXISTS (
    SELECT 1 FROM pt_atleta_connections c1
    JOIN pt_atleta_connections c2 ON c1.pt_user_id = c2.pt_user_id
    WHERE c1.atleta_user_id = auth.uid()
      AND c2.atleta_user_id = receiver_user_id
      AND c1.status = 'active'
      AND c2.status = 'active'
  )
);

-- Users can view cheers they sent or received
CREATE POLICY "Users can view own cheers"
ON public.cheers
FOR SELECT
USING (auth.uid() = sender_user_id OR auth.uid() = receiver_user_id);

-- Admins can manage all cheers
CREATE POLICY "Admins can manage all cheers"
ON public.cheers
FOR ALL
USING (is_admin(auth.uid()));

-- Enable realtime for cheers
ALTER PUBLICATION supabase_realtime ADD TABLE public.cheers;

-- Create function to count cheers received today
CREATE OR REPLACE FUNCTION public.count_today_cheers(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.cheers
  WHERE receiver_user_id = _user_id
    AND created_at >= CURRENT_DATE
$$;

-- Create function to get weekly workout stats
CREATE OR REPLACE FUNCTION public.get_weekly_workout_stats(_atleta_user_id uuid)
RETURNS TABLE(
  completed_this_week integer,
  current_streak integer,
  total_completed integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  week_start DATE;
  streak_count INTEGER := 0;
  last_date DATE;
  check_date DATE;
BEGIN
  -- Calculate start of current week (Monday)
  week_start := date_trunc('week', CURRENT_DATE)::DATE;
  
  -- Count completed this week
  SELECT COUNT(*)::INTEGER INTO completed_this_week
  FROM public.workouts
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'completato'
    AND completed_at >= week_start;
  
  -- Count total completed
  SELECT COUNT(*)::INTEGER INTO total_completed
  FROM public.workouts
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'completato';
  
  -- Calculate streak (consecutive weeks with at least one workout)
  streak_count := 0;
  check_date := week_start;
  
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.workouts
      WHERE atleta_user_id = _atleta_user_id
        AND status = 'completato'
        AND completed_at >= check_date
        AND completed_at < check_date + INTERVAL '7 days'
    ) THEN
      streak_count := streak_count + 1;
      check_date := check_date - INTERVAL '7 days';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  current_streak := streak_count;
  
  RETURN NEXT;
END;
$$;