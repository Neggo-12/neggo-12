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
      border: "border-black/[0.06] hover:border-emerald-500/30",
      glow: "hover:shadow-emerald-500/15",
      iconBg: "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white",
      accent: "bg-emerald-500",
      tag: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      check: "text-emerald-600",
      cta: "hsl(160 84% 33%)",
      line: "from-transparent via-emerald-500 to-transparent",
    },
    blue: {
      border: "border-black/[0.06] hover:border-blue-500/30",
      glow: "hover:shadow-blue-500/15",
      iconBg: "bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white",
      accent: "bg-blue-500",
      tag: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      check: "text-blue-600",
      cta: "hsl(217 91% 45%)",
      line: "from-transparent via-blue-500 to-transparent",
    },
    amber: {
      border: "border-black/[0.06] hover:border-amber-500/30",
      glow: "hover:shadow-amber-500/15",
      iconBg: "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
      accent: "bg-amber-500",
      tag: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      check: "text-amber-600",
      cta: "hsl(32 95% 40%)",
      line: "from-transparent via-amber-500 to-transparent",
    },
    purple: {
      border: "border-black/[0.06] hover:border-purple-500/30",
      glow: "hover:shadow-purple-500/15",
      iconBg: "bg-purple-500/10 text-purple-600 group-hover:bg-purple-500 group-hover:text-white",
      accent: "bg-purple-500",
      tag: "bg-purple-500/10 text-purple-700 border-purple-500/20",
      check: "text-purple-600",
      cta: "hsl(271 81% 45%)",
      line: "from-transparent via-purple-500 to-transparent",
    },
  }[accent];

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm",
        "transition-all duration-500 hover:scale-[1.015] hover:shadow-2xl",
        config.border,
        config.glow
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100", config.line)} />

      <div className="relative flex flex-col p-7 sm:p-9">
        <div className="flex items-start justify-between mb-6">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300", config.iconBg)}>
            <Icon className="h-7 w-7" />
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider", config.tag)}>
            {tag}
          </span>
        </div>

        <h3 className="text-2xl font-black text-foreground tracking-tight mb-2.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-7">{subtitle}</p>

        <ul className="space-y-3 mb-7">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", config.check)} />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center gap-2 text-sm font-bold transition-colors" style={{ color: config.cta }}>
          <span>Explorar plataforma</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

// ── Landing Hub ───────────────────────────────────────────────
export default function LandingHub() {
  return (
    <div className="min-h-screen theme-public bg-background">
      {/* ═════════════════════════════════════════════════════════
          NAVBAR — Clean, public-facing
         ═════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 glow-green">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">Neggo</span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-semibold ml-2">Verificado</span>
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
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 shadow-sm"
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

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-semibold text-emerald-700 mb-8">
            <Activity className="h-3.5 w-3.5" />
            Verificado antes de que hables con nadie
          </div>

          <h1 className="text-5xl font-black tracking-tight text-foreground sm:text-7xl lg:text-8xl max-w-5xl mx-auto leading-[0.95]">
            Conseguí lo que buscás en Medellín{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-500 to-blue-600">
              sin caer en una estafa
            </span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Bancos, constructoras y comercios reales, protegidos con anti-fraude.
            Vos decís qué necesitás — nosotros confirmamos que sea legítimo antes de conectarte.
          </p>

          {/* Value props strip */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-12">
            {[
              "1. Decís qué buscás — crédito, comercio o vivienda",
              "2. Verificamos identidad y evitamos fraude",
              "3. Te conectamos directo, sin vueltas",
            ].map((claim) => (
              <div key={claim} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{claim}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          PROOF — "no es una promesa, ya está construido"
         ═════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold mb-3">
          No es una promesa
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-10">
          Esto ya está construido y funcionando
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            "CRM real con seguimiento por sector",
            "Facturación automática mensual, con conciliación",
            "Tarifas negociables — no un precio fijo para todos",
            "Sistema de puntos que ya se canjea entre comercios aliados",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          TRUST BAR
         ═════════════════════════════════════════════════════════ */}
      <section className="border-y border-black/[0.06] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { icon: Lock, label: "Doble verificación", value: "MFA", desc: "Obligatoria en cuentas de negocio" },
              { icon: Shield, label: "Candados de datos", value: "24", desc: "37 reglas de acceso auditadas, una por una" },
              { icon: Zap, label: "Notificaciones", value: "Instantáneo", desc: "Te enteras apenas responden tu solicitud" },
              { icon: ShieldCheck, label: "Datos protegidos", value: "Ley 1581", desc: "Como exige la ley colombiana" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <item.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-foreground">{item.value}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.label}</div>
                <div className="text-[11px] text-muted-foreground/70 max-w-[16ch]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          AUDIENCE PATHS
         ═════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold mb-3">
            Un motor, cuatro maneras de usarlo
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            ¿Qué buscás hoy?
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <AudienceCard
            to="/landing/bancos"
            icon={Building2}
            title="Soy un Banco"
            subtitle="Infraestructura de adquisición de clientes verificados, con anti-fraude incorporado."
            accent="emerald"
            tag="Sin fraude"
            benefits={[
              "Score de precalificación automático (300–950) por ingresos declarados",
              "Tarifas por banco versionadas por periodo",
              "Pipeline con estados reales (solicitudes_banca)",
            ]}
          />

          <AudienceCard
            to="/landing/constructoras"
            icon={HomeIcon}
            title="Soy una Constructora"
            subtitle="Tu equipo de captación digital — leads reales con score financiero, sin pautar."
            accent="blue"
            tag="Pagás solo si cierras"
            benefits={[
              "Success Fee 2.25% sobre cierre, en producción",
              "Algoritmo de equidad 40-30-20-10 en la distribución de leads",
              "Matching por capacidad de compra real del cliente",
            ]}
          />

          <AudienceCard
            to="/corporativo/comercios"
            icon={Store}
            title="Soy un Comercio"
            subtitle="Tu canal de crecimiento — clientes ya calificados, listos para comprar."
            accent="purple"
            tag="Primeros 50 gratis"
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
            subtitle="Tu aliado financiero — te protegemos de estafas y te conseguimos las mejores condiciones."
            accent="amber"
            tag="Protegido siempre"
            benefits={[
              "Bóveda del Cliente con historial de compras",
              "Ofertas comparadas de múltiples comercios",
              "Código anti-phishing único por sesión",
              "Banca privada con selector real de bancos aprobados",
            ]}
          />
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          FAQ — objeciones ya validadas (marketing-neggo.md, sección 8)
         ═════════════════════════════════════════════════════════ */}
      <section className="border-y border-black/[0.06] bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold mb-3">
              Antes de que preguntes
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Las dudas que ya nos hicieron
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                q: "¿Cómo sé que esto es real y no es basura?",
                a: "Verificamos identidad y legitimidad antes de conectarte con nadie. Si algo no cuadra, se marca para revisión antes de llegar a vos.",
              },
              {
                q: "¿Qué pasa si me registro y no me sirve?",
                a: "Sin permanencia. Si no te genera valor, dejás de usarlo — sin contrato de salida ni letra chica.",
              },
              {
                q: "¿Por qué no buscar directo en Instagram o Google?",
                a: "Porque ahí nadie verifica nada. Ese es el trabajo que hacemos por vos antes de ponerte en contacto con alguien.",
              },
              {
                q: "¿Mis datos están seguros?",
                a: "Doble verificación en cuentas de negocio, protección bajo la Ley 1581, y nunca compartimos tu información sin tu autorización explícita.",
              },
            ].map((item) => (
              <div key={item.q} className="rounded-2xl border border-black/[0.06] bg-background p-6 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm font-bold text-foreground mb-2">{item.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          SAFE ACCESS CTA — replaces old Profile Switcher
         ═════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-lg mx-auto rounded-3xl border border-black/[0.06] bg-white shadow-xl p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mx-auto mb-5">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-700 mb-5">
            Cupos limitados — primeros 50 comercios con Sello de Confianza gratis
          </div>
          <h3 className="text-2xl font-black text-foreground mb-2.5">
            Acceso al Ecosistema
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Verificamos todo antes de conectarte, sin letra chica y sin permanencia —
            si no te sirve, te vas sin líos. Bancos, constructoras, comercios y clientes,
            en un solo lugar seguro.
          </p>
          <Link
            to="/login-ecosistema"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 text-base font-bold shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:shadow-emerald-600/40 hover:scale-[1.03]"
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
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-foreground">Neggo</span>
              <span className="text-[10px] text-muted-foreground">— Conexiones verificadas en Medellín</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/landing/bancos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Bancos</Link>
              <Link to="/landing/constructoras" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Constructoras</Link>
              <Link to="/corporativo/comercios" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Comercios</Link>
              <Link to="/landing/clientes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clientes</Link>
              <Link to="/login-ecosistema" className="text-xs text-muted-foreground hover:text-emerald-600 transition-colors">Acceso Seguro</Link>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-muted-foreground/40">
              &copy; 2026 Neggo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
