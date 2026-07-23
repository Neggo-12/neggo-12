import { useState, useCallback, useEffect } from 'react';
import {
  Search, Store, ShieldCheck, MapPin, Calendar, MessageCircle,
  Loader2, CheckCircle2, Sparkles, Frown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useClienteProfile } from '@/hooks/useClienteProfile';
import { useAuthStore } from '@/store/useAuthStore';
import {
  buscarComerciosVerificados,
  registrarBusquedaSinMatch,
  registrarContactoComercio,
  type ComercioBuscadorRow,
} from '@/core/db/repositories';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ───── Contact dialog ─────

function ContactarDialog({
  comercio,
  onOpenChange,
}: {
  comercio: ComercioBuscadorRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { name, telefono: perfilTelefono } = useClienteProfile();
  const [descripcion, setDescripcion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre el modal para un comercio nuevo, precarga teléfono y
  // WhatsApp con el número real del perfil — el cliente los confirma o
  // corrige, nunca los digita de cero.
  useEffect(() => {
    if (comercio) {
      setTelefono(perfilTelefono ?? '');
      setWhatsapp(perfilTelefono ?? '');
      setDescripcion('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comercio]);

  const canSubmit = descripcion.trim() !== '' && telefono.trim() !== '' && !!name && submitState === 'idle';

  const resetAndClose = useCallback(() => {
    setDescripcion('');
    setSubmitState('idle');
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !comercio || !name) return;
    setSubmitState('loading');
    setError(null);
    const { error: submitError } = await registrarContactoComercio({
      comercioId: comercio.id,
      descripcion: descripcion.trim(),
      nombre: name,
      telefono: telefono.trim(),
      whatsapp: whatsapp.trim() || null,
    });
    if (submitError) {
      setError(submitError);
      setSubmitState('idle');
      return;
    }
    setSubmitState('done');
    setTimeout(resetAndClose, 1800);
  }, [canSubmit, comercio, name, descripcion, telefono, whatsapp, resetAndClose]);

  return (
    <Dialog open={comercio !== null} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Store className="h-5 w-5 text-purple-400" />
            Contactar a {comercio?.name}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Cuéntale al comercio qué buscas — te contactará directamente a tu teléfono.
          </DialogDescription>
        </DialogHeader>

        {submitState === 'done' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Solicitud enviada</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {comercio?.name} recibió tus datos y te contactará pronto.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                ¿Qué buscas?
              </label>
              <Textarea
                placeholder="Ej: quiero saber si tienen disponibilidad de..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={500}
                className="min-h-[90px] rounded-xl border-border/60 bg-secondary/50 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teléfono</label>
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="h-10 rounded-xl border-border/60 bg-secondary/50 text-sm"
              />
              <p className="text-[11px] text-muted-foreground/70">
                Confirma o actualiza tu teléfono si cambió.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                WhatsApp <span className="normal-case font-normal text-muted-foreground/70">(opcional, si es distinto)</span>
              </label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Si prefieres que te escriban por WhatsApp"
                className="h-10 rounded-xl border-border/60 bg-secondary/50 text-sm"
              />
              <p className="text-[11px] text-muted-foreground/70">
                Confirma o actualiza tu WhatsApp si cambió.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                canSubmit
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───── Comercio result card ─────

function ComercioCard({
  comercio,
  onContactar,
}: {
  comercio: ComercioBuscadorRow;
  onContactar: (c: ComercioBuscadorRow) => void;
}) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-purple-500/20 bg-card/60 backdrop-blur-sm p-5 transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
          <Store className="h-5 w-5 text-purple-400" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold text-purple-400">
          <ShieldCheck className="h-3 w-3" />
          Sello de Confianza
        </span>
      </div>

      <h3 className="text-sm font-bold text-foreground mb-1">{comercio.name}</h3>

      <div className="space-y-1 mb-4">
        {comercio.categoria && (
          <p className="text-xs text-muted-foreground">{comercio.categoria}</p>
        )}
        {comercio.ciudad && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {comercio.ciudad}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          Afiliado desde {formatFecha(comercio.afiliadoDesde)}
        </p>
      </div>

      <Button
        onClick={() => onContactar(comercio)}
        className="mt-auto h-9 gap-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold"
        variant="ghost"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Contactar
      </Button>
    </div>
  );
}

// ───── Main view ─────

type SearchStatus = 'idle' | 'loading' | 'done';

export default function BuscarComerciosView() {
  const { ciudad } = useClienteProfile();
  const session = useAuthStore((s) => s.session);
  const [termino, setTermino] = useState('');
  const [results, setResults] = useState<ComercioBuscadorRow[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [hasSearched, setHasSearched] = useState(false);
  const [contactando, setContactando] = useState<ComercioBuscadorRow | null>(null);

  const handleSearch = useCallback(async () => {
    const q = termino.trim();
    if (!q || searchStatus === 'loading') return;
    setSearchStatus('loading');
    setHasSearched(true);
    const { data, error } = await buscarComerciosVerificados(q);
    const found = error ? [] : data ?? [];
    setResults(found);
    setSearchStatus('done');

    if (found.length === 0) {
      // Fire-and-forget: no bloquea la UI ni espera confirmación.
      void registrarBusquedaSinMatch({
        termino: q,
        ciudad: ciudad ?? null,
        clienteId: session?.userId ?? null,
      });
    }
  }, [termino, searchStatus, ciudad, session?.userId]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Store className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Buscar Comercios</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Encuentra comercios aliados verificados con Sello de Confianza y contáctalos directamente.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Busca por nombre del comercio..."
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={!termino.trim() || searchStatus === 'loading'}
          className="h-11 gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shrink-0"
        >
          {searchStatus === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Buscar
        </Button>
      </div>

      {/* Results */}
      {searchStatus === 'loading' ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
            <Frown className="h-6 w-6 text-purple-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">
            No encontramos comercios con ese nombre
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Pronto tendremos más aliados. Guardamos tu búsqueda para priorizar a quién invitar al ecosistema.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => (
            <ComercioCard key={c.id} comercio={c} onContactar={setContactando} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
            <Search className="h-6 w-6 text-purple-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Busca un comercio aliado</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Escribe el nombre del comercio que buscas y presiona Buscar.
          </p>
        </div>
      )}

      <ContactarDialog comercio={contactando} onOpenChange={(open) => !open && setContactando(null)} />
    </div>
  );
}
