-- Add 'nessuno' as a valid fitness_level enum value
ALTER TYPE public.fitness_level ADD VALUE IF NOT EXISTS 'nessuno';

-- Update exercises default to 'nessuno'
ALTER TABLE public.exercises ALTER COLUMN difficulty_level SET DEFAULT 'nessuno';
