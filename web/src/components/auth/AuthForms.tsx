import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  KeyRound,
  Lock,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
  CheckCircle2,
  Building2,
  Home,
  Store,
  ArrowLeft,
  ShieldCheck,
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
import { PasswordField, PasswordRequirements } from "./AuthFields";
import {
  type B2BSector,
  type AuthMode,
  type SubmitState,
  type AccentColor,
  BANK_PRODUCTS,
  ID_TYPES,
  getSectorConfig,
  getTheme,
} from "./authConfig";
import { fetchBancosAprobados } from "@/core/db/repositories";
import { RANGO_INGRESOS_LABELS } from "@/components/crm/leadLabels";
import type { RangoIngresosMensuales } from "@/core/domain/auth/types";

// ═══════════════════════════════════════════════════════════════
// B2B LOGIN
// ═══════════════════════════════════════════════════════════════

export function B2BLogin({
  themeColor = "blue",
  expectedRole,
}: {
  themeColor?: AccentColor;
  /** Server-verified role required for this portal. Login succeeds against
   *  Supabase Auth, but access is denied and the session is signed out if
   *  the authenticated user's role doesn't match. */
  expectedRole?: string;
}) {
  const navigate = useNavigate();
  const theme = getTheme(themeColor);
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
            description: "Las credenciales de Supabase no están configuradas. Contacta al administrador.",
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
              description: "Tu registro está siendo revisado por el equipo de Neggo. Recibirás un correo cuando sea aprobado.",
            });
          } else if (result.rejected) {
            toast.error("Cuenta rechazada", {
              description: "Tu solicitud de registro fue rechazada. Contacta a soporte para más información.",
            });
          } else {
            toast.error("Error de acceso", {
              description: result.error ?? "No se pudo iniciar sesión.",
            });
          }
          setLoading(false);
          return;
        }

        if (expectedRole && result.role !== expectedRole) {
          await useAuthStore.getState().logout();
          toast.error("Cuenta incorrecta para este portal", {
            description: "Esta cuenta no corresponde a este portal. Usa el portal correcto para tu tipo de cuenta.",
          });
          setLoading(false);
          return;
        }

        toast.success("¡Acceso exitoso!", {
          description: `Bienvenido al ecosistema Neggo como ${result.role}.`,
        });
        setTimeout(() => navigate(result.dashboardRoute ?? "/"), 600);
      } catch {
        toast.error("Error inesperado", {
          description: "Ocurrió un error al intentar iniciar sesión.",
        });
      }
      setLoading(false);
    },
    [canLogin, email, password, navigate, expectedRole]
  );

  const handleRecovery = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!recoveryEmail.trim() || recoveryLoading) return;
      setRecoveryLoading(true);

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", { description: "Contacta al administrador." });
          setRecoveryLoading(false);
          return;
        }

        const { requestPasswordReset } = await import("@/core/domain/auth/authService");
        const result = await requestPasswordReset(recoveryEmail.trim().toLowerCase());

        if (!result.success) {
          toast.error("Error al enviar recuperación", { description: result.error });
          setRecoveryLoading(false);
          return;
        }

        setRecoverySent(true);
        toast.success("Correo de recuperación enviado", {
          description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
        });
      } catch {
        toast.error("Error inesperado", { description: "No se pudo enviar el correo de recuperación." });
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
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl mb-4 border", theme.recoveryBg, theme.recoveryBorder)}>
              <Mail className={cn("h-8 w-8", theme.recoveryIconColor)} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Correo enviado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Hemos enviado un enlace de recuperación a{" "}
              <span className={cn("font-medium", theme.accent)}>{recoveryEmail}</span>.
              Revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
            <button
              type="button"
              onClick={() => { setShowRecovery(false); setRecoverySent(false); setRecoveryEmail(""); }}
              className={cn("mt-4 text-xs transition-colors cursor-pointer", theme.recoveryAccent)}
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleRecovery} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Mail className={cn("h-4 w-4", theme.accent)} />
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
                recoveryEmail.trim() ? theme.recoveryButton : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {recoveryLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Mail className="h-4 w-4" /> Enviar enlace de recuperación</>
              )}
            </Button>
            <button
              type="button"
              onClick={() => { setShowRecovery(false); setRecoveryEmail(""); }}
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
        id={`b2b-login-${themeColor}`}
        label="Contraseña"
        placeholder="Ingresa tu contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowRecovery(true)}
          className={cn("text-xs transition-colors cursor-pointer", theme.recoveryAccent)}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <Button
        type="submit"
        disabled={!canLogin}
        className={cn(
          "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
          canLogin ? theme.button : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Verificando credenciales...</>
        ) : (
          <><LogIn className="h-4 w-4" /> Ingresar</>
        )}
      </Button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// B2B REGISTER (locked to a single sector)
// ═══════════════════════════════════════════════════════════════

export function B2BRegister({ sector }: { sector: B2BSector }) {
  const sectorCfg = getSectorConfig(sector);
  const theme = getTheme(sectorCfg.themeColor);
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
  const [resultRequiresEmailConfirmation, setResultRequiresEmailConfirmation] = useState(false);

  const pwValidation = validatePassword(form.password);
  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;

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
          toast.error("Base de datos no configurada", { description: "Contacta al administrador." });
          setSubmitState("idle");
          return;
        }

        const duplicateField = await checkDuplicates({
          email: form.correo.trim().toLowerCase(),
          documentNumber: form.nit.trim(),
          documentType: "nit",
        });

        if (duplicateField) {
          const fieldLabels: Record<string, string> = { correo: "correo", documento: "NIT" };
          toast.error("Error: Datos duplicados", {
            description: `El ${fieldLabels[duplicateField] || duplicateField} ya se encuentra registrado en el ecosistema.`,
          });
          setSubmitState("idle");
          return;
        }

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
          toast.error("Error al registrar", { description: result.error });
          setSubmitState("idle");
          return;
        }

        const entityTypeMap: Record<B2BSector, AdminEntityType> = {
          banca: "banco",
          constructora: "constructora",
          comercio: "comercio",
        };
        const pendingRequest: OnboardingRequest = {
          id: result.userId ?? `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          entityType: entityTypeMap[sector],
          name: form.razonSocial.trim(),
          detail: `${sectorCfg.roleValue} — ${form.correo.trim().toLowerCase()}`,
          city: "Sin ciudad",
          nit: form.nit.trim(),
          status: "pendiente" as AuthorizationStatus,
          submittedAt: new Date().toISOString(),
          contacto: {
            nombre: form.representante.trim(),
            cargo: sectorCfg.roleValue,
            correo: form.correo.trim().toLowerCase(),
            telefono: form.telefono.trim(),
            estadoDocumentos: "pendiente",
          },
        };
        useAdminStore.getState().addPendingRequest(pendingRequest);

        setResultRequiresEmailConfirmation(!!result.requiresEmailConfirmation);
        setSubmitState("done");
        if (result.requiresEmailConfirmation) {
          toast.success("Registro enviado — confirma tu correo", {
            description: `Tu solicitud como ${sectorCfg.label} fue recibida. Hemos enviado un correo de confirmación a ${form.correo.trim().toLowerCase()}. Revisa tu bandeja y confirma para completar el registro.`,
          });
        } else {
          toast.success("Registro enviado a revisión", {
            description: `Tu solicitud como ${sectorCfg.label} está en revisión. El equipo de Neggo la aprobará en las próximas 24-48 horas hábiles.`,
          });
        }
      } catch {
        toast.error("Error inesperado", { description: "Ocurrió un error al procesar tu registro." });
        setSubmitState("idle");
      }
    },
    [canSubmit, form, sectorCfg, sector]
  );

  if (submitState === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl mb-4 border", theme.recoveryBg, theme.recoveryBorder)}>
          <CheckCircle2 className={cn("h-8 w-8", theme.accent)} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          {resultRequiresEmailConfirmation ? "Solicitud enviada" : "Solicitud enviada exitosamente"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {resultRequiresEmailConfirmation ? (
            <>
              Tu registro como{" "}
              <span className="font-medium text-foreground">{sectorCfg.label}</span>{" "}
              fue recibido. Hemos enviado un correo de confirmación a{" "}
              <span className="font-medium text-foreground">{form.correo.trim().toLowerCase()}</span>.{" "}
              Revisa tu bandeja y confirma el enlace para completar el proceso.
            </>
          ) : (
            <>
              Tu registro como{" "}
              <span className="font-medium text-foreground">{sectorCfg.label}</span>{" "}
              está siendo revisado por el equipo de Neggo. Recibirás un correo de
              confirmación cuando tu cuenta sea aprobada.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Razón Social
        </Label>
        <Input
          placeholder={sectorCfg.placeholder}
          value={form.razonSocial}
          onChange={updateField("razonSocial")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">NIT</Label>
        <Input
          placeholder="Ej: 900.123.456-7"
          value={form.nit}
          onChange={updateField("nit")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correo Corporativo</Label>
        <Input
          type="email"
          placeholder="Ej: gerente@empresa.com"
          value={form.correo}
          onChange={updateField("correo")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Representante Legal</Label>
        <Input
          placeholder="Nombre completo del representante"
          value={form.representante}
          onChange={updateField("representante")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teléfono de Contacto</Label>
        <Input
          type="tel"
          placeholder="Ej: +57 300 123 4567"
          value={form.telefono}
          onChange={updateField("telefono")}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
        />
      </div>

      <PasswordField
        id={`b2b-reg-${sector}`}
        label="Contraseña"
        placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
        value={form.password}
        onChange={updateField("password")}
      />
      <PasswordRequirements password={form.password} />
      <PasswordField
        id={`b2b-reg-confirm-${sector}`}
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
          canSubmit ? theme.button : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {submitState === "loading" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Verificando y registrando...</>
        ) : (
          <><UserPlus className="h-4 w-4" /> Solicitar Registro</>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Al enviar esta solicitud, aceptas los términos y condiciones del
        ecosistema Neggo. Tu información será verificada antes de la activación.
      </p>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// B2C LOGIN
// ═══════════════════════════════════════════════════════════════

export function B2CLogin({
  themeColor = "cyan",
  expectedRole = "Cliente",
}: {
  themeColor?: AccentColor;
  expectedRole?: string;
}) {
  const navigate = useNavigate();
  const theme = getTheme(themeColor);
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
          toast.error("Base de datos no configurada", { description: "Contacta al administrador." });
          setLoading(false);
          return;
        }

        const result = await useAuthStore.getState().loginWithCredentials({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!result.success) {
          if (result.pendingApproval) {
            toast.error("Cuenta pendiente de aprobación", { description: "Tu cuenta está siendo revisada por el equipo de Neggo." });
          } else {
            toast.error("Error de acceso", { description: result.error ?? "No se pudo iniciar sesión." });
          }
          setLoading(false);
          return;
        }

        if (expectedRole && result.role !== expectedRole) {
          await useAuthStore.getState().logout();
          toast.error("Cuenta incorrecta para este portal", {
            description: "Esta cuenta no corresponde a este portal. Usa el portal correcto para tu tipo de cuenta.",
          });
          setLoading(false);
          return;
        }

        toast.success("¡Bienvenido a Neggo!", { description: "Accediendo a tu portal financiero personal..." });
        setTimeout(() => navigate(result.dashboardRoute ?? "/portal"), 800);
      } catch {
        toast.error("Error inesperado", { description: "Ocurrió un error al intentar iniciar sesión." });
      }
      setLoading(false);
    },
    [canLogin, email, password, navigate, expectedRole]
  );

  const handleRecovery = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!recoveryEmail.trim() || recoveryLoading) return;
      setRecoveryLoading(true);

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", { description: "Contacta al administrador." });
          setRecoveryLoading(false);
          return;
        }

        const { requestPasswordReset } = await import("@/core/domain/auth/authService");
        const result = await requestPasswordReset(recoveryEmail.trim().toLowerCase());

        if (!result.success) {
          toast.error("Error al enviar recuperación", { description: result.error });
          setRecoveryLoading(false);
          return;
        }

        setRecoverySent(true);
        toast.success("Correo de recuperación enviado", { description: "Revisa tu bandeja de entrada para restablecer tu contraseña." });
      } catch {
        toast.error("Error inesperado", { description: "No se pudo enviar el correo de recuperación." });
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
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl mb-4 border", theme.recoveryBg, theme.recoveryBorder)}>
              <Mail className={cn("h-8 w-8", theme.recoveryIconColor)} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Correo enviado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Hemos enviado un enlace de recuperación a{" "}
              <span className={cn("font-medium", theme.accent)}>{recoveryEmail}</span>.
            </p>
            <button
              type="button"
              onClick={() => { setShowRecovery(false); setRecoverySent(false); setRecoveryEmail(""); }}
              className={cn("mt-4 text-xs transition-colors cursor-pointer", theme.recoveryAccent)}
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleRecovery} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Mail className={cn("h-4 w-4", theme.accent)} />
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
                recoveryEmail.trim() ? theme.recoveryButton : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {recoveryLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Mail className="h-4 w-4" /> Enviar enlace de recuperación</>
              )}
            </Button>
            <button
              type="button"
              onClick={() => { setShowRecovery(false); setRecoveryEmail(""); }}
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
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correo Electrónico</Label>
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
        id={`b2c-login-${themeColor}`}
        label="Contraseña"
        placeholder="Ingresa tu contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowRecovery(true)}
          className={cn("text-xs transition-colors cursor-pointer", theme.recoveryAccent)}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <Button
        type="submit"
        disabled={!canLogin}
        className={cn(
          "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
          canLogin ? theme.button : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Verificando credenciales...</>
        ) : (
          <><LogIn className="h-4 w-4" /> Ingresar</>
        )}
      </Button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// B2C REGISTER
// ═══════════════════════════════════════════════════════════════

export function B2CRegister({ themeColor = "cyan" }: { themeColor?: AccentColor }) {
  const navigate = useNavigate();
  const theme = getTheme(themeColor);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    tipoId: "",
    numeroId: "",
    correo: "",
    celular: "",
    rangoIngresos: "",
    password: "",
    confirmPassword: "",
  });
  const [bancos, setBancos] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingBancos, setIsLoadingBancos] = useState(true);
  const [loadBancosError, setLoadBancosError] = useState<string | null>(null);
  const [bancoProductos, setBancoProductos] = useState<Record<string, string[]>>({});
  const [resultRequiresEmailConfirmation, setResultRequiresEmailConfirmation] = useState(false);

  const pwValidation = validatePassword(form.password);
  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;

  const canSubmit =
    form.nombres.trim() !== "" &&
    form.apellidos.trim() !== "" &&
    form.tipoId !== "" &&
    form.numeroId.trim() !== "" &&
    form.correo.trim() !== "" &&
    form.celular.trim() !== "" &&
    form.rangoIngresos !== "" &&
    form.password.trim() !== "" &&
    form.confirmPassword.trim() !== "" &&
    pwValidation.isValid &&
    passwordsMatch &&
    submitState === "idle";

  useEffect(() => {
    fetchBancosAprobados().then(({ data, error }) => {
      if (error) {
        setLoadBancosError(error);
      } else {
        setBancos(data ?? []);
      }
      setIsLoadingBancos(false);
    });
  }, []);

  const toggleBank = useCallback((bankId: string) => {
    setBancoProductos((prev) => {
      if (bankId in prev) {
        const { [bankId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [bankId]: [] };
    });
  }, []);

  const toggleProducto = useCallback((bankId: string, producto: string) => {
    setBancoProductos((prev) => {
      const current = prev[bankId] ?? [];
      const next = current.includes(producto)
        ? current.filter((p) => p !== producto)
        : [...current, producto];
      return { ...prev, [bankId]: next };
    });
  }, []);

  const updateField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitState("loading");

      try {
        if (!isSupabaseConfigured) {
          toast.error("Base de datos no configurada", { description: "Contacta al administrador." });
          setSubmitState("idle");
          return;
        }

        const duplicateField = await checkDuplicates({
          email: form.correo.trim().toLowerCase(),
          documentNumber: form.numeroId.trim(),
          documentType: "cedula",
        });

        if (duplicateField) {
          const fieldLabels: Record<string, string> = { correo: "correo", documento: "cédula/documento" };
          toast.error("Error: Datos duplicados", {
            description: `El ${fieldLabels[duplicateField] || duplicateField} ya se encuentra registrado en el ecosistema.`,
          });
          setSubmitState("idle");
          return;
        }

        const result = await useAuthStore.getState().registerB2CClient({
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          tipoId: form.tipoId,
          numeroId: form.numeroId.trim(),
          email: form.correo.trim().toLowerCase(),
          celular: form.celular.trim(),
          rangoIngresos: form.rangoIngresos as RangoIngresosMensuales,
          password: form.password,
          bancoProductos: Object.entries(bancoProductos)
            .filter(([, productos]) => productos.length > 0)
            .map(([organizationId, productos]) => ({ organizationId, productos })),
        });

        if (!result.success) {
          toast.error("Error al registrar", { description: result.error });
          setSubmitState("idle");
          return;
        }

        setResultRequiresEmailConfirmation(!!result.requiresEmailConfirmation);
        setSubmitState("done");
        if (result.requiresEmailConfirmation) {
          toast.success("Registro exitoso — confirma tu correo", {
            description: "Hemos enviado un correo de confirmación a " + form.correo.trim().toLowerCase() + ". Revisa tu bandeja, confirma el enlace y luego inicia sesión para acceder a tu portal.",
          });
        } else {
          toast.success("¡Registro exitoso!", {
            description: "Bienvenido al portal de Neggo. Redirigiendo a tu panel financiero...",
          });
          setTimeout(() => navigate("/portal"), 2000);
        }
      } catch {
        toast.error("Error inesperado", { description: "Ocurrió un error al procesar tu registro." });
        setSubmitState("idle");
      }
    },
    [canSubmit, form, bancoProductos, navigate]
  );

  if (submitState === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl mb-4 border", theme.recoveryBg, theme.recoveryBorder)}>
          <CheckCircle2 className={cn("h-8 w-8", theme.accent)} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">¡Registro completado!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {resultRequiresEmailConfirmation ? (
            <>
              Hemos enviado un correo de confirmación a{" "}
              <span className="font-medium text-foreground">{form.correo.trim().toLowerCase()}</span>.{" "}
              Revisa tu bandeja, confirma el enlace y luego{" "}
              <span className="font-medium text-foreground">inicia sesión</span>{" "}
              para acceder a tu portal financiero.
            </>
          ) : (
            <>
              Bienvenido a Neggo. Serás redirigido a tu portal financiero personal
              donde podrás explorar ofertas, crear metas de ahorro y conectar con
              bancos y constructoras.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombres</Label>
          <Input placeholder="Ej: Jhon Edison" value={form.nombres} onChange={updateField("nombres")} className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apellidos</Label>
          <Input placeholder="Ej: Flórez" value={form.apellidos} onChange={updateField("apellidos")} className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de ID</Label>
          <Select value={form.tipoId} onValueChange={(val) => setForm((prev) => ({ ...prev, tipoId: val }))}>
            <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
              {ID_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id} className="cursor-pointer">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Número de ID</Label>
          <Input placeholder="Ej: 1234567890" value={form.numeroId} onChange={updateField("numeroId")} className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correo Electrónico</Label>
        <Input type="email" placeholder="Ej: jhon.florez@email.com" value={form.correo} onChange={updateField("correo")} className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Celular</Label>
        <Input type="tel" placeholder="Ej: +57 300 123 4567" value={form.celular} onChange={updateField("celular")} className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rango de Ingresos Mensuales</Label>
        <Select value={form.rangoIngresos} onValueChange={(val) => setForm((prev) => ({ ...prev, rangoIngresos: val }))}>
          <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
            {Object.entries(RANGO_INGRESOS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="cursor-pointer">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PasswordField id="b2c-reg-password" label="Contraseña" placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número" value={form.password} onChange={updateField("password")} />
      <PasswordRequirements password={form.password} />
      <PasswordField id="b2c-reg-confirm" label="Confirmar Contraseña" placeholder="Repite tu contraseña" value={form.confirmPassword} onChange={updateField("confirmPassword")} />

      {form.confirmPassword && !passwordsMatch && (
        <div className="flex items-center gap-2 text-[11px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Las contraseñas no coinciden
        </div>
      )}

      {/* ── Bank Matrix ── */}
      <div className="space-y-3 rounded-xl border border-border/40 bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <Lock className={cn("h-4 w-4", theme.accent)} />
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bancos y productos que ya tienes
          </Label>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Selecciona tus bancos y, para cada uno, qué productos tienes activos.
        </p>
        {isLoadingBancos ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando bancos disponibles...
          </div>
        ) : loadBancosError ? (
          <div className="flex items-center gap-2 text-xs text-red-400 py-2">
            <AlertCircle className="h-3.5 w-3.5" /> No se pudieron cargar los bancos.
          </div>
        ) : (
          <div className="space-y-2">
            {bancos.map((banco) => {
              const isSelected = banco.id in bancoProductos;
              return (
                <div key={banco.id} className="rounded-lg border border-border/40 bg-card/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleBank(banco.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-all duration-200 text-left cursor-pointer",
                      isSelected ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors", isSelected ? "border-emerald-400 bg-emerald-500/30" : "border-border/60")}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    {banco.name}
                  </button>
                  {isSelected && (
                    <div className="grid grid-cols-2 gap-1.5 p-3 pt-0">
                      {BANK_PRODUCTS.map((producto) => {
                        const isProductSelected = (bancoProductos[banco.id] ?? []).includes(producto.value);
                        return (
                          <button
                            key={producto.value}
                            type="button"
                            onClick={() => toggleProducto(banco.id, producto.value)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-all duration-200 text-left cursor-pointer",
                              isProductSelected
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                : "border-border/40 bg-card/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className={cn("flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border", isProductSelected ? "border-emerald-400 bg-emerald-500/30" : "border-border/60")}>
                              {isProductSelected && <CheckCircle2 className="h-2 w-2 text-white" />}
                            </div>
                            {producto.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {bancos.length === 0 && (
              <p className="text-xs text-muted-foreground">No hay bancos aprobados todavía.</p>
            )}
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300",
          canSubmit ? theme.button : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {submitState === "loading" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Verificando y creando cuenta...</>
        ) : (
          <><UserPlus className="h-4 w-4" /> Crear Cuenta y Acceder al Portal</>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Tus datos están protegidos bajo la política de privacidad de Neggo.
        Nunca compartiremos tu información sin tu autorización explícita.
      </p>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUTH PANEL — login/register tabs wrapper (themeable)
// ═══════════════════════════════════════════════════════════════

export function AuthPanel({
  mode,
  sector,
  themeColor,
  description,
  defaultAuthMode = "register",
}: {
  mode: "b2b" | "b2c";
  sector?: B2BSector;
  themeColor: AccentColor;
  description?: { login: string; register: string };
  defaultAuthMode?: AuthMode;
}) {
  const [authMode, setAuthMode] = useState<AuthMode>(defaultAuthMode);
  const theme = getTheme(themeColor);
  const expectedRole = mode === "b2b" ? (sector ? getSectorConfig(sector).roleValue : undefined) : "Cliente";

  return (
    <div className="space-y-4 animate-fade-in">
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {authMode === "register" ? description.register : description.login}
        </p>
      )}

      <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
        <div className="flex border-b border-border/30">
          <button
            onClick={() => setAuthMode("login")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative",
              authMode === "login" ? theme.accent : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LogIn className="h-3.5 w-3.5" />
            Iniciar Sesión
            {authMode === "login" && (
              <div className={cn("absolute bottom-0 left-4 right-4 h-0.5 rounded-full", theme.indicator, theme.indicatorGlow)} />
            )}
          </button>
          <div className="w-px bg-border/30 my-1.5" />
          <button
            onClick={() => setAuthMode("register")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative",
              authMode === "register" ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
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
          {authMode === "login"
            ? mode === "b2b"
              ? <B2BLogin themeColor={themeColor} expectedRole={expectedRole} />
              : <B2CLogin themeColor={themeColor} expectedRole={expectedRole} />
            : mode === "b2b" && sector
              ? <B2BRegister sector={sector} />
              : <B2CRegister themeColor={themeColor} />
          }
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTOR PAGE LAYOUT — reusable hero + benefits + auth panel
// ═══════════════════════════════════════════════════════════════

export function SectorPageLayout({
  sector,
  heroTitle,
  heroHighlight,
  heroSubtitle,
  benefits,
  features,
}: {
  sector: B2BSector;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  benefits: string[];
  features: { icon: typeof Building2; title: string; description: string }[];
}) {
  const sectorCfg = getSectorConfig(sector);
  const theme = getTheme(sectorCfg.themeColor);
  const SectorIcon = sectorCfg.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", theme.iconBg, theme.glowClass)}>
              <SectorIcon className={cn("h-5 w-5", theme.accent)} />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">Neggo</span>
              <span className={cn("hidden sm:inline text-[10px] uppercase tracking-[0.2em] font-semibold ml-2", theme.accent)}>
                {sectorCfg.label}
              </span>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Volver al inicio</span>
            <span className="sm:hidden">Volver</span>
          </Link>
        </div>
      </header>

      {/* ── Hero + Auth Grid ── */}
      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* Background orbs */}
        <div className={cn("absolute -top-20 -right-20 h-[400px] w-[400px] rounded-full blur-[100px]", sectorCfg.themeColor === "emerald" ? "bg-emerald-500/[0.04]" : sectorCfg.themeColor === "blue" ? "bg-blue-500/[0.04]" : "bg-amber-500/[0.04]")} />
        <div className={cn("absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full blur-[100px]", sectorCfg.themeColor === "emerald" ? "bg-emerald-500/[0.02]" : sectorCfg.themeColor === "blue" ? "bg-blue-500/[0.02]" : "bg-amber-500/[0.02]")} />

        <div className="relative grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* ── Left: Hero + Benefits ── */}
          <div className="space-y-8">
            <div className="space-y-5">
              <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-medium", theme.iconBg, theme.iconBorder, theme.accent)}>
                <span className="relative flex h-2 w-2">
                  <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", sectorCfg.themeColor === "emerald" ? "bg-emerald-400" : sectorCfg.themeColor === "blue" ? "bg-blue-400" : "bg-amber-400")} />
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", sectorCfg.themeColor === "emerald" ? "bg-emerald-400" : sectorCfg.themeColor === "blue" ? "bg-blue-400" : "bg-amber-400")} />
                </span>
                Portal {sectorCfg.label} — Ecosistema Neggo
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-[1.15]">
                {heroTitle}{" "}
                <span className={cn("text-transparent bg-clip-text bg-gradient-to-r", sectorCfg.themeColor === "emerald" ? "from-emerald-400 to-emerald-200" : sectorCfg.themeColor === "blue" ? "from-blue-400 to-blue-200" : "from-amber-400 to-amber-200")}>
                  {heroHighlight}
                </span>
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                {heroSubtitle}
              </p>

              <div className="flex flex-wrap gap-2.5">
                {benefits.map((b) => (
                  <span key={b} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium", theme.iconBg, theme.iconBorder, theme.accent)}>
                    <CheckCircle2 className="h-3 w-3" />
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Feature grid ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((f) => (
                <div key={f.title} className="flex gap-3.5">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", theme.iconBg)}>
                    <f.icon className={cn("h-5 w-5", theme.accent)} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Trust bar ── */}
            <div className="flex items-center gap-4 rounded-xl border border-border/30 bg-card/20 px-5 py-4">
              <ShieldCheck className={cn("h-5 w-5 shrink-0", theme.accent)} />
              <div>
                <p className="text-xs font-semibold text-foreground">Seguridad enterprise</p>
                <p className="text-[10px] text-muted-foreground">Cifrado de extremo a extremo · Cumplimiento normativo · ISO 27001</p>
              </div>
            </div>
          </div>

          {/* ── Right: Auth Panel ── */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", theme.iconBg)}>
                    <SectorIcon className={cn("h-5 w-5", theme.accent)} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Acceso {sectorCfg.label}</h3>
                    <p className="text-[10px] text-muted-foreground">Portal seguro del ecosistema Neggo</p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <AuthPanel
                  mode="b2b"
                  sector={sector}
                  themeColor={sectorCfg.themeColor}
                  description={{
                    login: `Inicia sesión con tu cuenta de ${sectorCfg.label.toLowerCase()} para acceder a tu panel de control.`,
                    register: `Regístra tu ${sectorCfg.label.toLowerCase().replace(/s$/, "")} para unirte al ecosistema Neggo.`,
                  }}
                />
              </div>
            </div>

            {/* ── Admin + Client links ── */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <Link
                to="/login-ecosistema"
                className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Lock className="h-3 w-3" />
                Iniciar sesión Admin Neggo
              </Link>
              <Link
                to="/landing/clientes"
                className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-cyan-400 transition-colors"
              >
                ¿Eres cliente? Acceder
              </Link>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-12 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60">
          <ShieldCheck className="h-3 w-3" />
          <span>Conexión cifrada — ISO 27001</span>
          <span className="text-border/40">|</span>
          <span>Neggo &copy; 2026</span>
        </div>
      </main>
    </div>
  );
}
