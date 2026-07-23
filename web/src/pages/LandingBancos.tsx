import { Link } from "react-router-dom";
import {
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Target,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Users,
  Clock,
  CreditCard,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthPanel } from "@/components/auth/AuthForms";

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

// ── Landing Bancos ────────────────────────────────────────────
export default function LandingBancos() {
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
                Leads bancarios con{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                  score de precalificación ya calculado
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Nada de cotizaciones frías: cada lead llega con score, prioridad y contexto
                financiero listo para que tu equipo comercial cierre, no que filtre.
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

            {/* Right: What you get, not fake live counters */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Score de precalificación automático", icon: Target },
                { label: "Pipeline con estados reales", icon: BarChart3 },
                { label: "Tarifas versionadas y transparentes", icon: CreditCard },
                { label: "Notificaciones al instante", icon: Zap },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <item.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="text-sm font-semibold text-foreground leading-snug">{item.label}</div>
                </div>
              ))}
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
              title="Score de precalificación automático"
              description="Cada lead llega clasificado por capacidad estimada (300–950), calculado internamente sobre el rango de ingresos declarado — listo para priorizar sin trabajo manual."
            />
            <FeatureItem
              icon={BarChart3}
              title="Pipeline CRM con estados en tiempo real"
              description="Sigue cada lead por su estado real (Pendiente → Contactado → Aprobado → Desembolsado) en un pipeline visual único."
            />
            <FeatureItem
              icon={CreditCard}
              title="Tarifas configurables por banco"
              description="Define y versiona las tarifas de tu banco por periodo. Cambios auditables, sin ambigüedad sobre qué se cobra y cuándo."
            />
            <FeatureItem
              icon={Zap}
              title="Notificaciones instantáneas (Realtime)"
              description="Tu equipo se entera al instante de cada lead nuevo o cambio de estado, sin refrescar ni esperar reportes."
            />
            <FeatureItem
              icon={Shield}
              title="Datos protegidos (RLS auditado, Ley 1581)"
              description="Aislamiento de datos por fila auditado y cumplimiento de protección de datos personales en toda la plataforma."
            />
            <FeatureItem
              icon={Clock}
              title="Facturación consolidada mensual"
              description="Un solo corte mensual con el detalle de leads y cierres facturados, sin sorpresas ni conciliaciones manuales."
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
              { step: "01", title: "Te registras", desc: "Verificamos tu organización antes de darte acceso al ecosistema Neggo.", icon: Users },
              { step: "02", title: "Configuras", desc: "Defines tus productos y tarifas por periodo, versionadas y auditables.", icon: CreditCard },
              { step: "03", title: "Recibes leads", desc: "Cada lead llega con su score de precalificación ya calculado, listo para priorizar.", icon: Star },
              { step: "04", title: "Gestionas y facturas", desc: "Trabajas el pipeline por estados reales y facturas por resultado, no por cuota fija.", icon: TrendingUp },
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
          MODELO DE PRECIO
         ═════════════════════════════════════════════════════════ */}
      <section id="planes" className="border-t border-border/30 bg-card/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-semibold mb-3">
              Modelo de precio
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Sin cuotas mensuales fijas
            </h2>
          </div>

          <div className="max-w-2xl mx-auto rounded-2xl border border-emerald-500/20 bg-card/40 backdrop-blur-sm p-8 sm:p-10">
            <p className="text-base text-muted-foreground leading-relaxed text-center mb-8">
              Pagas por lead calificado (CPL) o por cierre — tarifas visibles desde el primer día,
              sin planes de suscripción ni sorpresas al final de mes.
            </p>
            <ul className="space-y-4">
              {[
                "Tarifa por lead calificado o por cierre, tú eliges el modelo",
                "Tarifas configuradas y versionadas por tu banco, siempre visibles",
                "Un solo corte de facturación mensual con el detalle completo",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
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
