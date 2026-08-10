-- Ensure 3 system categories exist by slug (compatible with Lovable schema)
INSERT INTO public.pt_athlete_categories (pt_user_id, name, slug, is_system)
SELECT NULL, v.name, v.slug, true
FROM (
  VALUES
    ('In presenza', 'in_presenza'),
    ('Online', 'online'),
    ('Mix', 'mix')
) AS v(name, slug)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pt_athlete_categories c
  WHERE c.is_system = true
    AND c.slug = v.slug
);
