import { Link } from 'react-router-dom';
import { PauseCircle, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  ptName?: string | null;
  className?: string;
}

/**
 * Mostrato all'atleta quando il PT ha messo in pausa la collaborazione
 * (pt_atleta_connections.is_pt_active = false): niente schede/storico,
 * ma la chat col PT resta disponibile.
 */
export function PtCoachingPausedCard({ ptName, className }: Props) {
  return (
    <Card className={cn('border-dashed bg-app-card border-app-border', className)}>
      <CardContent className="p-8 text-center">
        <PauseCircle className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
        <h3 className="font-semibold text-app-foreground mb-2">Collaborazione in pausa</h3>
        <p className="text-sm text-app-muted-foreground mb-4">
          {ptName
            ? `${ptName} ha messo in pausa la collaborazione: puoi ancora chattare col tuo PT.`
            : 'Puoi ancora chattare col tuo PT.'}
        </p>
        <Button
          className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
          asChild
        >
          <Link to="/app/chat">
            <MessageCircle className="h-4 w-4" />
            Apri la chat
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default PtCoachingPausedCard;
