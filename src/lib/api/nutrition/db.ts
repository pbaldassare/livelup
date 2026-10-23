import { supabase } from '@/integrations/supabase/client';

/** Cast fino a rigenerazione types.ts da Lovable */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nutritionDb = () => supabase as any;
