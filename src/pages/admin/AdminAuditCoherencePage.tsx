import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
// Una sola pagina per verificare l'allineamento dati PT↔Atleta,
// la visibilità dei documenti, la sincronizzazione appuntamenti
// e la coerenza dei ruoli/permessi. Ogni "Correggi" è loggato.
// =====================================================

type AuditAction = {
  action: string;
  resource: string;
  resource_id?: string | null;
  details?: Record<string, unknown>;
};

function useAuditLog() {
  const { user } = useAuth();
  return async (a: AuditAction) => {
    if (!user?.id) return;
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: a.action,
      resource: a.resource,
      resource_id: a.resource_id ?? null,
      details: (a.details ?? {}) as any,
    } as any);
  };
}

// ---------------- Check primitives ----------------

async function fetchGhostDocs() {
  const { data, error } = await supabase
    .from('athlete_documents')
    .select('id, title, atleta_user_id, doc_type, created_at')
    .is('file_path', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchMultiActiveConnections() {
  // atleti con più di 1 connessione attiva (viola la regola 1 PT per atleta)
  const { data, error } = await supabase
    .from('pt_atleta_connections')
    .select('atleta_user_id, pt_user_id, id, status')
    .eq('status', 'active');
  if (error) throw error;
  const byAtleta = new Map<string, typeof data>();
  (data ?? []).forEach((row) => {
    const list = byAtleta.get(row.atleta_user_id) ?? [];
    list.push(row);
    byAtleta.set(row.atleta_user_id, list);
  });
  return Array.from(byAtleta.entries())
    .filter(([, v]) => v.length > 1)
    .map(([atleta_user_id, rows]) => ({ atleta_user_id, rows }));
}

async function fetchDuplicateAppointments() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, pt_user_id, atleta_user_id, start_datetime, title, category')
    .eq('category', 'appuntamento')
    .eq('is_cancelled', false);
  if (error) throw error;
  const map = new Map<string, typeof data>();
  (data ?? []).forEach((ev) => {
    const key = `${ev.pt_user_id}|${ev.atleta_user_id}|${ev.start_datetime}`;
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  });
  return Array.from(map.values()).filter((v) => v.length > 1);
}

async function fetchRoleMismatches() {
  // connessioni in cui l'atleta non ha role='atleta' o il pt non ha role='pt'
  const [{ data: conns }, { data: roles }] = await Promise.all([
    supabase.from('pt_atleta_connections').select('id, pt_user_id, atleta_user_id, status'),
    supabase.from('user_roles').select('user_id, role'),
  ]);
  const roleMap = new Map<string, Set<string>>();
  (roles ?? []).forEach((r) => {
    const s = roleMap.get(r.user_id) ?? new Set();
    s.add(r.role);
    roleMap.set(r.user_id, s);
  });
  return (conns ?? []).filter((c) => {
    const ptRoles = roleMap.get(c.pt_user_id);
    const atRoles = roleMap.get(c.atleta_user_id);
    return !ptRoles?.has('pt') || !atRoles?.has('atleta');
  });
}

async function fetchMissingProfiles() {
  // utenti con ruolo pt/atleta ma senza riga in pt_profiles/atleta_profiles
  const [{ data: roles }, { data: ptProfiles }, { data: atProfiles }] = await Promise.all([
    supabase.from('user_roles').select('user_id, role'),
    supabase.from('pt_profiles').select('user_id'),
    supabase.from('atleta_profiles').select('user_id'),
  ]);
  const ptSet = new Set((ptProfiles ?? []).map((p) => p.user_id));
  const atSet = new Set((atProfiles ?? []).map((p) => p.user_id));
  return (roles ?? []).filter((r) => {
    if (r.role === 'pt' && !ptSet.has(r.user_id)) return true;
    if (r.role === 'atleta' && !atSet.has(r.user_id)) return true;
    return false;
  });
}

// ---------------- Page ----------------

export default function AdminAuditCoherencePage() {
  const qc = useQueryClient();
  const audit = useAuditLog();
  const [ptId, setPtId] = useState<string>('');
  const [pdfTesting, setPdfTesting] = useState(false);
  const [pdfResults, setPdfResults] = useState<Array<{
    id: string; title: string; ok: boolean; reason?: string;
  }>>([]);

  // --- PTs picker
  const { data: pts = [] } = useQuery({
    queryKey: ['admin-audit-pts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles:profiles!user_roles_user_id_fkey(first_name, last_name, email)')
        .eq('role', 'pt');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        user_id: r.user_id,
        name: [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ').trim() || r.profiles?.email || r.user_id.slice(0, 8),
        email: r.profiles?.email ?? '',
      })).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  // --- PT detail when selected
  const { data: ptDetail } = useQuery({
    queryKey: ['admin-audit-pt-detail', ptId],
    enabled: !!ptId,
    queryFn: async () => {
      const [{ data: conns }, { data: events }] = await Promise.all([
        supabase
          .from('pt_atleta_connections')
          .select('atleta_user_id, status, created_at, profiles:profiles!pt_atleta_connections_atleta_user_id_fkey(first_name, last_name, email)')
          .eq('pt_user_id', ptId),
        supabase
          .from('calendar_events')
          .select('id, atleta_user_id, category, start_datetime, is_cancelled')
          .eq('pt_user_id', ptId),
      ]);
      const atletaIds = (conns ?? []).map((c) => c.atleta_user_id);
      const { data: docs } = atletaIds.length
        ? await supabase
            .from('athlete_documents')
            .select('id, atleta_user_id, file_path, title, doc_type')
            .in('atleta_user_id', atletaIds)
        : { data: [] as any[] };

      const byAtleta = (conns ?? []).map((c) => {
        const aDocs = (docs ?? []).filter((d) => d.atleta_user_id === c.atleta_user_id);
        const aEvents = (events ?? []).filter((e) => e.atleta_user_id === c.atleta_user_id && !e.is_cancelled);
        return {
          atleta_user_id: c.atleta_user_id,
          name: [c.profiles?.first_name, c.profiles?.last_name].filter(Boolean).join(' ').trim() || c.profiles?.email || c.atleta_user_id.slice(0, 8),
          email: c.profiles?.email ?? '',
          status: c.status,
          docsTotal: aDocs.length,
          docsGhost: aDocs.filter((d) => !d.file_path).length,
          appointments: aEvents.filter((e) => e.category === 'appuntamento').length,
          events: aEvents.filter((e) => e.category === 'evento').length,
          docs: aDocs,
        };
      });

      return {
        athletes: byAtleta,
        eventsTotal: (events ?? []).filter((e) => !e.is_cancelled).length,
      };
    },
  });

  // --- Coherence checks
  const ghostQ = useQuery({ queryKey: ['audit-ghost-docs'], queryFn: fetchGhostDocs });
  const multiActiveQ = useQuery({ queryKey: ['audit-multi-active'], queryFn: fetchMultiActiveConnections });
  const dupApptQ = useQuery({ queryKey: ['audit-dup-appts'], queryFn: fetchDuplicateAppointments });
  const roleMismatchQ = useQuery({ queryKey: ['audit-role-mismatch'], queryFn: fetchRoleMismatches });
  const missingProfilesQ = useQuery({ queryKey: ['audit-missing-profiles'], queryFn: fetchMissingProfiles });

  // --- Audit log
  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['audit-recent-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, user_id, action, resource, resource_id, details, created_at')
        .like('resource', 'audit%')
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  // --- Fix mutations
  const fixGhostDocs = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('athlete_documents').delete().in('id', ids);
      if (error) throw error;
      await audit({
        action: 'fix_ghost_documents',
        resource: 'audit:athlete_documents',
        details: { removed_ids: ids, count: ids.length },
      });
    },
    onSuccess: (_d, ids) => {
      toast.success(`Eliminati ${ids.length} documenti fantasma`);
      qc.invalidateQueries({ queryKey: ['audit-ghost-docs'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-pt-detail'] });
      refetchLogs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fixMultiActive = useMutation({
    mutationFn: async (groups: Array<{ atleta_user_id: string; rows: any[] }>) => {
      // mantiene il più recente, termina gli altri
      for (const g of groups) {
        const sorted = [...g.rows].sort((a, b) => a.id.localeCompare(b.id));
        const toTerminate = sorted.slice(0, -1).map((r) => r.id);
        if (toTerminate.length) {
          await supabase
            .from('pt_atleta_connections')
            .update({ status: 'terminated', terminated_at: new Date().toISOString() })
            .in('id', toTerminate);
        }
      }
      await audit({
        action: 'fix_multi_active_connections',
        resource: 'audit:pt_atleta_connections',
        details: { atleti_corretti: groups.map((g) => g.atleta_user_id) },
      });
    },
    onSuccess: () => {
      toast.success('Connessioni multiple risolte');
      qc.invalidateQueries({ queryKey: ['audit-multi-active'] });
      refetchLogs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fixDupAppointments = useMutation({
    mutationFn: async (groups: any[][]) => {
      const toDelete: string[] = [];
      for (const g of groups) {
        const sorted = [...g].sort((a, b) => a.id.localeCompare(b.id));
        toDelete.push(...sorted.slice(1).map((r) => r.id));
      }
      if (toDelete.length) {
        const { error } = await supabase.from('calendar_events').delete().in('id', toDelete);
        if (error) throw error;
      }
      await audit({
        action: 'fix_duplicate_appointments',
        resource: 'audit:calendar_events',
        details: { removed_ids: toDelete, count: toDelete.length },
      });
    },
    onSuccess: () => {
      toast.success('Appuntamenti duplicati rimossi');
      qc.invalidateQueries({ queryKey: ['audit-dup-appts'] });
      refetchLogs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- PDF visibility test (signed URLs + head check)
  const runPdfTest = async () => {
    if (!ptDetail) return;
    setPdfTesting(true);
    setPdfResults([]);
    const results: typeof pdfResults = [];
    const allDocs = ptDetail.athletes.flatMap((a) => a.docs.filter((d) => !!d.file_path));
    for (const d of allDocs) {
      try {
        const { data, error } = await supabase.storage
          .from('athlete-documents')
          .createSignedUrl(d.file_path!, 60);
        if (error || !data?.signedUrl) {
          results.push({ id: d.id, title: d.title, ok: false, reason: error?.message || 'no url' });
          continue;
        }
        // HEAD check
        try {
          const res = await fetch(data.signedUrl, { method: 'HEAD' });
          results.push({ id: d.id, title: d.title, ok: res.ok, reason: res.ok ? undefined : `HTTP ${res.status}` });
        } catch (e: any) {
          results.push({ id: d.id, title: d.title, ok: false, reason: e?.message || 'fetch error' });
        }
      } catch (e: any) {
        results.push({ id: d.id, title: d.title, ok: false, reason: e?.message || 'exception' });
      }
    }
    setPdfResults(results);
    setPdfTesting(false);
    await audit({
      action: 'test_pdf_visibility',
      resource: 'audit:storage',
      resource_id: ptId,
      details: {
        pt_user_id: ptId,
        tested: results.length,
        failed: results.filter((r) => !r.ok).length,
      },
    });
    refetchLogs();
    if (results.length === 0) toast.info('Nessun PDF da testare per questo PT');
    else toast.success(`Test completato: ${results.filter((r) => r.ok).length}/${results.length} OK`);
  };

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['audit-ghost-docs'] });
    qc.invalidateQueries({ queryKey: ['audit-multi-active'] });
    qc.invalidateQueries({ queryKey: ['audit-dup-appts'] });
    qc.invalidateQueries({ queryKey: ['audit-role-mismatch'] });
    qc.invalidateQueries({ queryKey: ['audit-missing-profiles'] });
    qc.invalidateQueries({ queryKey: ['admin-audit-pt-detail'] });
    refetchLogs();
  };

  const checks = [
    {
      key: 'ghost',
      label: 'Documenti fantasma',
      desc: 'Record in athlete_documents senza file allegato.',
      icon: FileWarning,
      count: ghostQ.data?.length ?? 0,
      loading: ghostQ.isLoading,
      onFix: () => fixGhostDocs.mutate((ghostQ.data ?? []).map((d) => d.id)),
      fixing: fixGhostDocs.isPending,
      severity: (ghostQ.data?.length ?? 0) > 0 ? 'warn' : 'ok',
    },
    {
      key: 'multi',
      label: 'Atleti con più PT attivi',
      desc: 'Viola la regola "1 PT per atleta".',
      icon: Users,
      count: multiActiveQ.data?.length ?? 0,
      loading: multiActiveQ.isLoading,
      onFix: () => fixMultiActive.mutate(multiActiveQ.data ?? []),
      fixing: fixMultiActive.isPending,
      severity: (multiActiveQ.data?.length ?? 0) > 0 ? 'error' : 'ok',
    },
    {
      key: 'dup',
      label: 'Appuntamenti duplicati',
      desc: 'Stesso PT, atleta e orario di inizio.',
      icon: CalendarClock,
      count: dupApptQ.data?.length ?? 0,
      loading: dupApptQ.isLoading,
      onFix: () => fixDupAppointments.mutate(dupApptQ.data ?? []),
      fixing: fixDupAppointments.isPending,
      severity: (dupApptQ.data?.length ?? 0) > 0 ? 'warn' : 'ok',
    },
    {
      key: 'roles',
      label: 'Ruoli incoerenti su connessioni',
      desc: 'PT o atleta nella connessione senza il ruolo corretto.',
      icon: ShieldCheck,
      count: roleMismatchQ.data?.length ?? 0,
      loading: roleMismatchQ.isLoading,
      onFix: null,
      fixing: false,
      severity: (roleMismatchQ.data?.length ?? 0) > 0 ? 'error' : 'ok',
    },
    {
      key: 'profiles',
      label: 'Profili mancanti',
      desc: 'Utenti con ruolo pt/atleta ma senza pt_profiles/atleta_profiles.',
      icon: Database,
      count: missingProfilesQ.data?.length ?? 0,
      loading: missingProfilesQ.isLoading,
      onFix: null,
      fixing: false,
      severity: (missingProfilesQ.data?.length ?? 0) > 0 ? 'warn' : 'ok',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Audit & Coerenza"
        description="Verifica in tempo reale l'allineamento tra PT, atleti, documenti e appuntamenti. Ogni correzione viene loggata."
        icon={ShieldCheck}
        actions={
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Aggiorna tutto
          </Button>
        }
      />

      {/* Coherence cards */}
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

      {/* PT detail */}
      <SectionCard
        title="Tracciabilità per Personal Trainer"
        description="Seleziona un PT per vedere atleti collegati, documenti e appuntamenti."
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
            <Button
              variant="outline"
              disabled={!ptId || pdfTesting}
              onClick={runPdfTest}
            >
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

      {/* Audit log */}
      <SectionCard
        title="Log azioni recenti"
        description="Ultime 20 verifiche e correzioni effettuate da questo pannello."
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
