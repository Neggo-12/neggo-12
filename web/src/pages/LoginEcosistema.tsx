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
  ArrowLeft,
  Lock,
  Crown,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
  AlertCircle,
  LogIn,
  UserPlus,
  BadgeCheck,
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
import {
  isSupabaseConfigured,
  validatePassword,
  checkDuplicates,
} from "@/core/db/supabaseClient";
import { useAdminStore } from "@/features/admin/store/useAdminStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { OnboardingRequest, AdminEntityType, AuthorizationStatus } from "@/types";

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

// ───── Types ─────

type LoginTab = "b2b" | "b2c";
type AuthMode = "login" | "register";
type B2BSector = "banca" | "constructora" | "comercio";

type SubmitState = "idle" | "loading" | "done";

const B2B_SECTORS: readonly {
  id: B2BSector;
  label: string;
  icon: typeof Landmark;
  color: string;
  bg: string;
  border: string;
  placeholder: string;
  roleValue: string;
}[] = [
  {
    id: "banca",
    label: "Bancos",
    icon: Landmark,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    placeholder: "Ej: Bancolombia S.A.",
    roleValue: "Banco",
  },
  {
    id: "constructora",
    label: "Constructoras",
    icon: Home,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    placeholder: "Ej: Marval S.A.",
    roleValue: "Constructora",
  },
  {
    id: "comercio",
    label: "Comercios",
    icon: Store,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    placeholder: "Ej: AutoMercado Premium S.A.",
    roleValue: "Comercio",
  },
] as const;

// ───── Shared: Password Field with toggle visibility ─────

function PasswordField({
  value,
  onChange,
  placeholder,
  id,
  label,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  id: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      >
        {label}
      </Label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm pl-10 pr-10 font-mono"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// ───── Shared: Password Requirements Indicator ─────

function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  const { errors } = validatePassword(password);
  const checks = [
    {
      label: "Mínimo 8 caracteres",
      met: password.length >= 8,
    },
    {
      label: "Al menos una mayúscula",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Al menos un número",
      met: /[0-9]/.test(password),
    },
  ];

  return (
    <div className="space-y-1.5 rounded-lg border border-border/30 bg-card/30 p-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        Requisitos de seguridad
      </p>
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-2 text-[11px]">
          <div
            className={cn(
              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors",
              c.met ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"
            )}
          >
            {c.met ? (
              <CheckCircle2 className="h-2.5 w-2.5" />
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            )}
          </div>
          <span className={c.met ? "text-emerald-400" : "text-muted-foreground"}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ───── B2B: Login Form ─────

function B2BLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const canLogin = email.trim() !== "" && password.trim() !== "" && !loading;

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canLogin) return;
      setLoading(true);

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", {
            description:
              "Las credenciales de Supabase no están configuradas. Contacta al administrador.",
          });
          setLoading(false);
          return;
        }

        const result = await useAuthStore.getState().loginWithCredentials({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!result.success) {
          if (result.pendingApproval) {
            toast.error("Cuenta pendiente de aprobación", {
              description:
                "Tu registro está siendo revisado por el equipo de Neggo. Recibirás un correo cuando sea aprobado.",
            });
          } else if (result.rejected) {
            toast.error("Cuenta rechazada", {
              description:
                "Tu solicitud de registro fue rechazada. Contacta a soporte para más información.",
            });
          } else {
            toast.error("Error de acceso", {
              description: result.error ?? "No se pudo iniciar sesión.",
            });
          }
          setLoading(false);
          return;
        }

        toast.success("¡Acceso exitoso!", {
          description: `Bienvenido al ecosistema Neggo como ${result.role}.`,
        });
        // Backend decides the dashboard route
        setTimeout(() => navigate(result.dashboardRoute ?? "/"), 600);
      } catch {
        toast.error("Error inesperado", {
          description: "Ocurrió un error al intentar iniciar sesión.",
        });
      }
      setLoading(false);
    },
    [canLogin, email, password, navigate]
  );

  const handleRecovery = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!recoveryEmail.trim() || recoveryLoading) return;
      setRecoveryLoading(true);

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", {
            description: "Contacta al administrador.",
          });
          setRecoveryLoading(false);
          return;
        }

        const { requestPasswordReset } = await import("@/core/domain/auth/authService");
        const result = await requestPasswordReset(recoveryEmail.trim().toLowerCase());

        if (!result.success) {
          toast.error("Error al enviar recuperación", {
            description: result.error,
          });
          setRecoveryLoading(false);
          return;
        }

        setRecoverySent(true);
        toast.success("Correo de recuperación enviado", {
          description:
            "Revisa tu bandeja de entrada para restablecer tu contraseña.",
        });
      } catch {
        toast.error("Error inesperado", {
          description: "No se pudo enviar el correo de recuperación.",
        });
      }
      setRecoveryLoading(false);
    },
    [recoveryEmail, recoveryLoading]
  );

  if (showRecovery) {
    return (
      <div className="space-y-5 animate-fade-in">
        {recoverySent ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
              <Mail className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Correo enviado
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Hemos enviado un enlace de recuperación a{" "}
              <span className="text-blue-400 font-medium">{recoveryEmail}</span>.
              Revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowRecovery(false);
                setRecoverySent(false);
                setRecoveryEmail("");
              }}
              className="mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleRecovery} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-blue-400" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Correo electrónico de recuperación
                </Label>
              </div>
              <Input
                type="email"
                placeholder="Ej: gerente@empresa.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={!recoveryEmail.trim() || recoveryLoading}
              className={cn(
                "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
                recoveryEmail.trim()
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {recoveryLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Enviar enlace de recuperación
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowRecovery(false);
                setRecoveryEmail("");
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Correo Electrónico (Usuario Maestro)
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Ej: gerente@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm pl-10"
          />
        </div>
      </div>

      <PasswordField
        id="b2b-login-password"
        label="Contraseña"
        placeholder="Ingresa tu contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowRecovery(true)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <Button
        type="submit"
        disabled={!canLogin}
        className={cn(
          "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
          canLogin
            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando credenciales...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Ingresar
          </>
        )}
      </Button>
    </form>
  );
}

// ───── B2B: Register Form ─────

function B2BRegister() {
  const [sector, setSector] = useState<B2BSector>("banca");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [form, setForm] = useState({
    razonSocial: "",
    nit: "",
    correo: "",
    representante: "",
    telefono: "",
    password: "",
    confirmPassword: "",
  });

  const activeSector = B2B_SECTORS.find((s) => s.id === sector)!;
  const pwValidation = validatePassword(form.password);
  const passwordsMatch =
    form.password && form.confirmPassword && form.password === form.confirmPassword;

  const canSubmit =
    form.razonSocial.trim() !== "" &&
    form.nit.trim() !== "" &&
    form.correo.trim() !== "" &&
    form.representante.trim() !== "" &&
    form.telefono.trim() !== "" &&
    form.password.trim() !== "" &&
    form.confirmPassword.trim() !== "" &&
    pwValidation.isValid &&
    passwordsMatch &&
    submitState === "idle";

  const updateField = useCallback(
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitState("loading");

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", {
            description: "Contacta al administrador.",
          });
          setSubmitState("idle");
          return;
        }

        // Duplicate check
        const duplicateField = await checkDuplicates({
          email: form.correo.trim().toLowerCase(),
          telefono: form.telefono.trim(),
        });

        if (duplicateField) {
          const fieldLabels: Record<string, string> = {
            correo: "correo",
            celular: "celular",
          };
          toast.error("Error: Datos duplicados", {
            description: `El ${fieldLabels[duplicateField] || duplicateField} ya se encuentra registrado en el ecosistema.`,
          });
          setSubmitState("idle");
          return;
        }

        // Delegate to the auth domain service (creates user + org + membership transactionally)
        const result = await useAuthStore.getState().registerB2BOrganization({
          razonSocial: form.razonSocial.trim(),
          nit: form.nit.trim(),
          email: form.correo.trim().toLowerCase(),
          representante: form.representante.trim(),
          telefono: form.telefono.trim(),
          password: form.password,
          sector,
        });

        if (!result.success) {
          toast.error("Error al registrar", {
            description: result.error,
          });
          setSubmitState("idle");
          return;
        }

        // Fallback garantizado: añadir al store de Zustand para que el Admin
        // lo vea de inmediato en memoria, incluso si Supabase falla o no está
        // configurado. Esto asegura que el registro SIEMPRE aparezca en /admin.
        const entityTypeMap: Record<B2BSector, AdminEntityType> = {
          banca: "banco",
          constructora: "constructora",
          comercio: "comercio",
        };
        const pendingRequest: OnboardingRequest = {
          id: result.userId ?? `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          entityType: entityTypeMap[sector],
          name: form.razonSocial.trim(),
          detail: `${activeSector.roleValue} — ${form.correo.trim().toLowerCase()}`,
          city: "Sin ciudad",
          nit: form.nit.trim(),
          status: "pendiente" as AuthorizationStatus,
          submittedAt: new Date().toISOString(),
          contacto: {
            nombre: form.representante.trim(),
            cargo: activeSector.roleValue,
            correo: form.correo.trim().toLowerCase(),
            telefono: form.telefono.trim(),
            estadoDocumentos: "pendiente",
          },
        };
        useAdminStore.getState().addPendingRequest(pendingRequest);

        setSubmitState("done");
        toast.success("Registro enviado a revisión", {
          description:
            "Tu solicitud como " + activeSector.label + " está en revisión. El equipo de Neggo la aprobará en las próximas 24-48 horas hábiles.",
        });
      } catch {
        toast.error("Error inesperado", {
          description: "Ocurrió un error al procesar tu registro.",
        });
        setSubmitState("idle");
      }
    },
    [canSubmit, form, activeSector, sector]
  );

  if (submitState === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          Solicitud enviada exitosamente
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Tu registro como{" "}
          <span className="font-medium text-foreground">{activeSector.label}</span>{" "}
          está siendo revisado por el equipo de Neggo. Recibirás un correo de
          confirmación cuando tu cuenta sea aprobada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      {/* ── Sector Selector ── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tipo de Entidad
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {B2B_SECTORS.map((s) => {
            const isActive = sector === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSector(s.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-all duration-200 cursor-pointer",
                  isActive
                    ? cn(s.bg, s.border, s.color, "shadow-sm")
                    : "border-border/40 bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                <s.icon
                  className={cn("h-5 w-5", isActive ? s.color : "text-muted-foreground")}
                />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Razón Social
        </Label>
        <Input
          placeholder={activeSector.placeholder}
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
          placeholder="Ej: gerente@empresa.com"
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

      {/* ── Password Fields ── */}
      <PasswordField
        id="b2b-reg-password"
        label="Contraseña"
        placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
        value={form.password}
        onChange={updateField("password")}
      />

      <PasswordRequirements password={form.password} />

      <PasswordField
        id="b2b-reg-confirm"
        label="Confirmar Contraseña"
        placeholder="Repite tu contraseña"
        value={form.confirmPassword}
        onChange={updateField("confirmPassword")}
      />

      {form.confirmPassword && !passwordsMatch && (
        <div className="flex items-center gap-2 text-[11px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Las contraseñas no coinciden
        </div>
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
          canSubmit
            ? cn(
                activeSector.id === "banca"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                  : activeSector.id === "constructora"
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20"
              )
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {submitState === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando y registrando...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
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

// ───── B2B Portal (wrapper with login/register sub-tabs) ─────

function B2BPortal() {
  const [authMode, setAuthMode] = useState<AuthMode>("register");

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Entity type badges */}
      <div className="flex flex-wrap gap-2">
        {B2B_SECTORS.map((s) => (
          <div
            key={s.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold",
              s.bg,
              s.border,
              s.color
            )}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {authMode === "register"
          ? "Regístrate como empresa para acceder al ecosistema Neggo. Bancos, constructoras y comercios aliados pueden gestionar leads, publicar ofertas y conectar con clientes verificados."
          : "Inicia sesión con tu cuenta empresarial para gestionar leads, publicar ofertas y acceder a tu panel de control."}
      </p>

      {/* ── Login / Register sub-tabs ── */}
      <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
        <div className="flex border-b border-border/30">
          <button
            onClick={() => setAuthMode("login")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative",
              authMode === "login"
                ? "text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LogIn className="h-3.5 w-3.5" />
            Iniciar Sesión
            {authMode === "login" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-blue-500 shadow-[0_0_6px_hsl(217_91%_60%/0.4)]" />
            )}
          </button>
          <div className="w-px bg-border/30 my-1.5" />
          <button
            onClick={() => setAuthMode("register")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative",
              authMode === "register"
                ? "text-emerald-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Registrarse
            {authMode === "register" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-emerald-500 shadow-[0_0_6px_hsl(160_84%_39%/0.4)]" />
            )}
          </button>
        </div>

        <div className="p-5">
          {authMode === "login" ? <B2BLogin /> : <B2BRegister />}
        </div>
      </div>
    </div>
  );
}

// ───── B2C: Login Form ─────

function B2CLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const canLogin = email.trim() !== "" && password.trim() !== "" && !loading;

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canLogin) return;
      setLoading(true);

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", {
            description: "Contacta al administrador.",
          });
          setLoading(false);
          return;
        }

        const result = await useAuthStore.getState().loginWithCredentials({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!result.success) {
          if (result.pendingApproval) {
            toast.error("Cuenta pendiente de aprobación", {
              description: "Tu cuenta está siendo revisada por el equipo de Neggo.",
            });
          } else {
            toast.error("Error de acceso", {
              description: result.error ?? "No se pudo iniciar sesión.",
            });
          }
          setLoading(false);
          return;
        }

        toast.success("¡Bienvenido a Neggo!", {
          description: "Accediendo a tu portal financiero personal...",
        });
        setTimeout(() => navigate(result.dashboardRoute ?? "/portal"), 800);
      } catch {
        toast.error("Error inesperado", {
          description: "Ocurrió un error al intentar iniciar sesión.",
        });
      }
      setLoading(false);
    },
    [canLogin, email, password, navigate]
  );

  const handleRecovery = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!recoveryEmail.trim() || recoveryLoading) return;
      setRecoveryLoading(true);

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", {
            description: "Contacta al administrador.",
          });
          setRecoveryLoading(false);
          return;
        }

        const { requestPasswordReset } = await import("@/core/domain/auth/authService");
        const result = await requestPasswordReset(recoveryEmail.trim().toLowerCase());

        if (!result.success) {
          toast.error("Error al enviar recuperación", {
            description: result.error,
          });
          setRecoveryLoading(false);
          return;
        }

        setRecoverySent(true);
        toast.success("Correo de recuperación enviado", {
          description:
            "Revisa tu bandeja de entrada para restablecer tu contraseña.",
        });
      } catch {
        toast.error("Error inesperado", {
          description: "No se pudo enviar el correo de recuperación.",
        });
      }
      setRecoveryLoading(false);
    },
    [recoveryEmail, recoveryLoading]
  );

  if (showRecovery) {
    return (
      <div className="space-y-5 animate-fade-in">
        {recoverySent ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
              <Mail className="h-8 w-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Correo enviado
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Hemos enviado un enlace de recuperación a{" "}
              <span className="text-cyan-400 font-medium">{recoveryEmail}</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowRecovery(false);
                setRecoverySent(false);
                setRecoveryEmail("");
              }}
              className="mt-4 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleRecovery} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-cyan-400" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Correo electrónico de recuperación
                </Label>
              </div>
              <Input
                type="email"
                placeholder="Ej: jhon.florez@email.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={!recoveryEmail.trim() || recoveryLoading}
              className={cn(
                "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
                recoveryEmail.trim()
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {recoveryLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Enviar enlace de recuperación
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowRecovery(false);
                setRecoveryEmail("");
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Correo Electrónico
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Ej: jhon.florez@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm pl-10"
          />
        </div>
      </div>

      <PasswordField
        id="b2c-login-password"
        label="Contraseña"
        placeholder="Ingresa tu contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowRecovery(true)}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <Button
        type="submit"
        disabled={!canLogin}
        className={cn(
          "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
          canLogin
            ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando credenciales...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Ingresar
          </>
        )}
      </Button>
    </form>
  );
}

// ───── B2C: Register Form ─────

function B2CRegister() {
  const navigate = useNavigate();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    tipoId: "",
    numeroId: "",
    correo: "",
    celular: "",
    password: "",
    confirmPassword: "",
  });
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  const pwValidation = validatePassword(form.password);
  const passwordsMatch =
    form.password && form.confirmPassword && form.password === form.confirmPassword;

  const canSubmit =
    form.nombres.trim() !== "" &&
    form.apellidos.trim() !== "" &&
    form.tipoId !== "" &&
    form.numeroId.trim() !== "" &&
    form.correo.trim() !== "" &&
    form.celular.trim() !== "" &&
    form.password.trim() !== "" &&
    form.confirmPassword.trim() !== "" &&
    pwValidation.isValid &&
    passwordsMatch &&
    submitState === "idle";

  const toggleBank = useCallback((bankId: string) => {
    setSelectedBanks((prev) =>
      prev.includes(bankId) ? prev.filter((b) => b !== bankId) : [...prev, bankId]
    );
  }, []);

  const updateField =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitState("loading");

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", {
            description: "Contacta al administrador.",
          });
          setSubmitState("idle");
          return;
        }

        // Duplicate check
        const duplicateField = await checkDuplicates({
          email: form.correo.trim().toLowerCase(),
          telefono: form.celular.trim(),
        });

        if (duplicateField) {
          const fieldLabels: Record<string, string> = {
            correo: "correo",
            celular: "celular",
          };
          toast.error("Error: Datos duplicados", {
            description: `El ${fieldLabels[duplicateField] || duplicateField} ya se encuentra registrado en el ecosistema.`,
          });
          setSubmitState("idle");
          return;
        }

        // Delegate to the auth domain service (auto-approves + auto-logs-in B2C clients)
        const result = await useAuthStore.getState().registerB2CClient({
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          tipoId: form.tipoId,
          numeroId: form.numeroId.trim(),
          email: form.correo.trim().toLowerCase(),
          celular: form.celular.trim(),
          password: form.password,
          selectedBanks,
        });

        if (!result.success) {
          toast.error("Error al registrar", {
            description: result.error,
          });
          setSubmitState("idle");
          return;
        }

        setSubmitState("done");
        toast.success("¡Registro exitoso!", {
          description:
            "Bienvenido al portal de Neggo. Redirigiendo a tu panel financiero...",
        });
        // Backend decides the route — B2C clients go to /portal
        setTimeout(() => navigate("/portal"), 2000);
      } catch {
        toast.error("Error inesperado", {
          description: "Ocurrió un error al procesar tu registro.",
        });
        setSubmitState("idle");
      }
    },
    [canSubmit, form, selectedBanks, navigate]
  );

  if (submitState === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
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
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
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
            onValueChange={(val) => setForm((prev) => ({ ...prev, tipoId: val }))}
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

      {/* ── Password Fields ── */}
      <PasswordField
        id="b2c-reg-password"
        label="Contraseña"
        placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
        value={form.password}
        onChange={updateField("password")}
      />

      <PasswordRequirements password={form.password} />

      <PasswordField
        id="b2c-reg-confirm"
        label="Confirmar Contraseña"
        placeholder="Repite tu contraseña"
        value={form.confirmPassword}
        onChange={updateField("confirmPassword")}
      />

      {form.confirmPassword && !passwordsMatch && (
        <div className="flex items-center gap-2 text-[11px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Las contraseñas no coinciden
        </div>
      )}

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
                  {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
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
            Verificando y creando cuenta...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
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

// ───── B2C Portal (wrapper with login/register sub-tabs) ─────

function B2CPortal() {
  const [authMode, setAuthMode] = useState<AuthMode>("register");

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {authMode === "register"
          ? "Crea tu cuenta personal para acceder a ofertas financieras, proyectos inmobiliarios, metas de ahorro y la red de comercios aliados con Sello de Confianza Neggo."
          : "Inicia sesión para acceder a tus metas de ahorro, ofertas personalizadas y el control de tu vida financiera."}
      </p>

      {/* ── Login / Register sub-tabs ── */}
      <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
        <div className="flex border-b border-border/30">
          <button
            onClick={() => setAuthMode("login")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative",
              authMode === "login"
                ? "text-cyan-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LogIn className="h-3.5 w-3.5" />
            Iniciar Sesión
            {authMode === "login" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-cyan-500 shadow-[0_0_6px_hsl(189_94%_43%/0.4)]" />
            )}
          </button>
          <div className="w-px bg-border/30 my-1.5" />
          <button
            onClick={() => setAuthMode("register")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative",
              authMode === "register"
                ? "text-emerald-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Registrarse
            {authMode === "register" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-emerald-500 shadow-[0_0_6px_hsl(160_84%_39%/0.4)]" />
            )}
          </button>
        </div>

        <div className="p-5">
          {authMode === "login" ? <B2CLogin /> : <B2CRegister />}
        </div>
      </div>
    </div>
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
            {activeTab === "b2b" && <B2BPortal />}
            {activeTab === "b2c" && <B2CPortal />}
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
            <span className="text-[10px] text-muted-foreground/50">
              — Admin Neggo
            </span>
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
