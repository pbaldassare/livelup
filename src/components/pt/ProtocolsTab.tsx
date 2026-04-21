import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Sparkles } from 'lucide-react';
import { PROTOCOL_REGISTRY, type ProtocolType } from '@/lib/protocols/registry';

// =====================================================
// PROTOCOLS TAB (read-only)
// Tab informativa per il PT: spiega i protocolli disponibili.
// Per ora visibile solo SET. Gli altri sono mostrati come "In arrivo".
// Nessun CRUD: non modificabile / duplicabile / eliminabile.
// =====================================================

const VISIBLE_PROTOCOLS: ProtocolType[] = ['SET'];
const COMING_SOON_PROTOCOLS: ProtocolType[] = [
  'TOP_SET_BACKOFF',
  'RAMPING',
  'EMOM',
  'AMRAP',
];

interface ProtocolCardProps {
  type: ProtocolType;
  comingSoon?: boolean;
}

function ProtocolCard({ type, comingSoon = false }: ProtocolCardProps) {
  const def = PROTOCOL_REGISTRY[type];
  const Icon = def.icon;

  return (
    <Card
      className={
        comingSoon
          ? 'opacity-60 border-dashed cursor-not-allowed'
          : 'border-primary/20 hover:border-primary/40 transition-colors'
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={
                comingSoon
                  ? 'flex h-10 w-10 items-center justify-center rounded-lg bg-muted'
                  : 'flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'
              }
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">{def.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{def.athleteLabel}</p>
            </div>
          </div>
          {comingSoon ? (
            <Badge variant="outline" className="shrink-0">
              In arrivo
            </Badge>
          ) : (
            <Badge variant="default" className="shrink-0">
              Default
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{def.description}</p>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Parametri gestiti
          </p>
          <div className="flex flex-wrap gap-1.5">
            {def.paramFields.map((f) => (
              <Badge key={f.key} variant="secondary" className="font-normal">
                {f.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProtocolsTab() {
  return (
    <div className="space-y-6">
      {/* Banner informativo */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              I protocolli definiscono <em>come</em> si esegue ogni esercizio.
            </p>
            <p className="text-sm text-muted-foreground">
              Per ora è disponibile <strong>SET</strong>, applicato di default a ogni esercizio
              che aggiungi nelle schede. Nuovi protocolli (Top Set + Back Off, Ramping, EMOM,
              AMRAP) saranno introdotti prossimamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disponibili */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Disponibili</h2>
          <Badge variant="secondary">{VISIBLE_PROTOCOLS.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {VISIBLE_PROTOCOLS.map((t) => (
            <ProtocolCard key={t} type={t} />
          ))}
        </div>
      </section>

      {/* Prossimamente */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-muted-foreground">Prossimamente</h2>
          <Badge variant="outline">{COMING_SOON_PROTOCOLS.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {COMING_SOON_PROTOCOLS.map((t) => (
            <ProtocolCard key={t} type={t} comingSoon />
          ))}
        </div>
      </section>
    </div>
  );
}
