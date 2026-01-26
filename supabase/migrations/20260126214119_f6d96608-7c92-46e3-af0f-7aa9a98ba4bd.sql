-- Add notification_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences jsonb 
DEFAULT '{"messages":true,"workouts":true,"connections":true,"subscriptions":true,"purchases":true,"reviews":true,"badges":true,"calendar":true}'::jsonb;