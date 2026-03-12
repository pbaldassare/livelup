
-- 1. Bucket exercise-videos
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-videos', 'exercise-videos', true);

-- RLS for exercise-videos bucket
CREATE POLICY "PT can upload exercise videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-videos' AND
  public.is_pt(auth.uid())
);

CREATE POLICY "PT can update own exercise videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercise-videos' AND
  public.is_pt(auth.uid())
);

CREATE POLICY "PT can delete own exercise videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-videos' AND
  public.is_pt(auth.uid())
);

CREATE POLICY "Anyone can view exercise videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exercise-videos');

-- 2. Tabella blog_posts
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  slug TEXT,
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PT can manage own blog posts"
ON public.blog_posts FOR ALL
TO authenticated
USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()))
WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts FOR SELECT
TO public
USING (is_published = true);

CREATE POLICY "Admins can manage all blog posts"
ON public.blog_posts FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- 3. Tabelle courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  price NUMERIC DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  difficulty_level TEXT DEFAULT 'principiante',
  duration_minutes INTEGER,
  category TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage courses"
ON public.courses FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can view published courses"
ON public.courses FOR SELECT
TO public
USING (is_published = true);

CREATE TABLE public.course_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  video_url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course sessions"
ON public.course_sessions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can view sessions of published courses"
ON public.course_sessions FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM public.courses WHERE courses.id = course_sessions.course_id AND courses.is_published = true
));

CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress_pct INTEGER DEFAULT 0,
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own enrollments"
ON public.course_enrollments FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
ON public.course_enrollments FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 4. RLS for PT manual badge assignment
CREATE POLICY "PT can assign badges to connected athletes"
ON public.atleta_badges FOR INSERT
TO authenticated
WITH CHECK (
  public.is_pt(auth.uid()) AND
  public.are_connected(auth.uid(), atleta_user_id)
);
