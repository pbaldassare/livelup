import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Target, Calendar, Activity, FileText } from 'lucide-react';
import type { WizardData } from './types';

interface Props {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

export function Step1Info({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Crea il tuo programma</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Definisci gli obiettivi e i parametri di base. Le schede le aggiungerai dopo.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Nome programma <span className="text-destructive">*</span>
        </Label>
        <Input
          className="h-11"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Es: Forza 4 settimane, Bodyweight Beginner..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-primary" />
          Obiettivo del programma
        </Label>
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Per chi è pensato, cosa otterrà l'atleta..."
          className="min-h-[70px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Durata (settimane)
          </Label>
          <Input
            className="h-11"
            type="number"
            min={1}
            max={52}
            value={data.durationWeeks}
            onChange={(e) =>
              onChange({ durationWeeks: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Livello atleta
          </Label>
          <Select
            value={data.athleteLevel}
            onValueChange={(v) => onChange({ athleteLevel: v as WizardData['athleteLevel'] })}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualsiasi livello</SelectItem>
              <SelectItem value="beginner">Principiante</SelectItem>
              <SelectItem value="intermediate">Intermedio</SelectItem>
              <SelectItem value="advanced">Avanzato</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Note Coach (opzionale)
        </Label>
        <Textarea
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Indicazioni generali, focus, accorgimenti..."
          className="min-h-[60px]"
        />
      </div>
    </div>
  );
}
