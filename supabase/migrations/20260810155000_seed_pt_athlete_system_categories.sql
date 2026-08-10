-- Ensure the 3 system athlete categories exist (idempotent re-seed)
INSERT INTO public.pt_athlete_categories (id, pt_user_id, name, slug, color, sort_order, is_system, is_active)
VALUES
  ('a1111111-1111-4111-8111-111111111101', NULL, 'In presenza', 'in_presenza', NULL, 10, true, true),
  ('a1111111-1111-4111-8111-111111111102', NULL, 'Online', 'online', NULL, 20, true, true),
  ('a1111111-1111-4111-8111-111111111103', NULL, 'Mix', 'mix', NULL, 30, true, true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  sort_order = EXCLUDED.sort_order,
  is_system = true,
  is_active = true,
  pt_user_id = NULL,
  updated_at = now();
