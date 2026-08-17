ALTER TABLE public.pt_course_steps
  ADD COLUMN IF NOT EXISTS video_urls TEXT[];

UPDATE public.pt_course_steps
SET video_urls = ARRAY[video_url]
WHERE video_url IS NOT NULL
  AND btrim(video_url) <> ''
  AND (video_urls IS NULL OR cardinality(video_urls) = 0);

UPDATE public.pt_course_steps
SET video_url = video_urls[1]
WHERE video_urls IS NOT NULL
  AND cardinality(video_urls) > 0
  AND (video_url IS NULL OR btrim(video_url) = '' OR video_url IS DISTINCT FROM video_urls[1]);

COMMENT ON COLUMN public.pt_course_steps.video_urls IS
  'Elenco URL video per step_type = video (ordine di visualizzazione).';
COMMENT ON COLUMN public.pt_course_steps.video_url IS
  'URL video primario (primo di video_urls) per compatibilità con client legacy.';