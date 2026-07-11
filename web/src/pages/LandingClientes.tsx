import { Link } from "react-router-dom";
import {
  UserCircle,
  Sparkles,
  TrendingUp,
  Shield,
  Target,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  LayoutGrid,
  CreditCard,
  HomeIcon,
  Search,
  Star,
  Clock,
  Zap,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthPanel } from "@/components/auth/AuthForms";
import { leads, campaigns, proyectos } from "@/data/mock";
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

function StatCard({ label, value, icon: Icon, suffix = "" }: { label: string; value: number; icon: React.ElementType; suffix?: string }) {
  const display = useAnimatedValue(value);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
        <Icon className="h-5 w-5 text-amber-400" />
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

// ── Product card (campaign preview) ───────────────────────────
function CampaignPreviewCard({ name, type, bank, ctr, leads, cities, id }: { name: string; type: string; bank: string; ctr: number; leads: number; cities: string[]; id: string }) {
  const typeLabels: Record<string, string> = {
    cdt: "CDT",
    hipotecario: "Hipotecario",
    "compra-cartera": "Compra de Cartera",
    tarjetas: "Tarjetas",
    libranzas: "Libranzas",
    vehiculos: "Vehículos",
    inversiones: "Inversiones",
  };

  return (
    <div className="group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <CreditCard className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">{name}</h4>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{bank}</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
          {typeLabels[type] || type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-card/60 px-3 py-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">CTR</div>
          <div className="text-sm font-bold font-mono text-foreground">{ctr}%</div>
        </div>
        <div className="rounded-lg bg-card/60 px-3 py-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Leads</div>
          <div className="text-sm font-bold font-mono text-foreground">{leads}</div>
        </div>
      </div>

      {cities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cities.slice(0, 3).map((c) => (
            <span key={c} className="rounded-md bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              {c}
            </span>
          ))}
          {cities.length > 3 && (
            <span className="rounded-md bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              +{cities.length - 3}
            </span>
          )}
        </div>
      )}

      <Link
        to="/portal"
        className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-amber-500/10 border border-amber-500/20 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
      >
        Solicitar ahora
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ── Project preview card ──────────────────────────────────────
function ProjectPreviewCard({ name, city, type, priceMin, priceMax, units }: { name: string; city: string; type: string; priceMin: number; priceMax: number; units: number }) {
  const priceMinM = Math.round(priceMin / 1_000_000);
  const priceMaxM = Math.round(priceMax / 1_000_000);

  return (
    <div className="group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <HomeIcon className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">{name}</h4>
            <p className="text-[10px] text-muted-foreground">{city}</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
          {type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-card/60 px-3 py-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Precio</div>
          <div className="text-sm font-bold font-mono text-foreground">${priceMinM}–${priceMaxM}M</div>
        </div>
        <div className="rounded-lg bg-card/60 px-3 py-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Unidades</div>
          <div className="text-sm font-bold font-mono text-foreground">{units}</div>
        </div>
      </div>

      <Link
        to="/portal"
        className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-amber-500/10 border border-amber-500/20 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
      >
        Ver proyecto
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default function LandingClientes() {
  const activeCampaigns = campaigns.filter((c) => c.status === "activa");
  const activeProjects = proyectos.filter((p) => p.status === "activo");
  const totalProducts = activeCampaigns.length + activeProjects.length;

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
                Las mejores ofertas{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                  financieras e inmobiliarias
                </span>
                {" "}en un solo lugar
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Explora campañas activas de los principales bancos y proyectos inmobiliarios
                de las mejores constructoras. Compara, solicita y obtén respuestas rápidas
                sin trámites innecesarios.
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

            {/* Right: Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Productos activos" value={totalProducts} icon={LayoutGrid} suffix="+" />
              <StatCard label="Bancos" value={6} icon={Building2} />
              <StatCard label="Constructoras" value={4} icon={HomeIcon} suffix="+" />
              <StatCard label="Ciudades" value={6} icon={Target} />
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
              { step: "01", title: "Explora", desc: "Navega por campañas de CDT, créditos, hipotecarios, tarjetas y proyectos inmobiliarios activos.", icon: Search },
              { step: "02", title: "Compara", desc: "Filtra por banco, ciudad, tipo de producto y rango de precio. Toda la info en un solo lugar.", icon: BarChart3 },
              { step: "03", title: "Solicita", desc: "Un clic y tu solicitud llega directo al banco o constructora. Ellos te contactan en minutos.", icon: Zap },
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
              icon={Target}
              title="Todo en un solo lugar"
              description="CDTs, créditos, tarjetas, hipotecarios, proyectos inmobiliarios. Todos los productos financieros que necesitas, sin visitar 10 sitios distintos."
            />
            <FeatureItem
              icon={Shield}
              title="Bancos verificados"
              description="Solo trabajamos con las principales entidades financieras del país. Tu información está segura con estándares bancarios."
            />
            <FeatureItem
              icon={Clock}
              title="Respuesta rápida"
              description="Tu solicitud llega directo al equipo comercial. Sin formularios interminables ni llamadas a call centers."
            />
            <FeatureItem
              icon={Star}
              title="Comparación inteligente"
              description="Filtra por tasa, monto, plazo, ciudad. Compara productos lado a lado para tomar la mejor decisión financiera."
            />
            <FeatureItem
              icon={CreditCard}
              title="Sin costo para ti"
              description="Neggo es 100% gratuito para clientes. Los bancos y constructoras pagan por conectar contigo. Tú solo comparas y eliges."
            />
            <FeatureItem
              icon={TrendingUp}
              title="Simula tu capacidad"
              description="Calcula tu capacidad de endeudamiento, simulaciones de crédito y visualiza tu elegibilidad antes de solicitar."
            />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════
          LIVE OFFERS PREVIEW
         ═════════════════════════════════════════════════════════ */}
      <section id="ofertas" className="border-t border-border/30 bg-card/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-semibold mb-2">
                Ofertas activas ahora
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Explora lo que está disponible
              </h2>
            </div>
            <Link
              to="/portal"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Ver todas las ofertas
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Campaigns row */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-400" />
              Campañas bancarias
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeCampaigns.slice(0, 3).map((c) => (
                <CampaignPreviewCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  type={c.type}
                  bank={c.bank}
                  ctr={c.ctr}
                  leads={c.leadsGenerated}
                  cities={c.cities}
                />
              ))}
            </div>
          </div>

          {/* Projects row */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <HomeIcon className="h-4 w-4 text-amber-400" />
              Proyectos inmobiliarios
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeProjects.slice(0, 3).map((p) => (
                <ProjectPreviewCard
                  key={p.id}
                  name={p.name}
                  city={p.city}
                  type={p.tipoVivienda}
                  priceMin={p.priceRangeMin}
                  priceMax={p.priceRangeMax}
                  units={p.units}
                />
              ))}
            </div>
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              to="/portal"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-background px-6 py-3 text-sm font-semibold hover:bg-amber-400 transition-colors"
            >
              Ver todas las ofertas
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
