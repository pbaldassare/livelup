import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  FileText, Upload, Trash2, Plus, AlertTriangle,
  CheckCircle2, Clock, Pencil, Lock, Eye, Download, Loader2,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// Documenti & Scadenze atleta.
// Bucket privato: athlete-documents. Path: <atletaUserId>/<uuid>.<ext>
// Visibile all'atleta proprietario, al PT collegato e admin.
// =====================================================

const DOC_TYPES = [
  { value: 'visita_medica', label: 'Visita medica' },
  { value: 'certificato_agonistico', label: 'Certificato agonistico' },
  { value: 'assicurazione', label: 'Assicurazione' },
  { value: 'consenso_privacy', label: 'Consenso privacy' },
  { value: 'altro', label: 'Altro' },
] as const;

type DocType = (typeof DOC_TYPES)[number]['value'];

interface Props {
  atletaUserId: string;
  /** Se true, l'atleta sta gestendo i propri (PWA). */
  selfMode?: boolean;
  /** Disabilita upload/eliminazione (per blocchi su sospeso/abbonamento bloccato). */
  readOnly?: boolean;
}

function expiryStatus(expiry?: string | null) {
  if (!expiry) return { label: 'Senza scadenza', tone: 'muted' as const, icon: Clock };
  const days = differenceInDays(new Date(expiry), new Date());
  if (days < 0) return { label: 'Scaduto', tone: 'destructive' as const, icon: AlertTriangle };
  if (days <= 30) return { label: `Scade tra ${days}g`, tone: 'warning' as const, icon: AlertTriangle };
  return { label: 'Valido', tone: 'success' as const, icon: CheckCircle2 };
}

function DocumentInlinePreview({ doc, onOpen }: { doc: any; onOpen: () => void }) {
  const [state, setState] = useState<{ url: string; type: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);
    setState(null);

    if (!doc?.file_path) return;
    supabase.storage
      .from('athlete-documents')
      .download(doc.file_path)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(data);
        setState({ url: objectUrl, type: data.type || fileTypeFromPath(doc.file_path) });
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc?.file_path]);

  if (!doc?.file_path) {
    return (
      <div className="h-36 rounded-md border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
        Nessun file allegato
      </div>
    );
  }

  if (failed) {
    return (
      <div className="h-36 rounded-md border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground text-center px-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        File non leggibile o permessi mancanti
      </div>
    );
  }

  if (!state) {
    return (
      <div className="h-36 rounded-md border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carico anteprima…
      </div>
    );
  }

  return (
    <button type="button" onClick={onOpen} className="h-36 w-full overflow-hidden rounded-md border bg-muted/20 text-left">
      {state.type.startsWith('image/') ? (
        <img src={state.url} alt={doc.title || 'Documento atleta'} className="h-full w-full object-cover" />
      ) : state.type === 'application/pdf' ? (
        <iframe title={doc.title || 'Anteprima documento'} src={`${state.url}#toolbar=0&navpanes=0`} className="h-full w-full pointer-events-none" />
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-8 w-8 opacity-60" />
          Apri anteprima
        </div>
      )}
    </button>
  );
}

export function DocumentsTab({ atletaUserId, selfMode = false, readOnly: readOnlyProp = false }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [preview, setPreview] = useState<{ doc: any; url: string; type: string } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // Connection gate (only for PT view). selfMode skip.
  const { data: connection } = useQuery({
    queryKey: ['pt-athlete-connection-status-docs', user?.id, atletaUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_atleta_connections')
        .select('status')
        .eq('pt_user_id', user!.id)
        .eq('atleta_user_id', atletaUserId)
        .maybeSingle();
      return data;
    },
    enabled: !selfMode && !!user?.id,
  });
  const ptInactive = !selfMode && (connection?.status && connection.status !== 'active');
  const readOnly = readOnlyProp || !!ptInactive;

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['athlete-documents', atletaUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_documents')
        .select('*')
        .eq('atleta_user_id', atletaUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!atletaUserId) return;
    const channel = supabase
      .channel(`athlete-docs-${atletaUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'athlete_documents', filter: `atleta_user_id=eq.${atletaUserId}` },
        () => qc.invalidateQueries({ queryKey: ['athlete-documents', atletaUserId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [atletaUserId, qc]);

  const remove = useMutation({
    mutationFn: async (doc: any) => {
      if (doc.file_path) {
        await supabase.storage.from('athlete-documents').remove([doc.file_path]);
      }
      const { error } = await supabase.from('athlete_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Documento eliminato');
      qc.invalidateQueries({ queryKey: ['athlete-documents', atletaUserId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Errore'),
  });

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const previewFile = async (doc: any) => {
    if (!doc.file_path) {
      toast.error('Nessun file allegato a questo documento');
      return;
    }
    setPreviewLoadingId(doc.id);
    try {
      const { data, error } = await supabase.storage
      .from('athlete-documents')
        .download(doc.file_path);
      if (error || !data) throw error || new Error('File non trovato');
      const url = URL.createObjectURL(data);
      if (preview?.url) URL.revokeObjectURL(preview.url);
      setPreview({ doc, url, type: data.type || fileTypeFromPath(doc.file_path) });
    } catch (e: any) {
      toast.error(e?.message || 'Impossibile caricare l’anteprima');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const downloadPreview = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview.url;
    a.download = `${preview.doc.title || 'documento'}${extensionFromPath(preview.doc.file_path)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-4">
      {ptInactive && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Connessione non attiva con questo atleta — documenti in sola lettura.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {docs.length} document{docs.length === 1 ? 'o' : 'i'}
        </div>
        <Dialog open={open} onOpenChange={(v) => !readOnly && setOpen(v)}>
          <DialogTrigger asChild>
            <Button disabled={readOnly}><Plus className="h-4 w-4 mr-2" /> Carica documento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuovo documento</DialogTitle></DialogHeader>
            <DocumentForm
              atletaUserId={atletaUserId}
              uploaderUserId={user!.id}
              onDone={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ['athlete-documents', atletaUserId] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Caricamento…</p>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nessun documento caricato.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map((d: any) => {
            const st = expiryStatus(d.expiry_date);
            const Icon = st.icon;
            const typeLabel = DOC_TYPES.find(t => t.value === d.doc_type)?.label ?? d.doc_type;
            return (
              <Card key={d.id}>
                <CardContent className="pt-4 space-y-2">
                  <DocumentInlinePreview doc={d} onOpen={() => previewFile(d)} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{d.title}</p>
                      <Badge variant="outline" className="text-xs mt-1">{typeLabel}</Badge>
                    </div>
                    <Badge
                      variant={st.tone === 'destructive' ? 'destructive' : st.tone === 'warning' ? 'secondary' : 'outline'}
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      <Icon className="h-3 w-3" /> {st.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {d.issued_date && <p>Emesso: {format(new Date(d.issued_date), 'dd MMM yyyy', { locale: it })}</p>}
                    {d.expiry_date && <p>Scadenza: {format(new Date(d.expiry_date), 'dd MMM yyyy', { locale: it })}</p>}
                    {d.notes && <p className="italic">{d.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {d.file_path && (
                      <Button variant="outline" size="sm" onClick={() => previewFile(d)} disabled={previewLoadingId === d.id}>
                        {previewLoadingId === d.id ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 mr-1" />
                        )}
                        Anteprima
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEditing(d)} disabled={readOnly}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Modifica
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Eliminare definitivamente questo documento?')) remove.mutate(d);
                      }}
                      disabled={readOnly}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" /> Elimina
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifica documento</DialogTitle></DialogHeader>
          {editing && (
            <DocumentForm
              atletaUserId={atletaUserId}
              uploaderUserId={user!.id}
              existing={editing}
              onDone={() => {
                setEditing(null);
                qc.invalidateQueries({ queryKey: ['athlete-documents', atletaUserId] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(v) => !v && closePreview()}>
        <DialogContent className="max-w-5xl h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span className="truncate">{preview?.doc?.title || 'Documento'}</span>
              <Button type="button" variant="outline" size="sm" onClick={downloadPreview}>
                <Download className="h-4 w-4 mr-2" /> Scarica
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 rounded-md border bg-muted/20 overflow-hidden">
            {preview && preview.type.startsWith('image/') ? (
              <img src={preview.url} alt={preview.doc.title || 'Documento atleta'} className="h-full w-full object-contain" />
            ) : preview && preview.type === 'application/pdf' ? (
              <iframe title={preview.doc.title || 'Anteprima documento'} src={preview.url} className="h-full w-full" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
                <FileText className="h-12 w-12 opacity-50" />
                <p>Anteprima non disponibile per questo formato.</p>
                <Button type="button" onClick={downloadPreview}>Scarica file</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function extensionFromPath(path?: string | null) {
  if (!path || !path.includes('.')) return '';
  return `.${path.split('.').pop()}`;
}

function fileTypeFromPath(path?: string | null) {
  const ext = extensionFromPath(path).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

// ---------------- Shared form (create + edit) ----------------

function DocumentForm({
  atletaUserId,
  uploaderUserId,
  existing,
  onDone,
}: {
  atletaUserId: string;
  uploaderUserId: string;
  existing?: any;
  onDone: () => void;
}) {
  const isEdit = !!existing;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [docType, setDocType] = useState<DocType>(existing?.doc_type ?? 'visita_medica');
  const [issuedDate, setIssuedDate] = useState(existing?.issued_date ?? '');
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [replaceFile, setReplaceFile] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error('Aggiungi un titolo'); return; }
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      let filePath: string | null | undefined = existing?.file_path ?? null;

      if (file && (!isEdit || replaceFile)) {
        if (file.size > 15 * 1024 * 1024) throw new Error('File troppo grande (max 15 MB)');
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        const newPath = `${atletaUserId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('athlete-documents')
          .upload(newPath, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        uploadedPath = newPath;

        // Replace: remove previous file (best effort)
        if (isEdit && existing?.file_path) {
          await supabase.storage.from('athlete-documents').remove([existing.file_path]);
        }
        filePath = newPath;
      }

      const payload = {
        doc_type: docType,
        title: title.trim(),
        file_path: filePath ?? null,
        issued_date: issuedDate || null,
        expiry_date: expiryDate || null,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('athlete_documents')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Documento aggiornato');
      } else {
        const { error } = await supabase.from('athlete_documents').insert({
          atleta_user_id: atletaUserId,
          uploaded_by_user_id: uploaderUserId,
          ...payload,
        });
        if (error) throw error;
        toast.success('Documento caricato');
      }
      onDone();
    } catch (e: any) {
      // Cleanup orphan upload if DB write failed
      if (uploadedPath) {
        await supabase.storage.from('athlete-documents').remove([uploadedPath]).catch(() => {});
      }
      toast.error(e?.message || 'Errore');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Titolo *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Visita medica 2026" />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data emissione</Label>
          <Input type="date" value={issuedDate ?? ''} onChange={(e) => setIssuedDate(e.target.value)} />
        </div>
        <div>
          <Label>Scadenza</Label>
          <Input type="date" value={expiryDate ?? ''} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Note</Label>
        <Input value={notes ?? ''} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {isEdit && existing?.file_path && !replaceFile ? (
        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground truncate">File esistente allegato</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setReplaceFile(true)}>
            Sostituisci
          </Button>
        </div>
      ) : (
        <div>
          <Label>File (PDF, JPG, PNG) {isEdit && '— opzionale'}</Label>
          <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {isEdit && replaceFile && (
            <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => { setReplaceFile(false); setFile(null); }}>
              Annulla sostituzione
            </Button>
          )}
        </div>
      )}

      <Button onClick={submit} disabled={busy} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {busy ? 'Salvataggio…' : isEdit ? 'Salva modifiche' : 'Salva documento'}
      </Button>
    </div>
  );
}

export default DocumentsTab;
