import { Link } from "react-router-dom";
import {
  Sparkles,
  ShieldCheck,
  Shield,
  Tag,
  Zap,
  Users,
  Clock,
  Store,
  Package,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { AuthPanel } from "@/components/auth/AuthForms";

// ── Live dot ───────────────────────────────────────────────────
function LiveDot({ color = "purple" }: { color?: "purple" }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 bg-purple-400" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-purple-400" />
    </span>
  );
}

// ── Feature item ──────────────────────────────────────────────
function FeatureItem({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
        <Icon className="h-5 w-5 text-purple-600" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p>
      </div>
    </div>
  );
}

// ── Landing Comercios ─────────────────────────────────────────
export default function CorporativoComercios() {
  return (
    <div className="min-h-screen theme-public bg-background">
      {/* ═════════════════════════════════════════════════════════
          NAVBAR
         ═════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 glow-purple">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">Neggo</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#como-funciona" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cómo funciona</a>
            <Link to="/comercios" className="rounded-full bg-purple-500 text-white px-5 py-2.5 text-xs font-bold hover:bg-purple-600 transition-colors">
              Acceder al Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════
          HERO
         ═════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-purple-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-500/[0.02] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-4 py-1.5 text-xs font-medium text-purple-600">
                <LiveDot color="purple" />
                Para comercios aliados
              </div>

              <h1 className="text-5xl font-black tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[0.98]">
                Ganá visibilidad con el{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-500">
                  Sello de Confianza Neggo
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Clientes verificados del ecosistema y notificación al instante cada vez
                que respondés una oferta. Sin intermediarios, sin fricción.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/comercios"
                  className="inline-flex items-center gap-2 rounded-full bg-purple-500 text-white px-8 py-4 text-base font-bold hover:bg-purple-600 hover:scale-[1.03] transition-all shadow-lg shadow-purple-500/25"
                >
                  Ver plataforma en acción
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-8 py-4 text-base font-bold text-foreground hover:bg-black/[0.03] transition-colors"
                >
                  Cómo funciona
                </a>
              </div>
            </div>

            {/* Right: What you get, not fake live counters */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Sello de Confianza verificado por Admin", icon: ShieldCheck },
                { label: "Comisión transparente según tu plan", icon: Tag },
                { label: "Notificación en tiempo real al responder ofertas", icon: Zap },
                { label: "Conexión directa con clientes del ecosistema", icon: Users },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white shadow-sm p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                    <item.icon className="h-5 w-5 text-purple-600" />
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-purple-600 font-bold mb-3">
              ¿Por qué Neggo para Comercios?
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Todo lo que tu comercio necesita para crecer
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureItem
              icon={ShieldCheck}
              title="Sello de Confianza Neggo"
              description="Verificación real emitida por Neggo. Un distintivo que genera credibilidad inmediata con los clientes del ecosistema."
            />
            <FeatureItem
              icon={Tag}
              title="Comisión clara por plan de negociación"
              description="Estructura de comisiones transparente y configurable según tu plan. Sabés exactamente qué se cobra y por qué."
            />
            <FeatureItem
              icon={Zap}
              title="Notificaciones Realtime al responder una oferta"
              description="Te enterás al instante cuando un cliente responde tu oferta, sin refrescar ni esperar reportes."
            />
            <FeatureItem
              icon={Users}
              title="Conexión directa con clientes del ecosistema"
              description="Accedé a clientes verificados que ya confían en Neggo, sin depender de tráfico frío ni publicidad externa."
            />
            <FeatureItem
              icon={Shield}
              title="Datos protegidos (RLS auditado, Ley 1581)"
              description="Aislamiento de datos por fila auditado y cumplimiento de protección de datos personales en toda la plataforma."
            />
            <FeatureItem
              icon={Clock}
              title="Panel de facturación mensual consolidada"
              description="Un solo corte mensual con el detalle de comisiones facturadas, sin sorpresas ni conciliaciones manuales."
            />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          HOW IT WORKS
         ═════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold mb-3">
              Flujo operativo
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Del registro al Sello de Confianza
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Te registrás", desc: "Verificamos tu negocio antes de darte acceso al ecosistema Neggo.", icon: Store },
              { step: "02", title: "Recibís el Sello", desc: "Neggo emite tu Sello de Confianza una vez verificado tu comercio.", icon: ShieldCheck },
              { step: "03", title: "Publicás ofertas", desc: "Publicás tus ofertas y respondés las solicitudes de clientes del ecosistema.", icon: Package },
              { step: "04", title: "Facturás por comisión", desc: "Facturás por comisión según tu plan, sin cuotas fijas ni costos ocultos.", icon: TrendingUp },
            ].map((item) => (
              <div
                key={item.step}
                className="relative group rounded-2xl border border-black/[0.06] bg-white shadow-sm p-6 transition-all hover:shadow-xl hover:shadow-purple-500/10"
              >
                <div className="absolute top-0 right-0 p-4 text-5xl font-extrabold font-mono text-muted-foreground/10 select-none">
                  {item.step}
                </div>
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 mb-4">
                    <item.icon className="h-5 w-5 text-purple-600" />
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
          CTA FINAL
         ═════════════════════════════════════════════════════════ */}
      <section className="border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-xl">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-500/[0.06] blur-[80px]" />
            <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                ¿Listo para ganar visibilidad con el Sello de Confianza?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
                Unite a los comercios que ya usan Neggo para conectar con clientes verificados del ecosistema.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/comercios"
                  className="inline-flex items-center gap-2 rounded-full bg-purple-500 text-white px-8 py-4 text-base font-bold hover:bg-purple-600 hover:scale-[1.03] transition-all shadow-lg shadow-purple-500/25"
                >
                  Ingresar a la plataforma
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/landing/clientes"
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-8 py-4 text-base font-bold text-foreground hover:bg-black/[0.03] transition-colors"
                >
                  Ver portal de clientes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          AUTH — Acceso embebido para Comercios
         ═════════════════════════════════════════════════════════ */}
      <section id="acceso" className="border-t border-border/30">
        <div className="mx-auto max-w-md px-4 sm:px-6 py-24">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-purple-600 font-bold mb-3">
              Acceso Comercios
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Ingresá o registrate
            </h2>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-white shadow-lg overflow-hidden">
            <div className="p-5 sm:p-6">
              <AuthPanel
                mode="b2b"
                sector="comercio"
                themeColor="amber"
                description={{
                  login: "Iniciá sesión con tu cuenta de comercio para acceder a tu panel de control.",
                  register: "Registrá tu comercio para unirte al ecosistema Neggo.",
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
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-bold text-foreground">Neggo</span>
              <span className="text-[10px] text-muted-foreground">— Para Comercios</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/landing/bancos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Bancos</Link>
              <Link to="/landing/constructoras" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Constructoras</Link>
              <Link to="/landing/clientes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clientes</Link>
              <Link to="/" className="text-xs text-purple-600 hover:text-purple-300 transition-colors">Inicio</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
