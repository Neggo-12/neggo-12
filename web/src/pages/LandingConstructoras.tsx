import { Link } from "react-router-dom";
import {
  Sparkles,
  TrendingUp,
  Shield,
  Target,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Users,
  Wallet,
  Clock,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthPanel } from "@/components/auth/AuthForms";

function LiveDot({ color = "blue" }: { color?: "emerald" | "blue" | "amber" }) {
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

function FeatureItem({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
        <Icon className="h-5 w-5 text-blue-400" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function LandingConstructoras() {
  return (
    <div className="min-h-screen bg-background">
      {/* ═════════════════════════════════════════════════════════
          NAVBAR
         ═════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 glow-blue">
              <Sparkles className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">Neggo</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#planes" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Planes</a>
            <Link to="/constructoras" className="rounded-lg bg-blue-500 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-600 transition-colors">
              Acceder al Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════
          HERO
         ═════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-blue-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-500/[0.02] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-xs font-medium text-blue-400">
                <LiveDot color="blue" />
                Para constructoras y desarrolladoras
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
                Conecta con compradores con{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">
                  capacidad de compra verificada
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Leads reales, no tráfico frío: cada comprador llega con su capacidad de compra
                ya validada por el sistema bancario, listo para avanzar.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/constructoras"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-500 text-white px-6 py-3 text-sm font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
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
                { label: "Matching por capacidad de compra real", icon: Target },
                { label: "Distribución de leads con algoritmo de equidad", icon: BarChart3 },
                { label: "Success Fee del 2.25% — solo pagas si cierras", icon: Wallet },
                { label: "Pipeline con seguimiento completo del lead", icon: TrendingUp },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <item.icon className="h-5 w-5 text-blue-400" />
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
            <p className="text-xs uppercase tracking-[0.25em] text-blue-400 font-semibold mb-3">
              ¿Por qué Neggo para Constructoras?
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Captación inmobiliaria inteligente
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureItem
              icon={Target}
              title="Matching por capacidad de compra verificada"
              description="Cada lead llega con su capacidad de compra ya validada por el sistema bancario. Solo ves compradores reales."
            />
            <FeatureItem
              icon={BarChart3}
              title="Algoritmo de distribución justa"
              description="Equidad entre proyectos: los leads se reparten con un algoritmo transparente, sin favoritismos ni sesgos comerciales."
            />
            <FeatureItem
              icon={Wallet}
              title="Success Fee transparente del 2.25%"
              description="Pagas el 2.25% solo sobre el valor del cierre. Sin cuotas fijas, sin riesgo si el lead no avanza."
            />
            <FeatureItem
              icon={TrendingUp}
              title="Pipeline CRM con estados en tiempo real"
              description="Sigue cada lead por su estado real, desde el primer contacto hasta el cierre, en un pipeline visual único."
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
              Del proyecto al comprador calificado
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Te registras", desc: "Verificamos tu constructora antes de darte acceso al ecosistema Neggo.", icon: Users },
              { step: "02", title: "Publicas", desc: "Publicas tus proyectos activos con ciudad, unidades, rango de precios y tipo de vivienda.", icon: Building2 },
              { step: "03", title: "Recibes leads", desc: "Cada lead llega con su capacidad de compra ya validada por el sistema bancario.", icon: Wallet },
              { step: "04", title: "Cierras y pagas", desc: "Cierras la venta y pagas solo el Success Fee del 2.25% sobre ese cierre.", icon: TrendingUp },
            ].map((item) => (
              <div
                key={item.step}
                className="relative group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 transition-all hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5"
              >
                <div className="absolute top-0 right-0 p-4 text-5xl font-extrabold font-mono text-muted-foreground/10 select-none">
                  {item.step}
                </div>
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 mb-4">
                    <item.icon className="h-5 w-5 text-blue-400" />
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
            <p className="text-xs uppercase tracking-[0.25em] text-blue-400 font-semibold mb-3">
              Modelo de precio
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Cero cuotas mensuales
            </h2>
          </div>

          <div className="max-w-2xl mx-auto rounded-2xl border border-blue-500/20 bg-card/40 backdrop-blur-sm p-8 sm:p-10">
            <p className="text-base text-muted-foreground leading-relaxed text-center mb-8">
              Success Fee del 2.25% sobre el valor del cierre — sin riesgo, pagas por resultado.
            </p>
            <ul className="space-y-4">
              {[
                "Sin cuotas mensuales fijas ni costo de entrada",
                "2.25% de Success Fee, solo cuando cierras la venta",
                "Un solo corte de facturación mensual con el detalle completo",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
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
          <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-card/40 backdrop-blur-sm">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/[0.06] blur-[80px]" />
            <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                ¿Listo para llenar tus proyectos?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
                Únete a las constructoras que ya usan Neggo para conectar sus proyectos con compradores financieramente calificados.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/constructoras"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-500 text-white px-6 py-3 text-sm font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
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
          AUTH — Acceso embebido para Constructoras
         ═════════════════════════════════════════════════════════ */}
      <section id="acceso" className="border-t border-border/30">
        <div className="mx-auto max-w-md px-4 sm:px-6 py-20">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-blue-400 font-semibold mb-3">
              Acceso Constructoras
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Ingresa o regístrate
            </h2>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="p-5 sm:p-6">
              <AuthPanel
                mode="b2b"
                sector="constructora"
                themeColor="blue"
                description={{
                  login: "Inicia sesión con tu cuenta de constructora para acceder a tu panel de control.",
                  register: "Registra tu constructora para unirte al ecosistema Neggo.",
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
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-bold text-foreground">Neggo</span>
              <span className="text-[10px] text-muted-foreground">— Para Constructoras</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/landing/bancos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Bancos</Link>
              <Link to="/landing/clientes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clientes</Link>
              <Link to="/" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Inicio</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
