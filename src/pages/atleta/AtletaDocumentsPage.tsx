import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Lock } from 'lucide-react';
import { DocumentsTab } from '@/components/pt/athlete-detail/DocumentsTab';

// =====================================================
// Atleta — pagina Documenti.
// Blocchi funzionali:
// - Abbonamento BLOCCATO  → sola lettura
// - Profilo SOSPESO       → sola lettura
// - Stati attivo/pending/premium → pieno accesso
// =====================================================

export default function AtletaDocumentsPage() {
  const { user } = useAuth();
  const { profile } = useAtletaStatus();
  const navigate = useNavigate();

  const { data: subscriptionBlocked } = useQuery({
    queryKey: ['atleta-sub-block', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('check_subscription_block', { _user_id: user.id });
      return !!data;
    },
    enabled: !!user?.id,
  });

  if (!user) return null;

  const isSuspended = profile?.status === 'sospeso';
  const isLocked = subscriptionBlocked || isSuspended;

  return (
    <div className="min-h-screen bg-app-background pb-24 text-app-text">
      <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/profile')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-app-accent" />
          <h1 className="text-lg font-semibold">Documenti</h1>
        </div>
      </div>

      {isLocked && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3">
          <Lock className="h-4 w-4 text-amber-400 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-semibold">Caricamento disabilitato</p>
            <p className="text-xs text-amber-100/80">
              {isSuspended
                ? 'Il tuo profilo è temporaneamente sospeso. Contatta il tuo PT.'
                : 'Abbonamento bloccato — i documenti sono in sola lettura.'}
            </p>
          </div>
        </div>
      )}

      <div className="p-4">
        <DocumentsTab atletaUserId={user.id} selfMode readOnly={isLocked} />
      </div>
    </div>
  );
}
