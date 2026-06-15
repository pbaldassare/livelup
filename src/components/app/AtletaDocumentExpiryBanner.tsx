import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, FileText } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// =====================================================
// Banner riepilogo scadenze documenti dell'atleta.
// Mostrato in cima alla home/profilo quando ci sono documenti
// scaduti o in scadenza nei prossimi 30 giorni.
// =====================================================

export function AtletaDocumentExpiryBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['atleta-doc-expiry', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_documents')
        .select('id, title, expiry_date')
        .eq('atleta_user_id', user!.id)
        .not('expiry_date', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!data || data.length === 0) return null;

  const now = new Date();
  const expired = data.filter(d => differenceInDays(new Date(d.expiry_date!), now) < 0);
  const soon = data.filter(d => {
    const days = differenceInDays(new Date(d.expiry_date!), now);
    return days >= 0 && days <= 30;
  });

  if (expired.length === 0 && soon.length === 0) return null;

  return (
    <div className="px-4 pt-3">
      <button
        type="button"
        onClick={() => navigate('/app/documenti')}
        className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-left flex items-start gap-3 hover:bg-amber-500/15 transition"
      >
        <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-200">
            {expired.length > 0
              ? `${expired.length} document${expired.length === 1 ? 'o scaduto' : 'i scaduti'}`
              : `${soon.length} document${soon.length === 1 ? 'o in scadenza' : 'i in scadenza'}`}
          </p>
          <p className="text-xs text-amber-100/80 mt-0.5 line-clamp-1">
            {(expired[0] || soon[0])?.title} — tocca per gestire i tuoi documenti
          </p>
        </div>
        <FileText className="h-4 w-4 text-amber-300/80 mt-0.5" />
      </button>
    </div>
  );
}

export default AtletaDocumentExpiryBanner;
