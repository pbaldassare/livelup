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
import { toast } from 'sonner';
import { FileText, Upload, Trash2, ExternalLink, Plus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
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

export function DocumentsTab({ atletaUserId, selfMode = false, readOnly = false }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

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

  // Realtime: sync PT view when athlete uploads/deletes documents (and vice-versa)
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

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('athlete-documents')
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Impossibile aprire il file");
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
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
            <UploadForm
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
                  <div className="flex gap-2 pt-1">
                    {d.file_path && (
                      <Button variant="outline" size="sm" onClick={() => openFile(d.file_path)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Apri
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate(d)} disabled={readOnly}>
                      <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" /> Elimina
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Upload form ----------------

function UploadForm({
  atletaUserId,
  uploaderUserId,
  onDone,
}: {
  atletaUserId: string;
  uploaderUserId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>('visita_medica');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Aggiungi un titolo');
      return;
    }
    setUploading(true);
    try {
      let filePath: string | null = null;
      if (file) {
        if (file.size > 15 * 1024 * 1024) throw new Error('File troppo grande (max 15 MB)');
        const ext = file.name.split('.').pop() || 'pdf';
        filePath = `${atletaUserId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('athlete-documents')
          .upload(filePath, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
      }
      const { error } = await supabase.from('athlete_documents').insert({
        atleta_user_id: atletaUserId,
        uploaded_by_user_id: uploaderUserId,
        doc_type: docType,
        title: title.trim(),
        file_path: filePath,
        issued_date: issuedDate || null,
        expiry_date: expiryDate || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success('Documento caricato');
      onDone();
    } catch (e: any) {
      toast.error(e?.message || 'Errore upload');
    } finally {
      setUploading(false);
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
          <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
        </div>
        <div>
          <Label>Scadenza</Label>
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Note</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div>
        <Label>File (PDF, JPG, PNG)</Label>
        <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <Button onClick={submit} disabled={uploading} className="w-full">
        <Upload className="h-4 w-4 mr-2" /> {uploading ? 'Carico…' : 'Salva documento'}
      </Button>
    </div>
  );
}

export default DocumentsTab;
