import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { StickyNote, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// Atleta: vede SOLO le note che il PT ha esplicitamente
// condiviso (pt_athlete_notes.is_shared_with_athlete=true).
// RLS lato DB garantisce il filtro.
// =====================================================

export function AtletaSharedPTNotes() {
  const { user } = useAuth();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['atleta-shared-notes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_athlete_notes')
        .select('id, title, body, tag, created_at')
        .eq('atleta_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) return null;
  if (notes.length === 0) return null;

  return (
    <div className="px-4 pt-2">
      <div className="rounded-2xl bg-app-card border border-app-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="h-4 w-4 text-app-accent" />
          <h3 className="font-semibold text-app-text">Note dal tuo PT</h3>
          <Badge variant="outline" className="ml-auto text-xs">{notes.length}</Badge>
        </div>
        <div className="space-y-3">
          {notes.map((n: any) => (
            <div key={n.id} className="rounded-xl bg-app-background/50 border border-app-border p-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {n.tag && <Badge variant="outline" className="text-[10px] capitalize">{n.tag}</Badge>}
                <span className="text-[11px] text-app-text-muted">
                  {format(new Date(n.created_at), 'dd MMM yyyy', { locale: it })}
                </span>
              </div>
              {n.title && <p className="font-semibold text-sm text-app-text">{n.title}</p>}
              <p className="text-sm whitespace-pre-wrap text-app-text/90">{n.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AtletaSharedPTNotes;
