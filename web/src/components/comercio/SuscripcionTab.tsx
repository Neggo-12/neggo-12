import { useState } from 'react';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useComercioStore } from '@/features/comercios/store/useComercioStore';
import { PLANES } from '@/features/comercios/components/ComercioOnboarding';
import type { SubscriptionTier } from '@/types';
import { cn } from '@/lib/utils';

export default function SuscripcionTab() {
  const { currentComercio, updatePlan } = useComercioStore();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(currentComercio.plan);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = selectedPlan !== currentComercio.plan;

  const handleConfirm = async () => {
    setIsSaving(true);
    await updatePlan(selectedPlan);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Suscripción</h2>
        <p className="text-xs text-muted-foreground">
          Tu plan actual es{' '}
          <span className="font-semibold text-foreground">
            {currentComercio.plan === 'premium' ? 'Premium' : 'Básico'}
          </span>
          . Cambia de plan cuando lo necesites.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANES.map((plan) => (
          <button
            key={plan.tier}
            type="button"
            onClick={() => setSelectedPlan(plan.tier)}
            className={cn(
              'relative rounded-xl border p-5 text-left transition-all hover:scale-[1.01]',
              selectedPlan === plan.tier
                ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                : 'border-border/40 bg-card/50',
            )}
          >
            {currentComercio.plan === plan.tier ? (
              <Badge className="absolute -top-2.5 right-3 bg-blue-600 text-white border-0 text-[10px] font-semibold">
                Plan Actual
              </Badge>
            ) : plan.highlighted ? (
              <Badge className="absolute -top-2.5 right-3 bg-emerald-600 text-white border-0 text-[10px] font-semibold">
                Recomendado
              </Badge>
            ) : null}
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <p className="text-2xl font-bold text-foreground font-mono mt-1">{plan.price}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
              <ul className="space-y-1.5 pt-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>

      <Button
        className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
        disabled={!hasChanges || isSaving}
        onClick={handleConfirm}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Confirmar Cambio
          </>
        )}
      </Button>
    </div>
  );
}
