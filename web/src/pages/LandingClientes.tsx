import { Link } from "react-router-dom";
import {
  UserCircle,
  Sparkles,
  Shield,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  LayoutGrid,
  CreditCard,
  HomeIcon,
  Search,
  Star,
  Zap,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthPanel } from "@/components/auth/AuthForms";

function LiveDot({ color = "amber" }: { color?: "emerald" | "blue" | "amber" }) {
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
        <Icon className="h-5 w-5 text-amber-400" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function LandingClientes() {
  return (
    <div className="min-h-screen bg-background">
      {/* ═════════════════════════════════════════════════════════
          NAVBAR
         ═════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 glow-amber">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">Neggo</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#como-funciona" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cómo funciona</a>
            <a href="#ofertas" className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Ofertas</a>
            <Link to="/portal" className="rounded-lg bg-amber-500 text-background px-4 py-2 text-xs font-semibold hover:bg-amber-400 transition-colors">
              Explorar ofertas
            </Link>
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════
          HERO
         ═════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-amber-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-amber-500/[0.02] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-xs font-medium text-amber-400">
                <LiveDot color="amber" />
                Para clientes y usuarios finales
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
                Compara ofertas reales de{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                  bancos, constructoras y comercios verificados
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Todo en un solo lugar, sin llamadas no deseadas: tú decides a quién le
                compartes tus datos y cuándo te contactan.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/portal"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-background px-6 py-3 text-sm font-semibold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                >
                  Explorar ofertas
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-card/40 px-6 py-3 text-sm font-semibold text-foreground hover:bg-card/60 transition-colors"
                >
                  Cómo funciona
                </a>
              </div>
            </div>

            {/* Right: What you get, not fake live counters */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Ofertas comparadas de múltiples aliados", icon: LayoutGrid },
                { label: "Bóveda personal con tu historial de compras", icon: CreditCard },
                { label: "Código anti-phishing único por sesión", icon: Star },
                { label: "Datos protegidos con MFA y verificación de identidad", icon: Shield },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <item.icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="text-sm font-semibold text-foreground leading-snug">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          HOW IT WORKS
         ═════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="border-t border-border/30 bg-card/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-semibold mb-3">
              Simple y directo
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Encuentra la mejor oferta en 3 pasos
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto">
            {[
              { step: "01", title: "Te registras", desc: "Creas tu cuenta gratis en segundos, sin trámites ni papeleo.", icon: UserCircle },
              { step: "02", title: "Cuentas qué buscas", desc: "Crédito, vivienda o el producto que necesitas — tú defines qué te interesa.", icon: Search },
              { step: "03", title: "Comparas y decides", desc: "Recibes ofertas reales de aliados verificados y comparas antes de elegir.", icon: BarChart3 },
            ].map((item) => (
              <div
                key={item.step}
                className="relative group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5"
              >
                <div className="absolute top-0 right-0 p-4 text-5xl font-extrabold font-mono text-muted-foreground/10 select-none">
                  {item.step}
                </div>
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 mb-4">
                    <item.icon className="h-5 w-5 text-amber-400" />
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
          FEATURES
         ═════════════════════════════════════════════════════════ */}
      <section className="border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-semibold mb-3">
              ¿Por qué Neggo?
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Tu portal financiero personal
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureItem
              icon={LayoutGrid}
              title="Ofertas comparadas de múltiples aliados"
              description="Bancos, constructoras y comercios verificados, todos en un solo lugar. Compara lado a lado antes de decidir."
            />
            <FeatureItem
              icon={CreditCard}
              title="Bóveda del Cliente"
              description="Tu historial de compras y solicitudes en un solo lugar, siempre disponible para consultar."
            />
            <FeatureItem
              icon={Star}
              title="Código anti-phishing único"
              description="Verifica la identidad de cualquier asesor que te contacte con tu código único por sesión, antes de compartir información."
            />
            <FeatureItem
              icon={Building2}
              title="Banca privada"
              description="Selector real de bancos aprobados dentro del ecosistema. Eliges tú con quién avanzar."
            />
            <FeatureItem
              icon={Shield}
              title="MFA para proteger tu cuenta"
              description="Autenticación de doble factor obligatoria para blindar el acceso a tu cuenta y tus datos."
            />
            <FeatureItem
              icon={CheckCircle2}
              title="Sin spam"
              description="Tú decides a quién le compartes tus datos. Sin llamadas ni mensajes no solicitados."
            />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          CATEGORÍAS DISPONIBLES
         ═════════════════════════════════════════════════════════ */}
      <section id="ofertas" className="border-t border-border/30 bg-card/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-semibold mb-2">
              Categorías disponibles
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Regístrate para ver las ofertas reales
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto mb-10">
            {[
              { title: "Banca", desc: "CDT, créditos, tarjetas, hipotecarios y más de bancos aliados.", icon: Building2 },
              { title: "Vivienda", desc: "Proyectos de constructoras aliadas, con capacidad de compra validada.", icon: HomeIcon },
              { title: "Comercios aliados", desc: "Ofertas verificadas con Sello de Confianza Neggo.", icon: Zap },
            ].map((cat) => (
              <div
                key={cat.title}
                className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 mb-4">
                  <cat.icon className="h-6 w-6 text-amber-400" />
                </div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">{cat.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/portal"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-background px-6 py-3 text-sm font-semibold hover:bg-amber-400 transition-colors"
            >
              Crear cuenta y ver ofertas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          CTA FINAL
         ═════════════════════════════════════════════════════════ */}
      <section className="border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-card/40 backdrop-blur-sm">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-500/[0.06] blur-[80px]" />
            <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                ¿Listo para encontrar tu próximo producto financiero?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
                Miles de clientes ya usan Neggo para comparar y solicitar productos financieros e inmobiliarios. Gratis y sin compromiso.
              </p>
              <div className="mt-8">
                <Link
                  to="/portal"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-background px-8 py-3.5 text-sm font-semibold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                >
                  Explorar ofertas ahora
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          AUTH — Acceso embebido para Clientes
         ═════════════════════════════════════════════════════════ */}
      <section id="acceso" className="border-t border-border/30">
        <div className="mx-auto max-w-md px-4 sm:px-6 py-20">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-semibold mb-3">
              Acceso Clientes
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Ingresa o regístrate
            </h2>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="p-5 sm:p-6">
              <AuthPanel
                mode="b2c"
                themeColor="cyan"
                description={{
                  login: "Inicia sesión para acceder a tus metas de ahorro, ofertas personalizadas y el control de tu vida financiera.",
                  register: "Crea tu cuenta personal para acceder a ofertas financieras, proyectos inmobiliarios y metas de ahorro.",
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
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-foreground">Neggo</span>
              <span className="text-[10px] text-muted-foreground">— Para Clientes</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/landing/bancos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Bancos</Link>
              <Link to="/landing/constructoras" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Constructoras</Link>
              <Link to="/" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">Inicio</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
