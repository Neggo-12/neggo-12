import { Link } from "react-router-dom";
import {
  Building2,
  HomeIcon,
  UserCircle,
  Store,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leads, campaigns, proyectos, leadsInmobiliarios } from "@/data/mock";
import { useState, useEffect } from "react";

// ── Animated counter hook ─────────────────────────────────────
function useAnimatedValue(value: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
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
  }, [value, duration]);
  return display;
}

function AnimatedStat({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const display = useAnimatedValue(value);
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold font-mono text-foreground sm:text-4xl">
        {display.toLocaleString()}
        {suffix}
      </div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// ── Audience Card ─────────────────────────────────────────────
interface AudienceCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  benefits: string[];
  accent: "emerald" | "blue" | "amber" | "purple";
  tag: string;
}

function AudienceCard({ to, icon: Icon, title, subtitle, benefits, accent, tag }: AudienceCardProps) {
  const config = {
    emerald: {
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      glow: "hover:shadow-emerald-500/10",
      iconBg: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
      accent: "bg-emerald-500",
      tag: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      line: "from-transparent via-emerald-500/50 to-transparent",
    },
    blue: {
      border: "border-blue-500/20 hover:border-blue-500/40",
      glow: "hover:shadow-blue-500/10",
      iconBg: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20",
      accent: "bg-blue-500",
      tag: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      line: "from-transparent via-blue-500/50 to-transparent",
    },
    amber: {
      border: "border-amber-500/20 hover:border-amber-500/40",
      glow: "hover:shadow-amber-500/10",
      iconBg: "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20",
      accent: "bg-amber-500",
      tag: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      line: "from-transparent via-amber-500/50 to-transparent",
    },
    purple: {
      border: "border-purple-500/20 hover:border-purple-500/40",
      glow: "hover:shadow-purple-500/10",
      iconBg: "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20",
      accent: "bg-purple-500",
      tag: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      line: "from-transparent via-purple-500/50 to-transparent",
    },
  }[accent];

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm",
        "transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl",
        config.border,
        config.glow
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100", config.line)} />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex flex-col p-6 sm:p-8">
        <div className="flex items-start justify-between mb-5">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-colors", config.iconBg)}>
            <Icon className="h-7 w-7" />
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider", config.tag)}>
            {tag}
          </span>
        </div>

        <h3 className="text-xl font-bold text-foreground tracking-tight mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{subtitle}</p>

        <ul className="space-y-2.5 mb-6">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", accent === "emerald" ? "text-emerald-400" : accent === "blue" ? "text-blue-400" : accent === "amber" ? "text-amber-400" : "text-purple-400")} />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: accent === "emerald" ? "hsl(160 84% 39%)" : accent === "blue" ? "hsl(217 91% 60%)" : accent === "amber" ? "hsl(38 92% 50%)" : "hsl(271 91% 65%)" }}>
          <span>Explorar plataforma</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

// ── Landing Hub ───────────────────────────────────────────────
export default function LandingHub() {
  const totalLeads = leads.length + leadsInmobiliarios.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "activa").length;
  const activeProjects = proyectos.filter((p) => p.status === "activo").length;
  const avgScore = Math.round(
    [...leads, ...leadsInmobiliarios].reduce((s, l) => s + l.score, 0) / (totalLeads || 1)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ═════════════════════════════════════════════════════════
          NAVBAR — Clean, public-facing
         ═════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 glow-green">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">Neggo</span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold ml-2">Fintech OS</span>
            </div>
          </Link>

          {/* ── Nav Links ── */}
          <div className="flex items-center gap-1">
            <Link
              to="/landing/clientes"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg"
            >
              <UserCircle className="h-3.5 w-3.5" />
              B2C Personas
            </Link>
            <Link
              to="/landing/bancos"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg"
            >
              <Building2 className="h-3.5 w-3.5" />
              B2B Negocios
            </Link>

            {/* Separator */}
            <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />

            {/* Acceso Seguro button */}
            <Link
              to="/login-ecosistema"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 shadow-sm"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Acceso Seguro</span>
              <span className="sm:hidden">Acceder</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════
          HERO
         ═════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-500/[0.03] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.02] blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-6">
            <Activity className="h-3.5 w-3.5" />
            Sistema operativo financiero enterprise
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl max-w-4xl mx-auto leading-[1.1]">
            El sistema operativo que{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-blue-400">
              conecta bancos, constructoras y clientes
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Pipeline inteligente, scoring Datacrédito en tiempo real, campañas comerciales
            y matching inmobiliario. Todo en una plataforma diseñada para mover dinero y decisiones.
          </p>

          {/* Stats strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <AnimatedStat value={totalLeads} suffix="+" label="Leads procesados" />
            <div className="hidden sm:block h-8 w-px bg-border/50" />
            <AnimatedStat value={avgScore} label="Score promedio" />
            <div className="hidden sm:block h-8 w-px bg-border/50" />
            <AnimatedStat value={activeCampaigns + activeProjects} label="Campañas activas" />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          AUDIENCE PATHS
         ═════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold mb-3">
            Cuatro plataformas, un ecosistema
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Elige tu perfil
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <AudienceCard
            to="/landing/bancos"
            icon={Building2}
            title="Soy un Banco"
            subtitle="Centro táctico de leads financieros con scoring inteligente, campañas multicanal y seguimiento operativo en tiempo real."
            accent="emerald"
            tag="Enterprise"
            benefits={[
              "Pipeline de leads con scoring Datacrédito",
              "Campañas comerciales con ROI en tiempo real",
              "Alertas de riesgo y feedback automatizado",
              "Asignación inteligente de ejecutivos",
            ]}
          />

          <AudienceCard
            to="/landing/constructoras"
            icon={HomeIcon}
            title="Soy una Constructora"
            subtitle="Captación inmobiliaria inteligente con matching financiero, capacidad de compra y conexión directa con compradores calificados."
            accent="blue"
            tag="Growth"
            benefits={[
              "Matching de leads por capacidad de compra",
              "Visualización de interés hipotecario",
              "Seguimiento de proyectos en tiempo real",
              "Conexión directa con bancos aliados",
            ]}
          />

          <AudienceCard
            to="/corporativo/comercios"
            icon={Store}
            title="Soy un Comercio"
            subtitle="Canal de crecimiento con clientes ya verificados, Sello de Confianza y notificaciones en tiempo real cuando responden tus ofertas."
            accent="purple"
            tag="Aliado"
            benefits={[
              "Sello de Confianza Neggo verificado por Admin",
              "Comisión transparente según tu plan de negociación",
              "Notificación en tiempo real al responder una oferta",
              "Conexión directa con clientes del ecosistema",
            ]}
          />

          <AudienceCard
            to="/landing/clientes"
            icon={UserCircle}
            title="Soy Cliente"
            subtitle="Explora las mejores ofertas financieras de bancos y constructoras. Compara, solicita y obtén respuestas rápidas."
            accent="amber"
            tag="Personal"
            benefits={[
              "Campañas bancarias activas en un solo lugar",
              "Proyectos inmobiliarios con precios reales",
              "Simulación de crédito y capacidad de compra",
              "Solicitudes directas sin intermediarios",
            ]}
          />
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          TRUST BAR
         ═════════════════════════════════════════════════════════ */}
      <section className="border-y border-border/30 bg-card/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { icon: Lock, label: "Autenticación", value: "MFA", desc: "TOTP obligatorio en cuentas B2B" },
              { icon: Shield, label: "Tablas con RLS", value: "24", desc: "37 políticas de seguridad auditadas" },
              { icon: Zap, label: "Notificaciones", value: "Realtime", desc: "Eventos entregados al instante" },
              { icon: ShieldCheck, label: "Registro Validado", value: "Ley 1581", desc: "Protección de datos personales" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/40">
                  <item.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold font-mono text-foreground">{item.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</div>
                <div className="text-[10px] text-muted-foreground/60">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          SAFE ACCESS CTA — replaces old Profile Switcher
         ═════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-lg mx-auto rounded-2xl border border-emerald-500/20 bg-card/40 backdrop-blur-sm p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-4">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            Acceso al Ecosistema
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Ingresa a tu portal seguro. Bancos, constructoras, comercios y clientes
            en un entorno regulado con cifrado de extremo a extremo.
          </p>
          <Link
            to="/login-ecosistema"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:shadow-emerald-600/30 hover:scale-[1.02]"
          >
            <Lock className="h-4 w-4" />
            Acceso Seguro al Ecosistema
          </Link>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          FOOTER
         ═════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold text-foreground">Neggo</span>
              <span className="text-[10px] text-muted-foreground">— Fintech Operating System</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/landing/bancos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Bancos</Link>
              <Link to="/landing/constructoras" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Constructoras</Link>
              <Link to="/corporativo/comercios" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Comercios</Link>
              <Link to="/landing/clientes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clientes</Link>
              <Link to="/login-ecosistema" className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors">Acceso Seguro</Link>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-muted-foreground/40">
              &copy; 2026 Neggo. Todos los derechos reservados. Sistema operativo financiero enterprise.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
