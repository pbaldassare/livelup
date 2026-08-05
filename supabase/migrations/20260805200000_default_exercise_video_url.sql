-- =====================================================
-- Default demo video for all exercises without video_url
-- Per-exercise override resta su exercises.video_url (PT/admin).
-- =====================================================

UPDATE public.exercises
SET video_url = 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
WHERE video_url IS NULL
   OR btrim(video_url) = '';
