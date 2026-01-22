-- =====================================================
-- PUSH SUBSCRIPTIONS TABLE - Per Web Push notifications
-- =====================================================
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can read all push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET - Per foto PT gallery
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pt-gallery',
  'pt-gallery',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies for PT gallery
CREATE POLICY "Anyone can view PT gallery images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pt-gallery');

CREATE POLICY "PT can upload own gallery images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pt-gallery' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.is_pt(auth.uid())
  );

CREATE POLICY "PT can update own gallery images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pt-gallery' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.is_pt(auth.uid())
  );

CREATE POLICY "PT can delete own gallery images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pt-gallery' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.is_pt(auth.uid())
  );

-- =====================================================
-- ADD gallery_photos TO pt_profiles
-- =====================================================
ALTER TABLE public.pt_profiles
ADD COLUMN IF NOT EXISTS gallery_photos TEXT[] DEFAULT '{}';

-- =====================================================
-- FUNCTION: Check if atleta can review PT
-- (must have completed at least one workout with this PT)
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_atleta_review_pt(_atleta_user_id UUID, _pt_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workouts
    WHERE atleta_user_id = _atleta_user_id
      AND pt_user_id = _pt_user_id
      AND status = 'completato'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.pt_reviews
    WHERE atleta_user_id = _atleta_user_id
      AND pt_user_id = _pt_user_id
  )
$$;

-- Enable realtime for push_subscriptions (for debugging)
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;