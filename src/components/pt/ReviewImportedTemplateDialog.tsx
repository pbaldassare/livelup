import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save } from 'lucide-react';
import { TouchIntegerInput } from '@/components/pt/TouchIntegerInput';
import { MobileNotesField } from '@/components/pt/MobileNotesField';

export interface ImportedExercise {
  name: string;
  sets: number;
  reps: number | null;
  rest_seconds: number | null;
  protocol_type:
    | 'standard'
    | 'emom'
    | 'amrap'
    | 'superset'
    | 'hiit'
    | 'tabata';
  notes: string | null;
  protocol_config?: Record<string, unknown> | null;
}

export interface ImportedTemplate {
  template_name: string;
  exercises: ImportedExercise[];
}

interface ReviewImportedTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ImportedTemplate | null;
  onSave?: (data: ImportedTemplate) => void | Promise<void>;
  isSaving?: boolean;
}

const PROTOCOL_LABELS: Record<ImportedExercise['protocol_type'], string> = {
  standard: 'Standard',
  emom: 'EMOM',
  amrap: 'AMRAP',
  superset: 'Superserie',
  hiit: 'HIIT',
  tabata: 'Tabata',
};

const emptyExercise = (): ImportedExercise => ({
  name: '',
  sets: 3,
  reps: 10,
  rest_seconds: 60,
  protocol_type: 'standard',
  notes: null,
});

export function ReviewImportedTemplateDialog({
  open,
  onOpenChange,
  data,
  onSave,
  isSaving = false,
}: ReviewImportedTemplateDialogProps) {
  const [templateName, setTemplateName] = useState('');
  const [exercises, setExercises] = useState<ImportedExercise[]>([]);

  useEffect(() => {
    if (data) {
      setTemplateName(data.template_name || '');
      setExercises(data.exercises || []);
    }
  }, [data]);

  const updateExercise = (idx: number, patch: Partial<ImportedExercise>) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    );
  };

  const addExercise = () =>
    setExercises((prev) => [...prev, emptyExercise()]);

  const removeExercise = (idx: number) =>
    setExercises((prev) => prev.filter((_, i) => i !== idx));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isSaving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Revisione scheda importata</DialogTitle>
          <DialogDescription>
            Verifica e correggi i dati estratti dall'AI prima di salvare.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="imported-template-name">Nome scheda</Label>
            <Input
              id="imported-template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Es: Full Body Principiante"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Esercizi ({exercises.length})</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addExercise}
                disabled={isSaving}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi esercizio
              </Button>
            </div>

            {exercises.length === 0 && (
              <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Nessun esercizio. Aggiungine uno manualmente.
              </div>
            )}

            <div className="space-y-3">
              {exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-3 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={ex.name}
                        onChange={(e) =>
                          updateExercise(idx, { name: e.target.value })
                        }
                        placeholder="Nome esercizio"
                        disabled={isSaving}
                        className="font-medium"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {PROTOCOL_LABELS[ex.protocol_type] ?? ex.protocol_type}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive shrink-0"
                      onClick={() => removeExercise(idx)}
                      disabled={isSaving}
                      title="Rimuovi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Serie
                      </Label>
                      <TouchIntegerInput
                        compact
                        min={1}
                        fallback={3}
                        value={ex.sets}
                        disabled={isSaving}
                        aria-label={`Serie ${ex.name || idx + 1}`}
                        onCommit={(n) => updateExercise(idx, { sets: n })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Ripetizioni
                      </Label>
                      <TouchIntegerInput
                        compact
                        min={0}
                        allowEmpty
                        fallback={10}
                        value={ex.reps}
                        disabled={isSaving}
                        aria-label={`Ripetizioni ${ex.name || idx + 1}`}
                        onCommit={(n) => updateExercise(idx, { reps: n })}
                        onEmptyCommit={() => updateExercise(idx, { reps: null })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Recupero (s)
                      </Label>
                      <TouchIntegerInput
                        compact
                        min={0}
                        allowEmpty
                        fallback={60}
                        value={ex.rest_seconds}
                        disabled={isSaving}
                        aria-label={`Recupero ${ex.name || idx + 1}`}
                        onCommit={(n) => updateExercise(idx, { rest_seconds: n })}
                        onEmptyCommit={() =>
                          updateExercise(idx, { rest_seconds: null })
                        }
                      />
                    </div>
                  </div>

                  <MobileNotesField
                    value={ex.notes ?? ''}
                    placeholder="Note..."
                    rows={3}
                    disabled={isSaving}
                    onChange={(raw) =>
                      updateExercise(idx, { notes: raw || null })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annulla
          </Button>
          <Button
            onClick={() =>
              onSave?.({ template_name: templateName, exercises })
            }
            disabled={isSaving || !templateName.trim() || exercises.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Salva scheda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
