import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAdminStats } from '@/hooks/useAdminStats';
import { KPICard, KPICardColored } from '@/components/dashboard/KPICard';
import { SectionCard, InfoSection } from '@/components/dashboard/SectionCard';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardStatusBadge, TagBadge } from '@/components/dashboard/DashboardStatusBadge';
import { AdminRevenueCharts } from '@/components/dashboard/AdminRevenueCharts';
import { 
  Users, 
  UserCog, 
  Activity, 
  TrendingUp, 
  LayoutDashboard,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  ArrowRight,
  BarChart3,
  Shield
} from 'lucide-react';

// =====================================================
// ADMIN DASHBOARD - Dashboard principale
// Design: KPI cards, sezioni con bordo colorato
// =====================================================

export function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();

  // Fetch pending PT approvals
  const { data: pendingPTs } = useQuery({
    queryKey: ['admin-pending-pts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_profiles')
        .select(`
          id,
          user_id,
          status,
          created_at,
          specializations
        `)
        .eq('status', 'registrato')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch profiles
      const ptsWithProfiles = await Promise.all(
        (data || []).map(async (pt) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', pt.user_id)
            .single();
          return { ...pt, profile };
        })
      );

      return ptsWithProfiles;
    },
  });

  return (
    <div className="space-y-6 animate-in" data-tour="admin-dashboard">
      {/* Page header */}
      <DashboardPageHeader
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Dashboard Admin"
        subtitle={`Benvenuto • Panoramica del sistema`}
        badges={
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {stats?.total_pts || 0} PT
            </Badge>
            <Badge variant="outline" className="bg-success/5 text-success border-success/20">
              {stats?.active_pts || 0} attivi
            </Badge>
          </div>
        }
      />

      {/* Primary KPI Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KPICard
              title="Personal Trainers"
              value={stats?.total_pts ?? 0}
              subtitle="Totali nel sistema"
              icon={Users}
              iconColor="primary"
            />
            <KPICard
              title="PT Attivi"
              value={stats?.active_pts ?? 0}
              subtitle="Approvati"
              icon={UserCog}
              iconColor="success"
            />
            <KPICard
              title="Atleti"
              value={stats?.total_athletes ?? 0}
              subtitle={`${stats?.connected_athletes ?? 0} collegati`}
              icon={Activity}
              iconColor="info"
            />
            <KPICard
              title="Abbonamenti"
              value={stats?.active_subscriptions ?? 0}
              subtitle="Attivi"
              icon={TrendingUp}
              iconColor="warning"
            />
          </>
        )}
      </div>

      {/* Dashboard KPI Section */}
      <SectionCard
        title="Dashboard KPI"
        subtitle="Panoramica delle performance"
        icon={BarChart3}
        iconColor="primary"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICardColored
            title="Tasso Collegamento"
            value={stats?.total_athletes ? `${Math.round((stats.connected_athletes / stats.total_athletes) * 100)}%` : '0%'}
            subtitle="Atleti collegati"
            icon={TrendingUp}
            color="blue"
          />
          <KPICardColored
            title="PT Attivi"
            value={stats?.active_pts ?? 0}
            subtitle="Approvati"
            icon={UserCog}
            color="green"
          />
          <KPICardColored
            title="Ticket Aperti"
            value={stats?.open_tickets ?? 0}
            subtitle="Da gestire"
            icon={Clock}
            color="yellow"
          />
          <KPICardColored
            title="In attesa"
            value={stats?.pending_pts ?? 0}
            subtitle="PT da approvare"
            icon={Clock}
            color="purple"
          />
        </div>
      </SectionCard>

      {/* Two columns section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending PT Approvals */}
        <InfoSection
          title="PT in attesa di approvazione"
          icon={AlertCircle}
          iconColor="yellow"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/pts">
                Vedi tutti
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {pendingPTs && pendingPTs.length > 0 ? (
            <div className="space-y-3">
              {pendingPTs.map((pt) => (
                <div 
                  key={pt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {pt.profile?.first_name} {pt.profile?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {pt.profile?.email}
                    </p>
                  </div>
                  <DashboardStatusBadge status="pending" label="In attesa" size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Nessuna richiesta in attesa</p>
            </div>
          )}
        </InfoSection>

        {/* Distribution by Region placeholder */}
        <InfoSection
          title="Distribuzione per Regione"
          icon={BarChart3}
          iconColor="blue"
        >
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Nessun dato disponibile</p>
          </div>
        </InfoSection>
      </div>

      {/* Platform Revenue Analytics */}
      <AdminRevenueCharts />

      {/* Quick Actions CTA */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Gestisci Personal Trainers</p>
                <p className="text-sm text-muted-foreground">
                  Approva, sospendi o gestisci i PT della piattaforma
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/admin/pts">
                Vai alla gestione
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminDashboard;
