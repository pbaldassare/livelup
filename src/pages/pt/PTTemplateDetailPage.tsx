import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { TemplateBlockBuilder } from '@/components/pt/TemplateBlockBuilder';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  ArrowLeft,
  Clock,
  BarChart3,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// PT TEMPLATE DETAIL PAGE
// Dettaglio template con gestione esercizi
// =====================================================

export function PTTemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch template
  const { data: template, isLoading } = useQuery({
    queryKey: ['pt-template-detail', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .eq('pt_user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!templateId && !!user?.id,
  });

  // Fetch template exercise count
  const { data: exerciseCount = 0 } = useQuery({
    queryKey: ['template-exercise-count', templateId],
    queryFn: async () => {
      if (!templateId) return 0;

      const { count, error } = await supabase
        .from('template_exercises')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', templateId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!templateId,
  });

  if (isLoading) {
    return <PageLoader text="Caricamento template..." />;
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Template non trovato</p>
        <Button variant="link" onClick={() => navigate('/pt/workouts')}>
          Torna ai template
        </Button>
      </div>
    );
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'principiante': return 'bg-success/10 text-success';
      case 'intermedio': return 'bg-warning/10 text-warning';
      case 'avanzato': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title={template.title}
        subtitle="Gestisci gli esercizi del template"
        icon={<FileText className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/pt' },
          { label: 'Allenamenti', href: '/pt/workouts' },
          { label: template.title },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate('/pt/workouts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Template Info Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Difficoltà</p>
              <Badge className={getDifficultyColor(template.difficulty_level)}>
                {template.difficulty_level}
              </Badge>
            </div>

            {template.category && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Categoria</p>
                <Badge variant="outline">{template.category}</Badge>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Durata stimata
              </p>
              <p className="font-medium">
                {template.estimated_duration ? `${template.estimated_duration} min` : 'N/A'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Esercizi
              </p>
              <p className="font-medium">{exerciseCount} esercizi</p>
            </div>

            <Separator />

            {template.description && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Descrizione</p>
                <p className="text-sm">{template.description}</p>
              </div>
            )}

            {template.tags && template.tags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="text-xs text-muted-foreground">
              <p>Creato il {format(new Date(template.created_at), 'dd MMM yyyy', { locale: it })}</p>
              <p>Aggiornato il {format(new Date(template.updated_at), 'dd MMM yyyy', { locale: it })}</p>
            </div>
          </CardContent>
        </Card>

        {/* Exercise Builder */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Blocchi e protocolli</CardTitle>
            <CardDescription>
              Costruisci la scheda usando blocchi (protocolli). Ogni blocco contiene uno o più esercizi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateBlockBuilder templateId={template.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PTTemplateDetailPage;
