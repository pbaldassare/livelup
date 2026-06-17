// Admin Audit & Coherence — Backend-enforced permissions
// All actions require: valid JWT + role 'admin' in public.user_roles.
// Routes: { action: 'checks' | 'pt_detail' | 'fix_ghost_documents'
//          | 'fix_multi_active' | 'fix_duplicate_appointments'
//          | 'sign_document_url' | 'list_pts' | 'recent_logs' }
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify caller JWT
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
  const userId = claimsData.claims.sub as string;

  // Service-role client (bypasses RLS, used only after admin check)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Admin role check (server-side, cannot be spoofed by client)
  const { data: isAdminData, error: roleErr } = await admin.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });
  if (roleErr) return json({ error: 'Role check failed' }, 500);
  if (!isAdminData) return json({ error: 'Forbidden: admin role required' }, 403);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const action = String(body?.action ?? '');

  const logAudit = (entry: {
    action: string;
    resource: string;
    resource_id?: string | null;
    details?: Record<string, unknown>;
  }) =>
    admin.from('audit_logs').insert({
      user_id: userId,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id ?? null,
      details: (entry.details ?? {}) as any,
    });

  try {
    switch (action) {
      case 'pt_readiness': {
        // Stato di "predisposizione" di tutti i PT: profilo, status, atleti,
        // pacchetti, completamento profilo (per onboarding).
        const [rolesRes, profsRes, ptProfRes, connsRes, pkgsRes] = await Promise.all([
          admin.from('user_roles').select('user_id').eq('role', 'pt'),
          admin.from('profiles').select('user_id, first_name, last_name, email, avatar_url'),
          admin
            .from('pt_profiles')
            .select(
              'user_id, status, bio, specializations, certifications, experience_years, location_city, hourly_rate, max_athletes, is_discoverable, offers_online, offers_in_person, latitude, longitude',
            ),
          admin.from('pt_atleta_connections').select('pt_user_id, status').eq('status', 'active'),
          admin.from('pt_packages').select('pt_user_id, is_active').eq('is_active', true),
        ]);
        const ids = (rolesRes.data ?? []).map((r) => r.user_id);
        const pmap = new Map((profsRes.data ?? []).map((p: any) => [p.user_id, p]));
        const ptMap = new Map((ptProfRes.data ?? []).map((p: any) => [p.user_id, p]));
        const connCount = new Map<string, number>();
        (connsRes.data ?? []).forEach((c: any) =>
          connCount.set(c.pt_user_id, (connCount.get(c.pt_user_id) ?? 0) + 1),
        );
        const pkgCount = new Map<string, number>();
        (pkgsRes.data ?? []).forEach((p: any) =>
          pkgCount.set(p.pt_user_id, (pkgCount.get(p.pt_user_id) ?? 0) + 1),
        );

        const checklist = (pt: any, prof: any) => {
          const items = {
            profile_row: !!pt,
            full_name: !!(prof?.first_name && prof?.last_name),
            bio: !!(pt?.bio && pt.bio.length >= 40),
            specializations: Array.isArray(pt?.specializations) && pt.specializations.length > 0,
            certifications: Array.isArray(pt?.certifications) && pt.certifications.length > 0,
            location: !!pt?.location_city,
            pricing: pt?.hourly_rate != null && Number(pt?.hourly_rate) > 0,
            avatar: !!prof?.avatar_url,
            discoverable: !!pt?.is_discoverable,
          };
          const total = Object.keys(items).length;
          const done = Object.values(items).filter(Boolean).length;
          return { items, percent: Math.round((done / total) * 100) };
        };

        const pts = ids
          .map((id) => {
            const prof: any = pmap.get(id);
            const pt: any = ptMap.get(id);
            const cl = checklist(pt, prof);
            const status: string = pt?.status ?? 'missing';
            return {
              user_id: id,
              name:
                [prof?.first_name, prof?.last_name].filter(Boolean).join(' ').trim() ||
                prof?.email ||
                id.slice(0, 8),
              email: prof?.email ?? '',
              status,
              active_athletes: connCount.get(id) ?? 0,
              max_athletes: pt?.max_athletes ?? 50,
              active_packages: pkgCount.get(id) ?? 0,
              has_profile_row: !!pt,
              completion_percent: cl.percent,
              checklist: cl.items,
              needs_onboarding: status === 'registrato' || cl.percent < 60,
              needs_approval: status === 'in_attesa_approvazione',
              ready: status === 'attivo' && cl.percent >= 80,
            };
          })
          .sort((a, b) => a.completion_percent - b.completion_percent);

        const summary = {
          total: pts.length,
          ready: pts.filter((p) => p.ready).length,
          onboarding: pts.filter((p) => p.needs_onboarding).length,
          awaiting_approval: pts.filter((p) => p.needs_approval).length,
          suspended: pts.filter((p) => p.status === 'sospeso').length,
          missing_profile: pts.filter((p) => !p.has_profile_row).length,
          avg_completion:
            pts.length > 0
              ? Math.round(pts.reduce((a, p) => a + p.completion_percent, 0) / pts.length)
              : 0,
        };

        await logAudit({
          action: 'pt_readiness_report',
          resource: 'audit:pt_readiness',
          details: { total: summary.total, ready: summary.ready },
        });

        return json({ pts, summary });
      }

      case 'list_pts': {
        const { data: roles } = await admin.from('user_roles').select('user_id').eq('role', 'pt');
        const ids = (roles ?? []).map((r) => r.user_id);
        if (!ids.length) return json({ pts: [] });
        const { data: profs } = await admin
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', ids);
        const pmap = new Map((profs ?? []).map((p) => [p.user_id, p]));
        const pts = ids
          .map((id) => {
            const p: any = pmap.get(id);
            return {
              user_id: id,
              name:
                [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() ||
                p?.email ||
                id.slice(0, 8),
              email: p?.email ?? '',
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        return json({ pts });
      }

      case 'checks': {
        const [ghost, conns, appts, rolesAll, ptProfiles, atProfiles] = await Promise.all([
          admin
            .from('athlete_documents')
            .select('id, title, atleta_user_id, doc_type, created_at')
            .is('file_path', null)
            .order('created_at', { ascending: false }),
          admin
            .from('pt_atleta_connections')
            .select('id, pt_user_id, atleta_user_id, status'),
          admin
            .from('calendar_events')
            .select('id, pt_user_id, atleta_user_id, start_datetime, title, category')
            .eq('category', 'appuntamento')
            .eq('is_cancelled', false),
          admin.from('user_roles').select('user_id, role'),
          admin.from('pt_profiles').select('user_id'),
          admin.from('atleta_profiles').select('user_id'),
        ]);

        // Multi-active
        const activeConns = (conns.data ?? []).filter((c) => c.status === 'active');
        const byAtleta = new Map<string, any[]>();
        activeConns.forEach((r) => {
          const list = byAtleta.get(r.atleta_user_id) ?? [];
          list.push(r);
          byAtleta.set(r.atleta_user_id, list);
        });
        const multiActive = Array.from(byAtleta.entries())
          .filter(([, v]) => v.length > 1)
          .map(([atleta_user_id, rows]) => ({ atleta_user_id, rows }));

        // Dup appts
        const map = new Map<string, any[]>();
        (appts.data ?? []).forEach((ev) => {
          const key = `${ev.pt_user_id}|${ev.atleta_user_id}|${ev.start_datetime}`;
          const list = map.get(key) ?? [];
          list.push(ev);
          map.set(key, list);
        });
        const dupAppts = Array.from(map.values()).filter((v) => v.length > 1);

        // Role mismatch
        const roleMap = new Map<string, Set<string>>();
        (rolesAll.data ?? []).forEach((r) => {
          const s = roleMap.get(r.user_id) ?? new Set();
          s.add(r.role);
          roleMap.set(r.user_id, s);
        });
        const roleMismatch = (conns.data ?? []).filter((c) => {
          const pt = roleMap.get(c.pt_user_id);
          const at = roleMap.get(c.atleta_user_id);
          return !pt?.has('pt') || !at?.has('atleta');
        });

        // Missing profiles
        const ptSet = new Set((ptProfiles.data ?? []).map((p) => p.user_id));
        const atSet = new Set((atProfiles.data ?? []).map((p) => p.user_id));
        const missingProfiles = (rolesAll.data ?? []).filter((r) => {
          if (r.role === 'pt' && !ptSet.has(r.user_id)) return true;
          if (r.role === 'atleta' && !atSet.has(r.user_id)) return true;
          return false;
        });

        return json({
          ghost: ghost.data ?? [],
          multiActive,
          dupAppts,
          roleMismatch,
          missingProfiles,
        });
      }

      case 'pt_detail': {
        const ptId = String(body?.pt_user_id ?? '');
        if (!ptId) return json({ error: 'pt_user_id required' }, 400);
        const [{ data: conns }, { data: events }] = await Promise.all([
          admin
            .from('pt_atleta_connections')
            .select('atleta_user_id, status, created_at')
            .eq('pt_user_id', ptId),
          admin
            .from('calendar_events')
            .select('id, atleta_user_id, category, start_datetime, is_cancelled')
            .eq('pt_user_id', ptId),
        ]);
        const atletaIds = (conns ?? []).map((c) => c.atleta_user_id);
        const [{ data: docs }, { data: profs }] = await Promise.all([
          atletaIds.length
            ? admin
                .from('athlete_documents')
                .select('id, atleta_user_id, file_path, title, doc_type')
                .in('atleta_user_id', atletaIds)
            : Promise.resolve({ data: [] as any[] }),
          atletaIds.length
            ? admin
                .from('profiles')
                .select('user_id, first_name, last_name, email')
                .in('user_id', atletaIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
        const athletes = (conns ?? []).map((c) => {
          const p: any = pmap.get(c.atleta_user_id);
          const aDocs = (docs ?? []).filter((d: any) => d.atleta_user_id === c.atleta_user_id);
          const aEvents = (events ?? []).filter(
            (e) => e.atleta_user_id === c.atleta_user_id && !e.is_cancelled,
          );
          return {
            atleta_user_id: c.atleta_user_id,
            name:
              [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() ||
              p?.email ||
              c.atleta_user_id.slice(0, 8),
            email: p?.email ?? '',
            status: c.status,
            docsTotal: aDocs.length,
            docsGhost: aDocs.filter((d: any) => !d.file_path).length,
            appointments: aEvents.filter((e) => e.category === 'appuntamento').length,
            events: aEvents.filter((e) => e.category === 'evento').length,
            docs: aDocs,
          };
        });
        return json({
          athletes,
          eventsTotal: (events ?? []).filter((e) => !e.is_cancelled).length,
        });
      }

      case 'fix_ghost_documents': {
        const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string') : [];
        if (!ids.length) return json({ ok: true, removed: 0 });
        const { error } = await admin.from('athlete_documents').delete().in('id', ids);
        if (error) return json({ error: error.message }, 500);
        await logAudit({
          action: 'fix_ghost_documents',
          resource: 'audit:athlete_documents',
          details: { removed_ids: ids, count: ids.length },
        });
        return json({ ok: true, removed: ids.length });
      }

      case 'fix_multi_active': {
        const groups: Array<{ atleta_user_id: string; rows: { id: string }[] }> =
          Array.isArray(body?.groups) ? body.groups : [];
        const corrected: string[] = [];
        for (const g of groups) {
          const sorted = [...g.rows].sort((a, b) => a.id.localeCompare(b.id));
          const toTerminate = sorted.slice(0, -1).map((r) => r.id);
          if (toTerminate.length) {
            const { error } = await admin
              .from('pt_atleta_connections')
              .update({ status: 'terminated', terminated_at: new Date().toISOString() })
              .in('id', toTerminate);
            if (error) return json({ error: error.message }, 500);
            corrected.push(g.atleta_user_id);
          }
        }
        await logAudit({
          action: 'fix_multi_active_connections',
          resource: 'audit:pt_atleta_connections',
          details: { atleti_corretti: corrected },
        });
        return json({ ok: true, corrected });
      }

      case 'fix_duplicate_appointments': {
        const groups: Array<Array<{ id: string }>> = Array.isArray(body?.groups) ? body.groups : [];
        const toDelete: string[] = [];
        for (const g of groups) {
          const sorted = [...g].sort((a, b) => a.id.localeCompare(b.id));
          toDelete.push(...sorted.slice(1).map((r) => r.id));
        }
        if (toDelete.length) {
          const { error } = await admin.from('calendar_events').delete().in('id', toDelete);
          if (error) return json({ error: error.message }, 500);
        }
        await logAudit({
          action: 'fix_duplicate_appointments',
          resource: 'audit:calendar_events',
          details: { removed_ids: toDelete, count: toDelete.length },
        });
        return json({ ok: true, removed: toDelete.length });
      }

      case 'sign_document_url': {
        const docId = String(body?.document_id ?? '');
        if (!docId) return json({ error: 'document_id required' }, 400);
        const { data: doc, error: docErr } = await admin
          .from('athlete_documents')
          .select('id, file_path, title, atleta_user_id')
          .eq('id', docId)
          .maybeSingle();
        if (docErr) return json({ error: docErr.message }, 500);
        if (!doc?.file_path) return json({ error: 'Document has no file' }, 404);
        const { data: signed, error: sErr } = await admin.storage
          .from('athlete-documents')
          .createSignedUrl(doc.file_path, 60);
        if (sErr || !signed?.signedUrl) {
          return json({ error: sErr?.message || 'Failed to sign URL' }, 500);
        }
        await logAudit({
          action: 'sign_document_url',
          resource: 'audit:storage',
          resource_id: doc.id,
          details: { atleta_user_id: doc.atleta_user_id, title: doc.title },
        });
        return json({ signedUrl: signed.signedUrl, title: doc.title });
      }

      case 'recent_logs': {
        const { data } = await admin
          .from('audit_logs')
          .select('id, user_id, action, resource, resource_id, details, created_at')
          .like('resource', 'audit%')
          .order('created_at', { ascending: false })
          .limit(20);
        return json({ logs: data ?? [] });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    return json({ error: e?.message || 'Internal error' }, 500);
  }
});
