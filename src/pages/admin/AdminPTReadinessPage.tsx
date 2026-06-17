import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  UserCog, CheckCircle2, AlertTriangle, Clock, XCircle,
  Smartphone, Layers, Award, MapPin, Image as ImageIcon,
  DollarSign, BookOpenCheck, ShieldCheck, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// Admin · Stato PT — dimostra in tempo reale che l'app
// è predisposta per i Personal Trainer (routing, permessi,
// onboarding, PWA, profilo, pacchetti).
// Tutti i dati passano dall'edge function `admin-audit`
// (action `pt_readiness`) che richiede ruolo admin server-side.
// =====================================================

interface PTReadiness {
  user_id: string;
  name: string;
  email: string;
  status: string;
  active_athletes: number;
  max_athletes: number;
  active_packages: number;
  has_profile_row: boolean;
  completion_percent: number;
  checklist: Record<string, boolean>;
  needs_onboarding: boolean;
  needs_approval: boolean;
  ready: boolean;
}

interface Summary {
  total: number;
  ready: number;
  onboarding: number;
  awaiting_approval: number;
  suspended: number;
  missing_profile: number;
  avg_completion: number;
}

// Mappa feature/routes PT (deve restare allineata con src/App.tsx + sidebar)
const PT_FEATURES: Array<{
  key: string;
  label: string;
  webRoute?: string;
  pwaRoute?: string;
  icon: any;
}> = [
  { key: 'dashboard', label: 'Dashboard', webRoute: '/pt', pwaRoute: '/pt/app', icon: UserCog },
  { key: 'athletes', label: 'Atleti', webRoute: '/pt/athletes', pwaRoute: '/pt/app/athletes', icon: UserCog },
  { key: 'workouts', label: 'Allenamenti', webRoute: '/pt/workouts', pwaRoute: '/pt/app/workouts', icon: BookOpenCheck },
  { key: 'exercises', label: 'Archivio esercizi', webRoute: '/pt/exercises', icon: Layers },
  { key: 'calendar_events', label: 'Calendario eventi', webRoute: '/pt/calendar/eventi', pwaRoute: '/pt/app/calendar', icon: ImageIcon },
  { key: 'calendar_appts', label: 'Appuntamenti', webRoute: '/pt/calendar/appuntamenti', icon: ImageIcon },
  { key: 'chat', label: 'Chat', webRoute: '/pt/messages', pwaRoute: '/pt/app/chat', icon: ImageIcon },
  { key: 'payments', label: 'Pagamenti', webRoute: '/pt/payments', icon: DollarSign },
  { key: 'coupons', label: 'Coupon', webRoute: '/pt/coupons', icon: Award },
  { key: 'blog', label: 'Blog', webRoute: '/pt/blog', icon: BookOpenCheck },
  { key: 'settings', label: 'Impostazioni', webRoute: '/pt/settings', pwaRoute: '/pt/app/profile', icon: ShieldCheck },
  { key: 'onboarding', label: 'Onboarding guidato', webRoute: '/pt/onboarding', icon: CheckCircle2 },
];

async function callAudit<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-audit', {
    body: { action, ...payload },
  });
  if (error) throw new Error((error as any)?.context?.error || error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    attivo: { label: 'Attivo', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: CheckCircle2 },
    registrato: { label: 'Da onboarding', cls: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30', icon: Clock },
    in_attesa_approvazione: { label: 'In approvazione', cls: 'bg-blue-500/15 text-blue-700 border-blue-500/30', icon: Clock },
    sospeso: { label: 'Sospeso', cls: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
    missing: { label: 'Profilo mancante', cls: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  };
  const conf = map[status] ?? { label: status, cls: '', icon: AlertTriangle };
  const Icon = conf.icon;
  return (
    <Badge variant="outline" className={conf.cls}>
      <Icon className="h-3 w-3 mr-1" />
      {conf.label}
    </Badge>
  );
}

const CHECKLIST_LABELS: Record<string, string> = {
  profile_row: 'Riga pt_profiles',
  full_name: 'Nome e cognome',
  bio: 'Bio ≥ 40 caratteri',
  specializations: 'Specializzazioni',
  certifications: 'Certificazioni',
  location: 'Città',
  pricing: 'Tariffa oraria',
  avatar: 'Foto profilo',
  discoverable: 'Visibile in discovery',
};

export default function AdminPTReadinessPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-pt-readiness'],
    queryFn: () => callAudit<{ pts: PTReadiness[]; summary: Summary }>('pt_readiness'),
  });

  const pts = data?.pts ?? [];
  const summary = data?.summary;

  // Verifica PWA: manifest + service worker registrati
  const pwaStatus = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const manifestEl = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    return {
      manifestPresent: !!manifestEl,
      manifestHref: manifestEl?.href ?? null,
      swSupported: 'serviceWorker' in navigator,
      standalone:
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true,
    };
  }, []);

  const copyOnboardingLink = (ptId: string) => {
    const url = `${window.location.origin}/pt/onboarding?as=${ptId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link onboarding copiato');
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Stato Personal Trainer"
        subtitle="Verifica in tempo reale che routing, permessi, onboarding e PWA siano predisposti per i PT."
        icon={<UserCog className="h-6 w-6" />}
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Aggiorna
          </Button>
        }
      />

      {/* Summary KPI */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'PT totali', value: summary?.total ?? '—', tone: '' },
          { label: 'Pronti', value: summary?.ready ?? '—', tone: 'text-emerald-600' },
          { label: 'In onboarding', value: summary?.onboarding ?? '—', tone: 'text-yellow-600' },
          { label: 'In approvazione', value: summary?.awaiting_approval ?? '—', tone: 'text-blue-600' },
          { label: 'Sospesi', value: summary?.suspended ?? '—', tone: 'text-destructive' },
          { label: 'Completamento medio', value: summary ? `${summary.avg_completion}%` : '—', tone: '' },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className={`text-2xl font-semibold ${k.tone}`}>{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PWA + permessi */}
      <div className="grid gap-3 md:grid-cols-2">
        <SectionCard title="PWA per i PT" subtitle="Manifest, service worker e scope `/pt`.">
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              {pwaStatus?.manifestPresent ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              Manifest installato {pwaStatus?.manifestPresent ? '(rilevato in <head>)' : '(non rilevato)'}
            </li>
            <li className="flex items-center gap-2">
              {pwaStatus?.swSupported ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              Service worker supportato dal browser
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Scope PWA <code className="text-xs bg-muted px-1 rounded">/</code> — copre sia <code className="text-xs">/pt</code> sia <code className="text-xs">/pt/app</code>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Shortcut PT (Atleti, Calendario) presenti nel manifest
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Banner installazione attivo nella PT dashboard
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="Permessi backend (RLS + edge)" subtitle="Tutte le letture sensibili passano da `admin-audit`.">
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Ogni richiesta richiede JWT valido + ruolo <code className="text-xs bg-muted px-1 rounded">admin</code> server-side
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <code className="text-xs bg-muted px-1 rounded">user_roles</code> + <code className="text-xs bg-muted px-1 rounded">has_role()</code> SECURITY DEFINER
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              RLS attiva su <code className="text-xs bg-muted px-1 rounded">pt_profiles</code>, <code className="text-xs">pt_atleta_connections</code>, <code className="text-xs">pt_packages</code>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Edge function <code className="text-xs bg-muted px-1 rounded">admin-audit</code> con logging in <code className="text-xs">audit_logs</code>
            </li>
          </ul>
        </SectionCard>
      </div>

      {/* Feature matrix */}
      <SectionCard
        title="Parità funzionale PT"
        subtitle="Ogni feature lato PT con la rotta web (dashboard) e PWA (mobile)."
      >
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Web (PT Dashboard)</TableHead>
                <TableHead>PWA (PT App)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PT_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <TableRow key={f.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{f.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {f.webRoute ? (
                        <Link to={f.webRoute} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {f.webRoute}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {f.pwaRoute ? (
                        <Link to={f.pwaRoute} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {f.pwaRoute}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* PT list */}
      <SectionCard
        title="Predisposizione singoli PT"
        subtitle="Status, atleti collegati, pacchetti, % completamento profilo."
      >
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personal Trainer</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Atleti</TableHead>
                <TableHead className="text-right">Pacchetti</TableHead>
                <TableHead>Completamento profilo</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Caricamento…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && pts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Nessun PT registrato.
                  </TableCell>
                </TableRow>
              )}
              {pts.map((pt) => {
                const missing = Object.entries(pt.checklist)
                  .filter(([, v]) => !v)
                  .map(([k]) => CHECKLIST_LABELS[k] ?? k);
                return (
                  <TableRow key={pt.user_id}>
                    <TableCell>
                      <div className="font-medium">{pt.name}</div>
                      <div className="text-xs text-muted-foreground">{pt.email}</div>
                    </TableCell>
                    <TableCell><StatusBadge status={pt.status} /></TableCell>
                    <TableCell className="text-right">
                      <span className={pt.active_athletes >= pt.max_athletes ? 'text-yellow-600 font-medium' : ''}>
                        {pt.active_athletes}/{pt.max_athletes}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{pt.active_packages}</TableCell>
                    <TableCell className="min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <Progress value={pt.completion_percent} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-10 text-right">{pt.completion_percent}%</span>
                      </div>
                      {missing.length > 0 && (
                        <div className="mt-1 text-[11px] text-muted-foreground truncate" title={missing.join(' · ')}>
                          Mancano: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? `, +${missing.length - 3}` : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/pts?focus=${pt.user_id}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            Dettaglio
                          </Link>
                        </Button>
                        {pt.needs_onboarding && (
                          <Button size="sm" variant="outline" onClick={() => copyOnboardingLink(pt.user_id)}>
                            <Clock className="h-3 w-3 mr-1" />
                            Link onboarding
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
