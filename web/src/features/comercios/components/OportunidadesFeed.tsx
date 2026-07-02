import { useComercioStore, filterOportunidades, MOCK_OPORTUNIDADES } from '../store/useComercioStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Send, TrendingUp, PiggyBank, Target, Clock, ShieldAlert, Tag } from 'lucide-react';
import EnviarPropuestaDialog from './EnviarPropuestaDialog';
import { SUBCATEGORIAS } from '@/types';
import type { ComercioCategory } from '@/types';
import { cn } from '@/lib/utils';

/** Format a subcategory value to its display label */
function subcatLabel(cat: ComercioCategory, val: string): string {
  const opts = SUBCATEGORIAS[cat];
  if (!opts) return val;
  const found = opts.find((o) => o.value === val);
  return found ? found.label : val;
}

export default function OportunidadesFeed() {
  const {
    currentComercio,
    selectedOpportunityId,
    isPropuestaDialogOpen,
    setSelectedOpportunity,
    setPropuestaDialogOpen,
  } = useComercioStore();

  const oportunidades = filterOportunidades(
    MOCK_OPORTUNIDADES,
    currentComercio.categoria,
    currentComercio.ciudad
  );

  const handleOpenPropuesta = (id: string): void => {
    setSelectedOpportunity(id);
    setPropuestaDialogOpen(true);
  };

  if (oportunidades.length === 0) {
    return (
      <Card className="border-dashed border-border/40 bg-card/30">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
            <Target className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Sin oportunidades aún</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Cuando un cliente con Intención Financiera Certificada (IFC) haga match con tu
              categoría y ciudad, aparecerá aquí para que le envíes tu propuesta.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {oportunidades.map((op) => (
          <OportunidadCard
            key={op.id}
            oportunidad={op}
            onEnviarPropuesta={handleOpenPropuesta}
          />
        ))}
      </div>

      <EnviarPropuestaDialog
        open={isPropuestaDialogOpen && selectedOpportunityId !== null}
        onOpenChange={setPropuestaDialogOpen}
      />
    </>
  );
}

// ───── Oportunidad Card ─────

function OportunidadCard({
  oportunidad,
  onEnviarPropuesta,
}: {
  oportunidad: ReturnType<typeof filterOportunidades>[number];
  onEnviarPropuesta: (id: string) => void;
}) {
  const isSent = oportunidad.propuestaEnviada;
  const probColor =
    oportunidad.probabilidadCierre >= 90
      ? 'text-emerald-400'
      : oportunidad.probabilidadCierre >= 75
        ? 'text-blue-400'
        : 'text-amber-400';

  // Build the full opportunity ID with subcategory
  const displayId = oportunidad.subcategoria
    ? `${oportunidad.id} | ${oportunidad.categoria} (${subcatLabel(oportunidad.categoria, oportunidad.subcategoria)})`
    : `${oportunidad.id} | ${oportunidad.categoria}`;

  // Add metadata extras (e.g. Viaje — "3 personas")
  const metadataExtra =
    oportunidad.metadataAdicional?.personas
      ? ` — ${oportunidad.metadataAdicional.personas} personas`
      : '';

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur transition-all duration-300',
        !isSent && 'hover:border-emerald-500/30 hover:bg-card/70'
      )}
    >
      {/* Subtle top accent */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-0.5 transition-colors',
          isSent ? 'bg-emerald-500/20' : 'bg-emerald-500/40'
        )}
      />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-sm font-mono tracking-tight text-muted-foreground truncate">
              ID: {oportunidad.id}
            </CardTitle>
            {/* Subcategory badge */}
            {oportunidad.subcategoria && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate">
                  {oportunidad.categoria} ({subcatLabel(oportunidad.categoria, oportunidad.subcategoria)})
                  {metadataExtra}
                </span>
              </div>
            )}
          </div>
          {isSent ? (
            <Badge className="shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
              Propuesta Enviada
            </Badge>
          ) : (
            <Badge className="shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] animate-pulse-slow">
              Nueva
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Métricas principales */}
        <div className="space-y-2.5">
          <MetricRow
            icon={PiggyBank}
            label="Presupuesto Validado"
            value={`$${oportunidad.presupuesto.toLocaleString('es-CO')} COP`}
            highlight
          />
          <MetricRow
            icon={TrendingUp}
            label="Capacidad de Ahorro Activo"
            value={`${oportunidad.capacidadAhorro}%`}
          >
            <Progress
              value={oportunidad.capacidadAhorro}
              className="mt-1 h-1.5 [&>div]:bg-emerald-500"
            />
          </MetricRow>
          <MetricRow
            icon={Target}
            label="Probabilidad de Cierre"
            value={`${oportunidad.probabilidadCierre}%`}
            valueClassName={probColor}
          />
          <MetricRow
            icon={Clock}
            label="Compra Estimada"
            value={`En ${oportunidad.compraEstimadaDias} días`}
          />
        </div>

        {/* Anonimato Notice */}
        <div className="flex items-start gap-2 rounded-lg bg-card/80 border border-border/40 p-3">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Por política de privacidad Neggo, los datos personales del cliente permanecen anónimos
            hasta que tu propuesta sea aceptada.
          </p>
        </div>

        {/* Action Button */}
        <Button
          variant={isSent ? 'outline' : 'default'}
          disabled={isSent}
          className={cn(
            'w-full font-medium transition-all',
            isSent
              ? 'border-emerald-500/20 text-emerald-400 cursor-default'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          )}
          onClick={() => !isSent && onEnviarPropuesta(oportunidad.id)}
        >
          <Send className="mr-2 h-4 w-4" />
          {isSent ? 'Propuesta Enviada' : 'Enviar Propuesta Competitiva'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ───── Metric Row ─────

function MetricRow({
  icon: Icon,
  label,
  value,
  highlight,
  valueClassName,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
  valueClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span
          className={cn(
            'text-xs font-semibold font-mono',
            highlight ? 'text-foreground' : 'text-muted-foreground',
            valueClassName
          )}
        >
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}
