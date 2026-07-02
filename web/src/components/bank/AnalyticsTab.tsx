import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Target, Award, BarChart3, MapPin, UserCheck } from 'lucide-react';
import { leads, campaigns } from '@/data/mock';
import { cn } from '@/lib/utils';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function AnalyticsTab() {
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    const order = ['pendiente', 'contactado', 'en-proceso', 'documentacion', 'viable', 'aprobado', 'desembolsado'];
    return order.map((s) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' '),
      value: counts[s] || 0,
    }));
  }, []);

  const scoreDistribution = useMemo(() => {
    const ranges = [
      { name: '300-550', min: 300, max: 550 },
      { name: '551-700', min: 551, max: 700 },
      { name: '701-850', min: 701, max: 850 },
      { name: '851-950', min: 851, max: 950 },
    ];
    return ranges.map((r) => ({
      name: r.name,
      value: leads.filter((l) => l.score >= r.min && l.score <= r.max).length,
    }));
  }, []);

  const productData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { counts[l.product] = (counts[l.product] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1).replace('-', ' '),
      value: v,
    }));
  }, []);

  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { counts[l.city] = (counts[l.city] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: k, value: v }));
  }, []);

  const campaignPerformance = useMemo(() => {
    return campaigns.map((c) => ({
      name: c.name.slice(0, 18) + (c.name.length > 18 ? '...' : ''),
      leads: c.leadsGenerated,
      conversions: c.conversions,
      ctr: c.ctr,
      score: c.avgScore,
    }));
  }, []);

  const trendData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      day: `D${i + 1}`,
      leads: Math.floor(20 + Math.random() * 40),
      conversions: Math.floor(5 + Math.random() * 15),
    }));
  }, []);

  const avgScoreByProduct = useMemo(() => {
    const groups: Record<string, number[]> = {};
    leads.forEach((l) => {
      if (!groups[l.product]) groups[l.product] = [];
      groups[l.product].push(l.score);
    });
    return Object.entries(groups).map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1).replace('-', ' '),
      score: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
    }));
  }, []);

  return (
    <div className="space-y-5">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Score Promedio', value: Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length), icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Leads por Campaña', value: Math.round(leads.length / campaigns.length), icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Ciudades Activas', value: [...new Set(leads.map((l) => l.city))].length, icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Ejecutivos Activos', value: [...new Set(leads.map((l) => l.assignedTo))].length, icon: UserCheck, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', stat.bg)}>
                <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground font-mono">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Funnel de Conversión" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" horizontal={false} />
              <XAxis type="number" stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} width={100} />
              <RechartsTooltip
                contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: 'hsl(210 40% 98%)' }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución por Score" icon={Award}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={scoreDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
                fontSize={11}
              >
                {scoreDistribution.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: 'hsl(210 40% 98%)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Rendimiento por Campaña" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={campaignPerformance} margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip
                contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: 'hsl(210 40% 98%)' }}
              />
              <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="conversions" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tendencia de Leads (14 días)" icon={Users}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData} margin={{ left: 0, right: 20 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip
                contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: 'hsl(210 40% 98%)' }}
              />
              <Area type="monotone" dataKey="leads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
              <Area type="monotone" dataKey="conversions" stroke="#10b981" fillOpacity={1} fill="url(#colorConv)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Leads por Producto" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={productData} margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" fontSize={10} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={60} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip
                contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: 'hsl(210 40% 98%)' }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Score Promedio por Producto" icon={Award}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={avgScoreByProduct} margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" fontSize={10} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={60} />
              <YAxis domain={[300, 950]} stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip
                contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: 'hsl(210 40% 98%)' }}
              />
              <Bar dataKey="score" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* City Heatmap Table */}
      <ChartCard title="Distribución por Ciudad" icon={MapPin}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {cityData.map((city, i) => {
            const maxVal = Math.max(...cityData.map((c) => c.value));
            const intensity = city.value / maxVal;
            return (
              <div
                key={city.name}
                className="relative overflow-hidden rounded-lg border border-border/30 p-4 text-center transition-all hover:border-border/60"
                style={{ background: `hsl(160 84% 39% / ${0.05 + intensity * 0.2})` }}
              >
                <div className="text-lg font-bold text-foreground font-mono">{city.value}</div>
                <div className="text-xs text-muted-foreground">{city.name}</div>
                <div
                  className="absolute bottom-0 left-0 h-1 rounded-full bg-emerald-500/60 transition-all"
                  style={{ width: `${intensity * 100}%` }}
                />
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
