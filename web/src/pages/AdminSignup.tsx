import { useState, useCallback } from "react";
import { Loader2, KeyRound, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { isSupabaseConfigured, validatePassword } from "@/core/db/supabaseClient";

type SubmitState = "idle" | "loading" | "done";

/**
 * Standalone, unlinked signup screen for the platform master admin's BASE
 * account. Reachable only by typing /admin-signup directly — not referenced
 * from any nav, menu, or the public login page. Creates the account with a
 * neutral role (never 'Admin'); promotion is a manual step in Supabase.
 */
export default function AdminSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  const pwValidation = validatePassword(password);
  const canSubmit = email.trim() !== "" && pwValidation.isValid && submitState === "idle";

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

        const { registerAdminMaster } = await import("@/core/domain/auth/authService");
        const result = await registerAdminMaster({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!result.success) {
          toast.error("Error al crear la cuenta", { description: result.error });
          setSubmitState("idle");
          return;
        }

        setRequiresEmailConfirmation(!!result.requiresEmailConfirmation);
        setSubmitState("done");
        toast.success("Cuenta base creada", {
          description:
            "Sin privilegios elevados. La promoción a Admin se hace manualmente en Supabase.",
        });
      } catch {
        toast.error("Error inesperado", {
          description: "Ocurrió un error al crear la cuenta.",
        });
        setSubmitState("idle");
      }
    },
    [canSubmit, email, password]
  );

  if (submitState === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Cuenta base creada</h1>
          <p className="text-sm text-muted-foreground">
            {requiresEmailConfirmation
              ? `Confirma el correo enviado a ${email.trim().toLowerCase()} y luego promueve manualmente esta cuenta a rol Admin en Supabase (columna users.rol).`
              : "Promueve manualmente esta cuenta a rol Admin en Supabase (users.rol = 'Admin') antes de usarla en /admin."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border/40 bg-card/50 p-6"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-bold text-foreground">Crear cuenta base (Admin)</h1>
          <p className="text-xs text-muted-foreground">
            Solo crea la cuenta. No otorga privilegios de Admin — eso se hace manualmente en Supabase.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Correo electrónico
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm pl-10"
              placeholder="admin@neggo.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Contraseña
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm pl-10"
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-11 rounded-xl font-semibold text-sm"
        >
          {submitState === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creando...
            </>
          ) : (
            "Crear cuenta"
          )}
        </Button>
      </form>
    </div>
  );
}
