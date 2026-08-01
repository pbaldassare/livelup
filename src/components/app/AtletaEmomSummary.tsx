// =====================================================
// EMOM SUMMARY (Atleta)
// Vista semplificata e leggibile dell'EMOM a blocchi.
// - Mostra: titolo "EMOM N Round da X"" + lista blocchi/esercizi.
// - NON mostra dati tecnici (ladder, mode, ecc).
// - Se EMOM è in versione legacy (nessun blocks[]), non viene renderizzato.
// =====================================================

import { Timer } from 'lucide-react';
import { normalizeEmomParams, formatRoundDurationSeconds } from '@/lib/protocols/emom';
import { formatProtocolTargetLabel } from '@/lib/protocols/exerciseTarget';
import { formatLoadLabel } from '@/lib/loadPrescription';

interface AtletaEmomSummaryProps {
  params: Record<string, unknown> | null | undefined;
  fallbackName?: string;
}

export function AtletaEmomSummary({ params, fallbackName }: AtletaEmomSummaryProps) {
  // Se non c'è alcun blocks[] originale → versione legacy → non mostrare nulla
  // (la UI esistente continua a mostrare reps/durata come prima).
  const raw = (params ?? {}) as Record<string, unknown>;
  const hasBlocks = Array.isArray(raw.blocks) && (raw.blocks as unknown[]).length > 0;
  if (!hasBlocks) return null;

  const emom = normalizeEmomParams(raw, fallbackName);

  return (
    <div className="rounded-2xl border border-app-border/70 bg-app-card/60 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-app-accent/15 flex items-center justify-center shrink-0">
          <Timer className="h-5 w-5 text-app-accent" />
        </div>
        <h3 className="text-lg font-black text-app-foreground leading-tight">
          EMOM {emom.rounds} Round da {formatRoundDurationSeconds(emom.round_duration)}
        </h3>
      </div>

      <div className="space-y-3">
        {emom.blocks.map((block, idx) => {
          const label = block.label?.trim() || `Blocco ${idx + 1}`;
          return (
            <div key={block.id} className="rounded-xl bg-app-muted/40 p-3">
              <p className="text-sm font-bold text-app-foreground mb-2">{label}</p>
              <ul className="space-y-1">
                {block.exercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="flex items-baseline gap-2 text-sm text-app-foreground/90"
                  >
                    <span className="text-app-accent">•</span>
                    <span className="flex-1">
                      <span className="font-semibold">
                        {ex.name?.trim() || fallbackName || 'Esercizio'}
                      </span>
                      <span className="text-app-muted-foreground">
                        {' '}
                        {formatProtocolTargetLabel(ex)}
                        {' · '}
                        {formatLoadLabel(ex)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-app-muted-foreground italic text-center pt-1">
        Alterni i blocchi ad ogni suono del timer
      </p>
    </div>
  );
}
