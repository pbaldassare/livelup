import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionCard } from './SectionCard';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Users, CreditCard, Activity, Euro } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// ADMIN REVENUE CHARTS
// Grafici per guadagni piattaforma e metriche PT
// =====================================================

interface MonthlyPlatformRevenue {
  month: string;
  totalRevenue: number;
  ptCount: number;
  athleteCount: number;
  subscriptionCount: number;
}

interface PTRevenueData {
  ptName: string;
  revenue: number;
  subscriptions: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--info))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(212, 95%, 68%)',
  'hsl(280, 67%, 63%)',
];

export function AdminRevenueCharts() {
  // Fetch platform-wide analytics
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['admin-platform-analytics'],
    queryFn: async () => {
      // Get last 6 months
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 5);
      const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: startOfMonth(now) });

      // Fetch all PT subscriptions (atleta_pt_subscriptions)
      const { data: subscriptions, error: subError } = await supabase
        .from('atleta_pt_subscriptions')
        .select('*')
        .order('started_at', { ascending: true });

      if (subError) throw subError;

      // Fetch all PTs
      const { data: pts, error: ptError } = await supabase
        .from('pt_profiles')
        .select('user_id, status')
        .eq('status', 'attivo');

      if (ptError) throw ptError;

      // Fetch PT profiles for names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name');

      // Calculate monthly platform metrics
      const monthlyData: MonthlyPlatformRevenue[] = months.map(monthDate => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        // Total revenue from PT subscriptions this month
        const totalRevenue = (subscriptions || [])
          .filter(sub => {
            const startDate = new Date(sub.started_at);
            return startDate >= monthStart && startDate <= monthEnd;
          })
          .reduce((sum, sub) => sum + (sub.price_paid || 0), 0);

        // Active subscriptions this month
        const activeSubscriptions = (subscriptions || [])
          .filter(sub => {
            const startDate = new Date(sub.started_at);
            return startDate <= monthEnd && sub.status === 'attivo';
          }).length;

        // Unique PTs with subscriptions
        const activePTs = new Set(
          (subscriptions || [])
            .filter(sub => {
              const startDate = new Date(sub.started_at);
              return startDate <= monthEnd && sub.status === 'attivo';
            })
            .map(sub => sub.pt_user_id)
        ).size;

        // Unique athletes
        const uniqueAthletes = new Set(
          (subscriptions || [])
            .filter(sub => {
              const startDate = new Date(sub.started_at);
              return startDate <= monthEnd && sub.status === 'attivo';
            })
            .map(sub => sub.atleta_user_id)
        ).size;

        return {
          month: format(monthDate, 'MMM', { locale: it }),
          totalRevenue,
          ptCount: activePTs,
          athleteCount: uniqueAthletes,
          subscriptionCount: activeSubscriptions,
        };
      });

      // Revenue by PT (top 7)
      const ptRevenueMap = new Map<string, { revenue: number; subscriptions: number }>();
      (subscriptions || []).forEach(sub => {
        const current = ptRevenueMap.get(sub.pt_user_id) || { revenue: 0, subscriptions: 0 };
        ptRevenueMap.set(sub.pt_user_id, {
          revenue: current.revenue + (sub.price_paid || 0),
          subscriptions: current.subscriptions + 1,
        });
      });

      const ptRevenueData: PTRevenueData[] = Array.from(ptRevenueMap.entries())
        .map(([ptId, data]) => {
          const profile = profiles?.find(p => p.user_id === ptId);
          return {
            ptName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'PT' : 'PT',
            revenue: data.revenue,
            subscriptions: data.subscriptions,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 7);

      // Calculate totals
      const totalRevenue = monthlyData.reduce((sum, d) => sum + d.totalRevenue, 0);
      const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.totalRevenue || 0;
      const prevMonthRevenue = monthlyData[monthlyData.length - 2]?.totalRevenue || 0;
      const revenueGrowth = prevMonthRevenue > 0 
        ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
        : 0;

      return {
        monthlyData,
        ptRevenueData,
        totalRevenue,
        currentMonthRevenue,
        revenueGrowth,
        totalPTs: pts?.length || 0,
        totalSubscriptions: subscriptions?.length || 0,
        activeSubscriptions: subscriptions?.filter(s => s.status === 'attivo').length || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <SectionCard
        title="Analytics Piattaforma"
        subtitle="Caricamento dati..."
        icon={Euro}
        iconColor="green"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </SectionCard>
    );
  }

  if (!analyticsData) return null;

  return (
    <SectionCard
      title="Analytics Piattaforma"
      subtitle="Revenue e metriche degli ultimi 6 mesi"
      icon={Euro}
      iconColor="green"
    >
      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Revenue Totale</span>
            </div>
            <p className="text-2xl font-bold">€{analyticsData.totalRevenue.toLocaleString('it-IT')}</p>
            <span className="text-xs text-muted-foreground">
              da {analyticsData.totalSubscriptions} abbonamenti
            </span>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-info" />
              <span className="text-sm text-muted-foreground">Questo Mese</span>
            </div>
            <p className="text-2xl font-bold">€{analyticsData.currentMonthRevenue.toLocaleString('it-IT')}</p>
            {analyticsData.revenueGrowth !== 0 && (
              <span className={`text-xs ${analyticsData.revenueGrowth > 0 ? 'text-success' : 'text-destructive'}`}>
                {analyticsData.revenueGrowth > 0 ? '+' : ''}{analyticsData.revenueGrowth}% vs mese prec.
              </span>
            )}
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">PT Attivi</span>
            </div>
            <p className="text-2xl font-bold">{analyticsData.totalPTs}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">Abbonamenti Attivi</span>
            </div>
            <p className="text-2xl font-bold">{analyticsData.activeSubscriptions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Piattaforma</CardTitle>
            <CardDescription>Andamento revenue mensile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.monthlyData}>
                  <defs>
                    <linearGradient id="colorPlatformRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `€${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalRevenue" 
                    stroke="hsl(var(--success))" 
                    fillOpacity={1} 
                    fill="url(#colorPlatformRevenue)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* PT & Athletes Growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Crescita Utenti</CardTitle>
            <CardDescription>PT e atleti attivi nel tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="ptCount" 
                    name="PT Attivi" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="athleteCount" 
                    name="Atleti" 
                    stroke="hsl(var(--info))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--info))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by PT (Bar Chart) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top PT per Revenue</CardTitle>
            <CardDescription>I Personal Trainer con più guadagni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.ptRevenueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `€${value}`}
                  />
                  <YAxis 
                    dataKey="ptName" 
                    type="category"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuzione Revenue</CardTitle>
            <CardDescription>Quota revenue per PT</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.ptRevenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="revenue"
                    nameKey="ptName"
                    label={({ ptName, percent }) => `${ptName.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {analyticsData.ptRevenueData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </SectionCard>
  );
}

export default AdminRevenueCharts;
