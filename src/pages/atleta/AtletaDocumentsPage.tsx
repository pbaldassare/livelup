import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { DocumentsTab } from '@/components/pt/athlete-detail/DocumentsTab';

// =====================================================
// Atleta — pagina Documenti (visione + upload propri).
// Stesso componente usato lato PT, in modalita' "selfMode".
// =====================================================

export default function AtletaDocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

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

      <div className="p-4">
        <DocumentsTab atletaUserId={user.id} selfMode />
      </div>
    </div>
  );
}
