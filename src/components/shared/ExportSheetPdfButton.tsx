import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mapTemplateToSheet } from '@/lib/pdf/mapTemplateToSheet';
import { mapWorkoutToSheet } from '@/lib/pdf/mapWorkoutToSheet';
import { downloadWorkoutSheetPdf } from '@/lib/pdf/buildWorkoutSheetPdf';

// =====================================================
// Export PDF scheda — template PT o workout atleta
// =====================================================

type ExportSheetPdfButtonProps = {
  mode: 'template' | 'workout';
  templateId?: string;
  workoutId?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon' | 'lg';
  className?: string;
  /** Solo icona (utile in header mobile) */
  iconOnly?: boolean;
};

export function ExportSheetPdfButton({
  mode,
  templateId,
  workoutId,
  label,
  variant = 'outline',
  size = 'sm',
  className,
  iconOnly = false,
}: ExportSheetPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const resolvedLabel =
    label ?? (mode === 'workout' ? 'Scarica scheda' : 'Esporta PDF');

  const handleExport = async () => {
    if (loading) return;
    if (mode === 'template' && !templateId) {
      toast.error('Template non disponibile');
      return;
    }
    if (mode === 'workout' && !workoutId) {
      toast.error('Allenamento non disponibile');
      return;
    }

    setLoading(true);
    try {
      const dto =
        mode === 'template'
          ? await mapTemplateToSheet(templateId!)
          : await mapWorkoutToSheet(workoutId!);

      downloadWorkoutSheetPdf(dto);
      toast.success('PDF scaricato');
    } catch (err: any) {
      const message =
        err?.message ||
        (typeof err === 'string' ? err : 'Impossibile generare il PDF');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? 'icon' : size}
      className={cn(className)}
      onClick={handleExport}
      disabled={loading}
      aria-label={resolvedLabel}
      title={resolvedLabel}
    >
      {loading ? (
        <Loader2 className={cn('h-4 w-4 animate-spin', !iconOnly && 'mr-2')} />
      ) : (
        <FileDown className={cn('h-4 w-4', !iconOnly && 'mr-2')} />
      )}
      {!iconOnly && (loading ? 'Generazione…' : resolvedLabel)}
    </Button>
  );
}
