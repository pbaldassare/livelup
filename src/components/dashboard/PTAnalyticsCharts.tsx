import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  Legend
} from 'recharts';
import { TrendingUp, Users, CreditCard, Activity } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// PT ANALYTICS CHARTS
// Grafici per revenue, abbonamenti e retention
// =====================================================

interface MonthlyData {
  month: string;
  revenue: number;
  subscriptions: number;
  athletes: number;
}

interface RetentionData {
  month: string;
  retained: number;
  churned: number;
  rate: number;
}

export function PTAnalyticsCharts() {
  const { user } = useAuth();

  // Fetch monthly revenue and subscription data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['pt-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get last 6 months
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 5);
      const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: startOfMonth(now) });

      // Fetch all subscriptions for this PT
      const { data: subscriptions, error } = await supabase
        .from('atleta_pt_subscriptions')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('started_at', { ascending: true });

      if (error) throw error;

      // Calculate monthly metrics
      const monthlyData: MonthlyData[] = months.map(monthDate => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        // Revenue for this month (subscriptions started in this month)
        const monthlyRevenue = (subscriptions || [])
          .filter(sub => {
            const startDate = new Date(sub.started_at);
            return startDate >= monthStart && startDate <= monthEnd;
          })
          .reduce((sum, sub) => sum + (sub.price_paid || 0), 0);

        // Active subscriptions during this month
        const activeSubscriptions = (subscriptions || [])
          .filter(sub => {
            const startDate = new Date(sub.started_at);
            const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
            return startDate <= monthEnd && 
                   (sub.status === 'attivo' || 
                    (expiresAt && expiresAt >= monthStart));
          }).length;

        // Unique athletes with active subscriptions this month
        const uniqueAthletes = new Set(
          (subscriptions || [])
            .filter(sub => {
              const startDate = new Date(sub.started_at);
              const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
              return startDate <= monthEnd && 
                     (sub.status === 'attivo' || 
                      (expiresAt && expiresAt >= monthStart));
            })
            .map(sub => sub.atleta_user_id)
        ).size;

        return {
          month: format(monthDate, 'MMM', { locale: it }),
          revenue: monthlyRevenue,
          subscriptions: activeSubscriptions,
          athletes: uniqueAthletes,
        };
      });

      // Calculate retention data
      const retentionData: RetentionData[] = months.slice(1).map((monthDate, index) => {
        const prevMonth = months[index];
        const prevMonthStart = startOfMonth(prevMonth);
        const prevMonthEnd = endOfMonth(prevMonth);
        const currMonthStart = startOfMonth(monthDate);
        const currMonthEnd = endOfMonth(monthDate);

        // Athletes active in previous month
        const prevAthletes = new Set(
          (subscriptions || [])
            .filter(sub => {
              const startDate = new Date(sub.started_at);
              return startDate <= prevMonthEnd && sub.status === 'attivo';
            })
            .map(sub => sub.atleta_user_id)
        );

        // Athletes still active in current month
        const currAthletes = new Set(
          (subscriptions || [])
            .filter(sub => {
              const startDate = new Date(sub.started_at);
              return startDate <= currMonthEnd && sub.status === 'attivo';
            })
            .map(sub => sub.atleta_user_id)
        );

        // Retained = athletes active in both months
        const retained = [...prevAthletes].filter(id => currAthletes.has(id)).length;
        const churned = prevAthletes.size - retained;
        const rate = prevAthletes.size > 0 ? Math.round((retained / prevAthletes.size) * 100) : 100;

        return {
          month: format(monthDate, 'MMM', { locale: it }),
          retained,
          churned,
          rate,
        };
      });

      // Calculate totals
      const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
      const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
      const prevMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 0;
      const revenueGrowth = prevMonthRevenue > 0 
        ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
        : 0;

      return {
        monthlyData,
        retentionData,
        totalRevenue,
        currentMonthRevenue,
        revenueGrowth,
        avgRetention: retentionData.length > 0 
          ? Math.round(retentionData.reduce((sum, d) => sum + d.rate, 0) / retentionData.length)
          : 100,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <SectionCard
        title="Analytics"
        subtitle="Caricamento dati..."
        icon={TrendingUp}
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
      title="Analytics"
      subtitle="Performance degli ultimi 6 mesi"
      icon={TrendingUp}
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
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-info" />
              <span className="text-sm text-muted-foreground">Questo mese</span>
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
              <span className="text-sm text-muted-foreground">Retention Rate</span>
            </div>
            <p className="text-2xl font-bold">{analyticsData.avgRetention}%</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">Abbonamenti attivi</span>
            </div>
            <p className="text-2xl font-bold">
              {analyticsData.monthlyData[analyticsData.monthlyData.length - 1]?.subscriptions || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Mensile</CardTitle>
            <CardDescription>Andamento degli ultimi 6 mesi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
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
                    dataKey="revenue" 
                    stroke="hsl(var(--success))" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Abbonamenti Attivi</CardTitle>
            <CardDescription>Numero di abbonamenti e atleti nel tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.monthlyData}>
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
                  <Bar 
                    dataKey="subscriptions" 
                    name="Abbonamenti" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="athletes" 
                    name="Atleti" 
                    fill="hsl(var(--info))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Retention Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Retention Rate</CardTitle>
            <CardDescription>Tasso di fidelizzazione degli atleti mese su mese</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.retentionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'rate') return [`${value}%`, 'Retention Rate'];
                      return [value, name === 'retained' ? 'Mantenuti' : 'Persi'];
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    formatter={(value) => value === 'rate' ? 'Retention Rate' : value === 'retained' ? 'Mantenuti' : 'Persi'}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--success))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </SectionCard>
  );
}

export default PTAnalyticsCharts;
