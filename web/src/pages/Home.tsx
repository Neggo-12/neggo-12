import { Link } from "react-router-dom";
import {
  Building2,
  HomeIcon,
  LayoutGrid,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  ArrowUpRight,
  Clock,
  PhoneCall,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Activity,
  Zap,
  Gauge,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leads, campaigns, proyectos, leadsInmobiliarios, feedbacks, pipelineStatus } from "@/data/mock";
import { useState, useEffect } from "react";

// ── Animated counter ──────────────────────────────────────────
function AnimatedValue({
  value,
  suffix = "",
  prefix = "",
}: {
  value: number;
  suffix?: string;
  prefix?: string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 900;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="font-mono font-bold tracking-tight">
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Live dot indicator ─────────────────────────────────────────
function LiveDot({ color = "emerald" }: { color?: "emerald" | "amber" | "red" }) {
  const colors = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
          colors[color]
        )}
      />
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", colors[color])} />
    </span>
  );
}

// ── Module card ────────────────────────────────────────────────
interface ModuleCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: "emerald" | "blue" | "amber";
  stats: { label: string; value: string }[];
  tag?: string;
}

function ModuleCard({ to, icon: Icon, title, description, gradient, stats, tag }: ModuleCardProps) {
  const borders = {
    emerald: "border-emerald-500/20 hover:border-emerald-500/40",
    blue: "border-blue-500/20 hover:border-blue-500/40",
    amber: "border-amber-500/20 hover:border-amber-500/40",
  };

  const glows = {
    emerald: "hover:shadow-emerald-500/10",
    blue: "hover:shadow-blue-500/10",
    amber: "hover:shadow-amber-500/10",
  };

  const iconBgs = {
    emerald: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20",
  };

  const accentBars = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
  };

  const tagStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm",
        "transition-all duration-500 hover:scale-[1.015] hover:shadow-2xl",
        borders[gradient],
        glows[gradient]
      )}
    >
      {/* Top accent line */}
      <div className={cn("absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100", accentBars[gradient])} />

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex flex-col p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl transition-colors", iconBgs[gradient])}>
            <Icon className="h-6 w-6" />
          </div>
          {tag && (
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", tagStyles[gradient])}>
              {tag}
            </span>
          )}
        </div>

        {/* Title + description */}
        <h3 className="text-lg font-bold text-foreground tracking-tight mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">{description}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-0.5">
              <div className="text-lg font-bold text-foreground font-mono">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          <span>Ingresar al módulo</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

// ── Activity item ──────────────────────────────────────────────
interface ActivityItemProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  time: string;
  badge?: string;
  badgeColor?: string;
}

function ActivityItem({ icon: Icon, iconColor, iconBg, title, subtitle, time, badge, badgeColor }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 border-b border-border/30 last:border-0">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {badge && (
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", badgeColor)}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <span className="shrink-0 text-[10px] font-mono text-muted-foreground mt-1">{time}</span>
    </div>
  );
}

// ── Home Page ──────────────────────────────────────────────────
export default function Home() {
  const activeCampaigns = campaigns.filter((c) => c.status === "activa").length;
  const activeProjects = proyectos.filter((p) => p.status === "activo").length;
  const totalLeads = leads.length + leadsInmobiliarios.length;
  const totalConverted =
    leads.filter((l) => l.status === "aprobado" || l.status === "desembolsado").length +
    leadsInmobiliarios.filter((l) => l.status === "aprobado").length;
  const conversionRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : "0";
  const avgScore =
    [...leads, ...leadsInmobiliarios].reduce((sum, l) => sum + l.score, 0) / totalLeads;
  const pendingFeedback = feedbacks.filter((f) => f.status === "nuevo" || f.status === "en-proceso").length;
  const activeLeadsPipeline = pipelineStatus.reduce((sum, p) => sum + p.value, 0);

  // Derived activity items
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    .slice(0, 4);

  const recentFeedback = feedbacks
    .filter((f) => f.status === "nuevo" || f.status === "en-proceso")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ═══════════════════════════════════════════════════════
            HERO SECTION
           ═══════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm">
          {/* Background glow orbs */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/3 blur-2xl" />

          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Branding */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 glow-green">
                    <Sparkles className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                      Neggo
                    </h1>
                    <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-semibold mt-0.5">
                      Sistema Operativo Financiero
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Centro de operaciones integrado para bancos, constructoras y operadores comerciales.
                  Pipeline inteligente, scoring financiero y conversión táctica en un solo lugar.
                </p>
              </div>

              {/* Right: Live stats */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-4 py-3">
                  <LiveDot color="emerald" />
                  <div>
                    <div className="text-xs text-muted-foreground">Pipeline Activo</div>
                    <div className="text-lg font-bold font-mono text-foreground">
                      {activeLeadsPipeline.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-4 py-3">
                  <LiveDot color="emerald" />
                  <div>
                    <div className="text-xs text-muted-foreground">Campañas</div>
                    <div className="text-lg font-bold font-mono text-foreground">
                      {activeCampaigns} activas
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-4 py-3">
                  <LiveDot color="emerald" />
                  <div>
                    <div className="text-xs text-muted-foreground">Proyectos</div>
                    <div className="text-lg font-bold font-mono text-foreground">
                      {activeProjects} activos
                    </div>
                  </div>
                </div>

                {pendingFeedback > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <LiveDot color="amber" />
                    <div>
                      <div className="text-xs text-amber-400">Feedback Pendiente</div>
                      <div className="text-lg font-bold font-mono text-amber-400">{pendingFeedback}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SYSTEM STATUS BAR (compact)
           ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "API Core", latency: "42ms", uptime: "99.97%", icon: Zap, color: "emerald" },
            { label: "Datacrédito", latency: "128ms", uptime: "99.91%", icon: Gauge, color: "emerald" },
            { label: "Notificaciones", latency: "18ms", uptime: "99.99%", icon: Activity, color: "emerald" },
            { label: "Campañas", latency: "340ms", uptime: "98.45%", icon: Target, color: "amber" },
            { label: "Scoring", latency: "55ms", uptime: "99.89%", icon: BarChart3, color: "emerald" },
            { label: "Seguridad", latency: "12ms", uptime: "100%", icon: Shield, color: "emerald" },
          ].map((sys) => {
            const isOk = sys.color === "emerald";
            return (
              <div
                key={sys.label}
                className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 transition-all hover:border-border/80"
              >
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", isOk ? "bg-emerald-500/10" : "bg-amber-500/10")}>
                  <sys.icon className={cn("h-3.5 w-3.5", isOk ? "text-emerald-400" : "text-amber-400")} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", isOk ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground truncate">{sys.label}</span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">{sys.latency} · {sys.uptime}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════
            MODULE CARDS
           ═══════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Módulos Operativos</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ModuleCard
              to="/banca"
              icon={Building2}
              title="Banca"
              description="Centro táctico de leads financieros, scoring Datacrédito, campañas comerciales y seguimiento operativo en tiempo real."
              gradient="emerald"
              tag="Core"
              stats={[
                { label: "Leads Activos", value: leads.length.toLocaleString() },
                { label: "Score Promedio", value: Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length).toString() },
                { label: "Campañas", value: activeCampaigns.toString() },
                { label: "Conversión", value: `${((leads.filter(l => l.status === "aprobado" || l.status === "desembolsado").length / leads.length) * 100).toFixed(1)}%` },
              ]}
            />

            <ModuleCard
              to="/constructoras"
              icon={HomeIcon}
              title="Constructoras"
              description="Captación inmobiliaria inteligente con capacidad de compra, interés hipotecario y matching de proyectos por perfil financiero."
              gradient="blue"
              stats={[
                { label: "Proyectos", value: activeProjects.toString() },
                { label: "Leads Inmob.", value: leadsInmobiliarios.length.toLocaleString() },
                { label: "Interés Hipot.", value: `${leadsInmobiliarios.filter(l => l.hipotecarioInterest).length} leads` },
                { label: "Cap. Promedio", value: `$${Math.round(leadsInmobiliarios.reduce((s, l) => s + l.capacidadCompra, 0) / leadsInmobiliarios.length / 1000000)}M` },
              ]}
            />

            <ModuleCard
              to="/portal"
              icon={LayoutGrid}
              title="Portal Clientes"
              description="Vitrina financiera para que los clientes exploren campañas bancarias activas y proyectos inmobiliarios disponibles."
              gradient="amber"
              stats={[
                { label: "Campañas View", value: campaigns.filter(c => c.status === "activa").length.toString() },
                { label: "Proyectos View", value: proyectos.filter(p => p.status === "activo").length.toString() },
                { label: "Bancos", value: "6" },
                { label: "Ciudades", value: "6" },
              ]}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            GLOBAL KPIs
           ═══════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">KPIs Globales</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Total Leads",
                value: totalLeads,
                icon: Users,
                gradient: "emerald" as const,
                suffix: "",
              },
              {
                label: "Convertidos",
                value: totalConverted,
                icon: CheckCircle2,
                gradient: "blue" as const,
                suffix: ` (${conversionRate}%)`,
              },
              {
                label: "Score Promedio",
                value: Math.round(avgScore),
                icon: TrendingUp,
                gradient: "amber" as const,
                suffix: " pts",
              },
              {
                label: "En Pipeline",
                value: activeLeadsPipeline,
                icon: Target,
                gradient: "emerald" as const,
                suffix: "",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm p-4 transition-all hover:scale-[1.02] hover:shadow-lg",
                  kpi.gradient === "emerald" && "border-emerald-500/15 hover:border-emerald-500/30",
                  kpi.gradient === "blue" && "border-blue-500/15 hover:border-blue-500/30",
                  kpi.gradient === "amber" && "border-amber-500/15 hover:border-amber-500/30"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-foreground">
                        <AnimatedValue value={kpi.value} suffix={kpi.suffix} />
                      </span>
                    </div>
                  </div>
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    kpi.gradient === "emerald" && "bg-emerald-500/10",
                    kpi.gradient === "blue" && "bg-blue-500/10",
                    kpi.gradient === "amber" && "bg-amber-500/10"
                  )}>
                    <kpi.icon className={cn(
                      "h-4 w-4",
                      kpi.gradient === "emerald" && "text-emerald-400",
                      kpi.gradient === "blue" && "text-blue-400",
                      kpi.gradient === "amber" && "text-amber-400"
                    )} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            RECENT ACTIVITY + FEEDBACK (two columns)
           ═══════════════════════════════════════════════════════ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Leads */}
          <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Actividad Reciente</h3>
              </div>
              <Link to="/banca" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                Ver todos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-5 py-3">
              {recentLeads.map((lead) => (
                <ActivityItem
                  key={lead.id}
                  icon={lead.status === "pendiente" ? Clock : lead.status === "contactado" ? PhoneCall : lead.status === "aprobado" || lead.status === "desembolsado" ? CheckCircle2 : MessageSquare}
                  iconColor={lead.status === "aprobado" || lead.status === "desembolsado" ? "text-emerald-400" : lead.status === "perdido" ? "text-red-400" : "text-blue-400"}
                  iconBg={lead.status === "aprobado" || lead.status === "desembolsado" ? "bg-emerald-500/10" : lead.status === "perdido" ? "bg-red-500/10" : "bg-blue-500/10"}
                  title={lead.name}
                  subtitle={`${lead.status === "pendiente" ? "Nueva solicitud" : lead.status === "contactado" ? "Contacto realizado" : lead.status === "aprobado" ? "Solicitud aprobada" : lead.status === "desembolsado" ? "Desembolso completado" : lead.status === "perdido" ? "Lead perdido" : "Actualización"} · ${lead.product.charAt(0).toUpperCase() + lead.product.slice(1)} · ${lead.bank}`}
                  time={(() => {
                    const diff = Date.now() - new Date(lead.lastActivity).getTime();
                    const hrs = Math.floor(diff / (1000 * 60 * 60));
                    if (hrs < 1) return "Ahora";
                    if (hrs < 24) return `${hrs}h`;
                    return `${Math.floor(hrs / 24)}d`;
                  })()}
                  badge={lead.priority === "maxima" || lead.priority === "alta" ? lead.priority.toUpperCase() : undefined}
                  badgeColor={lead.priority === "maxima" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}
                />
              ))}
            </div>
          </div>

          {/* Feedback + Quick Actions */}
          <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                {pendingFeedback > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                <h3 className="text-sm font-semibold text-foreground">Feedback & Alertas</h3>
                {pendingFeedback > 0 && (
                  <span className="rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 border border-amber-500/20">
                    {pendingFeedback}
                  </span>
                )}
              </div>
              <Link to="/banca" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                Gestionar <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-5 py-3 space-y-1">
              {recentFeedback.map((fb) => (
                <ActivityItem
                  key={fb.id}
                  icon={fb.type === "felicitacion" ? CheckCircle2 : fb.type === "problema" || fb.type === "mala-atencion" ? AlertTriangle : MessageSquare}
                  iconColor={fb.type === "felicitacion" ? "text-emerald-400" : fb.type === "problema" || fb.type === "mala-atencion" ? "text-red-400" : "text-blue-400"}
                  iconBg={fb.type === "felicitacion" ? "bg-emerald-500/10" : fb.type === "problema" || fb.type === "mala-atencion" ? "bg-red-500/10" : "bg-blue-500/10"}
                  title={fb.clientName}
                  subtitle={fb.comment.slice(0, 70) + "..."}
                  time={(() => {
                    const diff = Date.now() - new Date(fb.createdAt).getTime();
                    const hrs = Math.floor(diff / (1000 * 60 * 60));
                    if (hrs < 24) return `${hrs}h`;
                    return `${Math.floor(hrs / 24)}d`;
                  })()}
                  badge={
                    fb.type === "felicitacion" ? "Positivo" :
                    fb.type === "mala-atencion" ? "Crítico" :
                    fb.type === "problema" ? "Problema" : "Sugerencia"
                  }
                  badgeColor={
                    fb.type === "felicitacion" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    fb.type === "mala-atencion" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    fb.type === "problema" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }
                />
              ))}

              {recentFeedback.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Todo al día</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">No hay feedback pendiente de gestión</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
