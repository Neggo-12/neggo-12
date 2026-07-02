import { useMemo } from 'react';
import {
  Eye, MousePointer, Users, Target, TrendingUp, DollarSign,
  Calendar, MapPin, Play, Pause, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { campaigns } from '@/data/mock';
import { cn } from '@/lib/utils';
import CrearCampanaDialog from '@/components/bank/CrearCampanaDialog';

const statusConfig = {
  activa: { label: 'Activa', icon: Play, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  pausada: { label: 'Pausada', icon: Pause, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  finalizada: { label: 'Finalizada', icon: CheckCircle2, bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

const campaignTypeLabels: Record<string, string> = {
  cdt: 'CDT',
  hipotecario: 'Hipotecario',
  'compra-cartera': 'Compra Cartera',
  tarjetas: 'Tarjetas',
  libranzas: 'Libranzas',
  vehiculos: 'Vehículos',
  inversiones: 'Inversiones',
};

export default function CampanasTab() {
  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => ({
        impressions: acc.impressions + c.impressions,
        leads: acc.leads + c.leadsGenerated,
        conversions: acc.conversions + c.conversions,
        budget: acc.budget + c.budget,
        spent: acc.spent + c.spent,
      }),
      { impressions: 0, leads: 0, conversions: 0, budget: 0, spent: 0 }
    );
  }, []);

  const totalROI = totals.spent > 0 ? ((totals.conversions * 5000000 - totals.spent) / totals.spent * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Centro de Campañas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {campaigns.filter((c) => c.status === 'activa').length} activas · {campaigns.length} totales
          </p>
        </div>
        <CrearCampanaDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'Impresiones', value: (totals.impressions / 1000).toFixed(0) + 'K', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Leads Generados', value: totals.leads.toLocaleString(), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Conversiones', value: totals.conversions.toLocaleString(), icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Tasa Conv.', value: ((totals.conversions / totals.leads) * 100).toFixed(1) + '%', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Presupuesto', value: '$' + (totals.budget / 1000000).toFixed(1) + 'M', icon: DollarSign, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'ROI Estimado', value: (totalROI > 0 ? '+' : '') + totalROI.toFixed(0) + '%', icon: TrendingUp, color: totalROI >= 0 ? 'text-emerald-400' : 'text-red-400', bg: totalROI >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
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

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {campaigns.map((campaign) => {
          const status = statusConfig[campaign.status];
          const spentPct = (campaign.spent / campaign.budget) * 100;
          const convRate = campaign.leadsGenerated > 0 ? (campaign.conversions / campaign.leadsGenerated) * 100 : 0;
          const roi = campaign.spent > 0 ? ((campaign.conversions * 5000000 - campaign.spent) / campaign.spent * 100) : 0;

          return (
            <div
              key={campaign.id}
              className="group relative overflow-hidden rounded-xl border border-border/40 bg-card/40 p-5 transition-all hover:border-border/60 hover:bg-card/60"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] border-border/40 bg-secondary/40">
                      {campaignTypeLabels[campaign.type]}
                    </Badge>
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', status.bg, status.text, status.border)}>
                      <status.icon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{campaign.name}</h3>
                  <p className="text-xs text-muted-foreground">{campaign.bank}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground font-mono">{campaign.avgScore}</div>
                  <div className="text-[10px] text-muted-foreground">Score Promedio</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground font-mono">{(campaign.impressions / 1000).toFixed(0)}K</div>
                  <div className="text-[10px] text-muted-foreground">Impresiones</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground font-mono">{campaign.ctr}%</div>
                  <div className="text-[10px] text-muted-foreground">CTR</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground font-mono">{campaign.leadsGenerated}</div>
                  <div className="text-[10px] text-muted-foreground">Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground font-mono">{convRate.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted-foreground">Conv.</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Presupuesto</span>
                  <span className="font-mono">
                    <span className="text-foreground">${(campaign.spent / 1000000).toFixed(1)}M</span>
                    <span className="text-muted-foreground"> / ${(campaign.budget / 1000000).toFixed(1)}M</span>
                  </span>
                </div>
                <Progress value={spentPct} className="h-1.5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">ROI Estimado</span>
                  <span className={cn('font-mono font-semibold', roi >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(campaign.startDate).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })} - {new Date(campaign.endDate).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {campaign.cities.length} ciudades
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
