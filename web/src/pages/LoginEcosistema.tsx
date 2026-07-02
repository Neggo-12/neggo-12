import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Building2,
  UserCircle,
  Landmark,
  Store,
  Home,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  X,
  ArrowLeft,
  Lock,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ───── Bank options for B2C registration ─────

const COLOMBIA_BANKS: readonly { id: string; name: string }[] = [
  { id: "bancolombia", name: "Bancolombia" },
  { id: "davivienda", name: "Davivienda" },
  { id: "bogota", name: "Banco de Bogotá" },
  { id: "bbva", name: "BBVA" },
  { id: "colpatria", name: "Colpatria" },
  { id: "itau", name: "Itaú" },
] as const;

// ───── ID types ─────

const ID_TYPES: readonly { id: string; label: string }[] = [
  { id: "cc", label: "Cédula de Ciudadanía" },
  { id: "ce", label: "Cédula de Extranjería" },
  { id: "nit", label: "NIT" },
  { id: "pasaporte", label: "Pasaporte" },
] as const;

// ───── Components ─────

type LoginTab = "b2b" | "b2c";

type B2BSubmitState = "idle" | "loading" | "done";
type B2CSubmitState = "idle" | "loading" | "done";

// ───── B2B: Business Portal ─────

function B2BPortal() {
  const [submitState, setSubmitState] = useState<B2BSubmitState>("idle");
  const [form, setForm] = useState({
    razonSocial: "",
    nit: "",
    correo: "",
    representante: "",
    telefono: "",
  });

  const canSubmit =
    form.razonSocial.trim() !== "" &&
    form.nit.trim() !== "" &&
    form.correo.trim() !== "" &&
    form.representante.trim() !== "" &&
    form.telefono.trim() !== "" &&
    submitState === "idle";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitState("loading");
      // Simulate submission to backend
      setTimeout(() => {
        setSubmitState("done");
        toast.success("Solicitud enviada", {
          description:
            "Tu registro está en revisión. Recibirás un correo cuando sea aprobado.",
        });
        setTimeout(() => {
          setSubmitState("idle");
          setForm({
            razonSocial: "",
            nit: "",
            correo: "",
            representante: "",
            telefono: "",
          });
        }, 3000);
      }, 1500);
    },
    [canSubmit, form]
  );

  const updateField = useCallback(
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    },
    []
  );

  if (submitState === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          Solicitud enviada exitosamente
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Tu registro está siendo revisado por el equipo de Neggo. Recibirás un
          correo de confirmación en las próximas 24-48 horas hábiles.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Razón Social
        </Label>
        <Input
          placeholder="Ej: Constructora Marval S.A."
          value={form.razonSocial}
          onChange={updateField("razonSocial")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          NIT
        </Label>
        <Input
          placeholder="Ej: 900.123.456-7"
          value={form.nit}
          onChange={updateField("nit")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Correo Corporativo
        </Label>
        <Input
          type="email"
          placeholder="Ej: gerente@constructora.com"
          value={form.correo}
          onChange={updateField("correo")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Representante Legal
        </Label>
        <Input
          placeholder="Nombre completo del representante"
          value={form.representante}
          onChange={updateField("representante")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Teléfono de Contacto
        </Label>
        <Input
          type="tel"
          placeholder="Ej: +57 300 123 4567"
          value={form.telefono}
          onChange={updateField("telefono")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
        />
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
          canSubmit
            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {submitState === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando solicitud...
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Solicitar Registro Empresarial
          </>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Al enviar esta solicitud, aceptas los términos y condiciones del
        ecosistema Neggo. Tu información será verificada antes de la activación.
      </p>
    </form>
  );
}

// ───── B2C: Client Portal ─────

function B2CPortal() {
  const navigate = useNavigate();
  const [submitState, setSubmitState] = useState<B2CSubmitState>("idle");
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    tipoId: "",
    numeroId: "",
    correo: "",
    celular: "",
  });
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  const canSubmit =
    form.nombres.trim() !== "" &&
    form.apellidos.trim() !== "" &&
    form.tipoId !== "" &&
    form.numeroId.trim() !== "" &&
    form.correo.trim() !== "" &&
    form.celular.trim() !== "" &&
    submitState === "idle";

  const toggleBank = useCallback((bankId: string) => {
    setSelectedBanks((prev) =>
      prev.includes(bankId)
        ? prev.filter((b) => b !== bankId)
        : [...prev, bankId]
    );
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitState("loading");
      setTimeout(() => {
        setSubmitState("done");
        toast.success("¡Registro exitoso!", {
          description:
            "Bienvenido al portal de Neggo. Redirigiendo a tu panel financiero...",
        });
        setTimeout(() => {
          navigate("/portal");
        }, 2000);
      }, 1500);
    },
    [canSubmit, navigate]
  );

  const updateField =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  if (submitState === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-cyan-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          ¡Registro completado!
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Bienvenido a Neggo. Serás redirigido a tu portal financiero personal
          donde podrás explorar ofertas, crear metas de ahorro y conectar con
          bancos y constructoras.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Row: Nombres + Apellidos ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Nombres
          </Label>
          <Input
            placeholder="Ej: Jhon Edison"
            value={form.nombres}
            onChange={updateField("nombres")}
            className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Apellidos
          </Label>
          <Input
            placeholder="Ej: Flórez"
            value={form.apellidos}
            onChange={updateField("apellidos")}
            className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
          />
        </div>
      </div>

      {/* ── Row: Tipo ID + Número ID ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tipo de ID
          </Label>
          <Select
            value={form.tipoId}
            onValueChange={(val) =>
              setForm((prev) => ({ ...prev, tipoId: val }))
            }
          >
            <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
              {ID_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Número de ID
          </Label>
          <Input
            placeholder="Ej: 1234567890"
            value={form.numeroId}
            onChange={updateField("numeroId")}
            className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
          />
        </div>
      </div>

      {/* ── Correo ── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Correo Electrónico
        </Label>
        <Input
          type="email"
          placeholder="Ej: jhon.florez@email.com"
          value={form.correo}
          onChange={updateField("correo")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
        />
      </div>

      {/* ── Celular ── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Celular
        </Label>
        <Input
          type="tel"
          placeholder="Ej: +57 300 123 4567"
          value={form.celular}
          onChange={updateField("celular")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
        />
      </div>

      {/* ── Bank Matrix ── */}
      <div className="space-y-3 rounded-xl border border-border/40 bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-emerald-400" />
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bancos con productos activos
          </Label>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Marca los bancos con los que ya tienes productos financieros para
          personalizar tu experiencia.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {COLOMBIA_BANKS.map((bank) => {
            const isSelected = selectedBanks.includes(bank.id);
            return (
              <button
                key={bank.id}
                type="button"
                onClick={() => toggleBank(bank.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all duration-200 text-left cursor-pointer",
                  isSelected
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/30"
                      : "border-border/60"
                  )}
                >
                  {isSelected && (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  )}
                </div>
                {bank.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Submit ── */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
          canSubmit
            ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {submitState === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creando cuenta...
          </>
        ) : (
          <>
            <UserCircle className="h-4 w-4" />
            Crear Cuenta y Acceder al Portal
          </>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Tus datos están protegidos bajo la política de privacidad de Neggo.
        Nunca compartiremos tu información sin tu autorización explícita.
      </p>
    </form>
  );
}

// ───── Main Page ─────

export default function LoginEcosistema() {
  const [activeTab, setActiveTab] = useState<LoginTab>("b2b");

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">
                Neggo
              </span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold ml-2">
                Acceso Seguro
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-xl px-4 sm:px-6 py-12 lg:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] font-medium text-emerald-400 mb-4">
            <Lock className="h-3 w-3" />
            Entorno Seguro — Cifrado de extremo a extremo
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Acceso al Ecosistema
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Selecciona tu tipo de portal para acceder o registrarte en Neggo.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-border/30">
            <button
              onClick={() => setActiveTab("b2b")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all relative",
                activeTab === "b2b"
                  ? "text-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Portales de Negocio B2B</span>
              <span className="sm:hidden">B2B</span>
              {activeTab === "b2b" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-blue-500 shadow-[0_0_8px_hsl(217_91%_60%/0.5)]" />
              )}
            </button>
            <div className="w-px bg-border/30 my-2" />
            <button
              onClick={() => setActiveTab("b2c")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all relative",
                activeTab === "b2c"
                  ? "text-cyan-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Portal Clientes B2C</span>
              <span className="sm:hidden">B2C</span>
              {activeTab === "b2c" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-cyan-500 shadow-[0_0_8px_hsl(189_94%_43%/0.5)]" />
              )}
            </button>
          </div>

          {/* ── Tab Content ── */}
          <div className="p-5 sm:p-6">
            {activeTab === "b2b" && (
              <div className="space-y-4 animate-fade-in">
                {/* Entity type badges */}
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      icon: Landmark,
                      label: "Bancos",
                      color: "text-emerald-400",
                      bg: "bg-emerald-500/10 border-emerald-500/20",
                    },
                    {
                      icon: Home,
                      label: "Constructoras",
                      color: "text-blue-400",
                      bg: "bg-blue-500/10 border-blue-500/20",
                    },
                    {
                      icon: Store,
                      label: "Comercios",
                      color: "text-amber-400",
                      bg: "bg-amber-500/10 border-amber-500/20",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold",
                        item.bg,
                        item.color
                      )}
                    >
                      <item.icon className="h-3 w-3" />
                      {item.label}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Regístrate como empresa para acceder al ecosistema Neggo.
                  Bancos, constructoras y comercios aliados pueden gestionar
                  leads, publicar ofertas y conectar con clientes verificados.
                </p>

                <B2BPortal />
              </div>
            )}

            {activeTab === "b2c" && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Crea tu cuenta personal para acceder a ofertas financieras,
                  proyectos inmobiliarios, metas de ahorro y la red de comercios
                  aliados con Sello de Confianza Neggo.
                </p>

                <B2CPortal />
              </div>
            )}
          </div>
        </div>

        {/* ── Admin access link ── */}
        <div className="mt-8 flex items-center justify-center">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-slate-500/40 hover:bg-card/60 transition-all duration-200"
          >
            <Crown className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">Acceso Administrativo Master</span>
            <span className="text-[10px] text-muted-foreground/50">— Admin Neggo</span>
          </Link>
        </div>

        {/* ── Security footer ── */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60">
          <ShieldCheck className="h-3 w-3" />
          <span>Conexión cifrada — ISO 27001</span>
          <span className="text-border/40">|</span>
          <span>Neggo &copy; 2026</span>
        </div>
      </main>
    </div>
  );
}
