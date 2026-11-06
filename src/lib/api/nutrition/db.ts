import { supabase } from '@/integrations/supabase/client';

/** Cast fino a rigenerazione `types.ts` da Supabase */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nutritionDb = () => supabase as any;
