import { useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePassword } from "@/core/db/supabaseClient";

// ─── Password Field with toggle visibility ─────────────────────

export function PasswordField({
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

// ─── Password Requirements Indicator ───────────────────────────

export function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
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
