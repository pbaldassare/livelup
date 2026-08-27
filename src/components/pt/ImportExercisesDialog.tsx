import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  classifyExerciseImportRows,
  downloadExerciseImportTemplate,
  parseExerciseImportFile,
  type ExerciseImportIssue,
  type ExerciseImportPreviewRow,
  type ExerciseImportRow,
} from '@/lib/exerciseImport';
import { EXERCISE_ARCHIVE_CATEGORIES, EXERCISE_MUSCLE_GROUPS } from '@/lib/exerciseArchiveCategories';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

interface ImportExercisesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compact?: boolean;
}

const difficultyColor = (level: string) => {
  switch (level) {
    case 'principiante':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'intermedio':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'avanzato':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
    default:
      return '';
  }
};

export function ImportExercisesDialog({ open, onOpenChange, compact = false }: ImportExercisesDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [issues, setIssues] = useState<ExerciseImportIssue[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [formatNote, setFormatNote] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExerciseImportPreviewRow[] | null>(null);

  const toImportCount = preview?.filter((r) => r.status === 'import').length ?? 0;
  const skipCount = preview?.filter((r) => r.status === 'skip_duplicate').length ?? 0;
  const showingPreview = preview !== null;

  const reset = () => {
    setIssues([]);
    setSummary(null);
    setFileName(null);
    setPreview(null);
    setFormatNote(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    if (!user?.id) {
      toast.error('Sessione scaduta: ricarica la pagina e accedi di nuovo.');
      return;
    }
    setBusy(true);
    setIssues([]);
    setSummary(null);
    setPreview(null);
    setFormatNote(null);
    setFileName(file.name);
    await new Promise((r) => window.setTimeout(r, 30));
    try {
      const parsed = await parseExerciseImportFile(file);
      let existingNames: string[] = [];
      try {
        const { data: existing, error: existErr } = await supabase
          .from('exercises')
          .select('name')
          .eq('created_by', user.id)
          .eq('is_public', false)
          .limit(4000);
        if (!existErr) existingNames = (existing ?? []).map((e) => e.name);
      } catch {
        /* anteprima anche se l'elenco esistenti non risponde */
      }

      const classified = classifyExerciseImportRows(parsed.rows, existingNames);
      setPreview(classified.preview);
      setIssues(parsed.issues);
      setFormatNote(parsed.formatNote ?? null);

      if (classified.preview.length === 0 && parsed.issues.length === 0) {
        toast.message('Nessuna riga da importare nel file');
      }
    } catch (err) {
      setPreview([]);
      toast.error(err instanceof Error ? err.message : 'Lettura file non riuscita');
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!user?.id || !preview) return;
    const rows: ExerciseImportRow[] = preview.filter((r) => r.status === 'import');
    if (rows.length === 0) {
      toast.message('Nessun esercizio nuovo da importare');
      return;
    }

    setImporting(true);
    try {
      const { data: catalogs } = await sb
        .from('exercise_catalogs')
        .select('id, name')
        .eq('pt_user_id', user.id);
      const catalogByName = new Map<string, string>(
        ((catalogs ?? []) as { id: string; name: string }[]).map((c) => [c.name.trim().toLowerCase(), c.id]),
      );

      let imported = 0;
      const rowIssues: ExerciseImportIssue[] = [];

      for (const row of rows) {
        const { data: created, error } = await supabase
          .from('exercises')
          .insert({
            name: row.nome.trim(),
            category: row.categoria,
            muscle_groups: row.muscoli,
            difficulty_level: row.difficolta,
            video_url: row.video_url,
            description: row.descrizione,
            instructions: row.istruzioni,
            created_by: user.id,
            is_public: false,
          })
          .select('id')
          .single();
        if (error || !created) {
          rowIssues.push({ line: row.line, message: error?.message || 'Salvataggio fallito' });
          continue;
        }

        imported++;

        const catalogName = row.catalogo_pt?.trim();
        if (catalogName) {
          let catalogId = catalogByName.get(catalogName.toLowerCase());
          if (!catalogId) {
            const { data: cat, error: catErr } = await sb
              .from('exercise_catalogs')
              .insert({ pt_user_id: user.id, name: catalogName, emoji: '🗂️' })
              .select('id, name')
              .single();
            if (!catErr && cat) {
              catalogId = cat.id;
              catalogByName.set(catalogName.toLowerCase(), cat.id);
            }
          }
          if (catalogId) {
            await sb.from('exercise_catalog_items').insert({
              exercise_id: created.id,
              catalog_id: catalogId,
            });
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['pt-exercises-archive'] });
      await queryClient.invalidateQueries({ queryKey: ['pt-exercise-catalogs'] });
      await queryClient.invalidateQueries({ queryKey: ['pt-all-catalog-items'] });
      setIssues(rowIssues);
      setSummary(`Importati ${imported} · saltati ${skipCount} (già presenti) · errori ${rowIssues.length}`);
      setPreview(null);
      if (imported > 0) toast.success(`Importati ${imported} esercizi in I miei`);
      else if (skipCount > 0 && rowIssues.length === 0) toast.message('Nessun esercizio nuovo da importare');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import non riuscito');
    } finally {
      setImporting(false);
    }
  };

  const locked = busy || importing;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          'w-[calc(100%-1.5rem)] max-h-[calc(100vh-2rem)] overflow-y-auto',
          showingPreview ? 'max-w-3xl' : 'max-w-lg',
          compact && 'p-4',
        )}
      >
        <DialogHeader>
          <DialogTitle>Importa esercizi da Excel</DialogTitle>
          <DialogDescription className="text-left space-y-2 pt-1">
            {showingPreview ? (
              <span className="block">
                Controlla come verranno importati gli esercizi in I miei, poi conferma. I nomi già presenti vengono saltati.
                {formatNote ? ` ${formatNote}` : ''}
              </span>
            ) : (
              <>
                <span className="block">
                  Scarica il template Excel, compilalo (una riga = un esercizio) e ricarica il file .xlsx. Non serve convertirlo in CSV.
                </span>
                <span className="block">
                  <strong>Obbligatori:</strong> nome, categoria. Muscoli opzionale.
                </span>
                <span className="block">
                  Categorie Livelapp: {EXERCISE_ARCHIVE_CATEGORIES.slice(0, 4).join(', ')}, …{' '}
                  {EXERCISE_ARCHIVE_CATEGORIES[EXERCISE_ARCHIVE_CATEGORIES.length - 1]}. Muscoli: {EXERCISE_MUSCLE_GROUPS.slice(0, 3).join(', ')}, …
                </span>
                <span className="block">Video: solo link YouTube o Vimeo. Gli esercizi vanno in I miei, non nell'archivio generale.</span>
                <span className="block">Se compilate catalogo_pt, li raggruppiamo nelle vostre cartelle.</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {showingPreview && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {fileName ? `${fileName} · ` : ''}
              {toImportCount} da importare · {skipCount} già presenti / saltati · {issues.length} errori
            </p>
            {preview.length > 0 ? (
              <div className={cn('rounded-md border overflow-auto', compact ? 'max-h-[40vh]' : 'max-h-[min(44vh,360px)]')}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Difficoltà</TableHead>
                      <TableHead className={cn(compact && 'hidden')}>Categoria</TableHead>
                      <TableHead className={cn(compact && 'hidden')}>Muscoli</TableHead>
                      <TableHead className={cn(compact && 'hidden')}>Video</TableHead>
                      <TableHead className={cn(compact && 'hidden')}>Catalogo</TableHead>
                      {!compact && <TableHead className="hidden lg:table-cell">Descrizione</TableHead>}
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 80).map((row) => {
                      const skipped = row.status === 'skip_duplicate';
                      return (
                        <TableRow
                          key={`${row.line}-${row.nome}`}
                          className={cn(skipped && 'opacity-60')}
                        >
                          <TableCell>
                            <div className="font-medium">{row.nome}</div>
                            {compact && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {[row.categoria, row.muscoli.join(', '), row.catalogo_pt].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.difficolta && row.difficolta !== 'nessuno' ? (
                              <Badge variant="outline" className={difficultyColor(row.difficolta)}>
                                {row.difficolta}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className={cn(compact && 'hidden')}>
                            <Badge variant="secondary">{row.categoria}</Badge>
                          </TableCell>
                          <TableCell className={cn(compact && 'hidden')}>
                            {row.muscoli.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.muscoli.slice(0, 3).map((mg) => (
                                  <Badge key={mg} variant="outline" className="text-xs">{mg}</Badge>
                                ))}
                                {row.muscoli.length > 3 && (
                                  <Badge variant="outline" className="text-xs">+{row.muscoli.length - 3}</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className={cn('text-xs text-muted-foreground max-w-[9rem] truncate', compact && 'hidden')}>
                            {row.video_url || '—'}
                          </TableCell>
                          <TableCell className={cn('text-sm', compact && 'hidden')}>
                            {row.catalogo_pt || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          {!compact && (
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-[10rem] truncate">
                              {row.descrizione || '—'}
                            </TableCell>
                          )}
                          <TableCell>
                            {skipped ? (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 whitespace-nowrap">
                                già presente / saltato
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 whitespace-nowrap bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              >
                                da importare
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {preview.length > 80 && (
                  <p className="text-xs text-muted-foreground p-2 border-t">
                    Anteprima delle prime 80 righe su {preview.length}. All&apos;import vanno tutte.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
                Nessuna riga valida da mostrare. Controlla gli errori sotto e ricarica il file.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={downloadExerciseImportTemplate} disabled={locked}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Scarica template
          </Button>
          <Button
            type="button"
            variant={showingPreview ? 'outline' : 'default'}
            className="w-full sm:flex-1"
            onClick={() => inputRef.current?.click()}
            disabled={locked}
          >
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {showingPreview ? 'Cambia file' : 'Carica file compilato'}
          </Button>
          {showingPreview && (
            <Button
              type="button"
              className="w-full sm:flex-1"
              onClick={() => void confirmImport()}
              disabled={locked || toImportCount === 0}
            >
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Conferma import
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleFile(file);
            }}
          />
        </div>

        {summary && <p className="text-sm font-medium">{summary}</p>}
        {issues.length > 0 && (
          <ul className="max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs space-y-1">
            {issues.slice(0, 40).map((issue, i) => (
              <li key={`${issue.line}-${i}`}>
                Riga {issue.line}: {issue.message}
              </li>
            ))}
            {issues.length > 40 && <li>… e altre {issues.length - 40} righe</li>}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
