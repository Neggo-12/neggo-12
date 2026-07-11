import { Link } from "react-router-dom";
import {
  Building2,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Gauge,
  Target,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Activity,
  Users,
  MessageSquare,
  PhoneCall,
  Clock,
  CreditCard,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthPanel } from "@/components/auth/AuthForms";
import { leads, campaigns } from "@/data/mock";
import { useState, useEffect } from "react";

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

// ── Live dot ───────────────────────────────────────────────────
function LiveDot({ color = "emerald" }: { color?: "emerald" | "blue" | "amber" }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
          color === "emerald" && "bg-emerald-400",
          color === "blue" && "bg-blue-400",
          color === "amber" && "bg-amber-400"
        )}
      />
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          color === "emerald" && "bg-emerald-400",
          color === "blue" && "bg-blue-400",
          color === "amber" && "bg-amber-400"
        )}
      />
    </span>
  );
}

// ── Feature item ──────────────────────────────────────────────
function FeatureItem({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
        <Icon className="h-5 w-5 text-emerald-400" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, suffix = "" }: { label: string; value: number; icon: React.ElementType; suffix?: string }) {
  const display = useAnimatedValue(value);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
        <Icon className="h-5 w-5 text-emerald-400" />
      </div>
      <div>
        <div className="text-xl font-bold font-mono text-foreground">
          {display.toLocaleString()}
          {suffix}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────
function PlanCard({ name, price, features, recommended }: { name: string; price: string; features: string[]; recommended?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card/40 backdrop-blur-sm p-6 transition-all hover:scale-[1.02]",
        recommended
          ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5"
          : "border-border/40 hover:border-border/80"
      )}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Recomendado
        </div>
      )}
      <h4 className="text-lg font-bold text-foreground">{name}</h4>
      <div className="mt-3 mb-5">
        <span className="text-3xl font-extrabold font-mono text-foreground">{price}</span>
        <span className="text-sm text-muted-foreground">/mes</span>
      </div>
      <ul className="space-y-2.5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        to="/banca"
        className={cn(
          "mt-6 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
          recommended
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
        )}
      >
        Comenzar
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ── Landing Bancos ────────────────────────────────────────────
export default function LandingBancos() {
  const totalLeads = leads.length;
  const converted = leads.filter((l) => l.status === "aprobado" || l.status === "desembolsado").length;
  const conversionRate = ((converted / totalLeads) * 100).toFixed(1);
  const avgScore = Math.round(leads.reduce((s, l) => s + l.score, 0) / totalLeads);
  const activeCampaigns = campaigns.filter((c) => c.status === "activa").length;

  return (
    <div className="min-h-screen bg-background">
      {/* ═════════════════════════════════════════════════════════
          NAVBAR
         ═════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 glow-green">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">Neggo</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#planes" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Planes</a>
            <a href="#faq" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <Link to="/banca" className="rounded-lg bg-emerald-500 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-600 transition-colors">
              Acceder al Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════
          HERO
         ═════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.02] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400">
                <LiveDot color="emerald" />
                Para instituciones financieras
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
                Transforma tu{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                  operación comercial
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Pipeline inteligente con scoring Datacrédito, campañas comerciales multicanal
                y seguimiento operativo en tiempo real. Diseñado para equipos comerciales
                de banca que necesitan velocidad, precisión y control.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/banca"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-6 py-3 text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Ver plataforma en acción
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#planes"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-card/40 px-6 py-3 text-sm font-semibold text-foreground hover:bg-card/60 transition-colors"
                >
                  Ver planes
                </a>
              </div>
            </div>

            {/* Right: Live stats preview */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Leads Activos" value={totalLeads} icon={Users} />
              <StatCard label="Score Promedio" value={avgScore} icon={TrendingUp} suffix=" pts" />
              <StatCard label="Conversión" value={Number(conversionRate)} icon={Target} suffix="%" />
              <StatCard label="Campañas" value={activeCampaigns} icon={BarChart3} suffix=" activas" />
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          FEATURES
         ═════════════════════════════════════════════════════════ */}
      <section id="features" className="border-t border-border/30 bg-card/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-semibold mb-3">
              ¿Por qué Neggo para Bancos?
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Todo lo que tu equipo comercial necesita
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureItem
              icon={Target}
              title="Pipeline de leads inteligente"
              description="Recibe leads calificados con scoring Datacrédito (300–950). Priorización automática por riesgo y capacidad financiera."
            />
            <FeatureItem
              icon={BarChart3}
              title="Scoring financiero en tiempo real"
              description="Cada lead llega con score, badge visual de prioridad, interpretación financiera y clasificación de riesgo automática."
            />
            <FeatureItem
              icon={Zap}
              title="Campañas comerciales multicanal"
              description="Publica campañas de CDT, hipotecarios, libranzas y más. Mide impresiones, CTR, leads generados y ROI en dashboard unificado."
            />
            <FeatureItem
              icon={PhoneCall}
              title="Seguimiento operativo táctico"
              description="Cada lead tiene estado operacional (Pendiente → Contactado → Aprobado → Desembolsado) con acciones rápidas: llamar, WhatsApp, asignar."
            />
            <FeatureItem
              icon={MessageSquare}
              title="Centro de reputación bancaria"
              description="Recibe feedback de clientes: felicitaciones, problemas, sugerencias. Gestiona casos, responde y mide satisfacción en tiempo real."
            />
            <FeatureItem
              icon={Shield}
              title="Cumplimiento y seguridad enterprise"
              description="Infraestructura bancaria con latencia <50ms, uptime 99.97% y conexión directa con Datacrédito. Cumplimiento normativo asegurado."
            />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          HOW IT WORKS
         ═════════════════════════════════════════════════════════ */}
      <section className="border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold mb-3">
              Flujo operativo
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Del lead al desembolso en una plataforma
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Captación", desc: "Los leads llegan desde campañas, web, sucursales o portales aliados con scoring automático.", icon: Users },
              { step: "02", title: "Calificación", desc: "Score Datacrédito asigna prioridad automática. El equipo ve solo lo que importa.", icon: Star },
              { step: "03", title: "Contacto", desc: "Acciones rápidas: llamar, WhatsApp, asignar ejecutivo. Pipeline visual con estados operativos.", icon: PhoneCall },
              { step: "04", title: "Conversión", desc: "Seguimiento hasta aprobación y desembolso. Métricas de conversión y ROI en tiempo real.", icon: TrendingUp },
            ].map((item) => (
              <div
                key={item.step}
                className="relative group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 transition-all hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="absolute top-0 right-0 p-4 text-5xl font-extrabold font-mono text-muted-foreground/10 select-none">
                  {item.step}
                </div>
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 mb-4">
                    <item.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          PLANS
         ═════════════════════════════════════════════════════════ */}
      <section id="planes" className="border-t border-border/30 bg-card/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-semibold mb-3">
              Planes enterprise
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Escala con tu operación
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            <PlanCard
              name="Starter"
              price="$2,490"
              features={[
                "Hasta 500 leads/mes",
                "Scoring Datacrédito básico",
                "3 campañas activas",
                "5 ejecutivos",
                "Soporte por email",
              ]}
            />
            <PlanCard
              name="Enterprise"
              price="$5,990"
              recommended
              features={[
                "Leads ilimitados",
                "Scoring avanzado + riesgo",
                "Campañas ilimitadas",
                "Ejecutivos ilimitados",
                "API de integración",
                "Soporte prioritario 24/7",
                "Feedback & reputación",
              ]}
            />
            <PlanCard
              name="Custom"
              price="Contactar"
              features={[
                "Todo Enterprise",
                "White-label",
                "Integración core bancario",
                "SLAs personalizados",
                "Gerente de cuenta dedicado",
                "Onboarding in-situ",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          CTA FINAL
         ═════════════════════════════════════════════════════════ */}
      <section className="border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-card/40 backdrop-blur-sm">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/[0.06] blur-[80px]" />
            <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                ¿Listo para transformar tu operación comercial?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
                Únete a los bancos que ya usan Neggo para captar, calificar y convertir leads financieros con inteligencia operativa.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/banca"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-6 py-3 text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Ingresar a la plataforma
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/landing/clientes"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-6 py-3 text-sm font-semibold text-foreground hover:bg-card/80 transition-colors"
                >
                  Ver portal de clientes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          AUTH — Acceso embebido para Bancos
         ═════════════════════════════════════════════════════════ */}
      <section id="acceso" className="border-t border-border/30">
        <div className="mx-auto max-w-md px-4 sm:px-6 py-20">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-semibold mb-3">
              Acceso Bancos
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Ingresa o regístrate
            </h2>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="p-5 sm:p-6">
              <AuthPanel
                mode="b2b"
                sector="banca"
                themeColor="emerald"
                description={{
                  login: "Inicia sesión con tu cuenta de banco para acceder a tu panel de control.",
                  register: "Registra tu banco para unirte al ecosistema Neggo.",
                }}
              />
            </div>
          </div>
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
              <span className="text-[10px] text-muted-foreground">— Para Bancos</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/landing/constructoras" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Constructoras</Link>
              <Link to="/landing/clientes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clientes</Link>
              <Link to="/" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Inicio</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
