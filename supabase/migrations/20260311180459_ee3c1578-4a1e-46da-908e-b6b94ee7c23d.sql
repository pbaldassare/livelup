
-- =====================================================
-- GAMIFICATION: Badge trigger + seed data
-- =====================================================

-- 1. Function to check and award badges after workout completion
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  completed_count INTEGER;
  streak_weeks INTEGER;
  badge_record RECORD;
BEGIN
  -- Only trigger when workout is marked as completed
  IF NEW.status = 'completato' AND (OLD.status IS NULL OR OLD.status != 'completato') THEN
    
    -- Count total completed workouts
    SELECT COUNT(*)::INTEGER INTO completed_count
    FROM public.workouts
    WHERE atleta_user_id = NEW.atleta_user_id
      AND status = 'completato';

    -- Get weekly streak
    SELECT current_streak INTO streak_weeks
    FROM public.get_weekly_workout_stats(NEW.atleta_user_id);

    -- Check each active badge criteria
    FOR badge_record IN
      SELECT id, criteria FROM public.badges WHERE is_active = true
    LOOP
      -- Skip if already earned
      IF EXISTS (
        SELECT 1 FROM public.atleta_badges
        WHERE atleta_user_id = NEW.atleta_user_id AND badge_id = badge_record.id
      ) THEN
        CONTINUE;
      END IF;

      -- Check criteria type
      IF (badge_record.criteria->>'type') = 'workouts_completed' 
         AND completed_count >= (badge_record.criteria->>'count')::INTEGER THEN
        
        INSERT INTO public.atleta_badges (atleta_user_id, badge_id)
        VALUES (NEW.atleta_user_id, badge_record.id);

        -- Create notification
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
          NEW.atleta_user_id,
          'badge',
          'Nuovo badge sbloccato! 🏆',
          (SELECT name FROM public.badges WHERE id = badge_record.id),
          jsonb_build_object('badge_id', badge_record.id)
        );

      ELSIF (badge_record.criteria->>'type') = 'streak_weeks'
         AND streak_weeks >= (badge_record.criteria->>'weeks')::INTEGER THEN
        
        INSERT INTO public.atleta_badges (atleta_user_id, badge_id)
        VALUES (NEW.atleta_user_id, badge_record.id);

        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
          NEW.atleta_user_id,
          'badge',
          'Nuovo badge sbloccato! 🏆',
          (SELECT name FROM public.badges WHERE id = badge_record.id),
          jsonb_build_object('badge_id', badge_record.id)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create trigger on workouts table
DROP TRIGGER IF EXISTS trigger_check_badges ON public.workouts;
CREATE TRIGGER trigger_check_badges
  AFTER UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges();

-- 3. Function to check cheer badges
CREATE OR REPLACE FUNCTION public.check_cheer_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cheer_badge_id UUID;
BEGIN
  -- Find "first cheer" badge
  SELECT id INTO cheer_badge_id
  FROM public.badges
  WHERE (criteria->>'type') = 'first_cheer' AND is_active = true
  LIMIT 1;

  IF cheer_badge_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.atleta_badges
    WHERE atleta_user_id = NEW.sender_user_id AND badge_id = cheer_badge_id
  ) THEN
    INSERT INTO public.atleta_badges (atleta_user_id, badge_id)
    VALUES (NEW.sender_user_id, cheer_badge_id);

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.sender_user_id,
      'badge',
      'Nuovo badge sbloccato! 🏆',
      (SELECT name FROM public.badges WHERE id = cheer_badge_id),
      jsonb_build_object('badge_id', cheer_badge_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create trigger on cheers table
DROP TRIGGER IF EXISTS trigger_check_cheer_badges ON public.cheers;
CREATE TRIGGER trigger_check_cheer_badges
  AFTER INSERT ON public.cheers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cheer_badges();
