import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, FileWarning, Users,
  CalendarClock, RefreshCw, Wrench, FileSearch, Database, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

// =====================================================
// Admin · Audit & Coerenza
// Tutte le operazioni passano dall'edge function `admin-audit`,
// che verifica server-side JWT + ruolo admin prima di rispondere.
// Anche chiamando l'endpoint direttamente, un non-admin riceve 403.
// =====================================================

async function callAudit<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-audit', {
    body: { action, ...payload },
  });
  if (error) {
    const msg = (error as any)?.context?.error || error.message || 'Errore richiesta';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export default function AdminAuditCoherencePage() {
  const qc = useQueryClient();
  const [ptId, setPtId] = useState<string>('');
  const [pdfTesting, setPdfTesting] = useState(false);
  const [pdfResults, setPdfResults] = useState<Array<{
    id: string; title: string; ok: boolean; reason?: string;
  }>>([]);

  const { data: pts = [] } = useQuery({
    queryKey: ['admin-audit-pts'],
    queryFn: async () => {
      const res = await callAudit<{ pts: Array<{ user_id: string; name: string; email: string }> }>(
        'list_pts',
      );
      return res.pts ?? [];
    },
  });

  const { data: ptDetail } = useQuery({
    queryKey: ['admin-audit-pt-detail', ptId],
    enabled: !!ptId,
    queryFn: async () =>
      callAudit<{
        athletes: Array<{
          atleta_user_id: string;
          name: string;
          email: string;
          status: string;
          docsTotal: number;
          docsGhost: number;
          appointments: number;
          events: number;
          docs: Array<{ id: string; file_path: string | null; title: string }>;
        }>;
        eventsTotal: number;
      }>('pt_detail', { pt_user_id: ptId }),
  });

  const checksQ = useQuery({
    queryKey: ['audit-checks'],
    queryFn: () =>
      callAudit<{
        ghost: Array<{ id: string; title: string }>;
        multiActive: Array<{ atleta_user_id: string; rows: Array<{ id: string }> }>;
        dupAppts: Array<Array<{ id: string }>>;
        roleMismatch: Array<unknown>;
        missingProfiles: Array<unknown>;
      }>('checks'),
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['audit-recent-logs'],
    queryFn: async () => {
      const res = await callAudit<{ logs: any[] }>('recent_logs');
      return res.logs ?? [];
    },
  });

  const fixGhostDocs = useMutation({
    mutationFn: async (ids: string[]) => callAudit('fix_ghost_documents', { ids }),
    onSuccess: (_d, ids) => {
      toast.success(`Eliminati ${ids.length} documenti fantasma`);
      qc.invalidateQueries({ queryKey: ['audit-checks'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-pt-detail'] });
      refetchLogs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fixMultiActive = useMutation({
    mutationFn: async (groups: Array<{ atleta_user_id: string; rows: Array<{ id: string }> }>) =>
      callAudit('fix_multi_active', { groups }),
    onSuccess: () => {
      toast.success('Connessioni multiple risolte');
      qc.invalidateQueries({ queryKey: ['audit-checks'] });
      refetchLogs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fixDupAppointments = useMutation({
    mutationFn: async (groups: Array<Array<{ id: string }>>) =>
      callAudit('fix_duplicate_appointments', { groups }),
    onSuccess: () => {
      toast.success('Appuntamenti duplicati rimossi');
      qc.invalidateQueries({ queryKey: ['audit-checks'] });
      refetchLogs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runPdfTest = async () => {
    if (!ptDetail) return;
    setPdfTesting(true);
    setPdfResults([]);
    const results: typeof pdfResults = [];
    const allDocs = ptDetail.athletes.flatMap((a) => a.docs.filter((d) => !!d.file_path));
    for (const d of allDocs) {
      try {
        const res = await callAudit<{ signedUrl: string }>('sign_document_url', {
          document_id: d.id,
        });
        try {
          const head = await fetch(res.signedUrl, { method: 'HEAD' });
          results.push({
            id: d.id,
            title: d.title,
            ok: head.ok,
            reason: head.ok ? undefined : `HTTP ${head.status}`,
          });
        } catch (e: any) {
          results.push({ id: d.id, title: d.title, ok: false, reason: e?.message || 'fetch error' });
        }
      } catch (e: any) {
        results.push({ id: d.id, title: d.title, ok: false, reason: e?.message || 'sign error' });
      }
    }
    setPdfResults(results);
    setPdfTesting(false);
    refetchLogs();
    if (results.length === 0) toast.info('Nessun PDF da testare per questo PT');
    else toast.success(`Test completato: ${results.filter((r) => r.ok).length}/${results.length} OK`);
  };

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['audit-checks'] });
    qc.invalidateQueries({ queryKey: ['admin-audit-pt-detail'] });
    refetchLogs();
  };

  const cdata = checksQ.data;
  const checks = [
    {
      key: 'ghost',
      label: 'Documenti fantasma',
      desc: 'Record in athlete_documents senza file allegato.',
      icon: FileWarning,
      count: cdata?.ghost.length ?? 0,
      loading: checksQ.isLoading,
      onFix: () => fixGhostDocs.mutate((cdata?.ghost ?? []).map((d) => d.id)),
      fixing: fixGhostDocs.isPending,
      severity: (cdata?.ghost.length ?? 0) > 0 ? 'warn' : 'ok',
    },
    {
      key: 'multi',
      label: 'Atleti con più PT attivi',
      desc: 'Viola la regola "1 PT per atleta".',
      icon: Users,
      count: cdata?.multiActive.length ?? 0,
      loading: checksQ.isLoading,
      onFix: () => fixMultiActive.mutate(cdata?.multiActive ?? []),
      fixing: fixMultiActive.isPending,
      severity: (cdata?.multiActive.length ?? 0) > 0 ? 'error' : 'ok',
    },
    {
      key: 'dup',
      label: 'Appuntamenti duplicati',
      desc: 'Stesso PT, atleta e orario di inizio.',
      icon: CalendarClock,
      count: cdata?.dupAppts.length ?? 0,
      loading: checksQ.isLoading,
      onFix: () => fixDupAppointments.mutate(cdata?.dupAppts ?? []),
      fixing: fixDupAppointments.isPending,
      severity: (cdata?.dupAppts.length ?? 0) > 0 ? 'warn' : 'ok',
    },
    {
      key: 'roles',
      label: 'Ruoli incoerenti su connessioni',
      desc: 'PT o atleta nella connessione senza il ruolo corretto.',
      icon: ShieldCheck,
      count: cdata?.roleMismatch.length ?? 0,
      loading: checksQ.isLoading,
      onFix: null,
      fixing: false,
      severity: (cdata?.roleMismatch.length ?? 0) > 0 ? 'error' : 'ok',
    },
    {
      key: 'profiles',
      label: 'Profili mancanti',
      desc: 'Utenti con ruolo pt/atleta ma senza pt_profiles/atleta_profiles.',
      icon: Database,
      count: cdata?.missingProfiles.length ?? 0,
      loading: checksQ.isLoading,
      onFix: null,
      fixing: false,
      severity: (cdata?.missingProfiles.length ?? 0) > 0 ? 'warn' : 'ok',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Audit & Coerenza"
        subtitle="Verifica in tempo reale l'allineamento tra PT, atleti, documenti e appuntamenti. Ogni correzione viene loggata."
        icon={<ShieldCheck className="h-6 w-6" />}
        actions={
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Aggiorna tutto
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {checks.map((c) => {
          const Icon = c.icon;
          const tone =
            c.severity === 'error' ? 'border-destructive/40 bg-destructive/5'
            : c.severity === 'warn' ? 'border-yellow-500/40 bg-yellow-500/5'
            : 'border-emerald-500/30 bg-emerald-500/5';
          return (
            <Card key={c.key} className={tone}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4" /> {c.label}
                  </div>
                  {c.severity === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={c.severity === 'ok' ? 'outline' : 'secondary'}>
                    {c.loading ? '…' : `${c.count} ${c.count === 1 ? 'caso' : 'casi'}`}
                  </Badge>
                  {c.onFix && c.count > 0 && (
                    <Button size="sm" variant="outline" onClick={c.onFix} disabled={c.fixing}>
                      {c.fixing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wrench className="h-3 w-3 mr-1" />}
                      Correggi
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SectionCard
        title="Tracciabilità per Personal Trainer"
        subtitle="Seleziona un PT per vedere atleti collegati, documenti e appuntamenti."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={ptId} onValueChange={setPtId}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Scegli un Personal Trainer" />
              </SelectTrigger>
              <SelectContent>
                {pts.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.name} — {p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={!ptId || pdfTesting} onClick={runPdfTest}>
              {pdfTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSearch className="h-4 w-4 mr-2" />}
              Test visibilità PDF
            </Button>
          </div>

          {ptDetail && (
            <>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <div className="rounded border p-3">
                  <div className="text-muted-foreground text-xs">Atleti totali</div>
                  <div className="text-xl font-semibold">{ptDetail.athletes.length}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-muted-foreground text-xs">Connessioni attive</div>
                  <div className="text-xl font-semibold">
                    {ptDetail.athletes.filter((a) => a.status === 'active').length}
                  </div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-muted-foreground text-xs">Eventi calendar (non cancellati)</div>
                  <div className="text-xl font-semibold">{ptDetail.eventsTotal}</div>
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atleta</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Documenti</TableHead>
                      <TableHead className="text-right">Fantasma</TableHead>
                      <TableHead className="text-right">Appuntamenti</TableHead>
                      <TableHead className="text-right">Eventi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ptDetail.athletes.map((a) => (
                      <TableRow key={a.atleta_user_id}>
                        <TableCell>
                          <div className="font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.status === 'active' ? 'default' : 'outline'}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{a.docsTotal}</TableCell>
                        <TableCell className="text-right">
                          {a.docsGhost > 0 ? (
                            <span className="text-yellow-600 font-medium">{a.docsGhost}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{a.appointments}</TableCell>
                        <TableCell className="text-right">{a.events}</TableCell>
                      </TableRow>
                    ))}
                    {ptDetail.athletes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                          Nessun atleta collegato a questo PT.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {pdfResults.length > 0 && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-medium">Risultati test PDF</div>
                  <ul className="text-xs space-y-1">
                    {pdfResults.map((r) => (
                      <li key={r.id} className="flex items-center gap-2">
                        {r.ok ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        )}
                        <span className="truncate">{r.title}</span>
                        {!r.ok && <span className="text-destructive">— {r.reason}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Log azioni recenti"
        subtitle="Ultime 20 verifiche e correzioni effettuate da questo pannello."
      >
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nessuna azione registrata.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Azione</TableHead>
                  <TableHead>Risorsa</TableHead>
                  <TableHead>Dettagli</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(l.created_at), 'dd MMM HH:mm:ss', { locale: it })}
                    </TableCell>
                    <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                    <TableCell className="text-xs">{l.resource}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[420px] truncate">
                      {l.details ? JSON.stringify(l.details) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
