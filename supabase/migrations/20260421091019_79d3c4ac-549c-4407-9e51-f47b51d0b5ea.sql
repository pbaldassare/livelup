-- Aggiunge protocol_type e protocol_params su template_exercises
ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS protocol_type text NOT NULL DEFAULT 'SET',
  ADD COLUMN IF NOT EXISTS protocol_params jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Aggiunge protocol_type e protocol_params su workout_exercises
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS protocol_type text NOT NULL DEFAULT 'SET',
  ADD COLUMN IF NOT EXISTS protocol_params jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Migra dati esistenti: copia type/params dal blocco padre verso l'esercizio (template)
UPDATE public.template_exercises te
SET 
  protocol_type = COALESCE(NULLIF(tb.type::text, ''), 'SET'),
  protocol_params = COALESCE(tb.params, '{}'::jsonb)
FROM public.template_blocks tb
WHERE te.block_id = tb.id
  AND te.protocol_type = 'SET'
  AND te.protocol_params = '{}'::jsonb;

-- Migra dati esistenti: copia type/params dal blocco padre verso l'esercizio (workout)
UPDATE public.workout_exercises we
SET 
  protocol_type = COALESCE(NULLIF(wb.type::text, ''), 'SET'),
  protocol_params = COALESCE(wb.params, '{}'::jsonb)
FROM public.workout_blocks wb
WHERE we.block_id = wb.id
  AND we.protocol_type = 'SET'
  AND we.protocol_params = '{}'::jsonb;

-- Indici di supporto
CREATE INDEX IF NOT EXISTS idx_template_exercises_protocol_type ON public.template_exercises(protocol_type);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_protocol_type ON public.workout_exercises(protocol_type);