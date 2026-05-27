import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ACCEPTED_EXT = ['.pdf', '.xlsx'];

interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze?: (file: File) => void | Promise<void>;
  isLoading?: boolean;
}

export function ImportTemplateDialog({
  open,
  onOpenChange,
  onAnalyze,
  isLoading = false,
}: ImportTemplateDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = useCallback((f: File | null | undefined) => {
    if (!f) return;
    const isAcceptedMime = ACCEPTED_MIME.includes(f.type);
    const isAcceptedExt = ACCEPTED_EXT.some((ext) =>
      f.name.toLowerCase().endsWith(ext)
    );
    if (!isAcceptedMime && !isAcceptedExt) {
      toast.error('Formato non supportato. Usa PDF o Excel (.xlsx)');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      toast.error('File troppo grande. La dimensione massima è 10 MB');
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;
    const f = e.dataTransfer.files?.[0];
    validateAndSet(f);
  };

  const handleClose = (next: boolean) => {
    if (!next && isLoading) return;
    if (!next) setFile(null);
    onOpenChange(next);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Importa scheda da file</DialogTitle>
          <DialogDescription>
            Carica una scheda esistente in PDF o Excel e lasciala interpretare dall'AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => validateAndSet(e.target.files?.[0])}
            disabled={isLoading}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isLoading) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              disabled={isLoading}
              className={cn(
                'w-full rounded-xl border-2 border-dashed p-8 transition-all flex flex-col items-center justify-center gap-3 text-center',
                'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50',
                isDragging && 'border-primary bg-primary/10 scale-[1.01]',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Trascina qui il file o clicca per selezionarlo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF o Excel (.xlsx) — max 10 MB
                </p>
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFile(null)}
                disabled={isLoading}
                className="shrink-0"
                title="Rimuovi file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground italic text-center">
            L'AI interpreterà la scheda — potrai correggere prima di salvare
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button
            onClick={() => file && onAnalyze?.(file)}
            disabled={!file || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analizza con AI
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
